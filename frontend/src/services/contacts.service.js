import api, { unwrap } from './api'

export async function listContacts(params = {}) {
  const response = await api.get('/contacts', { params })
  return unwrap(response)
}

export async function getContact(id) {
  const response = await api.get(`/contacts/${id}`)
  return unwrap(response).data
}

export async function createContact(payload) {
  const response = await api.post('/contacts', payload)
  return unwrap(response).data
}

export async function updateContact(id, payload) {
  const response = await api.put(`/contacts/${id}`, payload)
  return unwrap(response).data
}

export async function deleteContact(id) {
  const response = await api.delete(`/contacts/${id}`)
  return unwrap(response)
}
