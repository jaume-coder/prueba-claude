import api from './client'

export async function login(username: string, password: string) {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const { data } = await api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function getYouTubeStatus() {
  const { data } = await api.get('/youtube/status')
  return data
}

export async function getYouTubeAuthUrl() {
  const { data } = await api.get('/youtube/auth-url')
  return data
}

export async function getChannelOverview() {
  const { data } = await api.get('/analytics/channel')
  return data
}

export async function getAnalyticsOverview(startDate?: string, endDate?: string) {
  const params: Record<string, string> = {}
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate
  const { data } = await api.get('/analytics/overview', { params })
  return data
}

export async function getTopVideos(startDate?: string, endDate?: string, sortBy = 'views', limit = 20) {
  const params: Record<string, string | number> = { sort_by: sortBy, limit }
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate
  const { data } = await api.get('/analytics/top-videos', { params })
  return data
}
