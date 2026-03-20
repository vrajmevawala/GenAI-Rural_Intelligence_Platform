import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserCog, MoreVertical, Plus, Shield, Loader2, Trash2 } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import { useUsers } from '@/hooks/useUsers'
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
  const { user: currentUser } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(null)
  const { users, isLoading, deleteUser } = useUsers()

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      await deleteUser(id)
      setMenuOpen(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage team members and roles</p>
        </div>
        {currentUser?.role !== 'field_officer' && (
          <Button icon={Plus}>Invite user</Button>
        )}
      </div>

      <Card padding={false}>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Fetching team members...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No users found"
                description="Invite team members to your organization to get started"
                icon={UserCog}
              />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['User', 'Role', 'Status', 'Last login', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u, idx) => {
                  const rb = roleBadge[u.role] || roleBadge.field_officer
                  const isSelf = u.id === currentUser?.id
                  
                  return (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }} className="hover:bg-gray-50/50 transition relative">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size="sm" status={u.status === 'active' || !u.status ? 'online' : 'offline'} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {u.name} {isSelf && <span className="text-[10px] text-gray-400 font-normal ml-1">(You)</span>}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge variant={rb.variant} size="sm">{rb.label}</Badge></td>
                      <td className="px-4 py-3">
                        <Badge variant={u.status !== 'inactive' ? 'success' : 'default'} dot size="sm">
                          {u.status || 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.last_login || u.created_at ? formatRelative(u.last_login || u.created_at) : 'Never'}
                      </td>
                      <td className="px-4 py-3 relative">
                        {currentUser?.role !== 'field_officer' && !isSelf && (
                          <div className="flex justify-end">
                            <button onClick={() => setMenuOpen(menuOpen === u.id ? null : u.id)}
                              className="p-1 rounded hover:bg-gray-100 transition">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                            
                            {menuOpen === u.id && (
                              <div className="absolute right-4 top-10 bg-white border border-gray-100 shadow-xl rounded-lg py-1 z-50 min-w-[140px]">
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Deactivate
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
