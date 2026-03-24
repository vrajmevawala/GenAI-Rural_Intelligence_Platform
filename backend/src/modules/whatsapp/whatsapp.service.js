const twilio = require('twilio')
const { v4: uuidv4 } = require('uuid')
const { pool } = require('../../config/db')
const { callGroq } = require('../../utils/groqClient')
const claudeClient = require('../../utils/claudeClient')
const { generateAlert } = require('../../utils/alertGenerator')
const { ALERT_TYPES } = require('../../utils/alertTypes')
const { detectIntent, INTENTS } = require('./whatsapp.intent')
const { getWeather, fetchWeatherForDistrict } = require('../weather/weather.service')
const schemesService = require('../schemes/schemes.service')
const { AppError } = require('../../middleware/errorHandler')
const logger = require('../../utils/logger')
const { handleFreeText } = require('./whatsapp.freetext.service')
const { ruleBasedClassify, extractCropFromMessage } = require('./whatsapp.rules')
const { handleFinancialFlow } = require('./whatsapp.financial.service')

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
async function sendMessage(toPhone, body, options = {}) {
  const mediaUrl = options?.mediaUrl || null

  if (!toPhone || (!body && !mediaUrl)) {
    throw new AppError('Phone and message body or media URL required', 400, 'INVALID_INPUT')
  }

  try {
    const payload = {
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${toPhone}`
    }

    if (body) payload.body = body
    if (mediaUrl) payload.mediaUrl = [mediaUrl]

    const message = await client.messages.create(payload)
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
  // Normalize phone to E.164 format for consistent storage and lookup
  const normalizedPhone = normalizePhoneNumber(phone)
  
  // Check for existing active non-expired session
  const existing = await pool.query(
    `SELECT * FROM whatsapp_conversations 
     WHERE farmer_id = $1 AND organization_id = $2 AND is_active = true 
     AND session_expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [farmerId, organizationId]
  )
  if (existing.rows.length > 0) return existing.rows[0]

  // Create new conversation session with normalized phone
  const result = await pool.query(
    `INSERT INTO whatsapp_conversations 
     (id, farmer_id, organization_id, phone_number, language, current_stage)
     VALUES ($1, $2, $3, $4, $5, 'welcome')
     RETURNING *`,
    [uuidv4(), farmerId, organizationId, normalizedPhone, language]
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

async function saveContext(conversationId, contextData = {}) {
  await pool.query(
    `UPDATE whatsapp_conversations
     SET context = context || $1::jsonb,
         updated_at = NOW(),
         session_expires_at = NOW() + INTERVAL '24 hours'
     WHERE id = $2`,
    [JSON.stringify(contextData), conversationId]
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

  // 5. Send via Twilio (normalize phone to E.164 format)
  const normalizedPhone = normalizePhoneNumber(farmer.phone)
  const sid = await sendMessage(normalizedPhone, welcomeMsg)

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
async function handleInboundMessage(fromPhone, body, mediaUrl = null) {
  try {
    // Strip whatsapp: prefix and normalize to E.164 format
    const cleanPhone = normalizePhoneNumber(fromPhone.replace('whatsapp:', ''))
    const inboundBody = String(body || '').trim()
    logger.info('WhatsApp inbound message', {
      from: cleanPhone,
      body: inboundBody.substring(0, 80),
      hasMedia: Boolean(mediaUrl),
      action: 'whatsapp.inbound'
    })

    // Find active conversation for this phone
    const convResult = await pool.query(
      `SELECT wc.*,
              f.name AS farmer_name,
              f.language AS preferred_language,
              f.phone,
              f.district,
              f.village,
              f.land_size,
              f.annual_income,
              to_jsonb(f)->>'soil_type' AS soil_type,
              to_jsonb(f)->>'water_source' AS water_source,
              to_jsonb(f)->>'loan_type' AS loan_type,
              (to_jsonb(f)->>'loan_due_date')::timestamp AS loan_due_date,
              COALESCE((to_jsonb(f)->>'has_crop_insurance')::boolean, false) AS has_crop_insurance,
              (to_jsonb(f)->>'insurance_expiry_date')::timestamp AS insurance_expiry_date,
              COALESCE((to_jsonb(f)->>'pm_kisan_enrolled')::boolean, false) AS pm_kisan_enrolled,
              (
                SELECT c.name
                FROM farmer_crops fc
                JOIN crops c ON c.id = fc.crop_id
                WHERE fc.farmer_id = f.id
                ORDER BY fc.created_at DESC
                LIMIT 1
              ) AS primary_crop,
              (
                SELECT fr.score
                FROM fvi_records fr
                WHERE fr.farmer_id = f.id
                ORDER BY fr.created_at DESC
                LIMIT 1
              ) AS vulnerability_score,
              (
                SELECT fr.risk_level
                FROM fvi_records fr
                WHERE fr.farmer_id = f.id
                ORDER BY fr.created_at DESC
                LIMIT 1
              ) AS vulnerability_label
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
      logger.info('No active WhatsApp conversation', { phone: cleanPhone })

      // Allow farmers to self-start by sending greeting/help keywords.
      if (isSelfStartMessage(inboundBody)) {
        const farmer = await findFarmerByPhone(cleanPhone)
        if (farmer) {
          const language = farmer.preferred_language || farmer.language || 'gu'
          const conv = await getOrCreateConversation(
            farmer.id,
            farmer.organization_id,
            cleanPhone,
            language
          )

          await saveMessage(conv.id, 'inbound', inboundBody)
          await updateStage(conv.id, 'menu', { started_by_farmer: true, trigger: inboundBody })

          const convForMenu = {
            ...conv,
            farmer_name: farmer.name,
            district: farmer.district,
            village: farmer.village,
            primary_crop: farmer.primary_crop,
            language
          }
          const reply = `${getSelfStartWelcomeMessage(language, farmer.name)}\n\n${await generateMenuMessage(convForMenu, language)}`
          const sid = await sendMessage(cleanPhone, reply)
          await saveMessage(conv.id, 'outbound', reply, sid)

          return {
            handled: true,
            conversationId: conv.id,
            nextStage: 'menu',
            startedByFarmer: true
          }
        } else {
          // Farmer not found in DB, but sent a greeting. Show menu and ask to register.
          logger.info('Self-start message from unregistered phone', { phone: cleanPhone })
          const language = 'gu' // Default language for unknown farmers
          const reply = await getUnregisteredFarmerWelcome(language)
          const sid = await sendMessage(cleanPhone, reply)

          return {
            handled: true,
            conversationId: null,
            nextStage: null,
            message: 'Unregistered farmer shown welcome message'
          }
        }
      }

      const noSessionMsg = getNoSessionMessage()
      await sendMessage(cleanPhone, noSessionMsg)
      return { handled: false, message: 'No active session' }
    }

    const conv = convResult.rows[0]
    logger.info('Found active conversation', { conversationId: conv.id, stage: conv.current_stage })

    // Save inbound message
    await saveMessage(conv.id, 'inbound', inboundBody || '[image]')

    // Media messages are processed before text intent detection.
    if (mediaUrl) {
      const reply = await handleCropDiseaseImage(conv, mediaUrl)
      const sid = await sendMessage(cleanPhone, reply)
      await saveMessage(conv.id, 'outbound', reply, sid)
      return { handled: true, conversationId: conv.id, nextStage: conv.current_stage }
    }

    // Stage-aware intent detection
    // In financial_flow: numeric input 0-10 should be treated as question selection, not menu
    let intent
    let detectedSource = 'unknown'
    
    if (conv.current_stage === 'financial_flow') {
      const numInput = parseInt(String(inboundBody || '').trim());
      if (!isNaN(numInput) && numInput >= 0 && numInput <= 10) {
        // In financial flow, numeric input is a financial question selection
        if (numInput === 0) {
          intent = INTENTS.MENU; // 0 goes back to main menu
        } else {
          intent = INTENTS.FINANCIAL; // 1-10 are financial questions
        }
        detectedSource = 'financial_question_selection';
      } else {
        // Non-numeric input in financial flow - detect normally
        const detected = await detectIntent(inboundBody, conv.language, conv.current_stage);
        intent = detected.intent;
        detectedSource = detected.source || 'detection';
      }
    } else {
      // In other stages: check menu intent first, then fall back to detection
      const menuIntent = resolveMenuSelectionIntent(inboundBody);
      if (menuIntent) {
        intent = menuIntent;
        detectedSource = 'menu_text';
      } else {
        const detected = await detectIntent(inboundBody, conv.language, conv.current_stage);
        intent = detected.intent;
        detectedSource = detected.source || 'detection';
      }
    }

    if (String(intent || '').startsWith('lang_')) {
      const langMap = {
        [INTENTS.LANGUAGE_GU]: 'gu',
        [INTENTS.LANGUAGE_HI]: 'hi',
        [INTENTS.LANGUAGE_EN]: 'en',
        [INTENTS.LANGUAGE_HINGLISH]: 'hinglish'
      }
      const newLang = langMap[intent] || 'gu'
      await pool.query(
        'UPDATE whatsapp_conversations SET language = $1, updated_at = NOW() WHERE id = $2',
        [newLang, conv.id]
      )
      const confirmMsg = getLanguageSwitchConfirmation(newLang)
      const sid = await sendMessage(cleanPhone, confirmMsg)
      await saveMessage(conv.id, 'outbound', confirmMsg, sid)
      await saveContext(conv.id, { last_intent: intent, language_switched_to: newLang })
      return { handled: true, conversationId: conv.id, nextStage: conv.current_stage }
    }

    let replyText
    let nextStage = conv.current_stage

    switch (intent) {
      case INTENTS.INSURANCE:
        replyText = await handleInsuranceFlow(conv, inboundBody, conv.language)
        nextStage = 'insurance_flow'
        break
      case INTENTS.PMKISAN:
        replyText = await handlePmKisanFlow(conv, inboundBody, conv.language)
        nextStage = 'pmkisan_flow'
        break
      case INTENTS.WEATHER:
        replyText = await handleWeatherFlow(conv, inboundBody, conv.language)
        nextStage = 'weather_flow'
        break
      case INTENTS.SCHEME:
        replyText = await handleSchemeFlow(conv, inboundBody, conv.language)
        nextStage = 'scheme_flow'
        break
      case INTENTS.PROFILE:
        replyText = await handleProfileView(conv, inboundBody, conv.language)
        break
      case INTENTS.OFFICER:
        replyText = await handleOfficerConnect(conv, inboundBody, conv.language)
        nextStage = 'officer_connect'
        break
      case INTENTS.FINANCIAL:
        // If coming from menu stage, show financial menu first (pass null)
        // If already in financial_flow stage, process the question number
        const isFromMenuStage = conv.current_stage === 'menu'
        const financialInput = isFromMenuStage ? null : inboundBody
        const financialResult = await handleFinancialFlow(conv, financialInput, conv.language)
        replyText = financialResult.message
        nextStage = 'financial_flow'
        break
      case INTENTS.MENU:
        replyText = await generateMenuMessage(conv, conv.language)
        nextStage = 'menu'
        break
      case INTENTS.YES:
        replyText = await handleYesResponse(conv)
        break
      case INTENTS.NO:
        replyText = await generateMenuMessage(conv, conv.language)
        nextStage = 'menu'
        break
      case INTENTS.STOP:
        await closeConversation(conv.id, inboundBody)
        replyText = getStopConfirmation(conv.language)
        nextStage = 'done'
        break
      case INTENTS.OTHER:
      default:
        replyText = await handleSmartFallback(conv, inboundBody)
        break
    }

    if (intent !== INTENTS.STOP && nextStage && nextStage !== conv.current_stage) {
      await updateStage(conv.id, nextStage)
    }

    await saveContext(conv.id, {
      last_intent: intent,
      last_intent_source: detectedSource,
      last_user_message: inboundBody,
      last_stage: nextStage
    })

    if (typeof replyText === 'object' && replyText?.message) {
      replyText = replyText.message
    }
    
    if (!replyText || typeof replyText !== 'string') {
      logger.warn('Handler returned invalid reply, using fallback', {
        conversationId: conv.id,
        intent,
        replyType: typeof replyText,
        replyValue: replyText
      })
      replyText = getGenericFailureReply(conv.language || 'en')
    }

    const sid = await sendMessage(cleanPhone, replyText)
    await saveMessage(conv.id, 'outbound', replyText, sid)

    return { handled: true, conversationId: conv.id, nextStage }
  } catch (err) {
    logger.error('Error handling WhatsApp inbound message', {
      error: err.message,
      from: fromPhone,
      body: String(body || '').substring(0, 50)
    })

    // Never leave farmer without a reply, even on internal failures.
    try {
      const fallbackPhone = normalizePhoneNumber(String(fromPhone || '').replace('whatsapp:', ''))
      if (fallbackPhone) {
        await sendMessage(fallbackPhone, getGenericFailureReply('en'))
      }
    } catch (sendErr) {
      logger.error('Failed to send fallback WhatsApp reply', {
        error: sendErr.message,
        from: fromPhone
      })
    }

    return { handled: true, conversationId: null, nextStage: null, recovered: true }
  }
}

/**
 * ─── MESSAGE GENERATION FUNCTIONS ────────────────────────────────────────────
 */

async function getConversationHistory(conversationId, limit = 8) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 8, 1), 8)
  const result = await pool.query(
    `SELECT direction, body, created_at
     FROM whatsapp_messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [conversationId, cappedLimit]
  )

  return result.rows
    .reverse()
    .map((m) => `${m.direction === 'inbound' ? 'Farmer' : 'Bot'}: ${m.body}`)
    .join('\n')
}

async function buildContextualPrompt(conv, userMessage) {
  const history = await getConversationHistory(conv.id, 8)
  const farmerContext = buildFarmerContext(conv)

  return `CONVERSATION HISTORY:\n${history}\n\nFARMER PROFILE:\n${farmerContext}\n\nCURRENT MESSAGE: ${userMessage}`
}

function buildFarmerContext(conv) {
  const lines = [
    `Name: ${conv.farmer_name || 'Farmer'}`,
    `Crop: ${conv.primary_crop || 'N/A'}`,
    `District: ${conv.district || 'N/A'}, ${conv.village || 'N/A'}`,
    `Vulnerability: ${conv.vulnerability_score || 'N/A'}/100 (${conv.vulnerability_label || 'unknown'})`,
    `Insurance: ${conv.has_crop_insurance ? `Yes, expires ${formatDate(conv.insurance_expiry_date)}` : 'No insurance'}`,
    `PM-KISAN: ${conv.pm_kisan_enrolled ? 'Enrolled' : 'Not enrolled'}`,
    `Loan: ${conv.loan_type || 'None'}`,
    `Language: ${conv.language || 'gu'}`
  ]
  return lines.join('\n')
}

async function handleSmartFallback(conv, userMessage) {
  const lang = conv.language || 'gu'

  // Check if message is a menu number (0-6) — if so, treat as OTHER intent
  if (/^[0-6]$/.test(String(userMessage).trim())) {
    return await generateMenuMessage(conv, lang)
  }

  // It's a free-text query — try Groq first, then Claude as backup
  try {
    const conversationData = {
      farmer_id: conv.farmer_id,
      farmer_name: conv.farmer_name,
      primary_crop: conv.primary_crop,
      district: conv.district,
      village: conv.village,
      soil_type: conv.soil_type || 'loam',
      irrigation_type: conv.irrigation_type || 'flood',
      land_area_acres: conv.land_size || 2,
      vulnerability_score: conv.vulnerability_score || 50,
      vulnerability_label: conv.vulnerability_label || 'medium',
      language: lang
    }

    const reply = await handleFreeText(userMessage, conversationData)
    
    logger.info('Free-text reply generated successfully', {
      farmerId: conv.farmer_id,
      messageLength: reply.length,
      lang,
      source: 'groq'
    })

    return reply
  } catch (groqErr) {
    logger.warn('Groq free-text handler failed, trying Claude backup', {
      error: groqErr.message,
      farmerId: conv.farmer_id
    })

    // BACKUP: Try Claude model
    try {
      const langMap = {
        gu: 'Gujarati',
        hi: 'Hindi',
        en: 'English',
        hinglish: 'Hinglish (Hindi-English mix)'
      }
      const langName = langMap[lang] || 'Gujarati'

      const systemPrompt = `You are KhedutMitra, an expert agricultural advisor helping Indian farmers with practical farming advice.

Farmer Details:
- Name: ${conv.farmer_name}
- Primary Crop: ${conv.primary_crop}
- District: ${conv.district}
- Village: ${conv.village}
- Soil Type: ${conv.soil_type || 'loam'}
- Irrigation: ${conv.irrigation_type || 'flood'}
- Land: ${conv.land_area_acres || 2} acres
- Risk Level: ${conv.vulnerability_label || 'medium'}

You MUST reply ONLY in ${langName}. Keep response under 200 characters. Be specific and actionable. No markdown or formatting.`

      const userPrompt = `Farmer Question: ${userMessage}`

      const reply = await claudeClient.callClaude(systemPrompt, userPrompt, 300)

      if (reply && reply.trim().length > 0) {
        logger.info('Claude backup model generated reply', {
          farmerId: conv.farmer_id,
          messageLength: reply.length,
          lang,
          source: 'claude'
        })
        return reply
      }
    } catch (claudeErr) {
      logger.error('Claude backup model also failed', {
        groqError: groqErr.message,
        claudeError: claudeErr.message,
        farmerId: conv.farmer_id
      })
    }

    // FALLBACK: Generic response in farmer's language (only if both models fail)
    const fallbacks = {
      gu: 'હું સમજ્યો નહિ. 0 ટાઇપ કરો મેનુ માટે અથવા 6 ટાઇપ કરો અધિકારી માટે.',
      hi: 'मुझे समझ नहीं आया। 0 टाइप करें menu के लिए या 6 officer के लिए।',
      en: "I don't understand. Type 0 for menu or 6 for officer.",
      hinglish: 'Samajh nahi aaya. 0 type karo menu ke liye ya 6 officer ke liye.'
    }
    logger.info('Both models failed, using hardcoded fallback', { farmerId: conv.farmer_id, lang })
    return fallbacks[lang] || fallbacks.gu
  }
}

async function handleCropDiseaseImage(conv, imageUrl) {
  const lang = conv.language || 'gu'
  const langName = getLanguageName(lang)
  const toPhone = normalizePhoneNumber(conv.phone_number || conv.phone)

  const prompt = `You are an expert agricultural scientist and crop doctor in India.
Analyze this crop image carefully.
Reply only in ${langName}. Plain text only. No markdown. No asterisks.
Keep total reply under 250 characters.
Format:
Line 1: Disease or problem name with emoji
Line 2: Main cause (short)
Line 3: Treatment step 1
Line 4: Treatment step 2
Line 5: 0 for menu | 6 for officer help
If image is not crop related, ask for a clear crop photo.
If image is unclear, ask for daylight photo.`

  try {
    const analyzingMsg = getAnalyzingMessage(lang)
    await sendMessage(toPhone, analyzingMsg)
    await saveMessage(conv.id, 'outbound', analyzingMsg)

    const diagnosis = await claudeClient.callClaudeWithImage(imageUrl, prompt, lang, 400)

    await saveContext(conv.id, {
      lastImageDiagnosis: diagnosis,
      lastImageTime: new Date().toISOString()
    })

    return diagnosis
  } catch (err) {
    console.error('Image diagnosis failed:', err.message)
    const errorMessages = {
      gu: '❌ ફોટો analyze કરી શક્યા નથી. ફરી try કરો અથવા 6 ટાઇપ કરો officer માટે.',
      hi: '❌ फोटो analyze नहीं हो सका। फिर try करें या 6 टाइप करें officer के लिए।',
      en: '❌ Could not analyze photo. Please try again or type 6 for officer.',
      hinglish: '❌ Photo analyze nahi hua. Dobara try karo ya 6 type karo officer ke liye.'
    }
    return errorMessages[lang] || errorMessages.en
  }
}

function getAnalyzingMessage(lang) {
  const messages = {
    gu: '🔍 તમારા પાકનો ફોટો analyze થઈ રહ્યો છે... 30 સેકંડ રાહ જુઓ.',
    hi: '🔍 आपकी फसल का फोटो analyze हो रहा है... 30 सेकंड रुकें।',
    en: '🔍 Analyzing your crop photo... Please wait 30 seconds.',
    hinglish: '🔍 Tera fasal ka photo analyze ho raha hai... 30 second ruko.'
  }
  return messages[lang] || messages.en
}

async function handleYesResponse(conv) {
  const stage = conv.current_stage
  const lang = conv.language || 'gu'

  switch (stage) {
    case 'insurance_flow':
      return await generateStageIntro('insurance_flow', conv, lang)
    case 'scheme_flow':
      return await generateStageIntro('scheme_flow', conv, lang)
    case 'officer_connect':
      return getOfficerConfirmation(lang)
    default:
      return await generateMenuMessage(conv, lang)
  }
}

async function generateWelcomeMessage(farmer, alerts, language) {
  try {
    // Always use Gujarati by default
    const lang = language === 'gu' ? 'gu' : 'gu'
    const alertContext = alerts.slice(0, 3)
      .map((a, i) => `${i + 1}. ${a.message || a.reason}`)
      .join('\n');

    const systemPrompt = `You are KhedutMitra, a warm and helpful Gujarati-speaking agricultural advisor.
Generate a brief, friendly welcome message for a farmer in Gujarati (ગુજરાતી) ONLY.
Keep it under 120 characters. 
Mention you have important updates.
NO MARKDOWN, NO EMOJIS, NO ENGLISH WORDS.
Write in proper Gujarati script only.`;

    const userPrompt = `Welcome message for farmer ${farmer.name}. Crop: ${farmer.primary_crop}. District: ${farmer.district}. They have ${alerts.length} alerts. Be warm and personalized.`;

    const groqResponse = await callGroq(systemPrompt, userPrompt, 200);

    if (groqResponse) {
      let msg = groqResponse;
      if (alerts.length > 0) {
        msg += `\n\nતમારા અપડેટ્સ:\n${alertContext}`;
      }
      msg += '\n\n0 લખો મુખ્ય મેનુ માટે.';
      return msg;
    }
  } catch (err) {
    logger.warn('Groq welcome generation failed, using default', {
      farmerId: farmer.id,
      error: err.message
    });
  }

  // Fallback to fixed template in Gujarati
  const count = alerts.length;
  const crop = farmer.primary_crop || 'તમારો પાક';
  let msg = `નમસ્તે ${farmer.name}. હું KhedutMitra છું.\nતમારા ${crop} અને બાબતો માટે ${count} અપડેટ્સ છે.`;
  if (count > 0) {
    msg += `\n\nતમારા અપડેટ્સ:\n`;
    alerts.slice(0, 3).forEach((alert, i) => {
      msg += `${i + 1}. ${alert.message || alert.reason}\n`;
    });
    if (count > 3) msg += `... અને ${count - 3} વધુ`;
  }
  msg += `\n\n0 લખો મુખ્ય મેનુ માટے.`;
  return msg
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
  if (['hindi', 'hin', 'hi'].includes(userInput)) {
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
  // Use fixed menu structure instead of dynamic
  const menuContent = getFixedMenuContent(language)
  return menuContent
}

async function generateDynamicMenuOptions(conv, language) {
  // Deprecated: Use getFixedMenuContent instead for consistent menu
  const fallback = [
    getMenuOption('insurance', language),
    getMenuOption('pmkisan', language),
    getMenuOption('weather', language),
    getMenuOption('scheme', language),
    getMenuOption('profile', language),
    getMenuOption('officer', language)
  ]
  return fallback
}

async function generateDynamicMenuHeader(conv, language) {
  // Deprecated: Use getFixedMenuContent instead for consistent menu
  return getMenuHeader(language)
}

async function handleMenuSelection(conv, input, language) {
  const num = parseInt(input)
  if (isNaN(num) || num < 1 || num > 7) {
    return { message: await generateMenuMessage(conv, language), nextStage: 'menu' }
  }

  const stages = ['insurance_flow', 'pmkisan_flow', 'weather_flow', 'scheme_flow', 'profile_view', 'officer_connect', 'financial_flow']

  const targetStage = stages[num - 1] || 'menu'

  if (targetStage === 'officer_connect') {
    return await handleOfficerConnect(conv, input, language)
  }

  if (targetStage === 'profile_view') {
    return await handleProfileView(conv, input, language)
  }

  if (targetStage === 'financial_flow') {
    return await handleFinancialFlow(conv, null, language)
  }

  const message = await generateStageIntro(targetStage, conv, language)
  return { message: `${message}\n\n${getMenuFollowup(language)}`, nextStage: 'menu' }
}

async function generateStageIntro(stage, conv, language) {
  try {
    // Always use Gujarati
    const stageDescriptions = {
      insurance_flow: 'પાક વીમા (PMFBY) માહિતી અને કેવી રીતે અરજ કરવી',
      pmkisan_flow: 'PM-KISAN યોજનાના ફાયદા અને કેવી રીતે નોંધણી કરવી',
      weather_flow: 'આબોહવા પૂર્વાનુમાન અને ખેતી ની ભલામણો',
      scheme_flow: 'સરકારી યોજનાઓ અને લોન જે ખેડૂતો માટે ઉપલબ્ધ છે'
    };

    const systemPrompt = `You are KhedutMitra, a Gujarati-speaking agricultural advisor.
Generate helpful, specific advice about ${stageDescriptions[stage] || stage} for a farmer in Gujarati (ગુજરાતી).
Keep it under 150 characters.
Be practical and actionable.
NO MARKDOWN, NO ENGLISH WORDS EXCEPT PROPER NAMES (PMFBY, PM-KISAN, KCC).
Use ONLY Gujarati script.`;

    const userPrompt = `Farmer grows ${conv.primary_crop || 'પાક'}, in ${conv.district || 'ગુજરાતમાં'}. Provide specific ${stageDescriptions[stage] || 'સલાહ'} for their situation.`;

    const groqResponse = await callGroq(systemPrompt, userPrompt, 250);
    if (groqResponse) return groqResponse;
  } catch (err) {
    logger.warn('Groq stage intro failed', { stage, error: err.message });
  }

  return await generateApiBackedStageIntro(stage, conv, language)
}

async function generateApiBackedStageIntro(stage, conv, language) {
  const profile = await getFarmerSnapshotForFlows(conv)
  const lang = language || conv.language || 'gu'

  if (stage === 'insurance_flow') {
    return buildInsuranceDynamicMessage(profile, lang)
  }

  if (stage === 'pmkisan_flow') {
    return buildPmKisanDynamicMessage(profile, lang)
  }

  if (stage === 'weather_flow') {
    return await buildWeatherDynamicMessage(profile, lang)
  }

  if (stage === 'scheme_flow') {
    return await buildSchemeDynamicMessage(profile, lang)
  }

  return getMenuMessage(lang)
}

async function getFarmerSnapshotForFlows(conv) {
  const result = await pool.query(
    `SELECT f.id,
            f.name,
            f.district,
            f.village,
          to_jsonb(f)->>'state' AS state,
            f.latitude,
            f.longitude,
            to_jsonb(f)->>'loan_type' AS loan_type,
            (to_jsonb(f)->>'loan_due_date')::date AS loan_due_date,
            COALESCE((to_jsonb(f)->>'has_crop_insurance')::boolean, false) AS has_crop_insurance,
            (to_jsonb(f)->>'insurance_expiry_date')::date AS insurance_expiry_date,
            COALESCE((to_jsonb(f)->>'pm_kisan_enrolled')::boolean, false) AS pm_kisan_enrolled,
            (
              SELECT c.name
              FROM farmer_crops fc
              JOIN crops c ON c.id = fc.crop_id
              WHERE fc.farmer_id = f.id
              ORDER BY fc.created_at DESC
              LIMIT 1
            ) AS primary_crop
     FROM farmers f
     WHERE f.id = $1
     LIMIT 1`,
    [conv.farmer_id]
  )

  return result.rows[0] || {
    id: conv.farmer_id,
    name: conv.farmer_name || 'Farmer',
    district: conv.district || null,
    village: conv.village || null,
    state: null,
    latitude: null,
    longitude: null,
    loan_type: conv.loan_type || null,
    loan_due_date: conv.loan_due_date || null,
    has_crop_insurance: conv.has_crop_insurance || false,
    insurance_expiry_date: conv.insurance_expiry_date || null,
    pm_kisan_enrolled: conv.pm_kisan_enrolled || false,
    primary_crop: conv.primary_crop || null
  }
}

function buildInsuranceDynamicMessage(profile, lang) {
  const crop = profile.primary_crop || 'crop'
  const due = profile.insurance_expiry_date ? getDaysUntil(profile.insurance_expiry_date) : null

  if (profile.has_crop_insurance) {
    if (lang === 'gu') {
      return `વીમા સ્થિતિ અપડેટ: ${crop}\nતમારો પાક વીમો active છે. Expiry ${formatDate(profile.insurance_expiry_date)} (અંદાજે ${due} દિવસ).\nRenewal માટે શાખામાં આધાર અને 7/12 લાવો.`
    }
    if (lang === 'hi') {
      return `बीमा अपडेट: ${crop}\nआपका फसल बीमा active है। Expiry ${formatDate(profile.insurance_expiry_date)} (लगभग ${due} दिन)।\nRenewal के लिए आधार और 7/12 के साथ शाखा जाएं।`
    }
    return `Insurance update for ${crop}: your policy is active till ${formatDate(profile.insurance_expiry_date)} (about ${due} days). Keep Aadhaar and land record ready for renewal.`
  }

  if (lang === 'gu') {
    return `વીમા સલાહ: ${crop}\nહાલમાં પાક વીમો નોંધાયેલો નથી. PMFBY માટે આધાર, બેંક પાસબુક અને 7/12 સાથે અરજી કરો.`
  }
  if (lang === 'hi') {
    return `बीमा सलाह: ${crop}\nफिलहाल फसल बीमा दर्ज नहीं है। PMFBY के लिए आधार, बैंक पासबुक और 7/12 के साथ आवेदन करें।`
  }
  return `Insurance advice for ${crop}: no active crop insurance found. Apply under PMFBY with Aadhaar, bank passbook, and land record.`
}

function buildPmKisanDynamicMessage(profile, lang) {
  const district = profile.district || 'your district'

  if (profile.pm_kisan_enrolled) {
    if (lang === 'gu') {
      return `PM-KISAN સ્થિતિ: નોંધાયેલા છો.\n${district} માટે આગામી હપ્તા પહેલાં eKYC અને bank account seed check કરો.\nStatus pmkisan.gov.in પર ચકાસો.`
    }
    if (lang === 'hi') {
      return `PM-KISAN स्थिति: आप enrolled हैं।\n${district} में अगली किस्त से पहले eKYC और bank seed check करें।\nStatus pmkisan.gov.in पर देखें।`
    }
    return `PM-KISAN status: enrolled. Before next installment for ${district}, verify eKYC and bank seeding. Check status on pmkisan.gov.in.`
  }

  if (lang === 'gu') {
    return `PM-KISAN સલાહ: નોંધણી મળતી નથી.\nઆધાર લિંક bank account અને જમીન દસ્તાવેજ સાથે CSC/શાખામાં નોંધણી કરો.`
  }
  if (lang === 'hi') {
    return `PM-KISAN सलाह: enrollment नहीं मिला।\nआधार linked bank account और जमीन दस्तावेज के साथ CSC/शाखा में रजिस्ट्रेशन करें।`
  }
  return 'PM-KISAN advice: enrollment not found. Register at CSC/bank with Aadhaar-linked bank account and land records.'
}

async function buildWeatherDynamicMessage(profile, lang) {
  const district = profile.district
  let weather = null

  if (district) {
    weather = await getWeather(district)
  }

  const isExpired = weather?.valid_until ? new Date(weather.valid_until) < new Date() : true
  if ((!weather || isExpired) && district && profile.latitude && profile.longitude) {
    try {
      weather = await fetchWeatherForDistrict(district, profile.latitude, profile.longitude, profile.state || null)
    } catch (err) {
      logger.warn('Weather API fetch failed for WhatsApp flow', {
        district,
        farmerId: profile.id,
        error: err.message
      })
    }
  }

  const crop = profile.primary_crop || 'crop'
  if (!weather) {
    if (lang === 'gu') {
      return `હવામાન અપડેટ હાલ મળ્યું નથી. ${crop} માટે સિંચાઈ હળવી રાખો અને કીટ નિયંત્રણ પર ધ્યાન આપો.`
    }
    if (lang === 'hi') {
      return `मौसम अपडेट अभी उपलब्ध नहीं है। ${crop} के लिए सिंचाई संतुलित रखें और कीट नियंत्रण पर ध्यान दें।`
    }
    return `Weather data is not available right now. For ${crop}, keep irrigation balanced and monitor pest activity.`
  }

  const temp = Number(weather.temperature || 0).toFixed(1)
  const rain = Number(weather.rainfall || 0).toFixed(1)
  const humidity = Number(weather.humidity || 0).toFixed(0)
  const advisory = Number(rain) > 3
    ? 'reduce irrigation and improve drainage'
    : Number(temp) >= 34
      ? 'irrigate in early morning and use mulch'
      : 'follow normal irrigation schedule'

  if (lang === 'gu') {
    return `હવામાન ${district || 'સ્થાનિક'}: તાપમાન ${temp}°C, વરસાદ ${rain}mm, ભેજ ${humidity}%.
${crop} માટે સલાહ: ${advisory}.`
  }
  if (lang === 'hi') {
    return `मौसम ${district || 'स्थानीय'}: तापमान ${temp}°C, वर्षा ${rain}mm, नमी ${humidity}%.
${crop} के लिए सलाह: ${advisory}.`
  }
  return `Weather ${district || 'local'}: temp ${temp}°C, rain ${rain}mm, humidity ${humidity}%. Advisory for ${crop}: ${advisory}.`
}

async function buildSchemeDynamicMessage(profile, lang) {
  try {
    await schemesService.matchFarmer(profile.id)
    const matchesData = await schemesService.getMatchesByFarmer(profile.id)
    const matches = matchesData.matches || []
    const top = matches.slice(0, 2).map((m) => m.scheme_name).filter(Boolean)

    if (top.length > 0) {
      if (lang === 'gu') {
        return `તમારા માટે યોજના મેળ: ${top.join(', ')}. અરજી માટે દસ્તાવેજ તૈયાર રાખો: આધાર, બેંક પાસબુક, જમીન પુરાવો.`
      }
      if (lang === 'hi') {
        return `आपके लिए योजना मैच: ${top.join(', ')}. आवेदन हेतु दस्तावेज तैयार रखें: आधार, बैंक पासबुक, भूमि प्रमाण।`
      }
      return `Top schemes matched for you: ${top.join(', ')}. Keep Aadhaar, bank passbook, and land proof ready to apply.`
    }
  } catch (err) {
    logger.warn('Scheme match fetch failed for WhatsApp flow', {
      farmerId: profile.id,
      error: err.message
    })
  }

  if (lang === 'gu') {
    return 'હાલમાં યોજના મૅચ મળ્યું નથી. KCC, PM-KISAN અને Soil Health Card માટે શાખામાં ચકાસો.'
  }
  if (lang === 'hi') {
    return 'अभी कोई योजना मैच नहीं मिला। KCC, PM-KISAN और Soil Health Card के लिए शाखा में जांच करें।'
  }
  return 'No scheme match found right now. Please check KCC, PM-KISAN, and Soil Health Card at your bank branch.'
}

async function handleInsuranceFlow(conv, input, language) {
  const lang = language || conv.language || 'gu'
  
  // Fetch fresh farmer insurance data from DB for SQL-driven response
  const insuranceData = await getFarmerInsuranceData(conv.farmer_id)
  const intro = buildInsuranceSQLMessage(insuranceData, conv, lang)
  const message = `${intro}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message, nextStage: 'menu' }
  }
  return message
}

async function handlePmKisanFlow(conv, input, language) {
  const lang = language || conv.language || 'gu'
  
  // Fetch fresh farmer PM-KISAN data from DB for SQL-driven response
  const pmkisanData = await getFarmerPmkisanData(conv.farmer_id)
  const intro = buildPmKisanSQLMessage(pmkisanData, conv, lang)
  const message = `${intro}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message, nextStage: 'menu' }
  }
  return message
}

async function handleWeatherFlow(conv, input, language) {
  const lang = language || conv.language || 'gu'
  const intro = await generateStageIntro('weather_flow', conv, lang)
  const message = `${intro}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message, nextStage: 'menu' }
  }
  return message
}

async function handleSchemeFlow(conv, input, language) {
  const lang = language || conv.language || 'gu'
  
  // Fetch farmer profile and matched schemes from DB for SQL-driven response
  const profile = await getFarmerSnapshotForFlows(conv)
  const intro = await buildSchemeDynamicMessage(profile, lang)
  const message = `${intro}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message, nextStage: 'menu' }
  }
  return message
}

async function handleProfileView(conv, input, language) {
  const lang = language || conv.language || 'gu'
  const profile = await getFarmerProfileForChat(conv)

  const systemPrompt = `You are GraamAI bot. Generate a farmer profile summary message in ${getLanguageName(lang)}. Keep it under 260 characters. Use simple words and plain text only.`

  const userPrompt = `Farmer details:\nName: ${profile.name || 'Farmer'}\nVillage: ${profile.village || 'N/A'}, ${profile.district || 'N/A'}\nCrop: ${profile.primary_crop || 'N/A'}\nLand: ${profile.land_size || 'N/A'} acres\nVulnerability score: ${profile.vulnerability_score || 'N/A'}/100 (${profile.vulnerability_label || 'unknown'})\nInsurance: ${profile.has_crop_insurance ? 'Yes' : 'No'}\nPM-KISAN: ${profile.pm_kisan_enrolled ? 'Enrolled' : 'Not enrolled'}\nLoan: ${profile.loan_type || 'None'}\nEnd with top 1 risk or action.`

  let message
  try {
    message = await callGroq(systemPrompt, userPrompt, 220)
    if (!message) {
      throw new Error('Empty Groq response')
    }
  } catch (err) {
    message = await formatProfileMessage(profile, lang)
  }

  const finalMessage = `${String(message || '').trim()}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message: finalMessage, nextStage: 'menu' }
  }
  return finalMessage
}

async function formatProfileMessage(farmer, language) {
  try {
    const systemPrompt = `You are KhedutMitra. Summarize farmer profile in ${getLanguageName(language)} with clean WhatsApp formatting. Use 5-7 short lines. Plain text only, no markdown symbols.`
    const userPrompt = `Name: ${farmer.name}\nDistrict: ${farmer.district}\nVillage: ${farmer.village || 'N/A'}\nLand: ${farmer.land_size || 'N/A'} acres\nSoil: ${farmer.soil_type || 'N/A'}\nIncome: INR ${farmer.annual_income || 'N/A'}`
    const summary = await callGroq(systemPrompt, userPrompt, 220)
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

async function getFarmerProfileForChat(conv) {
  const result = await pool.query(
    `SELECT f.name,
            f.district,
            f.village,
            f.land_size,
            f.annual_income,
            to_jsonb(f)->>'soil_type' AS soil_type,
            to_jsonb(f)->>'loan_type' AS loan_type,
            COALESCE((to_jsonb(f)->>'has_crop_insurance')::boolean, false) AS has_crop_insurance,
            COALESCE((to_jsonb(f)->>'pm_kisan_enrolled')::boolean, false) AS pm_kisan_enrolled,
            (
              SELECT c.name
              FROM farmer_crops fc
              JOIN crops c ON c.id = fc.crop_id
              WHERE fc.farmer_id = f.id
              ORDER BY fc.created_at DESC
              LIMIT 1
            ) AS primary_crop,
            (
              SELECT fr.score
              FROM fvi_records fr
              WHERE fr.farmer_id = f.id
              ORDER BY fr.created_at DESC
              LIMIT 1
            ) AS vulnerability_score,
            (
              SELECT fr.risk_level
              FROM fvi_records fr
              WHERE fr.farmer_id = f.id
              ORDER BY fr.created_at DESC
              LIMIT 1
            ) AS vulnerability_label
     FROM farmers f
     WHERE f.id = $1
     LIMIT 1`,
    [conv.farmer_id]
  )

  if (result.rows[0]) {
    return result.rows[0]
  }

  return {
    name: conv.farmer_name || 'Farmer',
    district: conv.district || null,
    village: conv.village || null,
    land_size: conv.land_size || null,
    annual_income: conv.annual_income || null,
    primary_crop: conv.primary_crop || null,
    vulnerability_score: conv.vulnerability_score || null,
    vulnerability_label: conv.vulnerability_label || null,
    has_crop_insurance: conv.has_crop_insurance || false,
    pm_kisan_enrolled: conv.pm_kisan_enrolled || false,
    loan_type: conv.loan_type || null,
    soil_type: null
  }
}

function resolveMenuSelectionIntent(text) {
  const normalized = String(text || '').trim().toLowerCase()
  const clean = normalized.replace(/[!?.:,;]/g, '').trim()
  if (!clean) return null

  if (['1', 'one', '૧', 'एक'].includes(clean)) return INTENTS.INSURANCE
  if (['2', 'two', '૨', 'दो'].includes(clean)) return INTENTS.PMKISAN
  if (['3', 'three', '૩', 'तीन'].includes(clean)) return INTENTS.WEATHER
  if (['4', 'four', '૪', 'चार'].includes(clean)) return INTENTS.SCHEME
  if (['5', 'five', '૫', 'पांच'].includes(clean)) return INTENTS.PROFILE
  if (['6', 'six', '૬', 'छह'].includes(clean)) return INTENTS.OFFICER
  if (['7', 'seven', '૭', 'सात'].includes(clean)) return INTENTS.FINANCIAL
  if (['0', 'menu', 'main menu', 'back'].includes(clean)) return INTENTS.MENU

  if (clean.includes('insurance') || clean.includes('bima') || clean.includes('વીમા') || clean.includes('बीमा')) return INTENTS.INSURANCE
  if (clean.includes('pmkisan') || clean.includes('pm kisan') || clean.includes('किसान')) return INTENTS.PMKISAN
  if (clean.includes('weather') || clean.includes('mausam') || clean.includes('હવામાન')) return INTENTS.WEATHER
  if (clean.includes('scheme') || clean.includes('yojana') || clean.includes('યોજના')) return INTENTS.SCHEME
  if (clean.includes('profile') || clean.includes('પ્રોફાઇલ') || clean.includes('प्रोफाइल')) return INTENTS.PROFILE
  if (clean.includes('officer') || clean.includes('contact') || clean.includes('call') || clean.includes('અધિકારી')) return INTENTS.OFFICER
  if (clean.includes('financial') || clean.includes('પૈસો') || clean.includes('पैसे') || clean.includes('bank') || clean.includes('loan')) return INTENTS.FINANCIAL

  return null
}

async function handleOfficerConnect(conv, input, language) {
  const lang = language || conv.language || 'gu'
  try {
    // Fetch farmer data to get organization_id if not in conversation
    let organizationId = conv.organization_id
    if (!organizationId) {
      const farmerResult = await pool.query(
        `SELECT organization_id FROM farmers WHERE id = $1`,
        [conv.farmer_id]
      )
      if (farmerResult.rows.length > 0) {
        organizationId = farmerResult.rows[0].organization_id
      }
    }

    // Create alert record for alerts page so admins can see bot support requests
    const alertMessage = {
      gu: `✅ બોટ સપોર્ટ વિનંતી - ${conv.farmer_name || 'Farmer'} (${new Date().toLocaleString('gu-IN')})`,
      hi: `✅ बॉट सपोर्ट अनुरोध - ${conv.farmer_name || 'Farmer'} (${new Date().toLocaleString('hi-IN')})`,
      en: `✅ Bot Support Request - ${conv.farmer_name || 'Farmer'} (${new Date().toLocaleString('en-IN')})`,
      hinglish: `✅ Bot Support Request - ${conv.farmer_name || 'Farmer'} (${new Date().toLocaleString('en-IN')})`
    }

    await pool.query(
      `INSERT INTO alerts (id, farmer_id, organization_id, alert_type, priority, language, message, message_text, reason, status, ai_generated, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [
        require('uuid').v4(),
        conv.farmer_id,
        organizationId,
        'custom',
        'medium',
        lang,
        alertMessage[lang] || alertMessage.en,
        `Bot Support Request - ${conv.farmer_name}`,
        'Farmer requested bot callback support',
        'sent',
        false
      ]
    )

    logger.info('Bot support request alert created', {
      farmerId: conv.farmer_id,
      organizationId: organizationId,
      farmerName: conv.farmer_name,
      farmerPhone: conv.phone_number,
      language: lang,
      action: 'whatsapp.bot.support.alert.created'
    })

    // Call n8n webhook with farmer data
    const webhookUrl = process.env.N8N_OFFICER_WEBHOOK_URL || 'https://vrajmevawala.app.n8n.cloud/webhook-test/e12bb2f7-7d92-4dd9-b96a-b0bb7b83cacd'
    
    // Format loan due date
    let loanDueInfo = 'N/A'
    if (conv.loan_due_date) {
      const dueDate = new Date(conv.loan_due_date)
      const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))
      loanDueInfo = `${dueDate.toLocaleDateString('en-IN')} (${daysUntilDue > 0 ? daysUntilDue + ' days remaining' : 'overdue'})`
    }

    // Format insurance details
    let insuranceInfo = 'Not enrolled'
    if (conv.has_crop_insurance) {
      insuranceInfo = 'Active'
      if (conv.insurance_expiry_date) {
        const expiryDate = new Date(conv.insurance_expiry_date)
        insuranceInfo += ` - Expires: ${expiryDate.toLocaleDateString('en-IN')}`
      }
    }

    // Get government schemes (fetch from database)
    let governmentSchemes = 'N/A'
    try {
      const schemeResult = await pool.query(
        `SELECT s.name 
         FROM farmer_schemes fs
         JOIN schemes s ON s.id = fs.scheme_id
         WHERE fs.farmer_id = $1 AND fs.status = 'active'
         ORDER BY fs.created_at DESC`,
        [conv.farmer_id]
      )
      if (schemeResult.rows.length > 0) {
        governmentSchemes = schemeResult.rows.map(r => r.name).join(', ')
      }
    } catch (err) {
      logger.warn('Failed to fetch farmer schemes', {
        farmerId: conv.farmer_id,
        error: err.message
      })
    }

    const payloadData = {
      farmer_name: conv.farmer_name || 'N/A',
      farmer_phone: conv.phone_number || 'N/A',
      farmer_location: conv.village || 'N/A',
      farmer_crop: conv.primary_crop || 'N/A',
      farmer_loan_due_date: loanDueInfo,
      farmer_insurance_details: insuranceInfo,
      farmer_government_schemes: governmentSchemes
    }

    try {
      const sendWebhook = async (url) => fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadData)
      })

      let response = await sendWebhook(webhookUrl)

      // n8n test webhooks can return 404 if workflow is active-only on /webhook path.
      if (!response.ok && response.status === 404 && webhookUrl.includes('/webhook-test/')) {
        const fallbackUrl = webhookUrl.replace('/webhook-test/', '/webhook/')
        logger.warn('N8n webhook test path not found, retrying with production path', {
          farmerId: conv.farmer_id,
          originalUrl: webhookUrl,
          fallbackUrl,
          action: 'whatsapp.officer.webhook.retry'
        })
        response = await sendWebhook(fallbackUrl)
      }

      if (!response.ok) {
        const responseText = await response.text().catch(() => '')
        logger.warn('N8n webhook call failed', {
          farmerId: conv.farmer_id,
          status: response.status,
          statusText: response.statusText,
          responseBody: responseText?.slice(0, 500),
          webhookUrl,
          action: 'whatsapp.officer.webhook.failed'
        })
      } else {
        logger.info('N8n webhook called successfully', {
          farmerId: conv.farmer_id,
          action: 'whatsapp.officer.webhook.success',
          payload: payloadData
        })
      }
    } catch (webhookErr) {
      logger.warn('N8n webhook call error', {
        farmerId: conv.farmer_id,
        error: webhookErr.message,
        action: 'whatsapp.officer.webhook.error'
      })
    }
  } catch (err) {
    logger.warn('Officer callback alert generation failed, returning confirmation anyway', {
      farmerId: conv.farmer_id,
      error: err.message,
      action: 'whatsapp.officer.callback.fallback'
    })
  }

  const message = `${getOfficerConfirmation(lang)}\n\n0 for menu | 6 for officer help`
  if (typeof input !== 'undefined') {
    return { message, nextStage: 'done' }
  }
  return message
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

