import * as revenueService from './revenue.service.js'

export async function list(req, res, next) {
  try { res.json(await revenueService.listRevenues(req.user.accountId)) }
  catch (err) { next(err) }
}

export async function create(req, res, next) {
  try { res.status(201).json(await revenueService.createRevenue(req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try { await revenueService.deleteRevenue(req.params.id, req.user.accountId); res.status(204).end() }
  catch (err) { next(err) }
}
