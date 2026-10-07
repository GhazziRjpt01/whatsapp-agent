import api, { unwrap } from './api'

export async function listAppointments(params = {}) {
  const response = await api.get('/appointments', { params })
  return unwrap(response)
}

export async function createAppointment(payload) {
  const response = await api.post('/appointments', payload)
  return unwrap(response).data
}

export async function updateAppointment(id, payload) {
  const response = await api.put(`/appointments/${id}`, payload)
  return unwrap(response).data
}

export async function deleteAppointment(id) {
  const response = await api.delete(`/appointments/${id}`)
  return unwrap(response)
}
