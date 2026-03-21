const twilio = require('twilio')
const { v4: uuidv4 } = require('uuid')
const { pool } = require('../../config/db')
const { callGrok } = require('../../utils/grokClient')
const { AppError } = require('../../middleware/errorHandler')
const logger = require('../../utils/logger')

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

/**
 * ─── NORMALIZE PHONE NUMBER TO E.164 FORMAT ───────────────────────────────────
 */
function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return trimmed;
}

/**
 * ─── SEND A WHATSAPP MESSAGE ──────────────────────────────────────────────────
 * toPhone must be in E.164 format: +91XXXXXXXXXX (no whatsapp: prefix)
 */
async function sendMessage(toPhone, body) {
  if (!toPhone || !body) {
    throw new AppError('Phone and message body required', 400, 'INVALID_INPUT')
  }

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${toPhone}`,
      body,
    })
    return message.sid
  } catch (err) {
    console.error('Twilio sendMessage error:', err)
    throw new AppError(
      `Failed to send WhatsApp message: ${err.message}`,
      500,
      'WHATSAPP_SEND_FAILED'
    )
  }
}

/**
 * ─── GET OR CREATE ACTIVE CONVERSATION ───────────────────────────────────────
 */
async function getOrCreateConversation(farmerId, organizationId, phone, language = 'gu') {
  // Check for existing active non-expired session
  const existing = await pool.query(
    `SELECT * FROM whatsapp_conversations 
     WHERE farmer_id = $1 AND organization_id = $2 AND is_active = true 
     AND session_expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [farmerId, organizationId]
  )
  if (existing.rows.length > 0) return existing.rows[0]

  // Create new conversation session
  const result = await pool.query(
    `INSERT INTO whatsapp_conversations 
     (id, farmer_id, organization_id, phone_number, language, current_stage)
     VALUES ($1, $2, $3, $4, $5, 'welcome')
     RETURNING *`,
    [uuidv4(), farmerId, organizationId, phone, language]
  )
  return result.rows[0]
}

/**
 * ─── SAVE MESSAGE TO DB ───────────────────────────────────────────────────────
 */
async function saveMessage(conversationId, direction, body, twilioSid = null) {
  await pool.query(
    `INSERT INTO whatsapp_messages (id, conversation_id, direction, body, twilio_sid, status)
     VALUES ($1, $2, $3, $4, $5, 'sent')`,
    [uuidv4(), conversationId, direction, body, twilioSid]
  )
}

/**
 * ─── UPDATE CONVERSATION STAGE ────────────────────────────────────────────────
 */
async function updateStage(conversationId, newStage, contextUpdate = {}) {
  await pool.query(
    `UPDATE whatsapp_conversations 
     SET current_stage = $1, 
         context = context || $2::jsonb,
         updated_at = NOW(),
         session_expires_at = NOW() + INTERVAL '24 hours'
     WHERE id = $3`,
    [newStage, JSON.stringify(contextUpdate), conversationId]
  )
}

/**
 * ─── INITIATE BOT ────────────────────────────────────────────────────────────
 * Called when a bank officer clicks "Send WhatsApp Alert" for a specific farmer
 */
