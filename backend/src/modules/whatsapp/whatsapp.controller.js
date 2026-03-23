const twilio = require('twilio')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const ffmpegStatic = require('ffmpeg-static')
const whatsappService = require('./whatsapp.service')
const { pool } = require('../../config/db')
const { successResponse, errorResponse } = require('../../utils/apiResponse')
const { AppError } = require('../../middleware/errorHandler')
const { info, error: logError } = require('../../utils/logger')

/**
 * POST /api/whatsapp/send/:farmerId
 * Called from dashboard when officer clicks "Send WhatsApp Alert"
 * Protected route - requires authentication and farm officer role
 */
async function initiateBot(req, res, next) {
  try {
    const { farmerId } = req.params
    const { language = 'gu' } = req.body
    const authenticatedUser = req.user

    // Verify request has required fields
    if (!farmerId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Farm ID is required'))
    }

    info('WhatsApp bot initiation', {
      farmerId,
      initiatedBy: authenticatedUser?.userId,
      language,
      organizationId: authenticatedUser?.institutionId,
      action: 'whatsapp.initiate'
    })

    const result = await whatsappService.initiateBot(
      farmerId,
      authenticatedUser?.institutionId,
      language
    )

    res.json(successResponse(result, 'WhatsApp message sent successfully'))
  } catch (err) {
    logError('WhatsApp initiation failed', err)
    next(err)
  }
}

/**
 * POST /api/whatsapp/webhook
 * Called by Twilio when farmer replies or message status changes
 * NO JWT auth — Twilio signature validation used instead
 * Must respond with TwiML <Response></Response> — Twilio needs this
 */
async function handleWebhook(req, res, next) {
  try {
    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const twilioSignature = req.headers['x-twilio-signature']
      const url = `${process.env.NGROK_URL}/api/whatsapp/webhook`
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        req.body
      )
      if (!isValid) {
        logError('Invalid Twilio signature', { headers: req.headers })
        res.set('Content-Type', 'text/xml')
        return res.send('<Response></Response>')
      }
    }

    const fromPhone = req.body.From // e.g. "whatsapp:+919876543210"
    const body = req.body.Body || '' // farmer's reply text
    const messageSid = req.body.MessageSid // Twilio message ID
    const messageStatus = req.body.MessageStatus // 'sent', 'delivered', 'read', etc.
    const numMedia = parseInt(req.body.NumMedia || 0, 10)
    const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null
    const mediaType = numMedia > 0 ? req.body.MediaContentType0 : null
    const isImage = Boolean(mediaType && mediaType.startsWith('image/'))

    info('Webhook received', {
      from: fromPhone,
      messageSid,
      status: messageStatus,
      action: 'whatsapp.webhook'
    })

    // Handle message status updates (optional)
    if (messageStatus && !body) {
      info('Message status update', { messageSid, status: messageStatus })
      res.set('Content-Type', 'text/xml')
      return res.send('<Response></Response>')
    }

    // Handle farmer reply
    if (fromPhone && (body || isImage)) {
      await whatsappService.handleInboundMessage(
        fromPhone,
        body,
        isImage ? mediaUrl : null
      )
    }

    // Twilio expects a TwiML response or empty 200
    res.set('Content-Type', 'text/xml')
    res.send('<Response></Response>')
  } catch (err) {
    logError('Webhook error', err)
    // Still return 200 so Twilio doesn't retry
    res.set('Content-Type', 'text/xml')
    res.send('<Response></Response>')
  }
}

/**
 * GET /api/whatsapp/conversations/:farmerId
 * Get all WhatsApp conversation history for a farmer
 * Protected route
 */
