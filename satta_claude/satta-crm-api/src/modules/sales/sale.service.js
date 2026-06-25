import { saleRepository }     from './sale.repository.js'
import { saleItemRepository }  from './sale-item.repository.js'
import { serviceRepository }   from '../services/service.repository.js'
import { inventoryRepository } from '../inventory/inventory.repository.js'
import { eventBus }            from '../../shared/events/eventBus.js'
import { EventTypes }          from '../../shared/events/eventTypes.js'
import { NotFoundError, InsufficientStockError } from '../../shared/errors/index.js'

export async function listSales(accountId) {
  return saleRepository.findAllByAccount(accountId)
}

export async function getSale(id, accountId) {
  const sale = await saleRepository.findByIdAndAccount(id, accountId)
  if (!sale) throw new NotFoundError('Sale not found')
  return sale
}

export async function getSaleWithItems(id, accountId) {
  const sale  = await getSale(id, accountId)
  const items = await saleItemRepository.findBySaleIdAndAccount(id, accountId)
  return { ...sale, items }
}

/**
 * Resolves each raw item into a fully-populated SaleItem payload with snapshots.
 * Services: validates serviceId belongs to account, snapshots name + price.
 * Products: validates inventoryItemId, snapshots name + price + costPrice, checks stock.
 */
async function resolveItems(accountId, rawItems, force) {
  const resolved = []
  const stockShortage = []

  for (const raw of rawItems) {
    if (raw.type === 'service') {
      if (raw.serviceId) {
        const svc = await serviceRepository.findByIdAndAccount(raw.serviceId, accountId)
        if (!svc) throw new NotFoundError(`Service ${raw.serviceId} not found`)
        const unitPrice = raw.unitPrice ?? svc.price ?? 0
        resolved.push({
          type:            'service',
          serviceId:       svc.id,
          inventoryItemId: null,
          name:            raw.name ?? svc.name,
          quantity:        raw.quantity,
          unitPrice,
          totalPrice:      raw.quantity * unitPrice,
        })
      } else {
        // Custom / uncatalogued service (e.g. from appointment without serviceId)
        const unitPrice = raw.unitPrice ?? 0
        resolved.push({
          type:            'service',
          serviceId:       null,
          inventoryItemId: null,
          name:            raw.name ?? 'Serviço',
          quantity:        raw.quantity,
          unitPrice,
          totalPrice:      raw.quantity * unitPrice,
        })
      }
    } else if (raw.type === 'product') {
      const inv = await inventoryRepository.findByIdAndAccount(raw.inventoryItemId, accountId)
      if (!inv) throw new NotFoundError(`Inventory item ${raw.inventoryItemId} not found`)

      const unitPrice = raw.unitPrice ?? inv.sellPrice ?? 0

      if (!force && inv.quantity < raw.quantity) {
        stockShortage.push({
          inventoryItemId: inv.id,
          name:      inv.name,
          available: inv.quantity,
          requested: raw.quantity,
        })
      }

      resolved.push({
        type:            'product',
        serviceId:       null,
        inventoryItemId: inv.id,
        name:            raw.name ?? inv.name,
        quantity:        raw.quantity,
        unitPrice,
        costPrice:       inv.costPrice ?? null,
        totalPrice:      raw.quantity * unitPrice,
      })
    } else {
      throw new NotFoundError(`Unknown sale item type: ${raw.type}`)
    }
  }

  if (stockShortage.length > 0) {
    throw new InsufficientStockError(
      `Insufficient stock for ${stockShortage.length} item(s)`,
      stockShortage,
    )
  }

  return resolved
}

export async function createSale(accountId, data) {
  const { items, discountAmount = 0, paymentMethod, notes, soldAt, customerId, source, force } = data

  if (!items?.length) {
    throw new NotFoundError('Sale must have at least one item')
  }

  const resolvedItems = await resolveItems(accountId, items, force)

  const amount      = resolvedItems.reduce((sum, i) => sum + i.totalPrice, 0)
  const totalAmount = Math.max(0, amount - discountAmount)

  const sale = await saleRepository.create({
    accountId,
    customerId:    customerId ?? null,
    status:        'completed',
    amount,
    discountAmount,
    totalAmount,
    paymentMethod: paymentMethod ?? null,
    notes:         notes ?? null,
    soldAt:        soldAt ?? new Date().toISOString(),
    source:        source ?? 'manual',
  })

  const saleItems = await saleItemRepository.createMany(
    resolvedItems.map(i => ({ ...i, saleId: sale.id, accountId }))
  )

  eventBus.emit(EventTypes.SALE_CREATED, { accountId, sale, items: saleItems })
  return { ...sale, items: saleItems }
}

export async function cancelSale(id, accountId) {
  const sale  = await getSale(id, accountId)
  const items = await saleItemRepository.findBySaleIdAndAccount(id, accountId)

  if (sale.status === 'cancelled') throw new NotFoundError('Sale is already cancelled')

  const updated = await saleRepository.update(id, { status: 'cancelled' })
  eventBus.emit(EventTypes.SALE_CANCELLED, { accountId, saleId: id, items })
  return { ...updated, items }
}

// Kept for backwards-compat — routes still call deleteSale
export async function deleteSale(id, accountId) {
  return cancelSale(id, accountId)
}
