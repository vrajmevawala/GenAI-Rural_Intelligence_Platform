import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import AuthLayout from '@/components/layout/AuthLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import FarmersPage from '@/pages/FarmersPage'
import FarmerDetailPage from '@/pages/FarmerDetailPage'
import VulnerabilityMapPage from '@/pages/VulnerabilityMapPage'
import AlertsPage from '@/pages/AlertsPage'
import SchemesPage from '@/pages/SchemesPage'
import UsersPage from '@/pages/UsersPage'
import SettingsPage from '@/pages/SettingsPage'
import useAuthStore from '@/store/authStore'

function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-[#0F4C35] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ roles, children }) {
  const { user } = useAuthStore()
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'farmers', element: <FarmersPage /> },
      { path: 'farmers/:id', element: <FarmerDetailPage /> },
      { path: 'vulnerability', element: <VulnerabilityMapPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'schemes', element: <SchemesPage /> },
      {
        path: 'users',
        element: (
          <RequireRole roles={['superadmin', 'org_admin']}>
            <UsersPage />
          </RequireRole>
        ),
      },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
], {
  future: {
    v7_startTransition: true,
  },
})
