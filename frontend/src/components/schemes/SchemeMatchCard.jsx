import { motion } from 'framer-motion'
import { FileText, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import TranslatedText from '@/components/common/TranslatedText'

const statusConfig = {
  eligible: { variant: 'info', icon: Clock, label: 'Eligible' },
  applied: { variant: 'warning', icon: Clock, label: 'Applied' },
  approved: { variant: 'success', icon: CheckCircle2, label: 'Approved' },
  rejected: { variant: 'critical', icon: XCircle, label: 'Rejected' },
  disbursed: { variant: 'success', icon: CheckCircle2, label: 'Disbursed' },
}

export default function SchemeMatchCard({ match, onUpdateStatus, index = 0 }) {
  const scheme = match.scheme || match
  const status = statusConfig[match.application_status || 'eligible']

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border border-gray-100 shadow-card hover:shadow-card-hover
                 transition-all duration-200 p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-brand-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              <TranslatedText>{scheme.scheme_name || scheme.name || 'Government Scheme'}</TranslatedText>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              <TranslatedText>{scheme.ministry || 'Ministry of Agriculture'}</TranslatedText>
            </p>
          </div>
        </div>
        <Badge variant={status.variant} size="sm" dot>
          {status.label}
        </Badge>
      </div>

      {scheme.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          <TranslatedText>{scheme.description}</TranslatedText>
        </p>
      )}

      {match.match_score !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-500">Match confidence</span>
            <span className="text-xs font-bold text-[#0F4C35]">
              {Math.round(match.match_score)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="h-1.5 bg-[#0F4C35] rounded-full transition-all"
              style={{ width: `${match.match_score}%` }}
            />
          </div>
        </div>
      )}

      {onUpdateStatus && match.application_status === 'eligible' && (
        <div className="flex gap-2 pt-2 border-t border-gray-50">
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            onClick={() => onUpdateStatus(match.id, 'applied')}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onUpdateStatus(match.id, 'rejected')}
          >
            Skip
          </Button>
        </div>
      )}
    </motion.div>
  )
}
