import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Building2, Bell, Shield, Save } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import Card, { CardTitle, CardDescription } from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { LANGUAGES } from '@/utils/constants'
import { cn } from '@/utils/cn'

const settingsTabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'organization', label: 'Organization', icon: Building2 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
]

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  const { user } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0 space-y-0.5">
          {settingsTabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                tab === t.key ? 'bg-[#0F4C35]/10 text-[#0F4C35]' : 'text-gray-500 hover:bg-gray-50')}>
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'profile' && (
              <Card>
                <CardTitle>Profile information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
                <div className="mt-6 space-y-4 max-w-lg">
                  <Input label="Full name" defaultValue={user?.name || ''} />
                  <Input label="Email address" type="email" defaultValue={user?.email || ''} />
                  <Input label="Phone" defaultValue={user?.phone || ''} />
                  <Select label="Preferred language" options={LANGUAGES} defaultValue="en" />
                  <Button icon={Save}>Save changes</Button>
                </div>
              </Card>
            )}
            {tab === 'organization' && (
              <Card>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Your organization details</CardDescription>
                <div className="mt-6 space-y-4 max-w-lg">
                  <Input label="Organization name" defaultValue={user?.organization?.name || 'Rural Cooperative Bank'} />
                  <Input label="Organization type" defaultValue="Cooperative Bank" disabled />
                  <Input label="Primary district" defaultValue="Ahmedabad" />
                  <Input label="Contact email" defaultValue="admin@ruralcoopbank.in" />
                  <Button icon={Save}>Save changes</Button>
                </div>
              </Card>
            )}
            {tab === 'notifications' && (
              <Card>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose what alerts you receive</CardDescription>
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Critical vulnerability alerts', desc: 'Get notified when farmers cross critical threshold', default: true },
                    { label: 'Loan due reminders', desc: 'Alerts for upcoming loan repayment dates', default: true },
                    { label: 'Insurance expiry warnings', desc: 'Notifications before insurance policies expire', default: true },
                    { label: 'Weekly digest', desc: 'Summary of farmer portfolio health every Monday', default: false },
                    { label: 'New scheme notifications', desc: 'When new government schemes become available', default: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked={item.default} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#0F4C35]/20 rounded-full peer peer-checked:bg-[#0F4C35] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {tab === 'security' && (
              <Card>
                <CardTitle>Security</CardTitle>
                <CardDescription>Update your password and security settings</CardDescription>
                <div className="mt-6 space-y-4 max-w-lg">
                  <Input label="Current password" type="password" />
                  <Input label="New password" type="password" />
                  <Input label="Confirm new password" type="password" />
                  <Button icon={Shield}>Update password</Button>
                </div>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
