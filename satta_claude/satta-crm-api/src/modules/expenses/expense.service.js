import { expenseRepository } from './expense.repository.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { NotFoundError } from '../../shared/errors/index.js'

export async function listExpenses(accountId) {
  return expenseRepository.findAllByAccount(accountId)
}

export async function createExpense(accountId, data) {
  const { description, amount, category, paidAt, source, externalTxId } = data
  const expense = await expenseRepository.create({
    accountId, description, amount, category,
    paidAt: paidAt ?? new Date().toISOString(),
    ...(source      && { source }),
    ...(externalTxId && { externalTxId }),
  })
  eventBus.emit(EventTypes.EXPENSE_CREATED, { expense })
  return expense
}

export async function deleteExpense(id, accountId) {
  const existing = await expenseRepository.findByIdAndAccount(id, accountId)
  if (!existing) throw new NotFoundError('Expense not found')
  return expenseRepository.delete(id)
}