async function initiateBot(farmerId, organizationId, language = 'gu') {
  const supportedLanguages = new Set(['gu', 'hi', 'en', 'hinglish'])
  const selectedLanguage = supportedLanguages.has(language) ? language : 'gu'

  // 1. Get farmer details from DB
  const farmerResult = await pool.query(
    `SELECT f.*, 
            (SELECT COUNT(*) FROM alerts a 
             WHERE a.farmer_id = f.id AND a.status = 'pending') as pending_alerts_count
     FROM farmers f 
     WHERE f.id = $1`,
    [farmerId]
  )
  const farmer = farmerResult.rows[0]
  if (!farmer) throw new AppError('Farmer not found', 404, 'FARMER_NOT_FOUND')
  if (!farmer.phone) throw new AppError('Farmer has no phone number', 400, 'NO_PHONE_NUMBER')

  // 2. Get pending alerts for this farmer
  const alertsResult = await pool.query(
    `SELECT * FROM alerts 
     WHERE farmer_id = $1 AND status = 'pending' 
     ORDER BY created_at DESC LIMIT 5`,
    [farmerId]
  )
  const alerts = alertsResult.rows

  // 3. Get or create conversation
  const conv = await getOrCreateConversation(farmerId, organizationId, farmer.phone, selectedLanguage)

  // 4. Build welcome message via Claude
  const welcomeMsg = await generateWelcomeMessage(farmer, alerts, selectedLanguage)

  // 5. Send via Twilio
  const sid = await sendMessage(farmer.phone, welcomeMsg)

  // 6. Save to DB
  await saveMessage(conv.id, 'outbound', welcomeMsg, sid)
  
  // 7. Extract alert types for context
  const alertTypes = alerts.map(a => a.alert_type)
  await updateStage(conv.id, 'alerts_summary', { alerts: alertTypes, alert_count: alerts.length })

  // 8. Update alert statuses to 'sent'
  if (alerts.length > 0) {
    await pool.query(
      `UPDATE alerts SET status = 'sent'
       WHERE farmer_id = $1 AND status = 'pending'`,
      [farmerId]
    )
  }

  return { success: true, conversationId: conv.id, messageSid: sid, alertsSent: alerts.length }
}

/**
 * ─── HANDLE INBOUND REPLY from farmer ────────────────────────────────────────
 */
async function handleInboundMessage(fromPhone, body) {
  try {
    // Strip whatsapp: prefix and normalize to E.164 format
    const cleanPhone = normalizePhoneNumber(fromPhone.replace('whatsapp:', ''))
    logger.info('WhatsApp inbound message', { from: cleanPhone, body: body.substring(0, 50), action: 'whatsapp.inbound' })

    // Find active conversation for this phone
    const convResult = await pool.query(
      `SELECT wc.*,
              f.name AS farmer_name,
              f.language AS preferred_language,
              f.district,
              (
                SELECT c.name
                FROM farmer_crops fc
                JOIN crops c ON c.id = fc.crop_id
                WHERE fc.farmer_id = f.id
                ORDER BY fc.created_at DESC
                LIMIT 1
              ) AS primary_crop,
              NULL::integer AS vulnerability_score,
              NULL::boolean AS has_crop_insurance,
              NULL::timestamp AS insurance_expiry_date,
              NULL::text AS loan_type,
              NULL::timestamp AS loan_due_date,
              NULL::boolean AS pm_kisan_enrolled
       FROM whatsapp_conversations wc
       JOIN farmers f ON f.id = wc.farmer_id
       WHERE wc.phone_number = $1
         AND wc.is_active = true
         AND wc.session_expires_at > NOW()
       ORDER BY wc.created_at DESC
       LIMIT 1`,
      [cleanPhone]
    )

    if (convResult.rows.length === 0) {
      // No active session — send a "please contact your bank" message
      logger.info('No active WhatsApp conversation', { phone: cleanPhone })
      const noSessionMsg = getNoSessionMessage()
      await sendMessage(cleanPhone, noSessionMsg)
      return { handled: false, message: 'No active session' }
    }

    const conv = convResult.rows[0]
    const userText = body.trim().toLowerCase()
    logger.info('Found active conversation', { conversationId: conv.id, stage: conv.current_stage })

    // Save inbound message
    await saveMessage(conv.id, 'inbound', body)

    // Determine next bot action based on current stage + user input
    const replyText = await processBotReply(conv, userText)
    logger.info('Generated bot reply', { nextStage: replyText.nextStage, messageLength: replyText.message.length })

    // Send reply
    const sid = await sendMessage(cleanPhone, replyText.message)
    await saveMessage(conv.id, 'outbound', replyText.message, sid)

    // Update stage
    if (replyText.nextStage) {
      await updateStage(conv.id, replyText.nextStage, replyText.contextUpdate || {})
    }

    // Close session if done
    if (replyText.nextStage === 'done') {
      await pool.query(
        `UPDATE whatsapp_conversations SET is_active = false WHERE id = $1`,
        [conv.id]
      )
    }

    return { handled: true, conversationId: conv.id, nextStage: replyText.nextStage }
  } catch (err) {
    logger.error('Error handling WhatsApp inbound message', { error: err.message, from: fromPhone, body: body.substring(0, 50) })
    throw err
  }
}

