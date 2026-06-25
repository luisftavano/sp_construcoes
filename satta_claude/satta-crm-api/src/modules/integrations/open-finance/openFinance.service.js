import { getAccounts, getTransactions } from './pluggy.client.js'
import { getRawConfig, saveCredentials } from '../integrationConfig.service.js'
import { createExpense } from '../../expenses/expense.service.js'
import { createRevenue } from '../../revenues/revenue.service.js'
import { expenseRepository } from '../../expenses/expense.repository.js'
import { revenueRepository } from '../../revenues/revenue.repository.js'
import { ValidationError } from '../../../shared/errors/index.js'

const PROVIDER = 'open_finance'
const MOCK = process.env.OPEN_FINANCE_MOCK !== 'false'

export async function connectItem(accountId, itemId) {
  await saveCredentials(accountId, PROVIDER, { itemId })
  return { connected: true, itemId }
}

export async function importTransactions(accountId, { from, to }) {
  const config = await getRawConfig(accountId, PROVIDER)
  if (!MOCK && !config?.credentials?.itemId) {
    throw new ValidationError('Open Finance não conectado para esta conta')
  }

  const itemId = config?.credentials?.itemId ?? 'mock-item'
  const accounts = await getAccounts(itemId)
  if (!accounts.length) return { created: 0, skipped: 0, errors: [] }

  const transactions = await getTransactions(accounts[0].id, { from, to })

  let created = 0
  let skipped = 0
  const errors = []

  for (const tx of transactions) {
    try {
      if (tx.type === 'CREDIT') {
        // Check for duplicate by externalTxId
        const existing = await revenueRepository.findOne({ accountId, externalTxId: tx.id })
        if (existing) { skipped++; continue }

        await createRevenue(accountId, {
          description: tx.description,
          amount:      Math.abs(tx.amount),
          category:    tx.category ?? 'Entrada bancária',
          receivedAt:  tx.date,
          source:      'open_finance',
          externalTxId: tx.id,
        })
        created++
      } else if (tx.type === 'DEBIT') {
        const existing = await expenseRepository.findOne({ accountId, externalTxId: tx.id })
        if (existing) { skipped++; continue }

        await createExpense(accountId, {
          description: tx.description,
          amount:      Math.abs(tx.amount),
          category:    tx.category ?? 'Saída bancária',
          paidAt:      tx.date,
          source:      'open_finance',
          externalTxId: tx.id,
        })
        created++
      }
    } catch (err) {
      errors.push({ txId: tx.id, error: err.message })
    }
  }

  return { created, skipped, errors }
}
