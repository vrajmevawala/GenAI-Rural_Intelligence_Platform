import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Phone, Calendar, RefreshCw,
  Bell, Wheat, Droplets, Wallet, Shield, Users,
} from 'lucide-react'
import { useFarmer, useScoreHistory, useRecalculateScore } from '@/hooks/useFarmers'
import { useSchemeMatches, useMatchSchemes } from '@/hooks/useSchemes'
import { useAlerts, useGenerateAlert } from '@/hooks/useAlerts'
import VulnerabilityGauge from '@/components/charts/VulnerabilityGauge'
import ScoreHistoryChart from '@/components/charts/ScoreHistoryChart'
import ScoreBreakdownCard from '@/components/farmers/ScoreBreakdownCard'
import SchemeMatchCard from '@/components/schemes/SchemeMatchCard'
import AlertCard from '@/components/alerts/AlertCard'
import { useUpdateMatchStatus } from '@/hooks/useSchemes'
import { useUpdateAlertStatus } from '@/hooks/useAlerts'
import Card, { CardTitle, CardDescription } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Avatar from '@/components/ui/Avatar'
import Skeleton from '@/components/ui/Skeleton'
import { formatCurrency, formatDate, formatDaysRemaining, formatPhone } from '@/utils/formatters'
import { getScoreLabel } from '@/utils/scoreUtils'
import { cn } from '@/utils/cn'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'score', label: 'Score details' },
  { key: 'schemes', label: 'Schemes' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'history', label: 'History' },
]

export default function FarmerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')

  const { data: farmer, isLoading } = useFarmer(id)
  const { data: scoreHistory } = useScoreHistory(id)
  const { data: schemeMatches } = useSchemeMatches(id)
  const { data: alertsData } = useAlerts({ farmer_id: id, limit: 10 })
  const recalculate = useRecalculateScore()
  const matchSchemes = useMatchSchemes()
  const generateAlert = useGenerateAlert()
  const updateMatchStatus = useUpdateMatchStatus()
  const updateAlertStatus = useUpdateAlertStatus()

  const alerts = Array.isArray(alertsData) ? alertsData : alertsData?.alerts || []
  const matches = Array.isArray(schemeMatches) ? schemeMatches : schemeMatches?.matches || []
  const history = Array.isArray(scoreHistory) ? scoreHistory : scoreHistory?.history || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!farmer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Farmer not found</p>
        <Button variant="ghost" onClick={() => navigate('/farmers')} className="mt-4">
          ← Back to farmers
        </Button>
      </div>
    )
  }

  const score = farmer.vulnerability_score ?? 0
  const label = farmer.vulnerability_label || getScoreLabel(score)

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/farmers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to farmers
        </button>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={RefreshCw}
            size="sm"
            loading={recalculate.isPending}
            onClick={() => recalculate.mutate(id)}
          >
            Recalculate
          </Button>
          <Button
            variant="secondary"
            icon={Bell}
            size="sm"
            loading={generateAlert.isPending}
            onClick={() => generateAlert.mutate(id)}
          >
            Generate alert
          </Button>
          <Button
            size="sm"
            onClick={() => matchSchemes.mutate(id)}
            loading={matchSchemes.isPending}
          >
            Match schemes
          </Button>
        </div>
      </div>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-100 shadow-card p-6"
      >
        <div className="flex items-start gap-6">
          <Avatar name={farmer.name} size="xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{farmer.name}</h1>
              <Badge variant={label.toLowerCase()} dot pulse={label === 'Critical'}>
                {label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {farmer.village}, {farmer.taluka}, {farmer.district}
              </span>
              {farmer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {formatPhone(farmer.phone)}
                </span>
              )}
            </div>
            <div className="flex gap-6">
              {[
                { icon: Wheat, label: 'Crop', value: farmer.primary_crop || 'N/A' },
                { icon: Droplets, label: 'Irrigation', value: farmer.irrigation_type || 'N/A' },
                { icon: Wallet, label: 'Income', value: farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : 'N/A' },
                { icon: Shield, label: 'Insurance', value: farmer.has_crop_insurance ? 'Yes' : 'No' },
                { icon: Users, label: 'Family', value: farmer.family_size || 'N/A' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <item.icon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
                  <p className="text-[10px] text-gray-500 mb-0.5">{item.label}</p>
                  <p className="text-xs font-semibold text-gray-700">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <VulnerabilityGauge score={score} size="md" />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium transition-all relative',
              activeTab === tab.key
                ? 'text-[#0F4C35]'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="farmer-tab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F4C35]"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle>Personal details</CardTitle>
              <div className="mt-4 space-y-3">
                {[
                  ['Name', farmer.name],
                  ['Phone', formatPhone(farmer.phone)],
                  ['Aadhaar (last 4)', farmer.aadhaar_last4 || '****'],
                  ['Language', farmer.preferred_language || 'Gujarati'],
                  ['District', farmer.district],
                  ['Taluka', farmer.taluka],
                  ['Village', farmer.village],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle>Farm &amp; financial</CardTitle>
              <div className="mt-4 space-y-3">
                {[
                  ['Land area', `${farmer.land_area_acres || 0} acres`],
                  ['Primary crop', farmer.primary_crop || 'N/A'],
                  ['Secondary crop', farmer.secondary_crop || 'N/A'],
                  ['Soil type', farmer.soil_type || 'N/A'],
                  ['Irrigation', farmer.irrigation_type || 'N/A'],
                  ['Annual income', farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : 'N/A'],
                  ['Loan amount', farmer.loan_amount_inr ? formatCurrency(farmer.loan_amount_inr) : 'None'],
                  ['Loan type', farmer.loan_type || 'N/A'],
                  ['Loan due', farmer.loan_due_date ? `${formatDate(farmer.loan_due_date)} (${formatDaysRemaining(farmer.loan_due_date)})` : 'N/A'],
                  ['Insurance', farmer.has_crop_insurance ? `Yes (expires ${farmer.insurance_expiry_date ? formatDate(farmer.insurance_expiry_date) : 'N/A'})` : 'No'],
                  ['PM-Kisan', farmer.pm_kisan_enrolled ? 'Enrolled' : 'Not enrolled'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'score' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle>Score breakdown</CardTitle>
              <CardDescription>7 vulnerability components</CardDescription>
              <div className="mt-4">
                <ScoreBreakdownCard breakdown={farmer.score_breakdown || {}} />
              </div>
            </Card>
            <Card>
              <CardTitle>Score history</CardTitle>
              <CardDescription>Trend over time</CardDescription>
              <div className="mt-4">
                <ScoreHistoryChart data={history} height={300} />
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'schemes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.length > 0 ? (
              matches.map((match, i) => (
                <SchemeMatchCard
                  key={match.id}
                  match={match}
                  index={i}
                  onUpdateStatus={(matchId, status) =>
                    updateMatchStatus.mutate({ matchId, status })
                  }
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p className="text-sm">No scheme matches yet</p>
                <Button className="mt-3" size="sm" onClick={() => matchSchemes.mutate(id)}>
                  Run matching
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert, i) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  index={i}
                  onStatusUpdate={(alertId, status) =>
                    updateAlertStatus.mutate({ id: alertId, status })
                  }
                />
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p className="text-sm">No alerts for this farmer</p>
                <Button className="mt-3" size="sm" onClick={() => generateAlert.mutate(id)}>
                  Generate alert
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardTitle>Vulnerability score trend</CardTitle>
            <CardDescription>Historical score changes over time</CardDescription>
            <div className="mt-4">
              <ScoreHistoryChart data={history} height={360} />
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