/**
 * ─── MESSAGE GENERATION FUNCTIONS ────────────────────────────────────────────
 */

async function generateWelcomeMessage(farmer, alerts, language) {
  try {
    // Try dynamic generation using Grok
    const alertContext = alerts.slice(0, 3)
      .map((a, i) => `${i + 1}. ${a.message || a.reason}`)
      .join('\n');

    const systemPrompt = language === 'gu'
      ? `You are KhedutMitra, a warm and helpful Gujarati-speaking agricultural advisor. Generate a brief, friendly welcome message for a farmer. Keep it under 120 characters. Mention you have important updates. NO MARKDOWN OR EMOJIS.`
      : `You are KhedutMitra, a helpful agricultural advisor. Generate a warm welcome in ${language}. Keep under 120 chars. NO MARKDOWN.`;

    const userPrompt = `Welcome message for farmer ${farmer.name}. Crop: ${farmer.primary_crop}. District: ${farmer.district}. They have ${alerts.length} alerts. Be warm and personalized.`;

    const grokResponse = await callGrok(systemPrompt, userPrompt, 200);

    if (grokResponse) {
      let msg = grokResponse;
      if (alerts.length > 0) {
        if (language === 'gu') {
          msg += `\n\n📋 તમારા અલર્ટ્સ:\n${alertContext}`;
        } else {
          msg += `\n\nYour Alerts:\n${alertContext}`;
        }
      }
      if (language === 'gu') {
        msg += '\n\nકૃપા કરીને 1 લખીને સેવા મેનુ જુઓ.';
      } else {
        msg += '\n\nReply 1 for menu.';
      }
      return msg;
    }
  } catch (err) {
    logger.warn('Grok welcome generation failed, using default', {
      farmerId: farmer.id,
      error: err.message
    });
  }

  // Fallback to fixed template
  if (language === 'gu') {
    const count = alerts.length;
    const crop = farmer.primary_crop || 'તમારો પાક';
    let msg = `નમસ્તે ${farmer.name}. હું KhedutMitra છું.\nતમારા ${crop} અને બાબતો માટે ${count} અપડેટ્સ છે.`;
    if (count > 0) {
      msg += `\n\n📋 તમારા અલર્ટ્સ:\n`;
      alerts.slice(0, 3).forEach((alert, i) => {
        msg += `${i + 1}. ${alert.message || alert.reason}\n`;
      });
      if (count > 3) msg += `... અને ${count - 3} વધુ`;
    }
    msg += `\n\n1 લખો સેવા માટે.`;
    return msg;
  }

  return `Hello ${farmer.name}! I have ${alerts.length} important updates for you. Reply 1 to continue.`;
}

