import api from './axios'

export const getAlerts = (params) => api.get('/alerts', { params })

export const generateAlert = (farmerId) =>
  api.post(`/alerts/generate/${farmerId}`)

export const generateBulkAlerts = () => api.post('/alerts/generate-bulk')

export const updateAlertStatus = (id, status) =>
  api.patch(`/alerts/${id}/status`, { status })

export const getPendingAlerts = () => api.get('/alerts/pending')
