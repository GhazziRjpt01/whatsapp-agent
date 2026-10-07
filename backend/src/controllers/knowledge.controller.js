import * as knowledgeService from '../services/knowledge.service.js'
import { getValidated } from '../middleware/validate.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function listKnowledge(req, res) {
  const result = await knowledgeService.listKnowledge(getValidated(req, 'query'))
  return sendSuccess(res, {
    message: 'Knowledge base fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function createKnowledge(req, res) {
  const item = await knowledgeService.createKnowledge(req.body, req.user?.id)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Knowledge article created successfully',
    data: item,
  })
}

export async function updateKnowledge(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const item = await knowledgeService.updateKnowledge(id, req.body)
  return sendSuccess(res, {
    message: 'Knowledge article updated successfully',
    data: item,
  })
}

export async function deleteKnowledge(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  await knowledgeService.deleteKnowledge(id)
  return sendSuccess(res, {
    message: 'Knowledge article deleted successfully',
    data: null,
  })
}