async function processBotReply(conv, userInput) {
  const stage = conv.current_stage
  const language = conv.language || 'gu'

  if (['menu', 'મેનુ', '0'].includes(userInput)) {
    return await handleMainMenu(conv, userInput, language)
  }

  // Handle language switch commands in any stage
  if (['gujarati', 'gu', 'guj'].includes(userInput)) {
    await pool.query(
      'UPDATE whatsapp_conversations SET language = $1 WHERE id = $2',
      ['gu', conv.id]
    )
    return { message: getLanguageSwitchConfirmation('gu'), nextStage: stage }
  }
  if (['hindi', 'hi'].includes(userInput)) {
    await pool.query(
      'UPDATE whatsapp_conversations SET language = $1 WHERE id = $2',
      ['hi', conv.id]
    )
    return { message: getLanguageSwitchConfirmation('hi'), nextStage: stage }
  }
  if (['english', 'en'].includes(userInput)) {
    await pool.query(
      'UPDATE whatsapp_conversations SET language = $1 WHERE id = $2',
      ['en', conv.id]
    )
    return { message: getLanguageSwitchConfirmation('en'), nextStage: stage }
  }

  // Stage-based response routing
  switch (stage) {
    case 'welcome':
    case 'alerts_summary':
      return await handleMainMenu(conv, userInput, language)

    case 'menu':
      return await handleMenuSelection(conv, userInput, language)

    case 'insurance_flow':
      return await handleInsuranceFlow(conv, userInput, language)

    case 'pmkisan_flow':
      return await handlePmKisanFlow(conv, userInput, language)

    case 'weather_flow':
      return await handleWeatherFlow(conv, userInput, language)

    case 'scheme_flow':
      return await handleSchemeFlow(conv, userInput, language)

    case 'officer_connect':
      return await handleOfficerConnect(conv, userInput, language)

    default:
      return await handleMainMenu(conv, userInput, language)
  }
}

async function handleMainMenu(conv, input, language) {
  const menuMessage = await generateMenuMessage(conv, language)
  return { message: menuMessage, nextStage: 'menu' }
}

async function generateMenuMessage(conv, language) {
  const options = [
    getMenuOption('insurance', language),
    getMenuOption('pmkisan', language),
    getMenuOption('weather', language),
    getMenuOption('scheme', language),
    getMenuOption('profile', language),
    getMenuOption('officer', language)
  ]

  const numbered = options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')
  const header = await generateDynamicMenuHeader(conv, language)
  return `${header}\n\n${numbered}\n\n0. ${getMenuLabel(language)}\n${getLanguageChangeHelp(language)}`
}

async function generateDynamicMenuHeader(conv, language) {
  const fallback = getMenuHeader(language)

  try {
    const systemPrompt = `You are KhedutMitra. Write one short WhatsApp menu header in ${getLanguageName(language)} for a farmer. Keep it under 90 characters. Friendly, clear, and action-oriented. Plain text only.`
    const userPrompt = `Farmer name: ${conv.farmer_name || 'Farmer'}. Crop: ${conv.primary_crop || 'N/A'}. District: ${conv.district || 'N/A'}. Ask them to choose one service by number.`
    const text = await callGrok(systemPrompt, userPrompt, 120)
    if (text && text.trim()) return text.trim()
  } catch (err) {
    logger.warn('Dynamic menu header failed, using fallback', {
      error: err.message,
      action: 'whatsapp.menu.header.fallback'
    })
  }

  return fallback
}

async function handleMenuSelection(conv, input, language) {
  const num = parseInt(input)
  if (isNaN(num) || num < 1 || num > 6) {
    return { message: await generateMenuMessage(conv, language), nextStage: 'menu' }
  }

  const stages = ['insurance_flow', 'pmkisan_flow', 'weather_flow', 'scheme_flow', 'profile_view', 'officer_connect']

  const targetStage = stages[num - 1] || 'menu'

  if (targetStage === 'officer_connect') {
    return await handleOfficerConnect(conv, input, language)
  }

  if (targetStage === 'profile_view') {
    return await handleProfileView(conv, input, language)
  }

  const message = await generateStageIntro(targetStage, conv, language)
  return { message: `${message}\n\n${getMenuFollowup(language)}`, nextStage: 'menu' }
}

