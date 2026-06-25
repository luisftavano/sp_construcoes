import { randomUUID } from 'crypto'
import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemorySaleItemRepository extends InMemoryRepository {
  async findBySaleId(saleId) {
    return this.findAll({ saleId })
  }

  async findBySaleIdAndAccount(saleId, accountId) {
    return this.findAll({ saleId, accountId })
  }

  async createMany(items) {
    return Promise.all(items.map(item => this.create(item)))
  }

  async deleteAllBySaleId(saleId) {
    const items = await this.findBySaleId(saleId)
    await Promise.all(items.map(i => this.delete(i.id)))
    return items.length
  }
}

class FirestoreSaleItemRepository extends FirestoreRepository {
  constructor() { super('saleItems') }

  async findBySaleId(saleId) {
    return this.findAll({ saleId })
  }

  async findBySaleIdAndAccount(saleId, accountId) {
    return this.findAll({ saleId, accountId })
  }

  async createMany(items) {
    const col = await this._col()
    const db  = col.firestore
    const batch = db.batch()
    const now = new Date().toISOString()
    const created = []

    for (const item of items) {
      const ref = col.doc()
      const payload = { ...item, id: ref.id, createdAt: now }
      batch.set(ref, payload)
      created.push(payload)
    }

    await batch.commit()
    return created
  }

  async deleteAllBySaleId(saleId) {
    const items = await this.findBySaleId(saleId)
    if (!items.length) return 0
    const col = await this._col()
    const db  = col.firestore
    const batch = db.batch()
    items.forEach(i => batch.delete(col.doc(i.id)))
    await batch.commit()
    return items.length
  }
}

export const saleItemRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreSaleItemRepository()
    : new InMemorySaleItemRepository()