async function getConversations(req, res, next) {
  try {
    const { farmerId } = req.params
    const authenticatedUser = req.user

    if (!farmerId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Farm ID is required'))
    }

    const result = await pool.query(
      `SELECT wc.id, wc.phone_number, wc.language, wc.current_stage,
              wc.is_active, wc.created_at, wc.updated_at,
              COUNT(wm.id) as message_count,
              MAX(wm.created_at) as last_message_at
       FROM whatsapp_conversations wc
       LEFT JOIN whatsapp_messages wm ON wm.conversation_id = wc.id
       WHERE wc.farmer_id = $1 AND wc.organization_id = $2
       GROUP BY wc.id
       ORDER BY wc.created_at DESC`,
      [farmerId, authenticatedUser?.organizationId]
    )

    res.json(successResponse(result.rows, 'Conversations retrieved'))
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/whatsapp/messages/:conversationId
 * Get all messages in a specific conversation
 * Protected route
 */
async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params

    if (!conversationId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Conversation ID is required'))
    }

    const result = await pool.query(
      `SELECT wm.id, wm.direction, wm.body, wm.status,
              wm.created_at, wm.twilio_sid
       FROM whatsapp_messages wm
       WHERE wm.conversation_id = $1 
       ORDER BY wm.created_at ASC`,
      [conversationId]
    )

    res.json(successResponse(result.rows, 'Messages retrieved'))
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/whatsapp/test
 * Test endpoint to verify Twilio credentials are working
 * Admin only - useful for debugging setup
 */
async function testTwilio(req, res, next) {
  try {
    const testPhone = req.body.testPhone
    if (!testPhone) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Test phone number required in format +91XXXXXXXXXX'))
    }

    const testMessage = `Test message from KhedutMitra at ${new Date().toLocaleString()}`
    const normalizedPhone = whatsappService.normalizePhoneNumber(testPhone)
    const sid = await whatsappService.sendMessage(normalizedPhone, testMessage)

    res.json(successResponse(
      { messageSid: sid, testPhone: normalizedPhone },
      'Test message sent successfully'
    ))
  } catch (err) {
    next(err)
  }
}

async function resolveNgrokBaseUrl() {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', { method: 'GET' })
    if (!res.ok) return null
    const data = await res.json()
    const tunnels = Array.isArray(data?.tunnels) ? data.tunnels : []
    const httpsTunnel = tunnels.find((t) => t?.public_url && String(t.public_url).startsWith('https://'))
    if (!httpsTunnel?.public_url) return null
    return String(httpsTunnel.public_url).replace(/\/+$/, '')
  } catch (_) {
    return null
  }
}

async function resolvePublicBaseUrl(req) {
  const ngrokDetected = await resolveNgrokBaseUrl()

  const candidates = [
    ngrokDetected,
    process.env.PUBLIC_BASE_URL,
    process.env.APP_BASE_URL,
    process.env.NGROK_URL
  ].filter(Boolean)

  if (candidates.length === 0) return null
  return String(candidates[0]).replace(/\/+$/, '')
}

function parseBase64Audio(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  const dataUrlMatch = raw.match(/^data:(audio\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      buffer: Buffer.from(dataUrlMatch[2], 'base64')
    }
  }

  return {
    mimeType: 'audio/mpeg',
    buffer: Buffer.from(raw, 'base64')
  }
}

async function convertToOggOpus(inputBuffer, inputMimeType = 'audio/mpeg') {
  const tempId = uuidv4()
  const tempDir = os.tmpdir()
  const inputExt = inputMimeType.includes('wav')
    ? 'wav'
    : inputMimeType.includes('ogg')
      ? 'ogg'
      : inputMimeType.includes('webm')
        ? 'webm'
        : 'mp3'

  const inputPath = path.join(tempDir, `voice_in_${tempId}.${inputExt}`)
  const outputPath = path.join(tempDir, `voice_out_${tempId}.ogg`)

  fs.writeFileSync(inputPath, inputBuffer)

  await new Promise((resolve, reject) => {
    const ffmpegBin = ffmpegStatic || 'ffmpeg'
    const ffmpeg = spawn(ffmpegBin, [
      '-y',
      '-i', inputPath,
      '-c:a', 'libopus',
      '-b:a', '32k',
      '-vbr', 'on',
      '-compression_level', '10',
      outputPath
    ])

    let stderr = ''
    ffmpeg.stderr.on('data', (chunk) => {
      stderr += String(chunk || '')
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`ffmpeg not available: ${err.message}`))
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) return resolve()
      reject(new Error(`ffmpeg conversion failed (${code}): ${stderr.slice(0, 240)}`))
    })
  })

  const oggBuffer = fs.readFileSync(outputPath)

  try { fs.unlinkSync(inputPath) } catch (_) {}
  try { fs.unlinkSync(outputPath) } catch (_) {}

  return oggBuffer
}

