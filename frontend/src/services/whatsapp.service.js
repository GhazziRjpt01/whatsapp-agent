import api, { unwrap } from './api'

export async function getWhatsAppSession() {
  const response = await api.get('/whatsapp/session')
  return unwrap(response).data
}

export async function connectWhatsAppSession() {
  const response = await api.post('/whatsapp/session/connect')
  return unwrap(response).data
}

export async function disconnectWhatsAppSession() {
  const response = await api.post('/whatsapp/session/disconnect')
  return unwrap(response).data
}
