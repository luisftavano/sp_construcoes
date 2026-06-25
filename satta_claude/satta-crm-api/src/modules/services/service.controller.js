import * as serviceService from './service.service.js'

export async function list(req, res, next) {
  try { res.json(await serviceService.listServices(req.user.accountId)) }
  catch (err) { next(err) }
}

export async function get(req, res, next) {
  try { res.json(await serviceService.getService(req.params.id, req.user.accountId)) }
  catch (err) { next(err) }
}

export async function create(req, res, next) {
  try { res.status(201).json(await serviceService.createService(req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function update(req, res, next) {
  try { res.json(await serviceService.updateService(req.params.id, req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try { await serviceService.deleteService(req.params.id, req.user.accountId); res.status(204).end() }
  catch (err) { next(err) }
}