/**
 * Format date for display in different languages
 * Input: Date object, string, ISO date, or timestamp
 * Output: "29 જુન 2027" / "29 जून 2027" / "Jun 29, 2027"
 */
function formatDateForDisplay(dateInput, lang = 'gu') {
  if (!dateInput) return 'N/A'
  
  try {
    const dateObj = new Date(dateInput)
    if (isNaN(dateObj.getTime())) return String(dateInput)
    
    const day = dateObj.getDate()
    const year = dateObj.getFullYear()
    
    const monthsGu = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જુન', 'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઑક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર']
    const monthsHi = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
    const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    const month = dateObj.getMonth()
    
    if (lang === 'gu') return `${day} ${monthsGu[month]} ${year}`
    if (lang === 'hi') return `${day} ${monthsHi[month]} ${year}`
    return `${monthsEn[month]} ${day}, ${year}`
  } catch (err) {
    return String(dateInput)
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A'
  try {
    return new Date(dateStr).toISOString().slice(0, 10)
  } catch (err) {
    return 'N/A'
  }
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

function getFixedMenuContent(lang) {
  const menus = {
    gu: `🌾 *KhedutMitra* - મુખ્ય મેનુ 🌾

કઈ સેવા જોઈએ? નીચેથી બટન પસંદ કરો:

*1* 🛡️  પાક વીમા (PMFBY)
*2* 💰 PM-કિસાન લાભ
*3* 🌦️  હવામાન અને ખેતી સલાહ
*4* 📋 સરકારી યોજનાઓ
*5* 👤 મારી પ્રોફાઇલ જુઓ
*6* 📞 અધિકારી સાથે વાત કરો
*7* 📚 આર્થિક પ્રશ્નો (બેંક, OTP, લોન)

_─────────────────_
*0* પાછા જાવું
🌐 ભાષા બદલવા: GU / HIN / EN`,
    hi: `🌾 *KhedutMitra* - मुख्य मेनू 🌾

कौन सी सेवा चाहिए? नीचे से चुनें:

*1* 🛡️  फसल बीमा (PMFBY)
*2* 💰 पीएम-किसान लाभ
*3* 🌦️  मौसम और फसल सलाह
*4* 📋 सरकारी योजनाएं
*5* 👤 मेरी प्रोफाइल देखें
*6* 📞 अधिकारी से बात करें
*7* 📚 वित्तीय सवाल (बैंक, OTP, लोन)

_─────────────────_
*0* वापस जाएं
🌐 भाषा बदलने के लिए: GU / HIN / EN`,
    en: `🌾 *KhedutMitra* - Main Menu 🌾

Which service do you need? Choose below:

*1* 🛡️  Crop Insurance (PMFBY)
*2* 💰 PM-Kisan Benefits
*3* 🌦️  Weather & Farm Advice
*4* 📋 Government Schemes
*5* 👤 My Profile
*6* 📞 Talk to Officer
*7* 📚 Financial Questions (Bank, OTP, Loans)

_─────────────────_
*0* Go Back
🌐 Change Language: GU / HIN / EN`,
    hinglish: `🌾 KhedutMitra - Main Menu 🌾

Kaun si service chahiye? Neeche se chuno:

*1* 🛡️  Fasal Bima (PMFBY)
*2* 💰 PM-Kisan Labh
*3* 🌦️  Mausam & Fasal Salah
*4* 📋 Sarkari Yojnaye
*5* 👤 Meri Profile Dekho
*6* 📞 Officer Se Baat Karo
*7* 📚 Financial Sawal (Bank, OTP, Loans)

_─────────────────_
*0* Wapas Jao
🌐 Bhasha Badlne Ke Liye: GU / HIN / EN`
  }
  return menus[lang] || menus.en
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
    gu: '📱 બીજી સેવા માટે નિમ્નમાંથી પસંદ કરો',
    hi: '📱 दूसरी सेवा के लिए नीचे से चुनें',
    en: '📱 Choose another service below',
    hinglish: '📱 Aur service ke liye neeche se chuno'
  }[lang] || 'Choose another service'
}

function getLanguageChangeHelp(lang) {
  return {
    gu: '\n🌐 ભાષા બદલવા: *GU* (ગુજરાતી) / *HIN* (હિંદી) / *EN* (અંગ્રેજી)',
    hi: '\n🌐 भाषा बदलें: *GU* (गुजराती) / *HIN* (हिंदी) / *EN* (अंग्रेजी)',
    en: '\n🌐 Change Language: *GU* (Gujarati) / *HIN* (Hindi) / *EN* (English)',
    hinglish: '\n🌐 Bhasha Badlo: *GU* (Gujarati) / *HIN* (Hindi) / *EN* (English)'
  }[lang] || 'To change language, type GU / HIN / EN.'
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
    gu: '✅ ભાષા ગુજરાતીમાં બદલાઈ ગઈ છે.\n\nમેનુ માટે કોઈ પણ નંબર(0-6) લખો.',
    hi: '✅ भाषा हिंदी में बदल गई है।\n\nमेनू के लिए कोई भी नंबर (0-6) लिखें।',
    en: '✅ Language changed to English.\n\nType any number (0-6) for menu options.',
    hinglish: '✅ Language English mein badal gayi hai.\n\nMenu ke liye koi bhi number (0-6) type karo.'
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
    gu: `✅ *કૉલબેક વિનંતી સ્વીકૃત*

📞 KhedutMitra Bot તમને 2 કલાક માં કૉલ કરશે.

👤 તમારો ફોન પાસે રાખો.
તમે ઑફલાઇન હો તો બોટ વૉઇસમેલ મૂકશે.`,
    hi: `✅ *कॉलबैक अनुरोध स्वीकृत*

📞 KhedutMitra Bot आपको 2 घंटे के भीतर सीधे कॉल करेगा।

👤 अपना फोन पास रखें।
यदि आप ऑफलाइन हैं तो बॉट वॉइसमेल छोड़ेगा।`,
    en: `✅ *Callback Request Accepted*

📞 KhedutMitra Bot will call you directly within 2 hours.

👤 Keep your phone handy.
If you're offline, the bot will leave a voicemail.`,
    hinglish: `✅ *Callback Request Accepted*

📞 KhedutMitra Bot aapko 2 ghante ke andar seedha call karega.

👤 Apna phone paas rakhna.
Agar offline ho to bot voicemail chhod dega.`
  }[lang] || 'KhedutMitra Bot will call you soon.'
}

