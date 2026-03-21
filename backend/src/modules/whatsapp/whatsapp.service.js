const twilio = require('twilio')
const { v4: uuidv4 } = require('uuid')
const { pool } = require('../../config/db')
const claudeClient = require('../../utils/claudeClient')
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
  if (language === 'gu') {
    const count = alerts.length
    const crop = farmer.primary_crop || 'તમારો પાક'
    let msg = `નમસ્તે ${farmer.name}ભાઈ/બેન. હું KhedutMitra સહાયક છું.\nતમારા ${crop} અને કૃષિ-નાણાકીય બાબતો માટે ${count} મહત્વપૂર્ણ અપડેટ્સ છે.`
    if (count > 0) {
      msg += `\n\n📌 *આપનાં અલર્ટ્સ:*\n`
      alerts.slice(0, 3).forEach((alert, i) => {
        msg += `${i + 1}. ${alert.message || alert.reason}\n`
      })
      if (count > 3) msg += `... અને ${count - 3} વધુ અલર્ટ્સ`
    }
    msg += `\nકૃપા કરીને 1 લખીને સેવા મેનુ જુઓ.`
    return msg
  }

  const alertCount = alerts.length
  const alertTypes = alerts.map(a => a.alert_type).join(', ')

  const systemPrompt = `You are KhedutMitra, a helpful rural financial advisor bot 
for ${farmer.name}. Generate a warm, simple WhatsApp message in ${getLanguageName(language)}. 
Keep it under 200 characters. Use simple words a farmer can understand. Use 1-2 relevant emojis. 
NO MARKDOWN — plain text only.`

  const userPrompt = `Farmer: ${farmer.name}, Crop: ${farmer.primary_crop}, 
District: ${farmer.district}. They have ${alertCount} pending alerts: ${alertTypes}.
Generate a greeting message introducing KhedutMitra and saying you have important updates.
End with "Reply 1 to see updates" or equivalent in their language. Keep under 200 chars.`

  try {
    return await claudeClient.callClaude(systemPrompt, userPrompt, 300)
  } catch (err) {
    // Fallback message if Claude fails
    const fallbackMsg = {
      gu: 'નમસ્તે! આ KhedutMitra છે. તમારા માટે મહત્વપૂર્ણ અપડેટ્સ છે. જવાબ આપો 1',
      hi: 'नमस्ते! यह KhedutMitra है। आपके लिए महत्वपूर्ण अपडेट हैं। जवाब दें 1',
      en: 'Hello! This is KhedutMitra. We have important updates for you. Reply 1 to continue.',
      hinglish: 'Namaste! Ye KhedutMitra hai. Aapke liye important updates hain. 1 type karo.'
    }
    return fallbackMsg[language] || fallbackMsg.en
  }
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
  const header = getMenuHeader(language)
  return `${header}\n\n${numbered}\n\n0. ${getMenuLabel(language)}\n${getLanguageChangeHelp(language)}`
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
  if (language === 'gu') {
    if (stage === 'insurance_flow') {
      return `વીમા સેવા (PMFBY):\n• અંદાજિત પ્રીમિયમ: રૂ. 680 થી શરૂ\n• જરૂરી દસ્તાવેજ: આધાર, 7/12, બેંક પાસબુક\n• અંતિમ તારીખ પહેલાં નજીકની શાખા/CSC ખાતે અરજી કરો.`
    }
    if (stage === 'pmkisan_flow') {
      return `PM-KISAN માર્ગદર્શન:\n• હપ્તો: રૂ. 2000\n• eKYC અને બેંક એકાઉન્ટ ચકાસો\n• મદદ માટે હેલ્પલાઇન: 155261\n• CSC અથવા બેંકમાં અરજી સ્થિતિ તપાસો.`
    }
    if (stage === 'weather_flow') {
      const crop = conv.primary_crop || 'તમારો પાક'
      return `હવામાન સલાહ (${crop}):\n• આગામી 14 દિવસ વરસાદ ઓછો રહેવાની શક્યતા\n• સિંચાઈનું સમયપત્રક બદલો\n• ભેજ જળવાય તે માટે મલ્ચિંગ/માટી આવરણ અપનાવો.`
    }
    if (stage === 'scheme_flow') {
      return `સરકારી યોજના સેવા:\n• KCC: ઓછી વ્યાજે કૃષિ લોન\n• Soil Health Card: જમીન ટેસ્ટ અને યોગ્ય ખાતર સલાહ\n• PM-KISAN: સીધી લાભ રકમ\n• દસ્તાવેજ સાથે શાખામાં આવો.`
    }
    return 'તમારી વિનંતી નોંધાઈ ગઈ છે.'
  }

  const fallback = {
    insurance_flow: 'Crop insurance (PMFBY): Keep Aadhaar, land record and passbook ready. Visit branch/CSC before last date.',
    pmkisan_flow: 'PM-KISAN: Check eKYC and bank details. Installment support helpline: 155261.',
    weather_flow: `Weather alert for ${conv.primary_crop || 'your crop'}: low rainfall risk. Adjust irrigation and protect soil moisture.`,
    scheme_flow: 'Eligible schemes: KCC, Soil Health Card, PM-KISAN. Visit branch with documents for quick support.'
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
    `SELECT name, phone, primary_crop, soil_type, irrigation_type, land_area_acres, 
            annual_income_inr, has_crop_insurance, family_size, district, taluka
     FROM farmers WHERE id = $1`,
    [conv.farmer_id]
  )
  const farmer = farmerRes.rows[0]
  if (!farmer) {
    return { message: getProfileNotFoundMsg(language), nextStage: 'menu' }
  }

  const profileMsg = formatProfileMessage(farmer, language)
  return { message: `${profileMsg}\n\n${getMenuFollowup(language)}`, nextStage: 'menu' }
}

