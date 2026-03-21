import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Phone, RefreshCw,
  Bell, Wheat, Droplets, Wallet, Shield, Users, MessageCircle,
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
import useLanguage from '@/hooks/useLanguage'
import TranslatedText from '@/components/common/TranslatedText'
import WeatherCard from '@/components/weather/WeatherCard'
import { useSendWhatsAppAlert } from '@/hooks/useWhatsApp'

export default function FarmerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = useMemo(() => [
    { key: 'overview', label: t('farmers.details.tabs.overview') },
    { key: 'score', label: t('farmers.details.tabs.score') },
    { key: 'schemes', label: t('farmers.details.tabs.schemes') },
    { key: 'alerts', label: t('farmers.details.tabs.alerts') },
    { key: 'history', label: t('farmers.details.tabs.history') },
  ], [t])

  const { data: farmer, isLoading } = useFarmer(id)
  const { data: scoreHistory } = useScoreHistory(id)
  const { data: schemeMatches } = useSchemeMatches(id)
  const { data: alertsData } = useAlerts({ farmer_id: id, limit: 10 })
  const recalculate = useRecalculateScore()
  const matchSchemes = useMatchSchemes()
  const generateAlert = useGenerateAlert()
  const sendWhatsAppAlert = useSendWhatsAppAlert()
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
          ← {t('common.cancel')}
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
          {t('common.cancel')}
        </button>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={MessageCircle}
            loading={sendWhatsAppAlert.isPending}
            onClick={() => sendWhatsAppAlert.mutate({ farmerId: id, language: 'gu' })}
          >
            Send WhatsApp
          </Button>
          <Button
            variant="secondary"
            icon={RefreshCw}
            size="sm"
            loading={recalculate.isPending}
            onClick={() => recalculate.mutate(id)}
          >
            {t('farmers.details.actions.recalculate')}
          </Button>
          <Button
            variant="secondary"
            icon={Bell}
            size="sm"
            loading={generateAlert.isPending}
            onClick={() => generateAlert.mutate(id)}
          >
            {t('farmers.details.actions.generate_alert')}
          </Button>
          <Button
            size="sm"
            onClick={() => matchSchemes.mutate(id)}
            loading={matchSchemes.isPending}
          >
            {t('farmers.details.actions.match_schemes')}
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
              <h1 className="text-2xl font-bold text-gray-900">
                <TranslatedText>{farmer.name}</TranslatedText>
              </h1>
              <Badge variant={label.toLowerCase()} dot pulse={label === 'Critical'}>
                {label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <TranslatedText>{farmer.village}</TranslatedText>, <TranslatedText>{farmer.taluka}</TranslatedText>, <TranslatedText>{farmer.district}</TranslatedText>
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
                { icon: Wheat, label: t('farmers.details.fields.primary_crop'), value: <TranslatedText>{farmer.primary_crop || 'N/A'}</TranslatedText> },
                { icon: Droplets, label: t('farmers.details.fields.irrigation'), value: <TranslatedText>{farmer.irrigation_type || 'N/A'}</TranslatedText> },
                { icon: Wallet, label: t('farmers.details.fields.annual_income'), value: farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : 'N/A' },
                { icon: Shield, label: t('farmers.details.fields.insurance'), value: farmer.has_crop_insurance ? t('common.save') : t('common.cancel') }, // Simplified Yes/No proxy for now or add to translations
                { icon: Users, label: t('farmers.details.fields.family_size'), value: farmer.family_size || 'N/A' },
              ].map((item) => (
                <div key={item.label} className="text-center text-nowrap">
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
      <nav className="flex gap-1 border-b border-gray-200">
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
      </nav>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardTitle>{t('farmers.details.sections.personal')}</CardTitle>
              <div className="mt-4 space-y-3">
                {[
                  [t('farmers.details.fields.phone'), formatPhone(farmer.phone)],
                  [t('farmers.details.fields.aadhaar'), farmer.aadhaar_last4 || '****'],
                  [t('farmers.details.fields.language'), <TranslatedText>{farmer.preferred_language || 'Gujarati'}</TranslatedText>],
                  [t('farmers.details.fields.district'), <TranslatedText>{farmer.district}</TranslatedText>],
                  [t('farmers.details.fields.taluka'), <TranslatedText>{farmer.taluka}</TranslatedText>],
                  [t('farmers.details.fields.village'), <TranslatedText>{farmer.village}</TranslatedText>],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <CardTitle>{t('farmers.details.sections.farm')}</CardTitle>
              <div className="mt-4 space-y-3">
                {[
                  [t('farmers.details.fields.land_area'), `${farmer.land_area_acres || 0} ${t('common.acres')}`],
                  [t('farmers.details.fields.primary_crop'), <TranslatedText>{farmer.primary_crop || 'N/A'}</TranslatedText>],
                  [t('farmers.details.fields.soil_type'), <TranslatedText>{farmer.soil_type || 'N/A'}</TranslatedText>],
                  [t('farmers.details.fields.irrigation'), <TranslatedText>{farmer.irrigation_type || 'N/A'}</TranslatedText>],
                  [t('farmers.details.fields.annual_income'), farmer.annual_income_inr ? formatCurrency(farmer.annual_income_inr) : 'N/A'],
                  [t('farmers.details.fields.insurance'), farmer.has_crop_insurance ? t('common.save') : t('common.cancel')],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <div className="flex flex-col gap-4">
              <WeatherCard weather={farmer.weather} location={farmer.district} />
              <Card className="flex-1">
                <CardTitle>{t('farmers.details.sections.score_breakdown')}</CardTitle>
                <div className="mt-4">
                  <ScoreBreakdownCard breakdown={farmer.score_breakdown || {}} />
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'score' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardTitle>{t('farmers.details.sections.score_breakdown')}</CardTitle>
              <CardDescription>5 vulnerability dimensions</CardDescription>
              <div className="mt-4">
                <ScoreBreakdownCard breakdown={farmer.score_breakdown || {}} />
              </div>
            </Card>
            <Card>
              <CardTitle>{t('farmers.details.sections.score_history')}</CardTitle>
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
                  {t('farmers.details.actions.match_schemes')}
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
                <p className="text-sm">{t('alerts.no_alerts_found')}</p>
                <Button className="mt-3" size="sm" onClick={() => generateAlert.mutate(id)}>
                  {t('farmers.details.actions.generate_alert')}
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardTitle>{t('farmers.details.sections.score_history')}</CardTitle>
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