function getNoSessionMessage() {
  return `📱 *નમસ્તે! કૃપા સહાય માટે બેંક સાથે સંપર્ક કરો*

Hello! Please contact your bank for KhedutMitra WhatsApp assistance.

नमस्ते! कृपया KhedutMitra सहायता के लिए बैंक से संपर्क करें।`
}

function detectProjectTopic(userMessage) {
  const text = String(userMessage || '').toLowerCase()
  if (!text.trim()) return 'offtopic'

  const has = (arr) => arr.some((k) => text.includes(k))

  if (has(['weather', 'mausam', 'હવામાન', 'rain', 'વરસાદ', 'बारिश', 'temperature'])) return 'weather'
  if (has(['insurance', 'bima', 'વીમા', 'बीमा', 'pmfby'])) return 'insurance'
  if (has(['pmkisan', 'pm kisan', 'किसान', 'હપ્તો'])) return 'pmkisan'
  if (has(['scheme', 'yojana', 'યોજના', 'subsidy'])) return 'scheme'
  if (has(['crop', 'soil', 'પાક', 'માટી', 'फसल', 'मिट्टी', 'disease', 'રોગ'])) return 'cropsoil'
  if (has(['loan', 'finance', 'credit', 'bank', 'kcc', 'લોન', 'बैंक'])) return 'finance'

  return 'offtopic'
}