async function generateStageIntro(stage, conv, language) {
  try {
    // Try dynamic generation with Grok based on stage and farmer context
    const stageDescriptions = {
      insurance_flow: 'crop insurance (PMFBY) information and how to apply',
      pmkisan_flow: 'PM-KISAN scheme benefits and how to enroll',
      weather_flow: 'weather forecast and farming recommendations',
      scheme_flow: 'government schemes and loans available for farmers'
    };

    const systemPrompt = language === 'gu'
      ? `You are KhedutMitra, a Gujarati-speaking agricultural advisor. Generate helpful, specific advice about ${stageDescriptions[stage] || stage} for a farmer. Keep it under 150 chars. Be practical and actionable. NO MARKDOWN.`
      : `Generate helpful advice about ${stageDescriptions[stage] || stage} in ${language}. Keep under 150 chars. Be practical and specific. NO MARKDOWN.`;

    const userPrompt = `Farmer grows ${conv.primary_crop || 'crops'}, in ${conv.district || 'rural area'}. Provide specific ${stageDescriptions[stage] || 'advice'} for their situation.`;

    const grokResponse = await callGrok(systemPrompt, userPrompt, 250);
    if (grokResponse) return grokResponse;
  } catch (err) {
    logger.warn('Grok stage intro failed', { stage, error: err.message });
  }

  // Fallback to fixed templates
  if (language === 'gu') {
    if (stage === 'insurance_flow') {
      return `વીમા સેવા (PMFBY):\n• પ્રીમિયમ: રૂ. 680+\n• જરૂર: આધાર, 7/12, બેંક\n• આવેદન કરો શાખા/CSC.`;
    }
    if (stage === 'pmkisan_flow') {
      return `PM-KISAN:\n• રૂ. 2000 હપ્તો\n• eKYC બેંક ચકાસો\n• હેલ્પલાઇન: 155261.`;
    }
    if (stage === 'weather_flow') {
      const crop = conv.primary_crop || 'આપનો પાક';
      return `હવામાન - ${crop}:\n• આગામી સપ્તાહ ઓછો વરસાદ\n• સિંચાઈ યોજના બદલો\n• મલ્ચિંગ અપનાવો.`;
    }
    if (stage === 'scheme_flow') {
      return `સરકારી યોજનાઓ:\n• KCC: ઓછી વ્યાજે લોન\n• Soil Card: જમીન પરીક્ષણ\n• PM-KISAN: સીધો લાભ.`;
    }
    return `સેવા માટે કૃપા આધાર અને બેંક તૈયાર કરો.`;
  }

  const fallback = {
    insurance_flow: 'Crop insurance info: Visit your bank branch with Aadhaar, land record, and passbook.',
    pmkisan_flow: 'PM-KISAN: Check your eKYC. Installment helpline: 155261.',
    weather_flow: `Weather forecast for ${conv.primary_crop}: Low rainfall expected. Adjust irrigation.`,
    scheme_flow: 'Government schemes: KCC loans, Soil Health Card, PM-KISAN available.'
  }
  return fallback[stage] || getMenuMessage(language)
}

async function handleInsuranceFlow(conv, input, language) {
  return {
    message: getMenuMessage(language),
    nextStage: 'menu'
  }
}

async function handlePmKisanFlow(conv, input, language) {
  return { message: getMenuMessage(language), nextStage: 'menu' }
}

async function handleWeatherFlow(conv, input, language) {
  return { message: getMenuMessage(language), nextStage: 'menu' }
}

async function handleSchemeFlow(conv, input, language) {
  return { message: getMenuMessage(language), nextStage: 'menu' }
}

async function handleProfileView(conv, input, language) {
  // Fetch farmer profile and display key info
  const farmerRes = await pool.query(
    `SELECT name, phone, soil_type, district, village, land_size, annual_income
     FROM farmers WHERE id = $1`,
    [conv.farmer_id]
  )
  const farmer = farmerRes.rows[0]
  if (!farmer) {
    return { message: getProfileNotFoundMsg(language), nextStage: 'menu' }
  }

  const profileMsg = await formatProfileMessage(farmer, language)
  return { message: `${profileMsg}\n\n${getMenuFollowup(language)}`, nextStage: 'menu' }
}

