import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { adjustInventoryQuantity } from './inventory.service.js'

/**
 * Keeps inventory in sync with sales via the event bus.
 * Decoupled from sale.service on purpose — sales should not import inventory directly.
 *
 * NOTE: connecting adjustments to future sale.updated events (e.g. changing quantities)
 * would require diffing old vs new items and is intentionally left for a future iteration.
 */
export function registerSaleStockSyncListeners() {
  eventBus.on(EventTypes.SALE_CREATED, async (payload) => {
    const productItems = (payload.items ?? []).filter(i => i.type === 'product')
    for (const item of productItems) {
      try {
        await adjustInventoryQuantity(payload.accountId, {
          itemId:         item.inventoryItemId,
          quantityChange: -item.quantity,
        })
      } catch (err) {
        console.error('[inventory-sync] Failed to decrement stock on sale.created:', err.message, { item })
      }
    }
  })

  eventBus.on(EventTypes.SALE_CANCELLED, async (payload) => {
    const productItems = (payload.items ?? []).filter(i => i.type === 'product')
    for (const item of productItems) {
      try {
        await adjustInventoryQuantity(payload.accountId, {
          itemId:         item.inventoryItemId,
          quantityChange: item.quantity,
        })
      } catch (err) {
        console.error('[inventory-sync] Failed to restore stock on sale.cancelled:', err.message, { item })
      }
    }
  })
}
