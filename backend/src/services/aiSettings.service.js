import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'

export async function getAiSettings() {
  const settings = await db.aiSettings.get()
  if (!settings) {
    throw new ApiError(404, 'AI settings not found')
  }
  return settings
}

export async function updateAiSettings(payload) {
  return db.aiSettings.update(payload)
}
