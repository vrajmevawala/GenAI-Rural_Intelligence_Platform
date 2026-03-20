import { Bell, Search, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useNotificationStore from '@/store/notificationStore'
import Avatar from '@/components/ui/Avatar'
import { cn } from '@/utils/cn'

export default function Topbar() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      {/* Search */}
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search farmers, schemes, alerts..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm
                     bg-gray-50 placeholder:text-gray-400 focus:outline-none
                     focus:ring-2 focus:ring-[#0F4C35]/20 focus:border-[#0F4C35]
                     focus:bg-white transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300
                        font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px]
                         font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200" />

        {/* User */}
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2.5 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition"
        >
          <Avatar name={user?.name || 'User'} size="sm" />
          <div className="text-left hidden lg:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] text-gray-400 capitalize">
              {user?.role?.replace('_', ' ') || 'Officer'}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden lg:block" />
        </button>
      </div>
    </header>
  )
}
