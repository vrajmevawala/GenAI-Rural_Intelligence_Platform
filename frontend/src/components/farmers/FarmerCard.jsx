import { motion } from 'framer-motion'
import { MapPin, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import VulnerabilityScoreBadge from './VulnerabilityScoreBadge'
import Avatar from '@/components/ui/Avatar'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export default function FarmerCard({ farmer, index = 0 }) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/farmers/${farmer.id}`)}
      className="bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover
                 transition-all duration-200 cursor-pointer group p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={farmer.name} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0F4C35] transition-colors">
              {farmer.name}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {farmer.village}, {farmer.district}
              </span>
            </div>
          </div>
        </div>
        <VulnerabilityScoreBadge
          score={farmer.vulnerability_score}
          label={farmer.vulnerability_label}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <span className="text-gray-400 block mb-0.5">Primary crop</span>
          <span className="font-medium text-gray-700">{farmer.primary_crop || 'N/A'}</span>
        </div>
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <span className="text-gray-400 block mb-0.5">Land area</span>
          <span className="font-medium text-gray-700">{farmer.land_area_acres || 0} acres</span>
        </div>
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <span className="text-gray-400 block mb-0.5">Annual income</span>
          <span className="font-medium text-gray-700">
            {farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : 'N/A'}
          </span>
        </div>
        <div className="bg-gray-50 rounded-lg px-2.5 py-2">
          <span className="text-gray-400 block mb-0.5">Language</span>
          <span className="font-medium text-gray-700 capitalize">
            {farmer.preferred_language || 'gu'}
          </span>
        </div>
      </div>

      {farmer.phone && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Phone className="w-3 h-3" />
          <span>{farmer.phone}</span>
        </div>
      )}
    </motion.div>
  )
}
