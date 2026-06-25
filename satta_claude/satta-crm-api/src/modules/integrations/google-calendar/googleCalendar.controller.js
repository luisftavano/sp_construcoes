import { buildAuthUrl, handleOAuthCallback } from './googleCalendar.service.js'

export async function authUrl(req, res, next) {
  try {
    const url = buildAuthUrl(req.user.accountId)
    res.json({ data: { url } })
  } catch (err) { next(err) }
}

export async function oauthCallback(req, res, next) {
  try {
    const { code, state: accountId } = req.query
    // state carries the accountId set in buildAuthUrl
    const result = await handleOAuthCallback(accountId, code)
    // Redirect to frontend settings page after OAuth completes
    res.redirect(`${process.env.FRONTEND_URL ?? '/'}/configuracoes/integracoes?connected=google_calendar`)
  } catch (err) { next(err) }
}
