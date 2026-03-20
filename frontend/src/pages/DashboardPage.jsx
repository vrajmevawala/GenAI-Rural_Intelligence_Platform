import { Link, useNavigate } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'
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
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Overview of farmer welfare and vulnerability across your organization
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total farmers"
          value={summary?.totalFarmers ?? summary?.total_farmers ?? 627}
          icon="Users"
          color="green"
          index={0}
        />
        <StatCard
          label="Critical risk"
          value={summary?.criticalCount ?? summary?.critical_count ?? 42}
          icon="AlertTriangle"
          color="red"
          pulse
          index={1}
          trend={12}
        />
        <StatCard
          label="Alerts sent"
          value={summary?.alertsSent ?? summary?.alerts_sent ?? 156}
          icon="Bell"
          color="amber"
          index={2}
        />
        <StatCard
          label="Schemes matched"
          value={summary?.schemesMatched ?? summary?.schemes_matched ?? 89}
          icon="FileText"
          color="blue"
          index={3}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3" padding={false}>
          <div className="p-5 pb-0">
            <CardTitle>Farmer distribution by risk level</CardTitle>
            <CardDescription>Breakdown of vulnerability scores across your portfolio</CardDescription>
          </div>
          <div className="p-4">
            <FarmerDistributionBar data={summary?.distribution || []} />
          </div>
        </Card>

        <Card className="lg:col-span-2" padding={false}>
          <div className="p-5 pb-0">
            <CardTitle>Alert breakdown</CardTitle>
            <CardDescription>Alerts by type this month</CardDescription>
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
                <CardTitle>High-risk farmers</CardTitle>
                <CardDescription>Farmers needing immediate attention</CardDescription>
              </div>
              <Link
                to="/farmers?vulnerability_label=critical"
                className="text-xs text-[#0F4C35] font-medium hover:underline"
              >
                View all →
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
                <CardTitle>Upcoming expiries</CardTitle>
                <CardDescription>Insurance and loan due dates</CardDescription>
              </div>
            </div>
          </div>
          <div className="px-3 pb-3">
            <ExpiryWarningList />
          </div>
        </Card>

        <Card className="lg:col-span-3" padding={false}>
          <div className="p-5 pb-3">
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest actions and events</CardDescription>
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
            <CardTitle>District vulnerability map</CardTitle>
            <CardDescription>
              Click a district to view farmers · Real-time vulnerability scores
            </CardDescription>
          </div>
          <Link
            to="/vulnerability"
            className="text-sm text-[#0F4C35] font-medium hover:underline flex items-center gap-1"
          >
            Full map view →
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
