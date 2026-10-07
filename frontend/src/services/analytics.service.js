import api, { unwrap } from './api'

export async function getAnalyticsOverview() {
  const response = await api.get('/analytics/overview')
  return unwrap(response).data
}
