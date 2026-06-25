import { buildAuthUrl, handleOAuthCallback, syncOrders } from './mercadoLivre.service.js'

export async function authUrl(req, res, next) {
  try {
    const url = buildAuthUrl(req.user.accountId)
    res.json({ data: { url } })
  } catch (err) { next(err) }
}

export async function oauthCallback(req, res, next) {
  try {
    const { code, state: accountId } = req.query
    await handleOAuthCallback(accountId, code)
    res.redirect(`${process.env.FRONTEND_URL ?? '/'}/configuracoes/integracoes?connected=mercado_livre`)
  } catch (err) { next(err) }
}

export async function sync(req, res, next) {
  try {
    const { from, to } = req.body
    const result = await syncOrders(req.user.accountId, { from, to })
    res.json({ data: result })
  } catch (err) { next(err) }
}
