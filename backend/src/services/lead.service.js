import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { buildMeta, getPagination } from '../utils/paginate.js'

export async function listLeads(query) {
  const pagination = getPagination(query)
  const result = await db.leads.list({
    ...pagination,
    status: query.status,
  })

  return {
    data: result.data,
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

export async function getLeadById(id) {
  const lead = await db.leads.getById(id)
  if (!lead) throw new ApiError(404, 'Lead not found')
  return lead
}

export async function createLead(payload) {
  return db.leads.create(payload)
}

export async function updateLead(id, payload) {
  const lead = await db.leads.update(id, payload)
  if (!lead) throw new ApiError(404, 'Lead not found')
  return lead
}

export async function deleteLead(id) {
  const removed = await db.leads.remove(id)
  if (!removed) throw new ApiError(404, 'Lead not found')
  return true
}
