import { sendError } from '../utils/ApiResponse.js'

export function notFound(req, res) {
  return sendError(res, {
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}
