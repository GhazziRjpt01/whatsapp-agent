import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'
import QRCode from 'qrcode'
import { ApiError } from '../utils/ApiError.js'
import { normalizeWhatsAppPhone } from './phone.js'
import { waLogger } from './logger.js'

const sessionDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../data/wa-session',
)

const state = {
  status: 'disconnected',
  qr: null,
  phone: null,
  name: null,
  sock: null,
  starting: null,
}

function publicStatus() {
  return {
    status: state.status,
    qr: state.status === 'qr' ? state.qr : null,
    phone: state.phone,
    name: state.name,
    connected: state.status === 'connected',
  }
}

function extractText(message) {
  if (!message) return ''
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    ''
  )
}

function phoneFromJid(jid) {
  if (!jid) return null
  const user = String(jid).split('@')[0].split(':')[0]
  return normalizeWhatsAppPhone(user)
}

export function isQrSessionConnected() {
  return state.status === 'connected' && Boolean(state.sock)
}

export function getQrSessionStatus() {
  return publicStatus()
}

export async function sendViaQrSession(to, body) {
  if (!isQrSessionConnected()) {
    throw new ApiError(409, 'WhatsApp is not linked. Scan the QR code in Settings.')
  }

  const phone = normalizeWhatsAppPhone(to)
  if (!phone) throw new ApiError(400, 'A valid WhatsApp recipient phone number is required')

  const jid = `${phone.replace('+', '')}@s.whatsapp.net`
  const sent = await state.sock.sendMessage(jid, {
    text: String(body).slice(0, 4096),
  })

  return {
    messaging_product: 'whatsapp',
    contacts: [{ input: phone, wa_id: phone.replace('+', '') }],
    messages: [{ id: sent?.key?.id || `qr.${Date.now()}` }],
    mock: false,
    via: 'qr',
  }
}

async function handleIncoming(messages) {
  const { handleInboundMessage } = await import('./webhook.service.js')

  for (const msg of messages) {
    if (!msg?.message || msg.key?.fromMe) continue

    const jid = msg.key.remoteJidAlt || msg.key.remoteJid
    if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue

    const from = phoneFromJid(jid)
    const text = extractText(msg.message).trim()
    if (!from || !text) continue

    try {
      await handleInboundMessage({
        from,
        contactName: msg.pushName || from,
        text,
        whatsappMessageId: msg.key.id,
        type: 'text',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      waLogger.error('QR inbound handling failed', { error: error.message })
    }
  }
}

export async function startQrSession() {
  if (state.starting) return state.starting
  if (state.sock && (state.status === 'connected' || state.status === 'qr')) {
    return publicStatus()
  }

  state.starting = (async () => {
    fs.mkdirSync(sessionDir, { recursive: true })
    const { state: authState, saveCreds } = await useMultiFileAuthState(sessionDir)

    const sock = makeWASocket({
      auth: authState,
      logger: pino({ level: 'silent' }),
      browser: Browsers.windows('Nexora Desk'),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    })

    state.sock = sock
    state.status = 'connecting'

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, qr, lastDisconnect } = update

      if (qr) {
        state.status = 'qr'
        state.qr = await QRCode.toDataURL(qr, { margin: 1, width: 280 })
        state.phone = null
      }

      if (connection === 'open') {
        state.status = 'connected'
        state.qr = null
        const jid = sock.user?.id
        state.phone = phoneFromJid(jid)
        state.name = sock.user?.name || state.phone
        waLogger.info('WhatsApp QR session connected', { phone: state.phone })
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut
        state.sock = null
        state.qr = null

        if (loggedOut) {
          state.status = 'disconnected'
          state.phone = null
          state.name = null
          fs.rmSync(sessionDir, { recursive: true, force: true })
          waLogger.warn('WhatsApp QR session logged out')
          return
        }

        state.status = 'connecting'
        waLogger.warn('WhatsApp QR session closed, reconnecting', { statusCode })
        setTimeout(() => {
          startQrSession().catch((error) => {
            waLogger.error('WhatsApp QR reconnect failed', { error: error.message })
          })
        }, 1500)
      }
    })

    sock.ev.on('messages.upsert', ({ messages }) => {
      handleIncoming(messages || [])
    })

    return publicStatus()
  })()

  try {
    return await state.starting
  } finally {
    state.starting = null
  }
}

export async function logoutQrSession() {
  const sock = state.sock
  state.sock = null
  state.qr = null
  state.phone = null
  state.name = null
  state.status = 'disconnected'

  try {
    await sock?.logout()
  } catch {
    sock?.end?.()
  }

  fs.rmSync(sessionDir, { recursive: true, force: true })
  return publicStatus()
}

export function resumeQrSessionIfSaved() {
  const creds = path.join(sessionDir, 'creds.json')
  if (!fs.existsSync(creds)) return
  startQrSession().catch((error) => {
    waLogger.error('Failed to resume WhatsApp QR session', { error: error.message })
  })
}
