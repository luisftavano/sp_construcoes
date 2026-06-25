import * as apptService from './appointment.service.js'

export async function list(req, res, next) {
  try { res.json(await apptService.listAppointments(req.user.accountId)) }
  catch (err) { next(err) }
}

export async function agenda(req, res, next) {
  try { res.json(await apptService.getAgenda(req.user.accountId, req.query.date)) }
  catch (err) { next(err) }
}

export async function get(req, res, next) {
  try { res.json(await apptService.getAppointment(req.params.id, req.user.accountId)) }
  catch (err) { next(err) }
}

export async function create(req, res, next) {
  try { res.status(201).json(await apptService.createAppointment(req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function update(req, res, next) {
  try { res.json(await apptService.updateAppointment(req.params.id, req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function cancel(req, res, next) {
  try { res.json(await apptService.cancelAppointment(req.params.id, req.user.accountId)) }
  catch (err) { next(err) }
}