/**
 * POST /api/whatsapp/send-alert-voice/:alertId
 * Send alert as WhatsApp audio (mp3) + text. Audio is generated client-side via Puter.
 */
async function sendAlertVoice(req, res, next) {
  try {
    const { alertId } = req.params
    const { audioBase64, text } = req.body || {}

    if (!alertId) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Alert ID is required'))
    }

    if (!audioBase64) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'audioBase64 is required'))
    }

    const publicBaseUrl = await resolvePublicBaseUrl(req)
    if (!publicBaseUrl) {
      return res.status(400).json(
        errorResponse('BAD_REQUEST', 'PUBLIC_BASE_URL or NGROK_URL is required to send media on WhatsApp')
      )
    }

    const alertRes = await pool.query(
      `SELECT a.id, a.farmer_id, a.message_text, a.message, f.phone
       FROM alerts a
       JOIN farmers f ON f.id = a.farmer_id
       WHERE a.id = $1
       LIMIT 1`,
      [alertId]
    )

    if (alertRes.rows.length === 0) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Alert not found'))
    }

    const alert = alertRes.rows[0]
    const phone = whatsappService.normalizePhoneNumber(alert.phone)
    if (!phone) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Farmer phone number is invalid'))
    }

    const parsed = parseBase64Audio(audioBase64)
    if (!parsed || !parsed.buffer || parsed.buffer.length < 256) {
      return res.status(400).json(errorResponse('BAD_REQUEST', 'Invalid audio payload'))
    }

    let oggOpusBuffer
    try {
      oggOpusBuffer = await convertToOggOpus(parsed.buffer, parsed.mimeType)
    } catch (convErr) {
      return res.status(500).json(
        errorResponse(
          'VOICE_CONVERSION_FAILED',
          `Failed to convert audio to WhatsApp voice-note format (OGG/Opus). ${convErr.message}`
        )
      )
    }

    const fileName = `alert_${alert.id}_${Date.now()}_${uuidv4()}.ogg`
    const voiceDir = path.resolve(__dirname, '../../public/voice')
    fs.mkdirSync(voiceDir, { recursive: true })
    fs.writeFileSync(path.join(voiceDir, fileName), oggOpusBuffer)

    const mediaUrl = `${publicBaseUrl}/media/voice/${fileName}`
    const textMessage = String(text || alert.message_text || alert.message || 'Important alert').trim()

    // Best-effort probe: do not block delivery if local network cannot resolve the public URL.
    try {
      const mediaProbe = await fetch(mediaUrl, { method: 'GET' })
      if (!mediaProbe.ok) {
        info('Voice media URL probe returned non-200', {
          mediaUrl,
          status: mediaProbe.status,
          action: 'whatsapp.voice_probe'
        })
      }
    } catch (probeErr) {
      info('Voice media URL probe failed but continuing', {
        mediaUrl,
        reason: probeErr.message,
        action: 'whatsapp.voice_probe'
      })
    }

    const mediaSid = await whatsappService.sendMessage(phone, null, { mediaUrl })
    const textSid = await whatsappService.sendMessage(phone, textMessage)

    await pool.query(
      `UPDATE alerts
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [alert.id]
    )

    return res.json(successResponse({ mediaSid, textSid, mediaUrl }, 'Voice + text alert sent on WhatsApp'))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  initiateBot,
  handleWebhook,
  getConversations,
  getMessages,
  testTwilio,
  sendAlertVoice
}
