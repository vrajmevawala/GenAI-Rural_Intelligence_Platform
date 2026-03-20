import api from './axios'

export const getFarmers = (params) => api.get('/farmers', { params })

export const getFarmerById = (id) => api.get(`/farmers/${id}`)

export const createFarmer = (data) => api.post('/farmers', data)

export const updateFarmer = (id, data) => api.patch(`/farmers/${id}`, data)

export const deleteFarmer = (id) => api.delete(`/farmers/${id}`)

export const recalculateScore = (id) =>
  api.post(`/farmers/${id}/recalculate-score`)

export const getScoreHistory = (id) => api.get(`/farmers/${id}/score-history`)

export const exportFarmers = (params) =>
  api.get('/farmers/export', { params, responseType: 'blob' })
