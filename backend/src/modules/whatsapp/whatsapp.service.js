const twilio = require('twilio')
const { v4: uuidv4 } = require('uuid')
const { pool } = require('../../config/db')
const { callGroq } = require('../../utils/groqClient')
const claudeClient = require('../../utils/claudeClient')
const { generateAlert } = require('../../utils/alertGenerator')
const { ALERT_TYPES } = require('../../utils/alertTypes')
const { detectIntent, INTENTS } = require('./whatsapp.intent')
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
      // No active session — send a "please contact your bank" message
      logger.info('No active WhatsApp conversation', { phone: cleanPhone })
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

    const detected = await detectIntent(inboundBody, conv.language, conv.current_stage)
    const intent = detected.intent

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
        replyText = await handleInsuranceFlow(conv)
        nextStage = 'insurance_flow'
        break
      case INTENTS.PMKISAN:
        replyText = await handlePmKisanFlow(conv)
        nextStage = 'pmkisan_flow'
        break
      case INTENTS.WEATHER:
        replyText = await handleWeatherFlow(conv)
        nextStage = 'weather_flow'
        break
      case INTENTS.SCHEME:
        replyText = await handleSchemeFlow(conv)
        nextStage = 'scheme_flow'
        break
      case INTENTS.PROFILE:
        replyText = await handleProfileView(conv)
        break
      case INTENTS.OFFICER:
        replyText = await handleOfficerConnect(conv)
        nextStage = 'officer_connect'
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
      case INTENTS.OTHER:
      default:
        replyText = await handleSmartFallback(conv, inboundBody)
        break
    }

    if (nextStage && nextStage !== conv.current_stage) {
      await updateStage(conv.id, nextStage)
    }

    await saveContext(conv.id, {
      last_intent: intent,
      last_intent_source: detected.source,
      last_user_message: inboundBody,
      last_stage: nextStage
    })

    const sid = await sendMessage(cleanPhone, replyText)
    await saveMessage(conv.id, 'outbound', replyText, sid)

    return { handled: true, conversationId: conv.id, nextStage }
  } catch (err) {
    logger.error('Error handling WhatsApp inbound message', {
      error: err.message,
      from: fromPhone,
      body: String(body || '').substring(0, 50)
    })
    throw err
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
  const history = await getConversationHistory(conv.id, 6)
  const farmerContext = buildFarmerContext(conv)

  const systemPrompt = `You are GraamAI, a helpful WhatsApp assistant for rural farmers in India working with Anand Cooperative Bank.
You help with crop insurance, PM-KISAN, weather, schemes, loans, and farming advice.
Reply in ${getLanguageName(lang)}. Keep under 200 characters.
Use simple words, plain text only, no markdown, no asterisks.
If you cannot answer, ask farmer to call bank officer.
IMPORTANT: Always end with exactly: 0 for menu | 6 for officer help`

  const userPrompt = `FARMER PROFILE:\n${farmerContext}\n\nRECENT CONVERSATION:\n${history}\n\nFARMER QUESTION: ${userMessage}`

  try {
    const text = await callGroq(systemPrompt, userPrompt, 220)
    if (String(text || '').includes('0 for menu | 6 for officer help')) {
      return String(text || '').trim()
    }
    return `${String(text || '').trim()}\n0 for menu | 6 for officer help`
  } catch (err) {
    const fallbacks = {
      gu: '❓ હું સમજ્યો નહિ. 0 ટાઇપ કરો menu માટે અથવા 6 ટાઇપ કરો officer માટે.',
      hi: '❓ मुझे समझ नहीं आया। 0 टाइप करें menu के लिए या 6 officer के लिए।',
      en: "❓ I did not understand. Type 0 for menu or 6 for officer.",
      hinglish: '❓ Samajh nahi aaya. 0 type karo menu ke liye ya 6 officer ke liye.'
    }
    return fallbacks[lang] || fallbacks.en
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
    // Try dynamic generation using Groq
    const alertContext = alerts.slice(0, 3)
      .map((a, i) => `${i + 1}. ${a.message || a.reason}`)
      .join('\n');

    const systemPrompt = language === 'gu'
      ? `You are KhedutMitra, a warm and helpful Gujarati-speaking agricultural advisor. Generate a brief, friendly welcome message for a farmer. Keep it under 120 characters. Mention you have important updates. NO MARKDOWN OR EMOJIS.`
      : `You are KhedutMitra, a helpful agricultural advisor. Generate a warm welcome in ${language}. Keep under 120 chars. NO MARKDOWN.`;

    const userPrompt = `Welcome message for farmer ${farmer.name}. Crop: ${farmer.primary_crop}. District: ${farmer.district}. They have ${alerts.length} alerts. Be warm and personalized.`;

    const groqResponse = await callGroq(systemPrompt, userPrompt, 200);

    if (groqResponse) {
      let msg = groqResponse;
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
    logger.warn('Groq welcome generation failed, using default', {
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
    const text = await callGroq(systemPrompt, userPrompt, 120)
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
    // Try dynamic generation with Groq based on stage and farmer context
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

    const groqResponse = await callGroq(systemPrompt, userPrompt, 250);
    if (groqResponse) return groqResponse;
  } catch (err) {
    logger.warn('Groq stage intro failed', { stage, error: err.message });
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
      return `હવામાન - ${crop}:\n• આગામી સપ્તાહ ઓછો વરસાદ\n• સિંચાઈ યોજના બદલો\n• જમીન આવરણ પદ્ધતિ અપનાવો.`;
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
  const lang = language || conv.language || 'gu'
  const intro = await generateStageIntro('insurance_flow', conv, lang)
  const message = `${intro}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message, nextStage: 'menu' }
  }
  return message
}

async function handlePmKisanFlow(conv, input, language) {
  const lang = language || conv.language || 'gu'
  const intro = await generateStageIntro('pmkisan_flow', conv, lang)
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
  const intro = await generateStageIntro('scheme_flow', conv, lang)
  const message = `${intro}\n\n0 for menu | 6 for officer help`

  if (typeof input !== 'undefined') {
    return { message, nextStage: 'menu' }
  }
  return message
}

async function handleProfileView(conv, input, language) {
  const lang = language || conv.language || 'gu'

  const systemPrompt = `You are GraamAI bot. Generate a farmer profile summary message in ${getLanguageName(lang)}. Keep it under 250 characters. Use simple words and plain text only.`

  const userPrompt = `Farmer details:\nName: ${conv.farmer_name || 'Farmer'}\nVillage: ${conv.village || 'N/A'}, ${conv.district || 'N/A'}\nCrop: ${conv.primary_crop || 'N/A'}\nLand: ${conv.land_size || 'N/A'} acres\nVulnerability score: ${conv.vulnerability_score || 'N/A'}/100 (${conv.vulnerability_label || 'unknown'})\nInsurance: ${conv.has_crop_insurance ? 'Yes' : 'No'}\nPM-KISAN: ${conv.pm_kisan_enrolled ? 'Enrolled' : 'Not enrolled'}\nLoan: ${conv.loan_type || 'None'}\nEnd with top 1 risk or action.`

  let message
  try {
    message = await callGroq(systemPrompt, userPrompt, 220)
    if (!message) {
      throw new Error('Empty Groq response')
    }
  } catch (err) {
    message = getProfileNotFoundMsg(lang)
  }

  const finalMessage = `${String(message || '').trim()}\n0 for menu | 6 for officer help`

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

async function handleOfficerConnect(conv, input, language) {
  const lang = language || conv.language || 'gu'
  await generateAlert({
    farmerId: conv.farmer_id,
    organizationId: conv.organization_id,
    alertType: ALERT_TYPES.OFFICER_CALLBACK,
    language: lang,
    contextData: {
      farmerConcern: input || 'Farmer requested officer callback via WhatsApp'
    },
    sendWhatsAppMessage: false
  })

  const message = `${getOfficerConfirmation(lang)}\n0 for menu | 6 for officer help`
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
  updateStage,
  saveContext,
  getConversationHistory,
  buildContextualPrompt,
  buildFarmerContext
}
