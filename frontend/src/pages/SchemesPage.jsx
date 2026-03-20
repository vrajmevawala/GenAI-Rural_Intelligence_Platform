import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Search, Zap } from 'lucide-react'
import { useSchemes, useBulkMatchSchemes } from '@/hooks/useSchemes'
import useAuthStore from '@/store/authStore'
import Card, { CardTitle, CardDescription } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'

export default function SchemesPage() {
  const { data, isLoading } = useSchemes()
  const bulkMatch = useBulkMatchSchemes()
  const { user } = useAuthStore()
  const canBulk = ['superadmin', 'org_admin'].includes(user?.role)
  const schemes = Array.isArray(data) ? data : data?.schemes || []

  const defaultSchemes = [
    { id: 1, scheme_name: 'PM-Kisan Samman Nidhi', ministry: 'Ministry of Agriculture', description: 'Direct income support of ₹6,000 per year to farmer families with cultivable land up to 2 hectares.', benefit_amount: 6000, eligible_criteria: 'Small & marginal farmers', status: 'active' },
    { id: 2, scheme_name: 'Pradhan Mantri Fasal Bima Yojana', ministry: 'Ministry of Agriculture', description: 'Crop insurance scheme providing financial support to farmers suffering crop loss due to natural calamities.', benefit_amount: 200000, eligible_criteria: 'All farmers with insurable crops', status: 'active' },
    { id: 3, scheme_name: 'Kisan Credit Card (KCC)', ministry: 'Ministry of Finance', description: 'Credit facility for farmers to meet agricultural and allied activities requirements.', benefit_amount: 300000, eligible_criteria: 'All farmers, fishermen, animal husbandry', status: 'active' },
    { id: 4, scheme_name: 'Soil Health Card Scheme', ministry: 'Ministry of Agriculture', description: 'Provides soil health cards with crop-wise recommendations for nutrients and fertilizers.', benefit_amount: 0, eligible_criteria: 'All farmers', status: 'active' },
    { id: 5, scheme_name: 'National Agriculture Market (eNAM)', ministry: 'Ministry of Agriculture', description: 'Pan-India electronic trading portal networking existing APMC mandis for better price discovery.', benefit_amount: 0, eligible_criteria: 'All farmers with produce', status: 'active' },
    { id: 6, scheme_name: 'Micro Irrigation Fund', ministry: 'NABARD', description: 'Facilitates drip and sprinkler irrigation to improve water use efficiency.', benefit_amount: 50000, eligible_criteria: 'Farmers adopting micro-irrigation', status: 'active' },
  ]

  const displaySchemes = schemes.length > 0 ? schemes : defaultSchemes

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schemes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Government schemes and farmer matching</p>
        </div>
        {canBulk && (
          <Button icon={Zap} onClick={() => bulkMatch.mutate()} loading={bulkMatch.isPending}>
            Bulk match all farmers
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displaySchemes.map((scheme, i) => (
            <motion.div key={scheme.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Card className="h-full flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-brand-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{scheme.scheme_name || scheme.name}</p>
                    <p className="text-xs text-gray-500">{scheme.ministry}</p>
                  </div>
                  <Badge variant="success" size="sm">{scheme.status || 'Active'}</Badge>
                </div>
                <p className="text-xs text-gray-600 mb-3 flex-1 line-clamp-3">{scheme.description}</p>
                {scheme.benefit_amount > 0 && (
                  <div className="bg-emerald-50 rounded-lg px-3 py-2 mb-3">
                    <p className="text-[10px] text-emerald-600">Max benefit</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(scheme.benefit_amount)}</p>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 border-t border-gray-50 pt-2">
                  Eligibility: {scheme.eligible_criteria}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
