import { accountRepository } from './account.repository.js'
import { getNicheSettings } from '../../config/nicheConfig.js'
import { createManyServices } from '../services/service.service.js'
import { NotFoundError } from '../../shared/errors/index.js'

export async function getAccountInfo(accountId) {
  const account = await accountRepository.findById(accountId)
  if (!account) throw new NotFoundError('Account not found')
  return account
}

export async function updateAccountInfo(accountId, data) {
  await getAccountInfo(accountId)
  return accountRepository.update(accountId, data)
}

export async function getNicheSettingsForAccount(accountId) {
  const account = await getAccountInfo(accountId)
  return getNicheSettings(account)
}

export async function updateAccountSettings(accountId, patch) {
  const account = await getAccountInfo(accountId)
  const current = account.accountSettings ?? {}

  const merged = {
    ...current,
    ...(patch.inventory != null && { inventory: { ...(current.inventory ?? {}), ...patch.inventory } }),
    ...(patch.sales     != null && { sales:     { ...(current.sales     ?? {}), ...patch.sales     } }),
    ...(patch.kango     != null && { kango:     { ...(current.kango     ?? {}), ...patch.kango     } }),
  }

  await accountRepository.update(accountId, { accountSettings: merged })

  const refreshed = await accountRepository.findById(accountId)
  return getNicheSettings(refreshed)
}

export async function completeOnboarding(accountId) {
  const account = await getAccountInfo(accountId)
  const config = getNicheSettings(account)
  const names = config.defaultServices ?? []

  if (names.length > 0) {
    await createManyServices(accountId, names)
  }

  return {
    defaultServicesCreated: names.length,
    services: names,
    segment: account.segment,
    labels: config.labels,
  }
}
