import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '@/api/users.api'
import { toast } from 'react-hot-toast'

export function useUsers(params = {}) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersApi.getUsers(params).then((res) => res.data?.data || res.data || []),
    staleTime: 30000,
  })

  const createUserMutation = useMutation({
    mutationFn: (data) => usersApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User invited successfully')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to invite user')
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated successfully')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update user')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete user')
    },
  })

  return {
    ...query,
    users: query.data || [],
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
    isMutating:
      createUserMutation.isPending ||
      updateUserMutation.isPending ||
      deleteUserMutation.isPending,
  }
}