function formatProfileMessage(farmer, language) {
  if (language === 'gu') {
    return `📋 *આપનું પ્રોફાઇલ*\n\nનામ: ${farmer.name}\nમુખ્ય પાક: ${farmer.primary_crop || 'N/A'}\nભૂમି વિસ્તાર: ${farmer.land_area_acres || 'N/A'} એકર\nમણાર પ્રકાર: ${farmer.irrigation_type || 'N/A'}\nજીલ્લો: ${farmer.district}\nતાલુકો: ${farmer.taluka}\nપરિવાર કદ: ${farmer.family_size || 'N/A'}`
  }
  if (language === 'hi') {
    return `📋 *आपकी प्रोफाइल*\n\nनाम: ${farmer.name}\nप्रमुख फसल: ${farmer.primary_crop || 'N/A'}\nभूमि क्षेत्र: ${farmer.land_area_acres || 'N/A'} एकड़\nसिंचाई: ${farmer.irrigation_type || 'N/A'}\nजिला: ${farmer.district}\nतालुका: ${farmer.taluka}\nपरिवार का आकार: ${farmer.family_size || 'N/A'}`
  }
  return `📋 *Your Profile*\n\nName: ${farmer.name}\nCrop: ${farmer.primary_crop || 'N/A'}\nLand: ${farmer.land_area_acres || 'N/A'} acres\nIrrigation: ${farmer.irrigation_type || 'N/A'}\nDistrict: ${farmer.district}\nTaluka: ${farmer.taluka}\nFamily: ${farmer.family_size || 'N/A'}`
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
    gu: 'નમસ્તે! કઈ સેવા જોઈએ? નંબર લખો:',
    hi: 'Kis Bare Mein Madad Chahiye? Number Type Karo:',
    en: 'What do you need help with? Type a number:',
    hinglish: 'Kisme help chahiye? Number type karo:'
  }[lang] || 'Type a number:'
}

function getMenuMessage(lang) {
  return {
    gu: `મહેરબાની કરીને 1 થી 5 માંથી કોઈ એક નંબર લખો.\n\n${getMenuFollowup('gu')}\n${getLanguageChangeHelp('gu')}`,
    hi: `Aur Koi Madad? Upar Menu Fir Se Type Karo.\n${getLanguageChangeHelp('hi')}`,
    en: `Anything else? Type menu to see options again.\n${getLanguageChangeHelp('en')}`,
    hinglish: `Kuch aur? Menu type karo dobara.\n${getLanguageChangeHelp('hinglish')}`
  }[lang] || 'Type menu for options.'
}

function getMenuFollowup(lang) {
  return {
    gu: 'બીજી સેવા માટે MENU અથવા 0 લખો.',
    hi: 'Dusri seva ke liye MENU ya 0 type karein.',
    en: 'Type MENU or 0 for more services.',
    hinglish: 'Aur service ke liye MENU ya 0 type karo.'
  }[lang] || 'Type MENU for more services.'
}

function getLanguageChangeHelp(lang) {
  return {
    gu: 'ભાષા બદલવા માટે GU / HI / EN લખો.',
    hi: 'Bhasha badalne ke liye GU / HI / EN type karein.',
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
    gu: 'બરાબર. હવે આપણે ગુજરાતી માં વાત કરીએ.',
    hi: 'Thik Hai. Ab Hindi Mein Baat Karenge.',
    en: 'Got it. Switching to English.',
    hinglish: 'Thik hai. Ab English mein baat karenge.'
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
