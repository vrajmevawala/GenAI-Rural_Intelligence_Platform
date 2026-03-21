import { Bell, ChevronDown, Languages } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useNotificationStore from '@/store/notificationStore'
import useLanguage from '@/hooks/useLanguage'
import Avatar from '@/components/ui/Avatar'
import { LANGUAGES } from '@/utils/constants'
import { cn } from '@/utils/cn'

export default function Topbar() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <div />

      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition border border-transparent hover:border-gray-200">
            <Languages className="w-4 h-4" />
            <span className="text-sm font-medium">
              {LANGUAGES.find(l => l.value === language)?.label.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            {LANGUAGES.map(lang => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition',
                  language === lang.value ? 'bg-[#0F4C35]/5 text-[#0F4C35] font-semibold' : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

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
