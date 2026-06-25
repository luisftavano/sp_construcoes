import { revenueRepository } from './revenue.repository.js'
import { NotFoundError } from '../../shared/errors/index.js'

export async function listRevenues(accountId) {
  return revenueRepository.findAllByAccount(accountId)
}

export async function createRevenue(accountId, data) {
  return revenueRepository.create({ accountId, ...data, receivedAt: data.receivedAt ?? new Date().toISOString() })
}

export async function deleteRevenue(id, accountId) {
  const existing = await revenueRepository.findOne({ id, accountId })
  if (!existing) throw new NotFoundError('Revenue not found')
  return revenueRepository.delete(id)
}
