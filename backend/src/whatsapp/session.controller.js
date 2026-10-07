import { sendSuccess } from '../utils/ApiResponse.js'
import {
  getQrSessionStatus,
  logoutQrSession,
  startQrSession,
} from './qrSession.js'

export async function getWhatsAppSession(req, res) {
  return sendSuccess(res, {
    message: 'WhatsApp session status',
    data: getQrSessionStatus(),
  })
}

export async function connectWhatsAppSession(req, res) {
  const data = await startQrSession()
  return sendSuccess(res, {
    message: 'WhatsApp QR session started',
    data,
  })
}

export async function disconnectWhatsAppSession(req, res) {
  const data = await logoutQrSession()
  return sendSuccess(res, {
    message: 'WhatsApp session disconnected',
    data,
  })
}
