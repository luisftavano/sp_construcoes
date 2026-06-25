import { appointmentRepository } from './appointment.repository.js'
import { customerRepository } from '../customers/customer.repository.js'
import { serviceRepository } from '../services/service.repository.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { NotFoundError, ScheduleConflictError } from '../../shared/errors/index.js'

async function assertBelongsToAccount(repository, id, accountId, label) {
  const entity = await repository.findByIdAndAccount(id, accountId)
  if (!entity) throw new NotFoundError(`${label} not found`)
  return entity
}

async function checkConflict(accountId, resourceName, startAt, endAt, excludeId, force) {
  if (!resourceName || force) return
  const conflict = await appointmentRepository.hasConflict(accountId, resourceName, startAt, endAt, excludeId)
  if (conflict) throw new ScheduleConflictError()
}

export async function listAppointments(accountId) {
  return appointmentRepository.findAllByAccount(accountId)
}

export async function getAgenda(accountId, date) {
  return appointmentRepository.findByDate(accountId, date)
}

export async function getAppointment(id, accountId) {
  const appt = await appointmentRepository.findByIdAndAccount(id, accountId)
  if (!appt) throw new NotFoundError('Appointment not found')
  return appt
}

export async function createAppointment(accountId, data) {
  const { force, serviceId, customerId, resourceName, startAt, endAt, ...rest } = data

  await assertBelongsToAccount(customerRepository, customerId, accountId, 'Customer')
  if (serviceId) await assertBelongsToAccount(serviceRepository, serviceId, accountId, 'Service')

  await checkConflict(accountId, resourceName, startAt, endAt, null, force)

  const appt = await appointmentRepository.create({
    accountId, customerId, serviceId, resourceName, startAt, endAt,
    status: 'scheduled',
    ...rest,
  })

  eventBus.emit(EventTypes.APPOINTMENT_CREATED, { appointment: appt })
  return appt
}

export async function updateAppointment(id, accountId, data) {
  const existing = await getAppointment(id, accountId)
  const { force, ...rest } = data

  const newStart = rest.startAt ?? existing.startAt
  const newEnd   = rest.endAt   ?? existing.endAt
  const resource = rest.resourceName ?? existing.resourceName

  await checkConflict(accountId, resource, newStart, newEnd, id, force)

  const updated = await appointmentRepository.update(id, rest)

  if (rest.status === 'cancelled') {
    eventBus.emit(EventTypes.APPOINTMENT_CANCELLED, { appointment: updated })
  } else if (rest.status === 'completed') {
    eventBus.emit(EventTypes.APPOINTMENT_COMPLETED, { appointment: updated })
  } else {
    eventBus.emit(EventTypes.APPOINTMENT_UPDATED, { appointment: updated })
  }

  return updated
}

export async function cancelAppointment(id, accountId) {
  return updateAppointment(id, accountId, { status: 'cancelled', force: true })
}