function buildCropSoilDynamicMessage(profile, lang) {
  const crop = profile.primary_crop || 'crop'
  const district = profile.district || 'your area'

  if (lang === 'gu') {
    return `${crop} માટે સલાહ (${district}): જમીન ભેજ જાળવો, 5-7 દિવસે પાક નિરીક્ષણ કરો, અને રોગના પ્રારંભિક લક્ષણો દેખાય તો ફોટો મોકલો.`
  }
  if (lang === 'hi') {
    return `${crop} के लिए सलाह (${district}): मिट्टी की नमी बनाए रखें, 5-7 दिन में फसल निरीक्षण करें, और रोग के शुरुआती लक्षण पर फोटो भेजें।`
  }
  return `Advice for ${crop} in ${district}: maintain soil moisture, inspect crop every 5-7 days, and share a crop photo if disease symptoms appear.`
}

function getOutOfScopeMessage(lang) {
  return {
    gu: 'હું કૃષિ, હવામાન, પાક, માટી, વીમા, યોજના અને ખેડૂત નાણાંકીય મદદ વિષય પર જ મદદ કરું છું. કૃપા કરીને સંબંધિત પ્રશ્ન પૂછો.\n\n0 for menu | 6 for officer help',
    hi: 'मैं केवल कृषि, मौसम, फसल, मिट्टी, बीमा, योजना और किसान वित्त से जुड़े सवालों में मदद करता हूँ। कृपया संबंधित प्रश्न पूछें।\n\n0 for menu | 6 for officer help',
    en: 'I can help only with farming, weather, crop/soil, insurance, schemes, and farmer finance topics. Please ask a related question.\n\n0 for menu | 6 for officer help',
    hinglish: 'Main sirf farming, weather, crop/soil, insurance, schemes aur farmer finance topics mein help karta hoon. Related question pucho.\n\n0 for menu | 6 for officer help'
  }[lang] || 'I can help only with farming and farmer finance topics.\n\n0 for menu | 6 for officer help'
}

