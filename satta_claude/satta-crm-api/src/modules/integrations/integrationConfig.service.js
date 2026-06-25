import { integrationConfigRepository } from './integrationConfig.repository.js'
import { PROVIDERS } from './integrationConfig.model.js'
import { NotFoundError, ValidationError } from '../../shared/errors/index.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'

/** Strip credentials before returning to caller. */
function safeConfig(config) {
  if (!config) return null
  const { credentials: _creds, ...rest } = config
  return { ...rest, connected: !!(config.credentials && Object.keys(config.credentials).length > 0) }
}

/** Returns the full config including credentials (for internal use only). */
export async function getRawConfig(accountId, provider) {
  return integrationConfigRepository.findByAccountAndProvider(accountId, provider)
}

export async function listIntegrations(accountId) {
  const existing = await integrationConfigRepository.findAllByAccount(accountId)
  const byProvider = Object.fromEntries(existing.map(c => [c.provider, c]))

  return PROVIDERS.map(provider => {
    const config = byProvider[provider]
    return config
      ? safeConfig(config)
      : { accountId, provider, enabled: false, connected: false, settings: {} }
  })
}

export async function getIntegration(accountId, provider) {
  if (!PROVIDERS.includes(provider)) throw new NotFoundError(`Unknown provider: ${provider}`)
  const config = await integrationConfigRepository.findByAccountAndProvider(accountId, provider)
  if (!config) return { accountId, provider, enabled: false, connected: false, settings: {} }
  return safeConfig(config)
}

export async function upsertIntegration(accountId, provider, { enabled, settings } = {}) {
  if (!PROVIDERS.includes(provider)) throw new ValidationError(`Unknown provider: ${provider}`)
  const existing = await integrationConfigRepository.findByAccountAndProvider(accountId, provider)

  if (existing) {
    const updated = await integrationConfigRepository.update(existing.id, {
      ...(enabled !== undefined && { enabled }),
      ...(settings !== undefined && { settings }),
    })
    return safeConfig(updated)
  }

  const created = await integrationConfigRepository.create({
    accountId,
    provider,
    enabled: enabled ?? false,
    credentials: {},
    settings: settings ?? {},
  })
  return safeConfig(created)
}

/** Save credentials (internal use only — never call from API handler). */
export async function saveCredentials(accountId, provider, credentials) {
  const existing = await integrationConfigRepository.findByAccountAndProvider(accountId, provider)
  if (existing) {
    const merged = { ...(existing.credentials ?? {}), ...credentials }
    const updated = await integrationConfigRepository.update(existing.id, { credentials: merged, enabled: true })
    eventBus.emit(EventTypes.INTEGRATION_CONNECTED, { accountId, provider })
    return safeConfig(updated)
  }
  const created = await integrationConfigRepository.create({
    accountId, provider, enabled: true, credentials, settings: {},
  })
  eventBus.emit(EventTypes.INTEGRATION_CONNECTED, { accountId, provider })
  return safeConfig(created)
}

export async function disconnectIntegration(accountId, provider) {
  if (!PROVIDERS.includes(provider)) throw new NotFoundError(`Unknown provider: ${provider}`)
  const existing = await integrationConfigRepository.findByAccountAndProvider(accountId, provider)
  if (!existing) throw new NotFoundError('Integration not configured')
  await integrationConfigRepository.update(existing.id, { credentials: {}, enabled: false })
  eventBus.emit(EventTypes.INTEGRATION_DISCONNECTED, { accountId, provider })
}
