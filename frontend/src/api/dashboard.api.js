import api from './axios'

export const getDashboardSummary = () => api.get('/dashboard/summary')

export const getActivityFeed = () => api.get('/dashboard/activity-feed')
