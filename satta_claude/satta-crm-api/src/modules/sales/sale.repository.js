import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemorySaleRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) { return this.findAll({ accountId }, opts) }
  async findByIdAndAccount(id, accountId) { const s = await this.findById(id); return s?.accountId === accountId ? s : null }
  async sumByAccount(accountId, from, to) {
    const all = await this.findAllByAccount(accountId)
    return all
      .filter(s => (!from || s.soldAt >= from) && (!to || s.soldAt <= to))
      .reduce((acc, s) => acc + (s.amount ?? 0), 0)
  }
}

class FirestoreSaleRepository extends FirestoreRepository {
  constructor() { super('sales') }
  async findAllByAccount(accountId, opts) { return this.findAll({ accountId }, opts) }
  async findByIdAndAccount(id, accountId) { const s = await this.findById(id); return s?.accountId === accountId ? s : null }
  async sumByAccount(accountId, from, to) {
    const all = await this.findAllByAccount(accountId)
    return all
      .filter(s => (!from || s.soldAt >= from) && (!to || s.soldAt <= to))
      .reduce((acc, s) => acc + (s.amount ?? 0), 0)
  }
}

export const saleRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreSaleRepository()
    : new InMemorySaleRepository()