function getGenericFailureReply(lang) {
  return {
    gu: `⚠️ *કૃમજીશ હવે થોડો મુશ્કેલી આવી*

કૃપા કરીને ફરી કોશિશ કરો:
📱 *0* - મેનુ પર જાવું
📞 *6* - અધિકારી મદદ માટે`,
    hi: `⚠️ *क्रिप्टा, थोड़ी समस्या आई*

कृपया फिर कोशिश करें:
📱 *0* - मेनू पर जाएं
📞 *6* - अधिकारी मदद के लिए`,
    en: `⚠️ *Sorry, We Had a Temporary Issue*

Please try again:
📱 *0* - Go to Menu
📞 *6* - Get Officer Help`,
    hinglish: `⚠️ *Maafi Chaata Hoon, Temporary Issue Aaya*

Dobara koshish karo:
📱 *0* - Menu par jao
📞 *6* - Officer help ke liye`
  }[lang] || 'Sorry, temporary issue. Type 0 for menu / 6 for officer help.'
}

async function closeConversation(conversationId, reason = 'stop') {
  await pool.query(
    `UPDATE whatsapp_conversations
     SET is_active = false,
         current_stage = 'done',
         session_expires_at = NOW(),
         updated_at = NOW(),
         context = context || $2::jsonb
     WHERE id = $1`,
    [conversationId, JSON.stringify({ closed_by_farmer: true, close_reason: reason, closed_at: new Date().toISOString() })]
  )
}