async function formatProfileMessage(farmer, language) {
  try {
    const systemPrompt = `You are KhedutMitra. Summarize farmer profile in ${getLanguageName(language)} with clean WhatsApp formatting. Use 5-7 short lines. Plain text only, no markdown symbols.`
    const userPrompt = `Name: ${farmer.name}\nDistrict: ${farmer.district}\nVillage: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil: ${farmer.soil_type || 'N/A'}\nIncome: INR ${farmer.annual_income || 'N/A'}`
    const summary = await callGrok(systemPrompt, userPrompt, 220)
    if (summary && summary.trim()) {
      return summary.trim()
    }
  } catch (err) {
    logger.warn('Dynamic profile summary failed, using fallback', {
      error: err.message,
      action: 'whatsapp.profile.summary.fallback'
    })
  }

  if (language === 'gu') {
    return `આપનું પ્રોફાઇલ\nનામ: ${farmer.name}\nજીલ્લો: ${farmer.district}\nગામ: ${farmer.village || 'N/A'}\nભૂમિ વિસ્તાર: ${farmer.land_size || 'N/A'} એકર\nમાટીનો પ્રકાર: ${farmer.soil_type || 'N/A'}\nવાર્ષિક આવક: ₹${farmer.annual_income || 'N/A'}`
  }
  if (language === 'hi') {
    return `आपकी प्रोफाइल\nनाम: ${farmer.name}\nजिला: ${farmer.district}\nगांव: ${farmer.village || 'N/A'}\nभूमि क्षेत्र: ${farmer.land_size || 'N/A'} एकड़\nमिट्टी का प्रकार: ${farmer.soil_type || 'N/A'}\nवार्षिक आय: ₹${farmer.annual_income || 'N/A'}`
  }
  if (language === 'hinglish') {
    return `Aapki Profile\nNaam: ${farmer.name}\nDistrict: ${farmer.district}\nGaon: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil Type: ${farmer.soil_type || 'N/A'}\nIncome: ₹${farmer.annual_income || 'N/A'}`
  }
  return `Your Profile\nName: ${farmer.name}\nDistrict: ${farmer.district}\nVillage: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil: ${farmer.soil_type || 'N/A'}\nIncome: ₹${farmer.annual_income || 'N/A'}`
}

