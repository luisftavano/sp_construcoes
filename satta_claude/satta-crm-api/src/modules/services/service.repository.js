import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryServiceRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }
  async findByIdAndAccount(id, accountId) {
    const s = await this.findById(id)
    return s?.accountId === accountId ? s : null
  }
}

class FirestoreServiceRepository extends FirestoreRepository {
  constructor() { super('services') }
  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }
  async findByIdAndAccount(id, accountId) {
    const s = await this.findById(id)
    return s?.accountId === accountId ? s : null
  }
}

export const serviceRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreServiceRepository()
    : new InMemoryServiceRepository()
