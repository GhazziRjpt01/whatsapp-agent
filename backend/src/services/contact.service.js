import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { buildMeta, getPagination } from '../utils/paginate.js'

export async function listContacts(query) {
  const pagination = getPagination(query)
  const result = await db.contacts.list({
    ...pagination,
    search: query.search,
  })

  return {
    data: result.data,
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

export async function getContactById(id) {
  const contact = await db.contacts.getById(id)
  if (!contact) throw new ApiError(404, 'Contact not found')
  return contact
}

export async function createContact(payload) {
  return db.contacts.create(payload)
}

export async function updateContact(id, payload) {
  const contact = await db.contacts.update(id, payload)
  if (!contact) throw new ApiError(404, 'Contact not found')
  return contact
}

export async function deleteContact(id) {
  const removed = await db.contacts.remove(id)
  if (!removed) throw new ApiError(404, 'Contact not found')
  return true
}
