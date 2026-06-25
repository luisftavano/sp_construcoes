import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

/** Strips accents and lowercases for fuzzy matching. */
function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function nameMatches(item, name, brand) {
  const nameOk = normalize(item.name).includes(normalize(name))
  const brandOk = !brand || normalize(item.brand ?? '').includes(normalize(brand))
  return nameOk && brandOk
}

class InMemoryInventoryRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }

  async findByIdAndAccount(id, accountId) {
    const item = await this.findById(id)
    return item?.accountId === accountId ? item : null
  }

  async findByNameAndBrandAndAccount(name, brand, accountId) {
    const all = await this.findAllByAccount(accountId)
    return all.filter(i => nameMatches(i, name, brand))
  }

  async findLowStockByAccount(accountId) {
    const all = await this.findAllByAccount(accountId)
    return all.filter(i => i.minStockAlert != null && i.quantity <= i.minStockAlert)
  }
}

class FirestoreInventoryRepository extends FirestoreRepository {
  constructor() { super('inventory') }

  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }

  async findByIdAndAccount(id, accountId) {
    const item = await this.findById(id)
    return item?.accountId === accountId ? item : null
  }

  // Firestore can't do fuzzy/case-insensitive search — load all and filter in JS.
  // Inventory lists are small enough that this is fine.
  async findByNameAndBrandAndAccount(name, brand, accountId) {
    const all = await this.findAllByAccount(accountId)
    return all.filter(i => nameMatches(i, name, brand))
  }

  async findLowStockByAccount(accountId) {
    const all = await this.findAllByAccount(accountId)
    return all.filter(i => i.minStockAlert != null && i.quantity <= i.minStockAlert)
  }
}

export const inventoryRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreInventoryRepository()
    : new InMemoryInventoryRepository()
