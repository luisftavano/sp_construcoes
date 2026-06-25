import {
  listIntegrations,
  getIntegration,
  upsertIntegration,
  disconnectIntegration,
} from './integrationConfig.service.js'

export async function list(req, res, next) {
  try {
    const items = await listIntegrations(req.user.accountId)
    res.json({ data: items })
  } catch (err) { next(err) }
}

export async function detail(req, res, next) {
  try {
    const item = await getIntegration(req.user.accountId, req.params.provider)
    res.json({ data: item })
  } catch (err) { next(err) }
}

export async function upsert(req, res, next) {
  try {
    const { enabled, settings } = req.body
    const item = await upsertIntegration(req.user.accountId, req.params.provider, { enabled, settings })
    res.json({ data: item })
  } catch (err) { next(err) }
}

export async function disconnect(req, res, next) {
  try {
    await disconnectIntegration(req.user.accountId, req.params.provider)
    res.json({ message: 'Integration disconnected' })
  } catch (err) { next(err) }
}
