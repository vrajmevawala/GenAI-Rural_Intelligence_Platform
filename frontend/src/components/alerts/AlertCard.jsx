import { motion } from 'framer-motion'
import { User, Calendar, Volume2, Send } from 'lucide-react'
import AlertPriorityBadge from './AlertPriorityBadge'
import Badge from '@/components/ui/Badge'
import { formatRelative } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import TranslatedText from '@/components/common/TranslatedText'
import toast from 'react-hot-toast'
import { sendAlertVoiceMp3 } from '@/api/whatsapp.api'

const borderColors = {
  low: 'border-l-emerald-400',
  medium: 'border-l-amber-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-400',
}

const typeIcons = {
  weather: '🌧️',
  loan_repayment: '💰',
  insurance_expiry: '🛡️',
  scheme_eligibility: '📋',
  crop_advisory: '🌾',
  market_price: '📊',
}

const financialTypes = new Set([
  'insurance_expiry',
  'loan_overdue',
  'pm_kisan_pending',
  'scheme_opportunity',
  'score_change',
  'officer_callback',
  'vulnerability_spike',
  'market_price',
])

function getAlertDomain(alert) {
  if (alert?.alert_domain) return alert.alert_domain
  return financialTypes.has(alert?.alert_type) ? 'financial' : 'agriculture'
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function AlertCard({ alert, onStatusUpdate, index = 0 }) {
  const alertDomain = getAlertDomain(alert)

  const handlePlayVoice = async () => {
    const text = String(alert?.voice_note_script || alert?.message_text || alert?.message || '').trim()
    if (!text) {
      toast.error('No voice text available for this alert')
      return
    }

    if (!window.puter?.ai?.txt2speech) {
      toast.error('Puter voice service is not available')
      return
    }

    try {
      const audio = await window.puter.ai.txt2speech(text)

      if (audio?.play) {
        await audio.play()
      } else {
        toast.error('Unable to play generated audio')
      }
    } catch (err) {
      toast.error('Failed to generate voice with Puter')
      console.error('Puter txt2speech failed:', err)
    }
  }

  const handleSendVoiceToWhatsApp = async () => {
    const voiceText = String(alert?.voice_note_script || alert?.message_text || alert?.message || '').trim()
    const textMessage = String(alert?.message_text || alert?.message || voiceText).trim()

    if (!alert?.id) {
      toast.error('Alert ID is missing')
      return
    }

    if (!voiceText) {
      toast.error('No voice text available for this alert')
      return
    }

    if (!window.puter?.ai?.txt2speech) {
      toast.error('Puter voice service is not available')
      return
    }

    try {
      const audio = await window.puter.ai.txt2speech(voiceText)
      const audioSrc = audio?.src
      if (!audioSrc) throw new Error('No audio source returned by Puter')

      const response = await fetch(audioSrc)
      const blob = await response.blob()
      const audioBase64 = await blobToDataUrl(blob)

      await sendAlertVoiceMp3(alert.id, {
        audioBase64,
        text: textMessage
      })

      toast.success('Voice + text sent on WhatsApp')
    } catch (err) {
      console.error('Failed to send alert voice to WhatsApp:', err)
      toast.error(
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Failed to send voice alert on WhatsApp'
      )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover',
        'transition-all duration-200 p-4 border-l-4',
        borderColors[alert.priority] || borderColors.low
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeIcons[alert.alert_type] || '📢'}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 capitalize">
              <TranslatedText>{alert.alert_type?.replace(/_/g, ' ') || 'Alert'}</TranslatedText>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                <TranslatedText>{alert.farmer_name || 'Unknown farmer'}</TranslatedText>
              </span>
              <Badge variant="default" size="sm">
                {alertDomain}
              </Badge>
            </div>
          </div>
        </div>
        <AlertPriorityBadge priority={alert.priority} />
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        <TranslatedText>{alert.message_content || alert.message || 'No message content'}</TranslatedText>
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={alert.status === 'sent' ? 'success' : alert.status === 'failed' ? 'critical' : 'default'} size="sm">
            {alert.status || 'pending'}
          </Badge>
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {alert.created_at ? formatRelative(alert.created_at) : 'Recently'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayVoice}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="Play voice note"
          >
            <Volume2 className="w-3 h-3" />
            Voice
          </button>
          <button
            type="button"
            onClick={handleSendVoiceToWhatsApp}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-[#0F4C35] hover:bg-[#0c3e2b] text-white"
            title="Send voice + text on WhatsApp"
          >
            <Send className="w-3 h-3" />
            WA MP3
          </button>
        </div>
      </div>
    </motion.div>
  )
}