async function handleOfficerConnect(conv, input, language) {
  // Log officer contact request
  await pool.query(
    `INSERT INTO alerts (id, farmer_id, message, reason, risk_level, status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uuidv4(), conv.farmer_id, 'Officer callback requested via WhatsApp', 
     'Farmer requested officer callback', 'high', 'pending']
  )
  return {
    message: getOfficerConfirmation(language),
    nextStage: 'done'
  }
}

/**
 * ─── LANGUAGE HELPERS ─────────────────────────────────────────────────────────
 */

function getLanguageName(code) {
  return { gu: 'Gujarati', hi: 'Hindi', en: 'English', hinglish: 'Hinglish' }[code] || 'Gujarati'
}

function getDaysUntil(dateStr) {
  if (!dateStr) return 'soon'
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? `${diff}` : 'already expired'
}

function getMenuOption(type, lang) {
  const opts = {
    insurance: { gu: 'પાક વીમા માર્ગદર્શન', hi: 'Fasal Bima', en: 'Crop insurance guidance', hinglish: 'Fasal Bima' },
    pmkisan: { gu: 'PM-KISAN', hi: 'PM-KISAN', en: 'PM-KISAN', hinglish: 'PM-KISAN' },
    weather: { gu: 'હવામાન અને પાક સલાહ', hi: 'Mausam Jankari', en: 'Weather and crop advice', hinglish: 'Mausam Info' },
    scheme: { gu: 'સરકારી યોજનાઓ', hi: 'Sarkari Yojana', en: 'Government schemes', hinglish: 'Govt Scheme' },
    profile: { gu: 'મારી પ્રોફાઇલ જુઓ', hi: 'Meri Profile Dekho', en: 'View my profile', hinglish: 'Meri profile dekho' },
    officer: { gu: 'અધિકારી સાથે વાત', hi: 'Officer Se Baat', en: 'Talk to officer', hinglish: 'Officer Se Baat' },
  }
  return opts[type]?.[lang] || opts[type]?.en || type
}

function getMenuHeader(lang) {
  return {
    gu: 'નમસ્તે! કઈ સેવા જોઈએ? કૃપા કરીને નંબર લખો:',
    hi: 'नमस्ते! किस सेवा में मदद चाहिए? कृपया नंबर लिखें:',
    en: 'What do you need help with? Type a number:',
    hinglish: 'Namaste! Kis service mein help chahiye? Number type karo:'
  }[lang] || 'Type a number:'
}

function getMenuMessage(lang) {
  return {
    gu: `કૃપા કરીને 1 થી 6 માંથી કોઈ એક નંબર લખો.\n\n${getMenuFollowup('gu')}\n${getLanguageChangeHelp('gu')}`,
    hi: `कृपया 1 से 6 में से कोई एक नंबर लिखें।\n\n${getMenuFollowup('hi')}\n${getLanguageChangeHelp('hi')}`,
    en: `Anything else? Type menu to see options again.\n${getLanguageChangeHelp('en')}`,
    hinglish: `1 se 6 tak koi number type karo.\n\n${getMenuFollowup('hinglish')}\n${getLanguageChangeHelp('hinglish')}`
  }[lang] || 'Type menu for options.'
}

function getMenuFollowup(lang) {
  return {
    gu: 'બીજી સેવા માટે MENU અથવા 0 લખો.',
    hi: 'दूसरी सेवा के लिए MENU या 0 लिखें।',
    en: 'Type MENU or 0 for more services.',
    hinglish: 'Aur service ke liye MENU ya 0 type karo.'
  }[lang] || 'Type MENU for more services.'
}

function getLanguageChangeHelp(lang) {
  return {
    gu: 'ભાષા બદલવા GU / HI / EN લખો.',
    hi: 'भाषा बदलने के लिए GU / HI / EN लिखें।',
    en: 'To change language, type GU / HI / EN.',
    hinglish: 'Language change karne ke liye GU / HI / EN type karo.'
  }[lang] || 'To change language, type GU / HI / EN.'
}

function getMenuLabel(lang) {
  return {
    gu: 'મુખ્ય મેનુ',
    hi: 'Main Menu',
    en: 'Main menu',
    hinglish: 'Main menu'
  }[lang] || 'Main menu'
}

function getLanguageSwitchConfirmation(lang) {
  return {
    gu: 'બરાબર. હવે આપણે ગુજરાતી માં વાત કરીએ. સેવા માટે નંબર લખો.',
    hi: 'ठीक है। अब हम हिंदी में बात करेंगे। सेवा के लिए नंबर लिखें।',
    en: 'Got it. Switching to English.',
    hinglish: 'Thik hai. Ab language update ho gayi. Service ke liye number type karo.'
  }[lang] || 'Language updated.'
}

function getProfileNotFoundMsg(lang) {
  return {
    gu: 'માફ કરજો, આપનું પ્રોફાઇલ લોડ કરી શકાયું નહीં.',
    hi: 'खेद है, प्रोफाइल लोड नहीं हो सकी।',
    en: 'Sorry, could not load profile.',
    hinglish: 'Maafi chahta hoon, profile load nahi ho saka.'
  }[lang] || 'Could not load profile.'
}

function getOfficerConfirmation(lang) {
  return {
    gu: 'તમારી વિનંતી નોંધાઈ ગઈ છે. અધિકારી 2 કલાકમાં ફોન કરશે. સમય: સોમ-શનિ, સવારે 9 થી સાંજે 5.',
    hi: '2 Ghante Mein Officer Call Karega. Office: Somvar-Shanivar 9am-5pm',
    en: 'Officer will call you within 2 hours. Office: Mon-Sat 9am-5pm.',
    hinglish: '2 ghante mein officer call karega. Office: Mon-Sat 9am-5pm'
  }[lang] || 'Officer will contact you soon.'
}

function getNoSessionMessage() {
  return 'Hello! Please ask your bank to send you a KhedutMitra WhatsApp message to start. | Namaste! Bank se kahen KhedutMitra WhatsApp send kare.'
}

module.exports = {
  initiateBot,
  handleInboundMessage,
  sendMessage,
  getOrCreateConversation,
  saveMessage,
  updateStage
}