function getStopConfirmation(lang) {
  return {
    gu: `✅ *ચેટ બંધ કરી દીધી છે*

જ્યારે પણ જરૂર હોય ફરી શરૂ કરો:
📱 *HIN* અથવા *HELP* લખો

આશા રાખું તમે કવચ અને સમGothic્ધ રહ્યા છો! 🌾`,
    hi: `✅ *चैट बंद की गई है*

जब भी चाहिए फिर से शुरू करो:
📱 *HIN* या *HELP* लिखो

उम्मीद है तुम सुरक्षित और खुश रहो! 🌾`,
    en: `✅ *Chat Closed*

Start again anytime:
📱 Type *HIN* or *HELP*

Take care and stay safe! 🌾`,
    hinglish: `✅ *Chat Band Ki Gayi*

Kabhi bhi shuru kar sakta hai:
📱 *HIN* ya *HELP* type karo

Apne aap ka dhyan rakho! 🌾`
  }[lang] || 'Chat closed. Send HIN or HELP to start again.'
}

function isSelfStartMessage(text) {
  const normalized = String(text || '').trim().toLowerCase()
  if (!normalized) return false

  const selfStartKeywords = new Set([
    'hi',
    'hii',
    'hiii',
    'hello',
    'hey',
    'help',
    'start',
    'menu',
    'namaste',
    'hello ji',
    'नमस्ते',
    'नमस्कार',
    'मदद',
    'हेल्प',
    'જય શ્રી કૃષ્ણ',
    'નમસ્તે',
    'મદદ'
  ])

  if (selfStartKeywords.has(normalized)) return true
  if (normalized.length <= 10 && selfStartKeywords.has(normalized.replace(/[!?.]/g, ''))) return true

  return false
}

