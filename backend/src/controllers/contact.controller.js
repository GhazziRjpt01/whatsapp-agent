import * as contactService from '../services/contact.service.js'
import { getValidated } from '../middleware/validate.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function listContacts(req, res) {
  const result = await contactService.listContacts(getValidated(req, 'query'))
  return sendSuccess(res, {
    message: 'Contacts fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function getContact(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const contact = await contactService.getContactById(id)
  return sendSuccess(res, {
    message: 'Contact fetched successfully',
    data: contact,
  })
}

export async function createContact(req, res) {
  const contact = await contactService.createContact(req.body)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Contact created successfully',
    data: contact,
  })
}

export async function updateContact(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const contact = await contactService.updateContact(id, req.body)
  return sendSuccess(res, {
    message: 'Contact updated successfully',
    data: contact,
  })
}

export async function deleteContact(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  await contactService.deleteContact(id)
  return sendSuccess(res, {
    message: 'Contact deleted successfully',
    data: null,
  })
}
