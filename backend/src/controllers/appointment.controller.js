import * as appointmentService from '../services/appointment.service.js'
import { getValidated } from '../middleware/validate.js'
import { sendSuccess } from '../utils/ApiResponse.js'

export async function listAppointments(req, res) {
  const result = await appointmentService.listAppointments(
    getValidated(req, 'query'),
  )
  return sendSuccess(res, {
    message: 'Appointments fetched successfully',
    data: result.data,
    meta: result.meta,
  })
}

export async function createAppointment(req, res) {
  const appointment = await appointmentService.createAppointment(req.body)
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Appointment created successfully',
    data: appointment,
  })
}

export async function updateAppointment(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  const appointment = await appointmentService.updateAppointment(id, req.body)
  return sendSuccess(res, {
    message: 'Appointment updated successfully',
    data: appointment,
  })
}

export async function deleteAppointment(req, res) {
  const { id } = getValidated(req, 'params', req.params)
  await appointmentService.deleteAppointment(id)
  return sendSuccess(res, {
    message: 'Appointment deleted successfully',
    data: null,
  })
}
