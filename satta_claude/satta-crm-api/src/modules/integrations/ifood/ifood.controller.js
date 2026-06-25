import { saveCredentials, disconnectIntegration } from '../integrationConfig.service.js'
import { syncOrders } from './ifood.service.js'

export async function connect(req, res, next) {
  try {
    const { clientId, clientSecret } = req.body
    if (!clientId || !clientSecret) {
      return res.status(422).json({ error: 'clientId e clientSecret são obrigatórios' })
    }
    await saveCredentials(req.user.accountId, 'ifood', { clientId, clientSecret })
    res.json({ data: { connected: true } })
  } catch (err) { next(err) }
}

export async function sync(req, res, next) {
  try {
    const { from, to } = req.body
    const result = await syncOrders(req.user.accountId, { from, to })
    res.json({ data: result })
  } catch (err) { next(err) }
}

export async function disconnect(req, res, next) {
  try {
    await disconnectIntegration(req.user.accountId, 'ifood')
    res.json({ data: { connected: false } })
  } catch (err) { next(err) }
}
