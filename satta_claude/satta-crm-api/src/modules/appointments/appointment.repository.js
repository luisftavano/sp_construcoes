import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryAppointmentRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }

  async findByIdAndAccount(id, accountId) {
    const a = await this.findById(id)
    return a?.accountId === accountId ? a : null
  }

  /** Returns all appointments for a given day, ordered by startAt. */
  async findByDate(accountId, dateStr) {
    const all = await this.findAllByAccount(accountId)
    return all
      .filter(a => a.startAt.startsWith(dateStr))
      .sort((a, b) => (a.startAt > b.startAt ? 1 : -1))
  }

  /** Checks if a resourceName is already booked in a time window. */
  async hasConflict(accountId, resourceName, startAt, endAt, excludeId) {
    const all = await this.findAllByAccount(accountId)
    return all.some(a =>
      a.id !== excludeId &&
      a.resourceName === resourceName &&
      !['cancelled', 'no_show'].includes(a.status) &&
      a.startAt < endAt &&
      a.endAt > startAt
    )
  }
}

class FirestoreAppointmentRepository extends FirestoreRepository {
  constructor() { super('appointments') }

  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }

  async findByIdAndAccount(id, accountId) {
    const a = await this.findById(id)
    return a?.accountId === accountId ? a : null
  }

  async findByDate(accountId, dateStr) {
    const all = await this.findAllByAccount(accountId)
    return all
      .filter(a => a.startAt.startsWith(dateStr))
      .sort((a, b) => (a.startAt > b.startAt ? 1 : -1))
  }

  async hasConflict(accountId, resourceName, startAt, endAt, excludeId) {
    const all = await this.findAllByAccount(accountId)
    return all.some(a =>
      a.id !== excludeId &&
      a.resourceName === resourceName &&
      !['cancelled', 'no_show'].includes(a.status) &&
      a.startAt < endAt &&
      a.endAt > startAt
    )
  }
}

export const appointmentRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreAppointmentRepository()
    : new InMemoryAppointmentRepository()
