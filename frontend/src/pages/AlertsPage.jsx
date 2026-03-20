import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Send, Filter, Plus, Clock } from 'lucide-react'
import { useAlerts, useUpdateAlertStatus, useGenerateBulkAlerts } from '@/hooks/useAlerts'
import useAuthStore from '@/store/authStore'
import AlertCard from '@/components/alerts/AlertCard'
import GenerateAlertModal from '@/components/alerts/GenerateAlertModal'
import StatCard from '@/components/dashboard/StatCard'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ALERT_PRIORITIES, ALERT_STATUSES } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function AlertsPage() {
  const [filters, setFilters] = useState({ priority: '', status: '' })
  const [showModal, setShowModal] = useState(false)
  const { user } = useAuthStore()
  const canBulk = ['superadmin', 'org_admin'].includes(user?.role)
  const queryParams = { ...filters, limit: 50 }
  Object.keys(queryParams).forEach((k) => { if (!queryParams[k]) delete queryParams[k] })
  const { data, isLoading } = useAlerts(queryParams)
  const updateStatus = useUpdateAlertStatus()
  const bulkGen = useGenerateBulkAlerts()
  const alerts = Array.isArray(data) ? data : data?.alerts || []
  const total = data?.total || alerts.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage farmer alerts and notifications</p>
        </div>
        <div className="flex gap-2">
          {canBulk && <Button variant="secondary" icon={Send} onClick={() => bulkGen.mutate()} loading={bulkGen.isPending}>Bulk generate</Button>}
          <Button icon={Plus} onClick={() => setShowModal(true)}>Generate alert</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard label="Total alerts" value={total} icon="Bell" color="blue" index={0} />
        <StatCard label="Pending" value={alerts.filter(a => a.status === 'pending').length} icon="Clock" color="amber" index={1} />
        <StatCard label="Sent" value={alerts.filter(a => a.status === 'sent').length} icon="Send" color="green" index={2} />
        <StatCard label="Critical" value={alerts.filter(a => a.priority === 'critical').length} icon="AlertTriangle" color="red" pulse index={3} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        {['', ...ALERT_PRIORITIES].map(p => (
          <button key={p} onClick={() => setFilters(f => ({ ...f, priority: p }))}
            className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition capitalize',
              filters.priority === p ? 'bg-[#0F4C35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {p || 'All priorities'}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {ALERT_STATUSES.map(s => (
          <button key={s} onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s }))}
            className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium transition capitalize',
              filters.status === s ? 'bg-[#0F4C35] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
            {s}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : alerts.length === 0 ? (
        <EmptyState icon="inbox" title="No alerts found" description="Adjust filters or generate new alerts" />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <AlertCard key={alert.id} alert={alert} index={i}
              onStatusUpdate={(id, status) => updateStatus.mutate({ id, status })} />
          ))}
        </div>
      )}
      <GenerateAlertModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
