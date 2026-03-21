const express = require('express')
const router = express.Router()
const controller = require('./whatsapp.controller')
const { authenticate, requireRole } = require('../../middleware/auth')

/**
 * POST /api/whatsapp/send/:farmerId
 * Bank officer triggers bot for a specific farmer
 * Protected - requires authentication and officer/admin role
 */
router.post(
  '/send/:farmerId',
  authenticate,
  requireRole('superadmin', 'org_admin', 'field_officer'),
  controller.initiateBot
)

/**
 * POST /api/whatsapp/webhook
 * Twilio webhook — receives farmer replies and message updates
 * NO authentication — Twilio calls this publicly
 * Validated using Twilio signature in production
 */
router.post('/webhook', controller.handleWebhook)

/**
 * GET /api/whatsapp/conversations/:farmerId
 * Get conversation history for a farmer
 * Protected - requires authentication
 */
router.get(
  '/conversations/:farmerId',
  authenticate,
  requireRole('superadmin', 'org_admin', 'field_officer'),
  controller.getConversations
)

/**
 * GET /api/whatsapp/messages/:conversationId
 * Get all messages for a conversation
 * Protected - requires authentication
 */
router.get(
  '/messages/:conversationId',
  authenticate,
  requireRole('superadmin', 'org_admin', 'field_officer'),
  controller.getMessages
)

/**
 * POST /api/whatsapp/test
 * Test endpoint to verify Twilio integration
 * Protected - superadmin only
 */
router.post(
  '/test',
  authenticate,
  requireRole('superadmin'),
  controller.testTwilio
)

module.exports = router
