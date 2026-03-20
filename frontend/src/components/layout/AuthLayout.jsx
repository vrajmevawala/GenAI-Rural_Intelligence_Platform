import { Outlet, Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Outlet />
    </div>
  )
}
