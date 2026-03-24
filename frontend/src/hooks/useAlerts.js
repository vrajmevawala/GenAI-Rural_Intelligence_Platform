import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as alertsApi from '@/api/alerts.api'
import useNotificationStore from '@/store/notificationStore'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

export function useAlerts(params = {}) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsApi.getAlerts(params).then((r) => r.data?.data || r.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: true,
  })
}

export function usePendingAlerts() {
  const { setUnreadCount } = useNotificationStore()
  const { isAuthenticated } = useAuthStore()

  const query = useQuery({
    queryKey: ['alerts-pending'],
    queryFn: () => alertsApi.getPendingAlerts().then((r) => r.data?.data || r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      const status = error?.response?.status
      if (status === 401 || status === 429) return false
      return failureCount < 1
    },
  })

  useEffect(() => {
    if (query.data) {
      const count = Array.isArray(query.data) ? query.data.length : query.data.count || 0
      setUnreadCount(count)
    }
  }, [query.data, setUnreadCount])

  return query
}

export function useGenerateAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: alertsApi.generateAlert,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Alert generated successfully')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to generate alert')
    },
  })
}

export function useGenerateBulkAlerts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: alertsApi.generateBulkAlerts,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      const count = res.data?.data?.count || 0
      toast.success(`${count} alerts generated`)
    },
    onError: () => toast.error('Bulk alert generation failed'),
  })
}

export function useUpdateAlertStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => alertsApi.updateAlertStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      qc.invalidateQueries({ queryKey: ['alerts-pending'] })
      toast.success('Alert status updated')
    },
    onError: () => toast.error('Failed to update alert status'),
  })
}

export default useAlerts
