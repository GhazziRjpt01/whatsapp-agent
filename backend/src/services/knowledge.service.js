import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { buildMeta, getPagination } from '../utils/paginate.js'

export async function listKnowledge(query) {
  const pagination = getPagination(query)
  const result = await db.knowledge.list({
    ...pagination,
    category: query.category,
  })

  return {
    data: result.data,
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

export async function createKnowledge(payload, userId) {
  return db.knowledge.create(payload, userId)
}

export async function updateKnowledge(id, payload) {
  const item = await db.knowledge.update(id, payload)
  if (!item) throw new ApiError(404, 'Knowledge article not found')
  return item
}

export async function deleteKnowledge(id) {
  const removed = await db.knowledge.remove(id)
  if (!removed) throw new ApiError(404, 'Knowledge article not found')
  return true
}
