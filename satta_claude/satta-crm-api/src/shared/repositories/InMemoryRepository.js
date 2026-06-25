import { randomUUID } from 'crypto'

/**
 * Generic in-memory CRUD store. Each subclass gets its own isolated Map.
 * Used as fallback when USE_FIRESTORE is not set.
 */
export class InMemoryRepository {
  constructor() {
    this._store = new Map()
  }

  async findById(id) {
    return this._store.get(id) ?? null
  }

  async create(data) {
    const entity = {
      id: randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this._store.set(entity.id, entity)
    return entity
  }

  async update(id, data) {
    const existing = this._store.get(id)
    if (!existing) return null
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() }
    this._store.set(id, updated)
    return updated
  }

  async delete(id) {
    return this._store.delete(id)
  }

  /** Filter by exact field equality. All conditions are ANDed. */
  async findAll(filter = {}, { orderBy, limit, offset = 0 } = {}) {
    let results = [...this._store.values()]

    for (const [key, value] of Object.entries(filter)) {
      results = results.filter(item => item[key] === value)
    }

    if (orderBy) {
      results.sort((a, b) => (a[orderBy] > b[orderBy] ? 1 : -1))
    }

    if (limit !== undefined) {
      results = results.slice(offset, offset + limit)
    }

    return results
  }

  async findOne(filter = {}) {
    const results = await this.findAll(filter)
    return results[0] ?? null
  }

  async count(filter = {}) {
    return (await this.findAll(filter)).length
  }
}
