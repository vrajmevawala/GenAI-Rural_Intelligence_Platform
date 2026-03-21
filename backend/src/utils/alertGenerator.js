const { v4: uuidv4 } = require('uuid')
const { pool } = require('../config/db')
const { callGroq } = require('./groqClient')
const { ALERT_TYPES, ALERT_PRIORITY_MAP, ALERT_PRIORITIES } = require('./alertTypes')

async function generateAlert({
  farmerId,
  organizationId,
  alertType,
  language = 'gu',
  contextData = {},
  sendWhatsAppMessage = false
}) {
  const normalizedType = isSupportedAlertType(alertType)
    ? alertType
    : ALERT_TYPES.CUSTOM

  const farmer = await getFarmerProfile(farmerId)
  const lang = 'gu'
  const orgId = organizationId || farmer.organization_id || null

  const farmerContext = buildFarmerContext(farmer, contextData)
  const alertInstruction = buildAlertInstruction(normalizedType, farmer, contextData)
  const langName = getLanguageName(lang)

  const systemPrompt = buildSystemPrompt(langName)
  const userPrompt = buildUserPrompt(farmerContext, normalizedType, alertInstruction, langName)

  const rawResult = await callGroq(systemPrompt, userPrompt, 1200)
  if (!rawResult || !String(rawResult).trim()) {
    throw new Error('Groq returned empty alert content')
  }
  const parsed = parseAlertResponse(rawResult)

  const savedAlert = await saveAlertToDB({
    farmerId,
    organizationId: orgId,
    alertType: normalizedType,
    language: lang,
    messageText: parsed.whatsappMessage,
    dashboardMessage: parsed.dashboardMessage,
    voiceNoteScript: parsed.voiceNoteScript,
    reason: parsed.reason,
    priority: ALERT_PRIORITY_MAP[normalizedType] || ALERT_PRIORITIES.MEDIUM,
    contextData
  })

  let whatsappSid = null
  if (sendWhatsAppMessage && farmer.phone) {
    try {
      const whatsappService = require('../modules/whatsapp/whatsapp.service')
      whatsappSid = await whatsappService.sendMessage(farmer.phone, parsed.whatsappMessage)
      await pool.query(
        `UPDATE alerts
         SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [savedAlert.id]
      )
    } catch (err) {
      console.error(`WhatsApp send failed for farmer ${farmerId}:`, err.message)
    }
  }

  return {
    alert: savedAlert,
    messages: parsed,
    whatsappSid
  }
}

async function getFarmerProfile(farmerId) {
  const farmerResult = await pool.query(
    `SELECT f.*
     FROM farmers f
     WHERE f.id = $1`,
    [farmerId]
  )

  if (farmerResult.rows.length === 0) {
    throw new Error(`Farmer not found: ${farmerId}`)
  }

  return farmerResult.rows[0]
}

function buildSystemPrompt(langName) {
  return `You are GraamAI, a rural financial advisor for cooperative banks in Gujarat, India.
You generate detailed, actionable WhatsApp alerts that are sent directly to farmers.

STRICT RULES:
- Write ONLY in ${langName}. Zero English words unless it is a proper name (PM-KISAN, PMFBY, Aadhaar are okay).
- Plain text ONLY. Zero markdown. Zero asterisks. Zero bullet symbols.
  Use numbered lists like: "1. Step one" on a new line.
- Use simple words a farmer with Class 5 education can understand.
- Warm and helpful tone.
- NEVER say "invalid" or "error".
- Never include farmer name in the message.
- Never mention officer or admin in the message.
- Every message must be immediately actionable.`
}

function buildUserPrompt(farmerContext, alertType, alertInstruction, langName) {
  return `FARMER PROFILE:
${farmerContext}

ALERT TYPE: ${alertType}

SPECIFIC INSTRUCTIONS FOR THIS ALERT:
${alertInstruction}

Generate THREE outputs in ${langName}:

---WHATSAPP_MESSAGE---
(max 900 characters)
Answer these six points in the message:
1. WHAT: exact problem
2. WHY: consequence if ignored
3. WHEN: exact deadline or days remaining
4. HOW: numbered steps
5. BRING: exact documents list
6. COST: exact rupee amount (premium/benefit/penalty)

Also include:
- branch info and timings
- helpline number
- quick reply line in Gujarati only: "જવાબ આપો: 1 માહિતી | 0 મેનુ"
- do not include farmer name
- do not mention officer/admin

---DASHBOARD_MESSAGE---
(max 300 characters)
One short Gujarati paragraph summarizing the same farmer-facing alert.

---VOICE_NOTE_SCRIPT---
(max 110 words)
Spoken style in ${langName}, no lists.
Start with: "નમસ્તે..."
Natural pauses with ...
- do not include farmer name
- do not mention officer/admin

---REASON---
One English line for internal DB tracking.`
}

function buildAlertInstruction(alertType, farmer, contextData) {
  const now = new Date()
  const insuranceDate = farmer.insurance_expiry_date ? new Date(farmer.insurance_expiry_date) : null
  const loanDueDate = farmer.loan_due_date ? new Date(farmer.loan_due_date) : null

  const daysUntilInsurance = insuranceDate
    ? Math.ceil((insuranceDate.getTime() - now.getTime()) / 86400000)
    : null

  const daysOverdueLoan = loanDueDate
    ? Math.floor((now.getTime() - loanDueDate.getTime()) / 86400000)
    : 0

  const loanAmount = Number(farmer.loan_amount_inr || 0)
  const penaltyAmount = loanAmount > 0 && daysOverdueLoan > 0
    ? Math.round((loanAmount * 0.02 * daysOverdueLoan) / 30)
    : 0

  const insurancePremium = calculatePremium(farmer.primary_crop, farmer.land_area_acres)

  const instructions = {
    [ALERT_TYPES.INSURANCE_EXPIRY]: `
SITUATION:
- PMFBY insurance expires in ${daysUntilInsurance ?? 'unknown'} days
- Exact expiry date: ${formatDate(farmer.insurance_expiry_date) || 'unknown'}
- Crop: ${farmer.primary_crop || 'unknown'}, Land: ${farmer.land_area_acres || 'unknown'} acres

MUST INCLUDE:
- consequence if no renewal: no compensation for crop loss
- estimated premium: Rs ${insurancePremium}
- required documents list
- exact branch visit steps and helpline`,

    [ALERT_TYPES.LOAN_OVERDUE]: `
SITUATION:
- Loan overdue days: ${Math.max(daysOverdueLoan, 0)}
- Loan type: ${farmer.loan_type || 'unknown'}
- Original amount: Rs ${loanAmount.toLocaleString('en-IN')}
- Due date: ${formatDate(farmer.loan_due_date) || 'unknown'}
- Estimated penalty already added: Rs ${penaltyAmount.toLocaleString('en-IN')}

MUST INCLUDE:
- consequences of delay
- reassurance that bank will help
- exact steps for branch visit and negotiation options
- document checklist`,

    [ALERT_TYPES.PM_KISAN_PENDING]: `
SITUATION:
- PM-KISAN installment pending
- Last installment date: ${formatDate(farmer.pm_kisan_last_installment_date) || 'never'}
- Enrolled: ${farmer.pm_kisan_enrolled ? 'yes' : 'no'}

MUST INCLUDE:
- amount pending Rs 2000 and yearly Rs 6000 context
- common reasons payment gets stuck
- exact fix flow with CSC/bank/tehsil guidance
- helpline numbers`,

    [ALERT_TYPES.WEATHER_RISK]: `
SITUATION:
- Weather risk for ${farmer.district || 'farmer district'}
- Forecast: ${contextData.rainfallForecast || 'below normal rainfall for next 14 days'}
- Risk level: ${contextData.droughtRisk || 'high'}
- Crop: ${farmer.primary_crop || 'unknown'}

MUST INCLUDE:
- 14-day district-specific warning
- crop-specific mitigation steps
- damage reporting timeline (72 hours) and claim documents
- emergency support channels`,

    [ALERT_TYPES.SCORE_CHANGE]: `
SITUATION:
- Vulnerability score changed
- Old score: ${contextData.oldScore ?? 'unknown'} (${String(contextData.oldLabel || 'unknown').toUpperCase()})
- New score: ${contextData.newScore ?? 'unknown'} (${String(contextData.newLabel || 'unknown').toUpperCase()})
- Top factors: ${contextData.topRiskFactors || 'multiple risk factors'}

MUST INCLUDE:
- top reasons that increased risk
- one most urgent action first
- what happens in next 7 days if ignored
- encouragement that score can improve`,

    [ALERT_TYPES.SCHEME_OPPORTUNITY]: `
SITUATION:
- Eligible schemes not yet applied
- Eligible schemes: ${contextData.eligibleSchemes || 'PM-KISAN, KCC, Soil Health Card'}
- Potential benefit: Rs ${contextData.totalBenefit || 'not estimated'}

MUST INCLUDE:
- scheme wise benefit, eligibility reason, documents, and apply location
- first immediate step for this farmer`,

    [ALERT_TYPES.OFFICER_CALLBACK]: `
SITUATION:
- Farmer requested callback support
- Request time: ${new Date().toLocaleString('en-IN')}
- Concern: ${contextData.farmerConcern || 'general assistance requested'}

MUST INCLUDE:
- callback ETA within 2 working hours
- urgent number for immediate call
- list of documents to keep ready
- reference number in message`,

    [ALERT_TYPES.CUSTOM]: `
SITUATION: ${contextData.situation || 'general advisory'}
Context: ${contextData.customMessage || 'supportive farming and banking guidance'}

MUST INCLUDE:
- detailed explanation
- actionable numbered steps
- required documents if applicable
- costs/benefits and support contacts`
  }

  return instructions[alertType] || instructions[ALERT_TYPES.CUSTOM]
}

function buildFarmerContext(farmer, contextData = {}) {
  const lines = [
    '=== PERSONAL ===',
    `Name: ${farmer.name || 'unknown'}`,
    `Phone: ${farmer.phone || 'not saved'}`,
    `Village: ${farmer.village || 'unknown'}, Taluka: ${farmer.taluka || 'unknown'}`,
    `District: ${farmer.district || 'unknown'}, State: ${farmer.state || 'unknown'}`,
    `Preferred language: ${getLanguageName(farmer.preferred_language || farmer.language)}`,
    '',
    '=== FARM ===',
    `Primary crop: ${farmer.primary_crop || 'unknown'}`,
    `Land area: ${farmer.land_area_acres || 'unknown'} acres`,
    `Soil type: ${farmer.soil_type || 'unknown'}`,
    `Irrigation: ${farmer.irrigation_type || 'unknown'}`,
    `Annual income: Rs ${farmer.annual_income_inr ? Number(farmer.annual_income_inr).toLocaleString('en-IN') : 'unknown'}`,
    '',
    '=== FINANCIAL ===',
    `Loan type: ${farmer.loan_type || 'none'}`,
    `Loan amount: ${farmer.loan_amount_inr ? `Rs ${Number(farmer.loan_amount_inr).toLocaleString('en-IN')}` : 'N/A'}`,
    `Loan due date: ${formatDate(farmer.loan_due_date) || 'unknown'}`,
    `Last repayment: ${formatDate(farmer.last_repayment_date) || 'unknown'}`,
    '',
    '=== INSURANCE & SCHEMES ===',
    `Crop insurance: ${farmer.has_crop_insurance ? 'yes' : 'no'}`,
    `Insurance expiry: ${formatDate(farmer.insurance_expiry_date) || 'unknown'}`,
    `PM-KISAN enrolled: ${farmer.pm_kisan_enrolled ? 'yes' : 'no'}`,
    `Last PM-KISAN installment: ${formatDate(farmer.pm_kisan_last_installment_date) || 'never'}`,
    '',
    '=== RISK ===',
    `Vulnerability score: ${farmer.vulnerability_score ?? 'unknown'}/100`,
    `Risk label: ${String(farmer.vulnerability_label || 'unknown').toUpperCase()}`,
    ''
  ]

  if (Object.keys(contextData).length > 0) {
    lines.push('=== ADDITIONAL CONTEXT ===')
    Object.entries(contextData).forEach(([key, value]) => {
      lines.push(`${key}: ${value}`)
    })
  }

  return lines.join('\n')
}

function parseAlertResponse(rawText) {
  const text = String(rawText || '').trim()
  if (!text) {
    return {
      whatsappMessage: '',
      dashboardMessage: '',
      voiceNoteScript: '',
      reason: ''
    }
  }

  const whatsappMessage = extractSection(text, 'WHATSAPP_MESSAGE')
  const dashboardMessage = extractSection(text, 'DASHBOARD_MESSAGE')
  const voiceNoteScript = extractSection(text, 'VOICE_NOTE_SCRIPT')
  const reason = extractSection(text, 'REASON')

  const fallbackDashboard = text.length > 300 ? text.slice(0, 300).trim() : text

  return {
    whatsappMessage: whatsappMessage || text,
    dashboardMessage: dashboardMessage || fallbackDashboard,
    voiceNoteScript: voiceNoteScript || '',
    reason: reason || deriveReasonFallback(dashboardMessage || fallbackDashboard)
  }
}

function extractSection(text, sectionName) {
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(?:---\\s*${escapedName}\\s*---|${escapedName}\\s*:)\\s*([\\s\\S]*?)(?=(?:---\\s*[A-Z_]+\\s*---|[A-Z_]+\\s*:)|$)`, 'i')
  const match = text.match(pattern)
  if (!match || !match[1]) return ''
  return match[1].trim()
}

function deriveReasonFallback(text) {
  const compact = String(text || '').replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  return compact.slice(0, 160)
}

async function saveAlertToDB({
  farmerId,
  organizationId,
  alertType,
  language,
  messageText,
  dashboardMessage,
  voiceNoteScript,
  reason,
  priority,
  contextData
}) {
  const result = await pool.query(
    `INSERT INTO alerts (
      id,
      farmer_id,
      organization_id,
      alert_type,
      priority,
      language,
      message_text,
      message,
      voice_note_script,
      reason,
      status,
      ai_generated,
      created_at,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      'pending', true, NOW(), NOW()
    ) RETURNING *`,
    [
      uuidv4(),
      farmerId,
      organizationId,
      alertType,
      priority,
      language,
      messageText,
      dashboardMessage || messageText,
      voiceNoteScript,
      reason || deriveReasonFallback(dashboardMessage || messageText)
    ]
  )

  const alert = result.rows[0]
  alert.context_data = contextData
  return alert
}

function calculatePremium(crop, acres) {
  const rates = {
    wheat: { rate: 1.5, sum: 35000 },
    cotton: { rate: 5, sum: 40000 },
    groundnut: { rate: 5, sum: 32000 },
    bajra: { rate: 2, sum: 20000 },
    castor: { rate: 5, sum: 30000 },
    default: { rate: 2, sum: 30000 }
  }

  const cropKey = String(crop || 'default').toLowerCase()
  const { rate, sum } = rates[cropKey] || rates.default
  const land = Number(acres || 1)
  return Math.round((rate / 100) * sum * land).toLocaleString('en-IN')
}

function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getLanguageName(code) {
  return {
    gu: 'Gujarati',
    hi: 'Hindi',
    en: 'English',
    hinglish: 'Hinglish'
  }[code] || 'Gujarati'
}

function isSupportedAlertType(value) {
  return Object.values(ALERT_TYPES).includes(value)
}

module.exports = {
  generateAlert,
  parseAlertResponse
}
