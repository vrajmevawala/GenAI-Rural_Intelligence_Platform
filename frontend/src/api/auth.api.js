import api from './axios'

export const login = (credentials) => api.post('/auth/login', credentials)

export const register = (data) => api.post('/auth/register', data)

export const refresh = () => api.post('/auth/refresh')

export const getMe = () => api.get('/auth/me')

export const updateProfile = (data) => api.patch('/auth/profile', data)

export const changePassword = (data) => api.post('/auth/change-password', data)

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email })

export const resetPassword = (data) => api.post('/auth/reset-password', data)