async function findFarmerByPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  const last10 = digits.slice(-10)
  if (!last10) return null

  const result = await pool.query(
    `SELECT f.id,
            f.name,
            COALESCE(to_jsonb(f)->>'organization_id', to_jsonb(f)->>'institution_id') AS organization_id,
            f.language,
            f.preferred_language,
            f.district,
            f.village,
            f.land_size,
            f.annual_income,
            to_jsonb(f)->>'soil_type' AS soil_type,
            to_jsonb(f)->>'water_source' AS water_source,
            (
              SELECT c.name
              FROM farmer_crops fc
              JOIN crops c ON c.id = fc.crop_id
              WHERE fc.farmer_id = f.id
              ORDER BY fc.created_at DESC
              LIMIT 1
            ) AS primary_crop
     FROM farmers f
     WHERE right(regexp_replace(COALESCE(f.phone, ''), '\\D', '', 'g'), 10) = $1
     LIMIT 1`,
    [last10]
  )

  return result.rows[0] || null
}

function getSelfStartWelcomeMessage(lang, farmerName) {
  const name = farmerName || 'ખેડૂત'
  return {
    gu: `🌾 *સ્વાગત છે, ${name}!*

હું *KhedutMitra* છું - તમારો કૃષિ સહાયક.

📋 મદદ માટે નીચેથી સેવા પસંદ કરો:`,
    hi: `🌾 *स्वागत है, ${name}!*

मैं *KhedutMitra* हूँ - आपका कृषि सहायक।

📋 मदद के लिए नीचे से सेवा चुनें:`,
    en: `🌾 *Welcome, ${name}!*

I'm *KhedutMitra* - Your Farm Assistant.

📋 Choose a service below for help:`,
    hinglish: `🌾 *Swagat Hai, ${name}!*

Main *KhedutMitra* hoon - Aapka Farm Assistant.

📋 Help ke liye neeche se service chuno:`
  }[lang] || `Welcome, ${name}! Choose a service below.`
}

function getUnregisteredFarmerWelcome(lang) {
  return {
    gu: `🌾 *નમસ્તે! KhedutMitra માં આપનું સ્વાગત છે!* 🌾

હું તમારો કૃષિ સહાયક છું - હવામાન, પાક, માટી, વીમા અને સરકારી યોજનાઓ બાબતે મદદ કરું છું.

📋 *નીચેનામાંથી પસંદ કરો:*

*1* 🛡️  પાક વીમા (PMFBY)
*2* 💰 PM-કિસાન લાભ  
*3* 🌦️  હવામાન અને ખેતી સલાહ
*4* 📋 સરકારી યોજનાઓ
*5* 👤 મારી પ્રોફાઇલ
*6* 📞 અધિકારી સાથે વાત કરો

_─────────────────_
*⚠️ નોંધણી માટે:* કૃપા આપનો બેંક અધિકારી સાથે સંપર્ક કરો તમારા ખેતી વિગતો નોંધવા માટે. પછી આ સેવાઓ સંપૂર્ણ રીતે વાપરી શકશો.

🌐 ભાષા: *GU* (Gujarati) | HIN (Hindi) | EN (English)`,
    
    hi: `🌾 *नमस्ते! KhedutMitra में आपका स्वागत है!* 🌾

मैं आपका कृषि सहायक हूँ - मौसम, फसल, मिट्टी, बीमा और सरकारी योजनाओं में मदद करता हूँ।

📋 *नीचे से चुनें:*

*1* 🛡️  फसल बीमा (PMFBY)
*2* 💰 पीएम-किसान लाभ
*3* 🌦️  मौसम और फसल सलाह
*4* 📋 सरकारी योजनाएं
*5* 👤 मेरी प्रोफाइल
*6* 📞 अधिकारी से बात करें

_─────────────────_
*⚠️ रजिस्ट्रेशन के लिए:* कृपया अपने बैंक अधिकारी से संपर्क करें अपनी खेती की जानकारी दर्ज करने के लिए। फिर ये सेवाएं पूरी तरह इस्तेमाल कर सकेंगे।

🌐 भाषा: GU | *HIN* (हिंदी) | EN`,
    
    en: `🌾 *Hello! Welcome to KhedutMitra!* 🌾

I'm your Farm Assistant - helping with weather, crops, soil, insurance, and government schemes.

📋 *Choose below:*

*1* 🛡️  Crop Insurance (PMFBY)
*2* 💰 PM-Kisan Benefits
*3* 🌦️  Weather & Farm Advice
*4* 📋 Government Schemes
*5* 👤 My Profile
*6* 📞 Talk to Officer

_─────────────────_
*⚠️ To Register:* Please contact your bank officer to register your farming details. Then you can fully use these services.

🌐 Language: GU | HIN | *EN* (English)`,
    
    hinglish: `🌾 *Namaste! KhedutMitra Mein Aapka Swagat Hai!* 🌾

Main aapka farm assistant hoon - mausam, fasal, mitti, insurance aur government schemes mein madad deta hoon.

📋 *Neeche se chuno:*

*1* 🛡️  Fasal Bima (PMFBY)
*2* 💰 PM-Kisan Labh
*3* 🌦️  Mausam & Fasal Salah
*4* 📋 Sarkari Yojnaye
*5* 👤 Meri Profile
*6* 📞 Officer Se Baat Karo

_─────────────────_
*⚠️ Registration Ke Liye:* Apne bank ke officer se contact karo apni farming details register karane ke liye. Phir in services ko poore tarah use kar sakte ho.

🌐 Language: GU | HIN | EN`
  }[lang] || 'Hello! Welcome to KhedutMitra. Choose an option (1-6) above or contact your bank officer to register.'
}

