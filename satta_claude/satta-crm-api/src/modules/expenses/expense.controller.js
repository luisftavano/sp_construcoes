import * as expenseService from './expense.service.js'

export async function list(req, res, next) {
  try { res.json(await expenseService.listExpenses(req.user.accountId)) }
  catch (err) { next(err) }
}

export async function create(req, res, next) {
  try { res.status(201).json(await expenseService.createExpense(req.user.accountId, req.body)) }
  catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try { await expenseService.deleteExpense(req.params.id, req.user.accountId); res.status(204).end() }
  catch (err) { next(err) }
}
