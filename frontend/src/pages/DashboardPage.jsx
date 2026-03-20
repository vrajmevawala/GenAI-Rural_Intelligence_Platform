import { Link, useNavigate } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'
import useLanguage from '@/hooks/useLanguage'
import StatCard from '@/components/dashboard/StatCard'
import FarmerDistributionBar from '@/components/charts/FarmerDistributionBar'
import AlertBreakdownPie from '@/components/charts/AlertBreakdownPie'
import HighRiskFarmerList from '@/components/dashboard/HighRiskFarmerList'
import ExpiryWarningList from '@/components/dashboard/ExpiryWarningList'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import GujaratDistrictMap from '@/components/map/GujaratDistrictMap'
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

export default function DashboardPage() {
  const { data: summary } = useDashboard()
  const { t } = useLanguage()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('dashboard.total_farmers')}
          value={summary?.totalFarmers ?? summary?.total_farmers ?? 627}
          icon="Users"
          color="green"
          index={0}
        />
        <StatCard
          label={t('dashboard.critical_risk')}
          value={summary?.criticalCount ?? summary?.critical_count ?? 42}
          icon="AlertTriangle"
          color="red"
          pulse
          index={1}
          trend={12}
        />
        <StatCard
          label={t('vulnerability.avg_score')}
          value={summary?.avg_score ?? 45}
          icon="Activity"
          color="amber"
          suffix="/100"
          index={2}
        />
        <StatCard
          label={t('vulnerability.districts_tracked')}
          value={summary?.districts_count ?? 33}
          icon="Map"
          color="blue"
          index={3}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3" padding={false}>
          <div className="p-5 pb-0">
            <CardTitle>{t('dashboard.distribution_title')}</CardTitle>
            <CardDescription>{t('dashboard.distribution_desc')}</CardDescription>
          </div>
          <div className="p-4">
            <FarmerDistributionBar data={summary?.distribution || []} />
          </div>
        </Card>

        <Card className="lg:col-span-2" padding={false}>
          <div className="p-5 pb-0">
            <CardTitle>{t('dashboard.alert_breakdown_title')}</CardTitle>
            <CardDescription>{t('dashboard.alert_breakdown_desc')}</CardDescription>
          </div>
          <div className="p-4">
            <AlertBreakdownPie data={summary?.alertBreakdown || []} />
          </div>
        </Card>
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5" padding={false}>
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.high_risk_farmers')}</CardTitle>
                <CardDescription>{t('dashboard.high_risk_desc')}</CardDescription>
              </div>
              <Link
                to="/farmers?vulnerability_label=critical"
                className="text-xs text-[#0F4C35] font-medium hover:underline"
              >
                {t('dashboard.view_all')} →
              </Link>
            </div>
          </div>
          <div className="px-3 pb-3">
            <HighRiskFarmerList />
          </div>
        </Card>

        <Card className="lg:col-span-4" padding={false}>
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.upcoming_expiries')}</CardTitle>
                <CardDescription>{t('dashboard.expiries_desc')}</CardDescription>
              </div>
            </div>
          </div>
          <div className="px-3 pb-3">
            <ExpiryWarningList />
          </div>
        </Card>

        <Card className="lg:col-span-3" padding={false}>
          <div className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.recent_activity')}</CardTitle>
                <CardDescription>{t('dashboard.activity_desc')}</CardDescription>
              </div>
            </div>
          </div>
          <div className="px-3 pb-3">
            <ActivityFeed />
          </div>
        </Card>
      </div>

      {/* Map preview widget */}
      <Card hover={false} padding={false} className="overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <CardTitle>{t('dashboard.map_title')}</CardTitle>
            <CardDescription>
              {t('dashboard.map_desc')}
            </CardDescription>
          </div>
          <Link
            to="/vulnerability"
            className="text-sm text-[#0F4C35] font-medium hover:underline flex items-center gap-1"
          >
            {t('dashboard.full_map_view')} →
          </Link>
        </div>
        <div style={{ height: '380px' }}>
          <GujaratDistrictMap
            onDistrictClick={(district) => navigate(`/farmers?district=${district}`)}
            selectedDistrict={null}
          />
        </div>
      </Card>
    </div>
  )
}
