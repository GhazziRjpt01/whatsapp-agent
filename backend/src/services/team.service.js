import { db } from '../db/client.js'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { buildMeta, getPagination } from '../utils/paginate.js'

function presentMember(member, includePassword) {
  if (!member || includePassword) return member
  const { password: _password, ...safe } = member
  return safe
}

export async function listTeamMembers(query, { includePassword = false } = {}) {
  const pagination = getPagination(query)
  const result = await db.teamMembers.list({
    ...pagination,
    search: query.search,
  })

  return {
    data: result.data.map((member) => presentMember(member, includePassword)),
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

function assertCeoAssignment(payload, actor) {
  if (payload?.role === 'ceo' && actor?.role !== 'ceo') {
    throw new ApiError(403, 'Only the CEO can assign the CEO role')
  }
}

export async function createTeamMember(payload, actor) {
  assertCeoAssignment(payload, actor)
  if (env.dataStore === 'supabase' && !payload.password) {
    throw new ApiError(400, 'Password is required to add a team member')
  }
  const member = await db.teamMembers.create(payload)
  return presentMember(member, actor?.role === 'ceo')
}

export async function updateTeamMember(id, payload, actor) {
  assertCeoAssignment(payload, actor)
  const member = await db.teamMembers.update(id, payload)
  if (!member) throw new ApiError(404, 'Team member not found')
  return presentMember(member, actor?.role === 'ceo')
}

export async function removeTeamMember(id, actorId) {
  const member = await db.teamMembers.getById(id)
  if (!member) throw new ApiError(404, 'Team member not found')
  if (member.profile_id === actorId) {
    throw new ApiError(400, 'You cannot remove your own account from the team')
  }
  await db.teamMembers.remove(id)
  return true
}
