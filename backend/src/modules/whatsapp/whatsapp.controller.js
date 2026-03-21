const twilio = require('twilio')
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
    const body = req.body.Body // farmer's reply text
    const messageSid = req.body.MessageSid // Twilio message ID
    const messageStatus = req.body.MessageStatus // 'sent', 'delivered', 'read', etc.

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
    if (fromPhone && body) {
      await whatsappService.handleInboundMessage(fromPhone, body)
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
    const sid = await whatsappService.sendMessage(testPhone, testMessage)

    res.json(successResponse(
      { messageSid: sid, testPhone },
      'Test message sent successfully'
    ))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  initiateBot,
  handleWebhook,
  getConversations,
  getMessages,
  testTwilio
}
