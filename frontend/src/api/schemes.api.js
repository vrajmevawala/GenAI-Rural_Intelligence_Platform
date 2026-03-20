import api from './axios'

export const getSchemes = () => api.get('/schemes')

export const matchSchemes = (farmerId) =>
  api.post(`/schemes/match/${farmerId}`)

export const getSchemeMatches = (farmerId) =>
  api.get(`/schemes/matches/${farmerId}`)

export const updateMatchStatus = (matchId, status) =>
  api.patch(`/schemes/matches/${matchId}/status`, {
    application_status: status,
  })

export const bulkMatchSchemes = () => api.post('/schemes/bulk-match')
