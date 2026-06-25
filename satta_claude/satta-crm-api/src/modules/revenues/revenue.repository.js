import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryRevenueRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) { return this.findAll({ accountId }, opts) }
  async sumByAccount(accountId) {
    return (await this.findAllByAccount(accountId)).reduce((a, r) => a + (r.amount ?? 0), 0)
  }
}

class FirestoreRevenueRepository extends FirestoreRepository {
  constructor() { super('revenues') }
  async findAllByAccount(accountId, opts) { return this.findAll({ accountId }, opts) }
  async sumByAccount(accountId) {
    return (await this.findAllByAccount(accountId)).reduce((a, r) => a + (r.amount ?? 0), 0)
  }
}

export const revenueRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreRevenueRepository()
    : new InMemoryRevenueRepository()
