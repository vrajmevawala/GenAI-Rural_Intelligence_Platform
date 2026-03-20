import { Outlet } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 transition-all duration-300">
           {/* Removed motion/AnimatePresence here as it might be causing opacity: 0 stuck state */}
           <ErrorBoundary key={location.pathname}>
             <Outlet />
           </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
