import { create } from 'zustand'

const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: (user, accessToken, refreshToken) =>
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    }),

  logout: () =>
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setUser: (user) => set({ user }),

  setTokens: (accessToken, refreshToken) =>
    set({ accessToken, refreshToken }),

  setAccessToken: (accessToken) => set({ accessToken }),

  setLoading: (isLoading) => set({ isLoading }),

  hasRole: (roles) => {
    const { user } = get()
    if (!user) return false
    if (typeof roles === 'string') return user.role === roles
    return roles.includes(user.role)
  },
}))

export const getState = () => useAuthStore.getState()

export default useAuthStore
