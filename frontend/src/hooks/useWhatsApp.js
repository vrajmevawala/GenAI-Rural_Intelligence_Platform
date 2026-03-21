import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as whatsappApi from '@/api/whatsapp.api'
import toast from 'react-hot-toast'

/**
 * Hook to send WhatsApp alert to a farmer
 * Returns mutation with loading/error states
 */
export function useSendWhatsAppAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ farmerId, language = 'gu' }) =>
      whatsappApi.sendWhatsAppAlert(farmerId, language).then(r => r.data),
    onSuccess: (data) => {
      toast.success('WhatsApp message sent to farmer!')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] })
    },
    onError: (err) => {
      const message = err.response?.data?.error?.message || 'Failed to send WhatsApp message'
      toast.error(message)
    }
  })
}

/**
 * Hook to fetch conversation history for a farmer
 */
export function useWhatsAppConversations(farmerId) {
  return useQuery({
    queryKey: ['whatsapp-conversations', farmerId],
    queryFn: () => whatsappApi.getWhatsAppConversations(farmerId).then(r => r.data?.data || r.data),
    enabled: !!farmerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook to fetch messages in a conversation
 */
export function useWhatsAppMessages(conversationId) {
  return useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: () => whatsappApi.getWhatsAppMessages(conversationId).then(r => r.data?.data || r.data),
    enabled: !!conversationId,
    staleTime: 1000 * 30, // 30 seconds - refresh more often as messages arrive
  })
}

/**
 * Hook to test Twilio integration
 */
export function useTestWhatsApp() {
  return useMutation({
    mutationFn: (testPhone) =>
      whatsappApi.testWhatsAppIntegration(testPhone).then(r => r.data),
    onSuccess: () => {
      toast.success('Test message sent successfully!')
    },
    onError: (err) => {
      const message = err.response?.data?.error?.message || 'Failed to send test message'
      toast.error(message)
    }
  })
}
