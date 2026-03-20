import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserCog, MoreVertical, Plus, Shield } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import Card from '@/components/ui/Card'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { formatRelative } from '@/utils/formatters'
import { cn } from '@/utils/cn'

const roleBadge = {
  superadmin: { variant: 'critical', label: 'Super Admin' },
  org_admin: { variant: 'warning', label: 'Org Admin' },
  field_officer: { variant: 'info', label: 'Field Officer' },
}

export default function UsersPage() {
  const { user } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(null)

  const demoUsers = [
    { id: 1, name: 'Amit Sharma', email: 'amit@graamai.in', role: 'superadmin', last_login: new Date(Date.now() - 3600000).toISOString(), status: 'active' },
    { id: 2, name: 'Priya Patel', email: 'priya@graamai.in', role: 'org_admin', last_login: new Date(Date.now() - 86400000).toISOString(), status: 'active' },
    { id: 3, name: 'Rajesh Kumar', email: 'rajesh@graamai.in', role: 'field_officer', last_login: new Date(Date.now() - 172800000).toISOString(), status: 'active' },
    { id: 4, name: 'Meena Devi', email: 'meena@graamai.in', role: 'field_officer', last_login: new Date(Date.now() - 604800000).toISOString(), status: 'active' },
    { id: 5, name: 'Sunil Bhatt', email: 'sunil@graamai.in', role: 'field_officer', last_login: null, status: 'invited' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage team members and roles</p>
        </div>
        <Button icon={Plus}>Invite user</Button>
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['User', 'Role', 'Status', 'Last login', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {demoUsers.map((u, idx) => {
                const rb = roleBadge[u.role] || roleBadge.field_officer
                return (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" status={u.status === 'active' ? 'online' : 'offline'} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant={rb.variant} size="sm">{rb.label}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge variant={u.status === 'active' ? 'success' : 'default'} dot size="sm">{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.last_login ? formatRelative(u.last_login) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                        className="p-1 rounded hover:bg-gray-100 transition">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
