import api, { unwrap } from './api'

export async function listTeamMembers(params = {}) {
  const response = await api.get('/team', { params })
  return unwrap(response)
}

export async function createTeamMember(payload) {
  const response = await api.post('/team', payload)
  return unwrap(response).data
}

export async function updateTeamMember(id, payload) {
  const response = await api.put(`/team/${id}`, payload)
  return unwrap(response).data
}

export async function deleteTeamMember(id) {
  const response = await api.delete(`/team/${id}`)
  return unwrap(response)
}
