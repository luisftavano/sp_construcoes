import { inventoryRepository } from './inventory.repository.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { NotFoundError, AmbiguousInventoryMatchError } from '../../shared/errors/index.js'

export async function listInventory(accountId, { page = 1, limit = 50, category } = {}) {
  const all = await inventoryRepository.findAllByAccount(accountId)
  const filtered = category ? all.filter(i => i.category === category) : all
  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name))
  const offset = (page - 1) * limit
  return {
    data: sorted.slice(offset, offset + limit),
    total: filtered.length,
    page,
    limit,
  }
}

export async function getInventoryItem(accountId, id) {
  const item = await inventoryRepository.findByIdAndAccount(id, accountId)
  if (!item) throw new NotFoundError('Inventory item not found')
  return item
}

export async function createInventoryItem(accountId, data) {
  const item = await inventoryRepository.create({
    ...data,
    accountId,
    unit: data.unit ?? 'unidade',
    quantity: data.quantity ?? 0,
  })
  eventBus.emit(EventTypes.INVENTORY_ITEM_CREATED, { item })
  return item
}

export async function updateInventoryItem(accountId, id, data) {
  await getInventoryItem(accountId, id)
  const updated = await inventoryRepository.update(id, data)
  eventBus.emit(EventTypes.INVENTORY_ITEM_UPDATED, { item: updated })
  return updated
}

export async function deleteInventoryItem(accountId, id) {
  await getInventoryItem(accountId, id)
  await inventoryRepository.delete(id)
  eventBus.emit(EventTypes.INVENTORY_ITEM_DELETED, { id, accountId })
}

export async function getLowStockItems(accountId) {
  return inventoryRepository.findLowStockByAccount(accountId)
}

/**
 * Central function for quantity adjustments — used by manual UI and Kango tools.
 *
 * Resolution order:
 *   1. itemId provided → adjust directly
 *   2. name/brand provided → fuzzy search:
 *      - 0 matches + quantityChange > 0 → create new item
 *      - 0 matches + quantityChange <= 0 → NotFoundError
 *      - 1 match → adjust
 *      - >1 matches → AmbiguousInventoryMatchError (caller must ask user to clarify)
 *
 * After adjustment, emits INVENTORY_LOW_STOCK_REACHED if quantity drops to/below minStockAlert.
 *
 * NOTE: connecting this to sales (auto-decrement on sale.created) is intentionally
 * deferred to saleStockSync.listener.js — do not add sale coupling here.
 */
export async function adjustInventoryQuantity(accountId, { itemId, name, brand, quantityChange, unit }) {
  let item

  if (itemId) {
    item = await getInventoryItem(accountId, itemId)
  } else {
    const candidates = await inventoryRepository.findByNameAndBrandAndAccount(name, brand, accountId)

    if (candidates.length > 1) {
      throw new AmbiguousInventoryMatchError(
        `Found ${candidates.length} inventory items matching "${name}"${brand ? ` (${brand})` : ''}. Specify which one.`,
        candidates,
      )
    }

    if (candidates.length === 0) {
      if (quantityChange <= 0) throw new NotFoundError(`Inventory item "${name}" not found`)
      // Auto-create when adding stock for an unknown item
      return createInventoryItem(accountId, {
        name,
        brand,
        quantity: quantityChange,
        unit: unit ?? 'unidade',
      })
    }

    item = candidates[0]
  }

  const newQuantity = item.quantity + quantityChange
  const updated = await inventoryRepository.update(item.id, { quantity: newQuantity })

  eventBus.emit(EventTypes.INVENTORY_QUANTITY_ADJUSTED, {
    accountId,
    item: updated,
    quantityChange,
  })

  if (updated.minStockAlert != null && newQuantity <= updated.minStockAlert) {
    eventBus.emit(EventTypes.INVENTORY_LOW_STOCK_REACHED, { accountId, item: updated })
  }

  return updated
}