/**
 * ─── SQL-DRIVEN DATA FETCHING ─────────────────────────────────────────────────
 * These functions fetch fresh data from DB for each menu option (text-to-SQL)
 */

async function getFarmerInsuranceData(farmerId) {
  const result = await pool.query(
    `SELECT 
       f.id,
       f.name,
       COALESCE((to_jsonb(f)->>'has_crop_insurance')::boolean, false) AS has_crop_insurance,
       (to_jsonb(f)->>'insurance_expiry_date')::date AS insurance_expiry_date,
       (to_jsonb(f)->>'insurance_provider')::text AS insurance_provider,
       (to_jsonb(f)->>'insurance_policy_number')::text AS policy_number,
       (
         SELECT c.name
         FROM farmer_crops fc
         JOIN crops c ON c.id = fc.crop_id
         WHERE fc.farmer_id = f.id
         ORDER BY fc.created_at DESC
         LIMIT 1
       ) AS primary_crop,
       f.district
     FROM farmers f
     WHERE f.id = $1`,
    [farmerId]
  )
  return result.rows[0] || {}
}

async function getFarmerPmkisanData(farmerId) {
  const result = await pool.query(
    `SELECT 
       f.id,
       f.name,
       f.district,
       f.village,
       COALESCE((to_jsonb(f)->>'pm_kisan_enrolled')::boolean, false) AS pm_kisan_enrolled,
       (to_jsonb(f)->>'pm_kisan_registration_date')::date AS pm_kisan_registration_date,
       (to_jsonb(f)->>'aadhar_linked_bank')::boolean AS aadhar_linked,
       (to_jsonb(f)->>'last_pm_kisan_installment')::date AS last_installment_date
     FROM farmers f
     WHERE f.id = $1`,
    [farmerId]
  )
  return result.rows[0] || {}
}

function buildInsuranceSQLMessage(insuranceData, conv, lang) {
  const crop = insuranceData.primary_crop || conv.primary_crop || 'crop';
  const district = insuranceData.district || conv.district || 'your region';
  
  if (insuranceData.has_crop_insurance) {
    const expiryDate = formatDateForDisplay(insuranceData.insurance_expiry_date, lang);
    const daysLeft = insuranceData.insurance_expiry_date ? getDaysUntil(insuranceData.insurance_expiry_date) : 'soon';
    const provider = insuranceData.insurance_provider || 'Insurance provider';
    const policyNo = insuranceData.policy_number ? ` (Policy: ${insuranceData.policy_number})` : '';
    
    if (lang === 'gu') {
      return `✅ પાક વીમો સ્થિતિ: સક્રિય\n\n🌾 પાક: ${crop}\n📅 સમાપ્તિ: ${expiryDate} (${daysLeft} દિવસ બાકી)\n🏢 પ્રદાતા: ${provider}${policyNo}\n\n💡 Renewal માટે બેંક શાખામાં આધાર અને 7/12 લાવો.`;
    }
    if (lang === 'hi') {
      return `✅ फसल बीमा स्थिति: सक्रिय\n\n🌾 फसल: ${crop}\n📅 समाप्ति: ${expiryDate} (${daysLeft} दिन बाकी)\n🏢 प्रदाता: ${provider}${policyNo}\n\n💡 Renewal के लिए बैंक शाखा में आधार और 7/12 लाएं।`;
    }
    return `✅ Crop Insurance Status: Active\n\n🌾 Crop: ${crop}\n📅 Expires: ${expiryDate} (${daysLeft} days left)\n🏢 Provider: ${provider}${policyNo}\n\n💡 For renewal, bring Aadhaar and land proof to bank branch.`;
  }
  
  // Not insured - show PMFBY registration info
  if (lang === 'gu') {
    return `📋 પાક વીમો સ્થિતિ: નોંધાયેલો નથી\n\n🌾 પાક: ${crop}\n📍 જીલ્લો: ${district}\n\n💡 PMFBY માર્ગે પાક વીમો લો:\n✅ Kharif: જુલાઈ 31 સુધી\n✅ Rabi: જાન્યુઆરી 31 સુધી\n\n📄 જરુરી: આધાર, બેંક પાસબુક, 7/12\n🏢 કોણે ખર્ચ: FREE`;
  }
  if (lang === 'hi') {
    return `📋 फसल बीमा स्थिति: पंजीकृत नहीं\n\n🌾 फसल: ${crop}\n📍 जिला: ${district}\n\n💡 PMFBY के तहत फसल बीमा लें:\n✅ Kharif: 31 जुलाई तक\n✅ Rabi: 31 जनवरी तक\n\n📄 जरूरी: आधार, बैंक पासबुक, 7/12\n🏢 खर्च: FREE`;
  }
  return `📋 Crop Insurance Status: Not Registered\n\n🌾 Crop: ${crop}\n📍 District: ${district}\n\n💡 Get crop insurance under PMFBY:\n✅ Kharif: by July 31\n✅ Rabi: by Jan 31\n\n📄 Required: Aadhaar, passbook, land proof\n🏢 Cost: FREE`;
}

function buildPmKisanSQLMessage(pmkisanData, conv, lang) {
  const district = pmkisanData.district || conv.district || 'your district';
  
  if (pmkisanData.pm_kisan_enrolled) {
    const regDate = pmkisanData.pm_kisan_registration_date ? formatDateForDisplay(pmkisanData.pm_kisan_registration_date, lang) : 'a few months ago';
    const lastInstallment = pmkisanData.last_installment_date ? formatDateForDisplay(pmkisanData.last_installment_date, lang) : 'recently';
    const aadhaarStatus = pmkisanData.aadhar_linked ? (lang === 'gu' ? '✅ હાં' : lang === 'hi' ? '✅ हाँ' : '✅ Yes') : (lang === 'gu' ? '⚠️ ના' : lang === 'hi' ? '⚠️ नहीं' : '⚠️ No');
    
    if (lang === 'gu') {
      return `✅ PM-KISAN સ્થિતિ: નોંધાયેલા છો\n\n📅 નોંધણી: ${regDate}\n💰 આખરી કિસ્ત: ${lastInstallment}\n✅ Aadhaar જોડાયેલો: ${aadhaarStatus}\n\n💡 આગામી કિસ્ત:\n🔹 eKYC અપડેટ ચકાસો\n🔹 બેંક એકાઉન્ટ Aadhaar સાથે લિંક હોવું જોઈએ\n🔹 Status: pmkisan.gov.in પર ચકાસો`;
    }
    if (lang === 'hi') {
      return `✅ PM-KISAN स्थिति: नामांकित हैं\n\n📅 पंजीकरण: ${regDate}\n💰 आखिरी किस्त: ${lastInstallment}\n✅ Aadhaar लिंक: ${aadhaarStatus}\n\n💡 आगामी किस्त के लिए:\n🔹 eKYC स्थिति जांचें\n🔹 बैंक खाता Aadhaar से जुड़ा होना चाहिए\n🔹 स्थिति देखें: pmkisan.gov.in`;
    }
    return `✅ PM-KISAN Status: Enrolled\n\n📅 Registered: ${regDate}\n💰 Last Installment: ${lastInstallment}\n✅ Aadhaar Linked: ${aadhaarStatus}\n\n💡 For next installment:\n🔹 Check eKYC status\n🔹 Bank account must be Aadhaar-linked\n🔹 View status: pmkisan.gov.in`;
  }
  
  // Not enrolled
  if (lang === 'gu') {
    return `📋 PM-KISAN સ્થિતિ: નોંધણી નથી\n\n📍 જીલ્લો: ${district}\n\n💡 PM-KISAN લાભ માટે નોંધણી કરો:\n✅ ₹2000/હપ્તા (૩ હપ્તામાં ₹6000/વર્ષે)\n✅ કોણે પણ કૃષક પરિવાર\n\n📄 જરુરી કાગળ:\n🔹 આધાર (Aadhaar)\n🔹 બેંક ખાતો નંબર\n🔹 જમીન પુરાવો (7/12)\n\n🏢 નોંધણી: CSC કેન્દ્ર અથવા બેંક શાખામાં (FREE)`;
  }
  if (lang === 'hi') {
    return `📋 PM-KISAN स्थिति: पंजीकृत नहीं\n\n📍 जिला: ${district}\n\n💡 PM-KISAN लाभ के लिए पंजीकरण करें:\n✅ ₹2000/किस्त (3 किस्त में ₹6000/साल)\n✅ कोई भी farming family\n\n📄 जरूरी दस्तावेज:\n🔹 आधार (Aadhaar)\n🔹 बैंक खाता नंबर\n🔹 भूमि प्रमाण (7/12)\n\n🏢 पंजीकरण: CSC center या bank branch में (FREE)`;
  }
  return `📋 PM-KISAN Status: Not Registered\n\n📍 District: ${district}\n\n💡 Register for PM-KISAN benefits:\n✅ ₹2000/installment (3 installments = ₹6000/year)\n✅ For all farming families\n\n📄 Required documents:\n🔹 Aadhaar\n🔹 Bank Account Number\n🔹 Land Proof (7/12)\n\n🏢 Registration: CSC center or bank (FREE)`;
}

module.exports = {
  initiateBot,
  handleInboundMessage,
  sendMessage,
  getOrCreateConversation,
  saveMessage,
  updateStage,
  saveContext,
  getConversationHistory,
  buildContextualPrompt,
  buildFarmerContext,
  normalizePhoneNumber
}
