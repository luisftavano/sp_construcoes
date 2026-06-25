import * as inventoryService from './inventory.service.js'

export async function list(req, res, next) {
  try {
    const { page, limit, category } = req.query
    res.json(await inventoryService.listInventory(req.user.accountId, {
      page:     parseInt(page) || 1,
      limit:    parseInt(limit) || 50,
      category,
    }))
  } catch (err) { next(err) }
}

export async function lowStock(req, res, next) {
  try { res.json(await inventoryService.getLowStockItems(req.user.accountId)) }
  catch (err) { next(err) }
}

export async function get(req, res, next) {
  try { res.json(await inventoryService.getInventoryItem(req.user.accountId, req.params.id)) }
  catch (err) { next(err) }
}

export async function create(req, res, next) {
  try { res.status(201).json(await inventoryService.createInventoryItem(req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function update(req, res, next) {
  try { res.json(await inventoryService.updateInventoryItem(req.user.accountId, req.params.id, req.body)) }
  catch (err) { next(err) }
}

export async function adjust(req, res, next) {
  try {
    res.json(await inventoryService.adjustInventoryQuantity(req.user.accountId, {
      itemId: req.params.id,
      quantityChange: req.body.quantityChange,
    }))
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    await inventoryService.deleteInventoryItem(req.user.accountId, req.params.id)
    res.status(204).end()
  } catch (err) { next(err) }
}
