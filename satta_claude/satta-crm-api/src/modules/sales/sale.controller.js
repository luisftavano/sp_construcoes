import * as saleService from './sale.service.js'

export async function list(req, res, next) {
  try { res.json(await saleService.listSales(req.user.accountId)) }
  catch (err) { next(err) }
}

export async function get(req, res, next) {
  try { res.json(await saleService.getSaleWithItems(req.params.id, req.user.accountId)) }
  catch (err) { next(err) }
}

export async function create(req, res, next) {
  try { res.status(201).json(await saleService.createSale(req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function cancel(req, res, next) {
  try { res.json(await saleService.cancelSale(req.params.id, req.user.accountId)) }
  catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try { await saleService.deleteSale(req.params.id, req.user.accountId); res.status(204).end() }
  catch (err) { next(err) }
}
