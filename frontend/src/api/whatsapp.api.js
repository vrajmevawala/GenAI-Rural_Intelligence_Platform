import api from './axios'

/**
 * Send real WhatsApp message to farmer
 * Triggers bot conversation on farmer's phone
 * POST /api/whatsapp/send/:farmerId
 */
export const sendWhatsAppAlert = (farmerId, language = 'gu') =>
  api.post(`/whatsapp/send/${farmerId}`, { language })

/**
 * Get conversation history for a farmer
 * GET /api/whatsapp/conversations/:farmerId
 */
export const getWhatsAppConversations = (farmerId) =>
  api.get(`/whatsapp/conversations/${farmerId}`)

/**
 * Get all messages in a conversation
 * GET /api/whatsapp/messages/:conversationId
 */
export const getWhatsAppMessages = (conversationId) =>
  api.get(`/whatsapp/messages/${conversationId}`)

/**
 * Test Twilio integration (admin only)
 * Sends a test WhatsApp message
 * POST /api/whatsapp/test
 */
export const testWhatsAppIntegration = (testPhone) =>
  api.post('/whatsapp/test', { testPhone })

/**
 * Send an alert as WhatsApp MP3 voice + text.
 * audioBase64 should be data URL or plain base64.
 */
export const sendAlertVoiceMp3 = (alertId, { audioBase64, text } = {}) =>
  api.post(`/whatsapp/send-alert-voice/${alertId}`, { audioBase64, text })
