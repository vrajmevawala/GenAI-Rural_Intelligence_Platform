import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Map, Bell, FileText,
  UserCog, Settings, ChevronLeft, ChevronRight, LogOut, Leaf,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import useAuthStore from '@/store/authStore'
import useNotificationStore from '@/store/notificationStore'
import useLanguage from '@/hooks/useLanguage'

const iconMap = {
  LayoutDashboard, Users, Map, Bell, FileText, UserCog, Settings,
}

const navItems = [
  { label: 'nav.dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
  { label: 'nav.farmers', icon: 'Users', path: '/farmers' },
  { label: 'nav.vulnerability_map', icon: 'Map', path: '/vulnerability' },
  { label: 'nav.alerts', icon: 'Bell', path: '/alerts', badge: true },
  { label: 'nav.schemes', icon: 'FileText', path: '/schemes' },
  { label: 'nav.users', icon: 'UserCog', path: '/users', roles: ['superadmin', 'org_admin'] },
  { label: 'nav.settings', icon: 'Settings', path: '/settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { t } = useLanguage()

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  )

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen bg-white border-r border-gray-100 flex flex-col relative flex-shrink-0"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-[#0F4C35] rounded-lg flex items-center justify-center flex-shrink-0">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-lg font-bold text-gray-900 whitespace-nowrap overflow-hidden"
              >
                GraamAI
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
        {visibleItems.map((item) => {
          const Icon = iconMap[item.icon]
          const isActive = location.pathname.startsWith(item.path)

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-all duration-150 group relative',
                isActive
                  ? 'bg-[#0F4C35]/10 text-[#0F4C35] font-semibold'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#0F4C35] rounded-r-full"
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon className={cn(
                'w-5 h-5 flex-shrink-0 transition-colors',
                isActive ? 'text-[#0F4C35]' : 'text-gray-400 group-hover:text-gray-600'
              )} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {t(item.label)}
                  </motion.span>
                )}
              </AnimatePresence>
              {item.badge && unreadCount > 0 && (
                <span className={cn(
                  'bg-red-500 text-white text-[10px] font-bold rounded-full flex-shrink-0',
                  'flex items-center justify-center min-w-[18px] h-[18px] px-1',
                  collapsed && 'absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] text-[8px]'
                )}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-2">
        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm',
            'text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150'
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="whitespace-nowrap font-medium"
              >
                {t('nav.logout')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full
                   shadow-sm flex items-center justify-center hover:bg-gray-50 transition z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-gray-500" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-gray-500" />
        )}
      </button>
    </motion.aside>
  )
}
