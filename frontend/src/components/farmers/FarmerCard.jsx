import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, MapPin, Trash2, RefreshCw } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import VulnerabilityScoreBadge from './VulnerabilityScoreBadge'
import { formatCurrency } from '@/utils/formatters'
import useLanguage from '@/hooks/useLanguage'
import TranslatedText from '@/components/common/TranslatedText'

export default function FarmerCard({ farmer, index }) {
  const navigate = useNavigate()
  const { t } = useLanguage()

  if (!farmer) return null

  return (
    <motion.div
      // Remove initial opacity: 0 to ensure visibility even if animation fails
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index % 10) * 0.05, duration: 0.3 }}
      onClick={() => navigate(`/farmers/${farmer.id}`)}
      className="bg-white rounded-xl border border-gray-100 p-4 shadow-card hover:shadow-card-hover transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={farmer.name} size="md" />
          <div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0F4C35] transition-colors">
              <TranslatedText>{farmer.name || 'Unknown Farmer'}</TranslatedText>
            </p>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <MapPin className="w-3 h-3" />
              <div className="flex gap-1">
                <TranslatedText>{farmer.village}</TranslatedText>
                <span>,</span>
                <TranslatedText>{farmer.district}</TranslatedText>
              </div>
            </div>
          </div>
        </div>
        <VulnerabilityScoreBadge 
          score={farmer.vulnerability_score} 
          label={farmer.vulnerability_label}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gray-50/50">
          <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">{t('farmers.card.primary_crop')}</p>
          <p className="text-xs font-medium text-gray-700">
            <TranslatedText>{farmer.primary_crop || 'N/A'}</TranslatedText>
          </p>
        </div>
        <div className="p-2 rounded-lg bg-gray-50/50">
          <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">{t('farmers.card.land_area')}</p>
          <p className="text-xs font-medium text-gray-700">
            {farmer.land_area_acres || 'N/A'} {t('common.acres')}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-gray-50/50">
          <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">{t('farmers.card.annual_income')}</p>
          <p className="text-xs font-medium text-gray-700">
            {farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : '₹0'}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-gray-50/50">
          <p className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">{t('farmers.card.language')}</p>
          <p className="text-xs font-medium text-gray-700">{farmer.language || 'Gu'}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-[10px]">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Phone className="w-3 h-3" />
          <span>{farmer.phone || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-1 hover:text-[#0F4C35] hover:bg-[#0F4C35]/5 rounded transition">
            <RefreshCw className="w-3 h-3" />
          </button>
          <button className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition text-gray-400">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
