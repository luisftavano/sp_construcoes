import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryExpenseRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) { return this.findAll({ accountId }, opts) }
  async findByIdAndAccount(id, accountId) { const e = await this.findById(id); return e?.accountId === accountId ? e : null }
  async sumByAccount(accountId, from, to) {
    const all = await this.findAllByAccount(accountId)
    return all
      .filter(e => (!from || e.paidAt >= from) && (!to || e.paidAt <= to))
      .reduce((acc, e) => acc + (e.amount ?? 0), 0)
  }
}

class FirestoreExpenseRepository extends FirestoreRepository {
  constructor() { super('expenses') }
  async findAllByAccount(accountId, opts) { return this.findAll({ accountId }, opts) }
  async findByIdAndAccount(id, accountId) { const e = await this.findById(id); return e?.accountId === accountId ? e : null }
  async sumByAccount(accountId, from, to) {
    const all = await this.findAllByAccount(accountId)
    return all
      .filter(e => (!from || e.paidAt >= from) && (!to || e.paidAt <= to))
      .reduce((acc, e) => acc + (e.amount ?? 0), 0)
  }
}

export const expenseRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreExpenseRepository()
    : new InMemoryExpenseRepository()
