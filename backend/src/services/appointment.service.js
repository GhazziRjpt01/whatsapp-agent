import { db } from '../db/client.js'
import { ApiError } from '../utils/ApiError.js'
import { buildMeta, getPagination } from '../utils/paginate.js'

function normalizeTime(time) {
  if (!time) return time
  return time.length === 5 ? `${time}:00` : time
}

export async function listAppointments(query) {
  const pagination = getPagination(query)
  const result = await db.appointments.list({
    ...pagination,
    status: query.status,
  })

  return {
    data: result.data,
    meta: buildMeta({ ...pagination, total: result.total }),
  }
}

export async function createAppointment(payload) {
  return db.appointments.create({
    ...payload,
    appointment_time: normalizeTime(payload.appointment_time),
  })
}

export async function updateAppointment(id, payload) {
  const nextPayload = { ...payload }
  if (nextPayload.appointment_time) {
    nextPayload.appointment_time = normalizeTime(nextPayload.appointment_time)
  }

  const appointment = await db.appointments.update(id, nextPayload)
  if (!appointment) throw new ApiError(404, 'Appointment not found')
  return appointment
}

export async function deleteAppointment(id) {
  const removed = await db.appointments.remove(id)
  if (!removed) throw new ApiError(404, 'Appointment not found')
  return true
}
