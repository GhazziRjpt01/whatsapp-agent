import { getStoreName } from '../db/client.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export function getHealth(req, res) {
  return sendSuccess(res, {
    message: 'WhatsApp AI backend is running',
    data: {
      service: 'whatsapp-ai-backend',
      store: getStoreName(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  })
}
