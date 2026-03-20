import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import useAuthStore from '@/store/authStore'
import * as authApi from '@/api/auth.api'
import toast from 'react-hot-toast'

export function useAuth() {
  const store = useAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { user, access_token, refresh_token } = res.data.data || res.data
      store.login(user, access_token, refresh_token)
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/dashboard')
    },
    onError: (err) => {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Login failed'
      toast.error(message)
    },
  })

  const handleLogout = useCallback(() => {
    store.logout()
    toast.success('Signed out successfully')
    navigate('/login')
  }, [store, navigate])

  return {
    ...store,
    loginMutation,
    handleLogin: (data) => loginMutation.mutate(data),
    handleLogout,
  }
}

export function useInitAuth() {
  const { setLoading, logout, accessToken, setUser } = useAuthStore()

  useEffect(() => {
    const init = async () => {
      if (!accessToken) {
        setLoading(false)
        return
      }
      try {
        const res = await authApi.getMe()
        setUser(res.data.data || res.data)
        setLoading(false)
      } catch {
        logout()
      }
    }
    init()
  }, [])
}

export default useAuth
