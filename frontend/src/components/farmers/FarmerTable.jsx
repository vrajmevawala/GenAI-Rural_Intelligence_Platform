import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, MoreVertical, Eye, Trash2, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import VulnerabilityScoreBadge from './VulnerabilityScoreBadge'
import Avatar from '@/components/ui/Avatar'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import useLanguage from '@/hooks/useLanguage'
import TranslatedText from '@/components/common/TranslatedText'

export default function FarmerTable({ farmers = [], onDelete, onRecalculate, sortConfig, onSort }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(null)
  const { t } = useLanguage()

  const columns = [
    { key: 'name', label: t('farmers.table.farmer') },
    { key: 'district', label: t('farmers.table.district') },
    { key: 'primary_crop', label: t('farmers.table.crop') },
    { key: 'land_area_acres', label: t('farmers.table.land') },
    { key: 'vulnerability_score', label: t('farmers.table.score') },
    { key: 'annual_income_inr', label: t('farmers.table.income') },
    { key: 'created_at', label: t('farmers.table.registered') },
  ]

  const SortIcon = ({ colKey }) => {
    if (sortConfig?.key !== colKey) return null
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort?.(col.key)}
                  className={cn(
                    'text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider',
                    onSort && 'cursor-pointer hover:text-gray-700 transition-colors select-none'
                  )}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </span>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {farmers.map((farmer, idx) => (
              <motion.tr
                key={farmer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => navigate(`/farmers/${farmer.id}`)}
                className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={farmer.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 group-hover:text-[#0F4C35] transition-colors">
                        <TranslatedText>{farmer.name}</TranslatedText>
                      </p>
                      <p className="text-xs text-gray-400">
                        <TranslatedText>{farmer.village}</TranslatedText>
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <TranslatedText>{farmer.district}</TranslatedText>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <TranslatedText>{farmer.primary_crop}</TranslatedText>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{farmer.land_area_acres || '—'}</td>
                <td className="px-4 py-3">
                  <VulnerabilityScoreBadge
                    score={farmer.vulnerability_score}
                    label={farmer.vulnerability_label}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {farmer.created_at ? formatDate(farmer.created_at) : '—'}
                </td>
                <td className="px-4 py-3 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(menuOpen === farmer.id ? null : farmer.id)
                    }}
                    className="p-1 rounded hover:bg-gray-100 transition"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  {menuOpen === farmer.id && (
                    <div className="absolute right-4 top-full z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/farmers/${farmer.id}`)
                          setMenuOpen(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> View details
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRecalculate?.(farmer.id)
                          setMenuOpen(null)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Recalculate
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(farmer.id)
                            setMenuOpen(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
