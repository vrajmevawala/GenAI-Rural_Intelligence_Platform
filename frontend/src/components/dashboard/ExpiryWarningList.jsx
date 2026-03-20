import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Shield, Calendar, AlertTriangle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { formatDaysRemaining } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import useLanguage from '@/hooks/useLanguage'
import TranslatedText from '@/components/common/TranslatedText'

export default function ExpiryWarningList({ data = [], isLoading = false }) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  const displayItems = data.length > 0 ? data : [
    { id: 1, farmer_name: 'Ramesh Patel', farmer_id: 1, type: 'insurance', expiry_date: new Date(Date.now() + 5 * 86400000).toISOString(), district: 'Banaskantha' },
    { id: 2, farmer_name: 'Suresh Bhatt', farmer_id: 2, type: 'loan', expiry_date: new Date(Date.now() + 3 * 86400000).toISOString(), district: 'Kutch' },
    { id: 3, farmer_name: 'Geeta Devi', farmer_id: 3, type: 'insurance', expiry_date: new Date(Date.now() - 2 * 86400000).toISOString(), district: 'Banaskantha' },
    { id: 4, farmer_name: 'Jayaben Solanki', farmer_id: 4, type: 'loan', expiry_date: new Date(Date.now() + 10 * 86400000).toISOString(), district: 'Kutch' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-32 mb-1" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {displayItems.map((item, idx) => {
        const remaining = formatDaysRemaining(item.expiry_date)
        const isOverdue = remaining.startsWith('Overdue')
        const isUrgent = remaining === 'Due today' || remaining === 'Due tomorrow' || isOverdue

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(`/farmers/${item.farmer_id}`)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50
                       transition-colors cursor-pointer"
          >
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
              item.type === 'insurance' ? 'bg-blue-50' : 'bg-amber-50'
            )}>
              {item.type === 'insurance' ? (
                <Shield className="w-4 h-4 text-blue-500" />
              ) : (
                <Calendar className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                <TranslatedText>{item.farmer_name}</TranslatedText>
              </p>
              <p className="text-[10px] text-gray-400 capitalize">
                {t(`farmers.details.fields.${item.type}`)} · <TranslatedText>{item.district}</TranslatedText>
              </p>
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold whitespace-nowrap',
                isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'
              )}
            >
              {isUrgent && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
              <TranslatedText>{remaining}</TranslatedText>
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
