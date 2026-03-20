import { useQuery } from '@tanstack/react-query'
import * as dashboardApi from '@/api/dashboard.api'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardApi.getDashboardSummary().then((r) => r.data?.data || r.data),
    staleTime: 30_000,
  })
}

export function useActivityFeed() {
  return useQuery({
    queryKey: ['activity-feed'],
    queryFn: () => dashboardApi.getActivityFeed().then((r) => r.data?.data || r.data),
    staleTime: 30_000,
  })
}

export default useDashboard
