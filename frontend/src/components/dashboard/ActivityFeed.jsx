import { motion } from 'framer-motion'
import { Bell, UserPlus, RefreshCw, AlertTriangle, FileText, Shield } from 'lucide-react'
import { useActivityFeed } from '@/hooks/useDashboard'
import { formatRelative } from '@/utils/formatters'
import Skeleton from '@/components/ui/Skeleton'
import { cn } from '@/utils/cn'
import TranslatedText from '@/components/common/TranslatedText'

const typeIcons = {
  alert_sent: Bell,
  farmer_added: UserPlus,
  score_updated: RefreshCw,
  high_risk: AlertTriangle,
  scheme_matched: FileText,
  insurance_expiry: Shield,
}

const typeColors = {
  alert_sent: 'bg-blue-50 text-blue-600',
  farmer_added: 'bg-emerald-50 text-emerald-600',
  score_updated: 'bg-purple-50 text-purple-600',
  high_risk: 'bg-red-50 text-red-600',
  scheme_matched: 'bg-amber-50 text-amber-600',
  insurance_expiry: 'bg-orange-50 text-orange-600',
}

export default function ActivityFeed({ data: providedData, isLoading: providedLoading = false }) {
  const { data: hookData, isLoading: hookLoading } = useActivityFeed()

  const sourceData = providedData ?? hookData
  const isLoading = providedData ? providedLoading : hookLoading
  const activities = Array.isArray(sourceData) ? sourceData : sourceData?.activities || []

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-3 w-48 mb-1.5" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return <p className="text-xs text-gray-400 px-2 py-3">No recent activity found.</p>
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, idx) => {
        const Icon = typeIcons[activity.type] || Bell
        const color = typeColors[activity.type] || 'bg-gray-50 text-gray-600'

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-relaxed">
                <TranslatedText>{activity.message}</TranslatedText>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {activity.created_at ? formatRelative(activity.created_at) : 'Recently'}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
