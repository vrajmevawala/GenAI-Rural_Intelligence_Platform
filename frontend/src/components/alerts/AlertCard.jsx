import { motion } from 'framer-motion'
import { Bell, User, Calendar, ChevronRight } from 'lucide-react'
import AlertPriorityBadge from './AlertPriorityBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { formatRelative } from '@/utils/formatters'
import { cn } from '@/utils/cn'

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

export default function AlertCard({ alert, onStatusUpdate, index = 0 }) {
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
              {alert.alert_type?.replace(/_/g, ' ') || 'Alert'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {alert.farmer_name || 'Unknown farmer'}
              </span>
            </div>
          </div>
        </div>
        <AlertPriorityBadge priority={alert.priority} />
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {alert.message_content || alert.message || 'No message content'}
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

        {alert.status === 'pending' && onStatusUpdate && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onStatusUpdate(alert.id, 'sent')}
            >
              Send
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusUpdate(alert.id, 'failed')}
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
