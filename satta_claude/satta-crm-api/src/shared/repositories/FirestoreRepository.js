/**
 * Firestore-backed repository. Lazily initialises the Firestore client
 * so that missing credentials don't crash the server on boot.
 *
 * Subclasses must set `this.collectionName` in their constructor.
 */
export class FirestoreRepository {
  constructor(collectionName) {
    this.collectionName = collectionName
    this._db = null
  }

  /** Lazy init — only calls firebase-admin when the first query arrives. */
  async _col() {
    if (!this._db) {
      const { getFirestore } = await import('firebase-admin/firestore')
      this._db = getFirestore()
    }
    return this._db.collection(this.collectionName)
  }

  async findById(id) {
    const col = await this._col()
    const doc = await col.doc(id).get()
    return doc.exists ? { id: doc.id, ...doc.data() } : null
  }

  async create(data) {
    const col = await this._col()
    const now = new Date().toISOString()
    const payload = { ...data, createdAt: now, updatedAt: now }
    const ref = await col.add(payload)
    return { id: ref.id, ...payload }
  }

  async update(id, data) {
    const col = await this._col()
    const payload = { ...data, updatedAt: new Date().toISOString() }
    await col.doc(id).update(payload)
    return this.findById(id)
  }

  async delete(id) {
    const col = await this._col()
    await col.doc(id).delete()
    return true
  }

  async findAll(filter = {}, { orderBy, limit, offset } = {}) {
    const col = await this._col()
    let q = col

    for (const [key, value] of Object.entries(filter)) {
      q = q.where(key, '==', value)
    }

    if (orderBy) q = q.orderBy(orderBy)
    if (offset) q = q.offset(offset)
    if (limit) q = q.limit(limit)

    const snap = await q.get()
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }

  async findOne(filter = {}) {
    const results = await this.findAll(filter, { limit: 1 })
    return results[0] ?? null
  }

  async count(filter = {}) {
    return (await this.findAll(filter)).length
  }
}
