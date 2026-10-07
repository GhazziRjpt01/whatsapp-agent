import { ApiError } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { sendError } from '../utils/ApiResponse.js'

export function errorHandler(err, req, res, next) {
  void next

  if (err instanceof ApiError) {
    if (env.nodeEnv !== 'production' && err.statusCode >= 500) {
      console.error(err)
    }

    return sendError(res, {
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
    })
  }

  if (env.nodeEnv !== 'production') {
    console.error(err)
  }

  if (err?.type === 'entity.parse.failed') {
    return sendError(res, {
      statusCode: 400,
      message: 'Invalid JSON payload',
    })
  }

  return sendError(res, {
    statusCode: 500,
    message: 'Internal server error',
    details: env.nodeEnv === 'production' ? null : err.message,
  })
}
