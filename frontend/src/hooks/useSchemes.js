import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as schemesApi from '@/api/schemes.api'
import toast from 'react-hot-toast'

export function useSchemes() {
  return useQuery({
    queryKey: ['schemes'],
    queryFn: () => schemesApi.getSchemes().then((r) => r.data?.data || r.data),
    staleTime: 5 * 60_000,
  })
}

export function useSchemeMatches(farmerId) {
  return useQuery({
    queryKey: ['scheme-matches', farmerId],
    queryFn: () => schemesApi.getSchemeMatches(farmerId).then((r) => r.data?.data || r.data),
    enabled: !!farmerId,
    staleTime: 60_000,
  })
}

export function useMatchSchemes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: schemesApi.matchSchemes,
    onSuccess: (_, farmerId) => {
      qc.invalidateQueries({ queryKey: ['scheme-matches', farmerId] })
      toast.success('Schemes matched successfully')
    },
    onError: () => toast.error('Failed to match schemes'),
  })
}

export function useBulkMatchSchemes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: schemesApi.bulkMatchSchemes,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheme-matches'] })
      toast.success('Bulk matching complete')
    },
    onError: () => toast.error('Bulk matching failed'),
  })
}

export function useUpdateMatchStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ matchId, status }) => schemesApi.updateMatchStatus(matchId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheme-matches'] })
      toast.success('Match status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })
}

export default useSchemes
