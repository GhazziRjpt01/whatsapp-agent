import * as teamService from '../services/team.service.js'
import { getValidated } from '../middleware/validate.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function listTeamMembers(req, res) {
  const includePassword = req.user?.role === 'ceo'
  const result = await teamService.listTeamMembers(getValidated(req, 'query'), {
    includePassword,
  })
  return sendSuccess(res, {
    message: 'Team members fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function createTeamMember(req, res) {
  const member = await teamService.createTeamMember(req.body, req.user)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Team member added successfully',
    data: member,
  })
}

export async function updateTeamMember(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const member = await teamService.updateTeamMember(id, req.body, req.user)
  return sendSuccess(res, {
    message: 'Team member updated successfully',
    data: member,
  })
}

export async function removeTeamMember(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  await teamService.removeTeamMember(id, req.user.id)
  return sendSuccess(res, {
    message: 'Team member removed successfully',
    data: null,
  })
}
