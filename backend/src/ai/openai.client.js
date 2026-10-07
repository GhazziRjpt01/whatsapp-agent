import OpenAI from 'openai'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

let client = null

export function isOpenAIConfigured() {
  return Boolean(
    env.openaiApiKey &&
      !env.openaiApiKey.includes('your_openai') &&
      env.openaiApiKey.startsWith('sk-'),
  )
}

export function getOpenAIClient() {
  if (!isOpenAIConfigured()) {
    throw new ApiError(500, 'OpenAI is not configured. Set OPENAI_API_KEY.')
  }

  if (!client) {
    client = new OpenAI({
      apiKey: env.openaiApiKey,
      timeout: 60_000,
      maxRetries: 2,
    })
  }

  return client
}

export function getConfiguredModel(fallback = 'gpt-4o-mini') {
  return process.env.OPENAI_MODEL || fallback
}
