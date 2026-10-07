import * as conversationService from '../services/conversation.service.js'
import { getValidated } from '../middleware/validate.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function listConversations(req, res) {
  const result = await conversationService.listConversations(
    getValidated(req, 'query'),
  )
  return sendSuccess(res, {
    message: 'Conversations fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function getConversation(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const conversation = await conversationService.getConversationById(id)
  return sendSuccess(res, {
    message: 'Conversation fetched successfully',
    data: conversation,
  })
}

export async function createConversation(req, res) {
  const conversation = await conversationService.createConversation(req.body)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Conversation created successfully',
    data: conversation,
  })
}

export async function updateConversation(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const conversation = await conversationService.updateConversation(id, req.body)
  return sendSuccess(res, {
    message: 'Conversation updated successfully',
    data: conversation,
  })
}

export async function listMessages(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const result = await conversationService.listMessages(
    id,
    getValidated(req, 'query'),
  )
  return sendSuccess(res, {
    message: 'Messages fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function createMessage(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const message = await conversationService.createMessage(
    id,
    req.body,
    req.user,
  )
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Message created successfully',
    data: message,
  })
}

export async function takeover(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const result = await conversationService.takeover(id, req.user, req.body || {})
  return sendSuccess(res, {
    message: result.unchanged
      ? 'Conversation already with a human agent'
      : 'Conversation taken over successfully',
    data: result,
  })
}

export async function returnToAi(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const result = await conversationService.returnConversationToAi(
    id,
    req.user,
    req.body || {},
  )
  return sendSuccess(res, {
    message: result.unchanged
      ? 'Conversation already in AI mode'
      : 'Conversation returned to AI successfully',
    data: result,
  })
}

export async function listHandoffs(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const handoffs = await conversationService.listHandoffs(id)
  return sendSuccess(res, {
    message: 'Handoff audit fetched successfully',
    data: handoffs,
  })
}
