import { customerRepository } from './customer.repository.js'
import { saleRepository } from '../sales/sale.repository.js'
import { appointmentRepository } from '../appointments/appointment.repository.js'
import { detectDocumentType } from '../../shared/utils/documentValidator.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { NotFoundError } from '../../shared/errors/index.js'

export async function listCustomers(accountId, { page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit
  const customers = await customerRepository.findAllByAccount(accountId, { limit, offset })
  const total = await customerRepository.count({ accountId })
  return { data: customers, total, page, limit }
}

export async function getCustomer(id, accountId) {
  const customer = await customerRepository.findByIdAndAccount(id, accountId)
  if (!customer) throw new NotFoundError('Customer not found')
  return customer
}

export async function createCustomer(accountId, data) {
  const payload = { ...data, accountId }
  if (data.document) {
    payload.document = data.document.replace(/\D/g, '')
    payload.documentType = detectDocumentType(payload.document)
  }
  const customer = await customerRepository.create(payload)
  eventBus.emit(EventTypes.CUSTOMER_CREATED, { customer })
  return customer
}

export async function updateCustomer(id, accountId, data) {
  const existing = await getCustomer(id, accountId)
  const payload = { ...data }
  if (data.document) {
    payload.document = data.document.replace(/\D/g, '')
    payload.documentType = detectDocumentType(payload.document)
  }
  const updated = await customerRepository.update(id, payload)
  eventBus.emit(EventTypes.CUSTOMER_UPDATED, { customer: updated })
  return updated
}

export async function deleteCustomer(id, accountId) {
  await getCustomer(id, accountId)
  await customerRepository.delete(id)
  eventBus.emit(EventTypes.CUSTOMER_DELETED, { id, accountId })
}

/**
 * Returns customers with no sales or appointments in the last X days.
 * Used by the Kango AI tool `list_inactive_customers`.
 */
export async function listInactiveCustomers(accountId, daysSinceLastActivity = 30) {
  const cutoff = new Date(Date.now() - daysSinceLastActivity * 86_400_000).toISOString()
  const customers = await customerRepository.findAllByAccount(accountId)

  const inactiveCustomers = await Promise.all(
    customers.map(async (c) => {
      const recentSales = await saleRepository.findAll({ accountId, customerId: c.id })
      const recentAppointments = await appointmentRepository.findAll({ accountId, customerId: c.id })

      const lastSale = recentSales.map(s => s.soldAt).sort().at(-1) ?? '1970-01-01'
      const lastAppt = recentAppointments.map(a => a.startAt).sort().at(-1) ?? '1970-01-01'
      const lastActivity = lastSale > lastAppt ? lastSale : lastAppt

      return lastActivity < cutoff ? { ...c, lastActivityAt: lastActivity } : null
    })
  )

  return inactiveCustomers.filter(Boolean)
}
