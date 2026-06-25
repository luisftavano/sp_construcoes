import { serviceRepository } from './service.repository.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { NotFoundError } from '../../shared/errors/index.js'

export async function listServices(accountId) {
  return serviceRepository.findAllByAccount(accountId)
}

export async function getService(id, accountId) {
  const service = await serviceRepository.findByIdAndAccount(id, accountId)
  if (!service) throw new NotFoundError('Service not found')
  return service
}

export async function createService(accountId, data) {
  const service = await serviceRepository.create({ ...data, accountId })
  eventBus.emit(EventTypes.SERVICE_CREATED, { service })
  return service
}

export async function updateService(id, accountId, data) {
  await getService(id, accountId)
  const updated = await serviceRepository.update(id, data)
  eventBus.emit(EventTypes.SERVICE_UPDATED, { service: updated })
  return updated
}

export async function deleteService(id, accountId) {
  await getService(id, accountId)
  await serviceRepository.delete(id)
  eventBus.emit(EventTypes.SERVICE_DELETED, { id, accountId })
}

export async function createManyServices(accountId, names) {
  return Promise.all(names.map(name => createService(accountId, { name })))
}
