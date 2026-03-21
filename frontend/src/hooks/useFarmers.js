import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as farmersApi from '@/api/farmers.api'
import toast from 'react-hot-toast'

export function useFarmers(params = {}) {
  return useQuery({
    queryKey: ['farmers', params],
    queryFn: () => farmersApi.getFarmers(params).then((r) => r.data?.data || r.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useFarmer(id) {
  return useQuery({
    queryKey: ['farmer', id],
    queryFn: () => farmersApi.getFarmerById(id).then((r) => r.data?.data || r.data),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCreateFarmer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: farmersApi.createFarmer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmers'] })
      toast.success('Farmer created successfully')
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.error?.message
        || err.response?.data?.message
        || 'Failed to create farmer'
      )
    },
  })
}

export function useUpdateFarmer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => farmersApi.updateFarmer(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['farmers'] })
      qc.invalidateQueries({ queryKey: ['farmer', id] })
      toast.success('Farmer updated successfully')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update farmer')
    },
  })
}

export function useDeleteFarmer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: farmersApi.deleteFarmer,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farmers'] })
      toast.success('Farmer deleted')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete farmer')
    },
  })
}

export function useRecalculateScore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: farmersApi.recalculateScore,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['farmer', id] })
      qc.invalidateQueries({ queryKey: ['farmers'] })
      toast.success('Score recalculated')
    },
    onError: () => toast.error('Failed to recalculate score'),
  })
}

export function useScoreHistory(farmerId) {
  return useQuery({
    queryKey: ['score-history', farmerId],
    queryFn: () => farmersApi.getScoreHistory(farmerId).then((r) => r.data?.data || r.data),
    enabled: !!farmerId,
    staleTime: 60_000,
  })
}

export default useFarmers
