import { db } from '../db/client.js'

export async function getAnalyticsOverview() {
  return db.analytics.overview()
}
