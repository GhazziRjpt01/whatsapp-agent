import * as leadService from '../services/lead.service.js'
import { getValidated } from '../middleware/validate.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function listLeads(req, res) {
  const result = await leadService.listLeads(getValidated(req, 'query'))
  return sendSuccess(res, {
    message: 'Leads fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function getLead(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const lead = await leadService.getLeadById(id)
  return sendSuccess(res, {
    message: 'Lead fetched successfully',
    data: lead,
  })
}

export async function createLead(req, res) {
  const lead = await leadService.createLead(req.body)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Lead created successfully',
    data: lead,
  })
}

export async function updateLead(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const lead = await leadService.updateLead(id, req.body)
  return sendSuccess(res, {
    message: 'Lead updated successfully',
    data: lead,
  })
}

export async function deleteLead(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  await leadService.deleteLead(id)
  return sendSuccess(res, {
    message: 'Lead deleted successfully',
    data: null,
  })
}
