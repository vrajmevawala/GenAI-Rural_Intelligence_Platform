import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import VulnerabilityScoreBadge from '@/components/farmers/VulnerabilityScoreBadge'
import Avatar from '@/components/ui/Avatar'
import Skeleton from '@/components/ui/Skeleton'
import TranslatedText from '@/components/common/TranslatedText'

export default function HighRiskFarmerList({ data = [], isLoading = false }) {
  const navigate = useNavigate()

  const farmers = Array.isArray(data) ? data : data?.rows || data?.farmers || []

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-28 mb-1" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (farmers.length === 0) {
    return <p className="text-xs text-gray-400 px-2 py-3">No high-risk farmers found.</p>
  }

  return (
    <div className="space-y-0.5">
      {farmers.map((farmer, idx) => (
        <motion.div
          key={farmer.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: idx * 0.05 }}
          onClick={() => navigate(`/farmers/${farmer.id}`)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50
                     transition-colors cursor-pointer group"
        >
          <span className="text-[10px] font-bold text-gray-300 w-4 text-center">
            {idx + 1}
          </span>
          <Avatar name={farmer.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate group-hover:text-[#0F4C35]">
              <TranslatedText>{farmer.name}</TranslatedText>
            </p>
            <p className="text-[10px] text-gray-400 truncate">
              <TranslatedText>{farmer.village}</TranslatedText>, <TranslatedText>{farmer.district}</TranslatedText>
            </p>
          </div>
          <VulnerabilityScoreBadge
            score={farmer.vulnerability_score}
            label={farmer.vulnerability_label || (farmer.vulnerability_score > 80 ? 'critical' : 'high')}
            size="sm"
          />
        </motion.div>
      ))}
    </div>
  )
}
