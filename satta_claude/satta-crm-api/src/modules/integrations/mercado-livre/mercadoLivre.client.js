/**
 * MÓDULO OPCIONAL — Mercado Livre
 * Relevante apenas para contas que vendem produtos físicos.
 * Não é carregado se ENABLE_MERCADO_LIVRE !== 'true'.
 */
import { randomUUID } from 'crypto'
import { ExternalServiceError } from '../../../shared/errors/index.js'

const MOCK          = process.env.MERCADO_LIVRE_MOCK !== 'false'
const ENABLED       = process.env.ENABLE_MERCADO_LIVRE === 'true'
const CLIENT_ID     = process.env.ML_CLIENT_ID
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET
const REDIRECT_URI  = process.env.ML_REDIRECT_URI

const ML_AUTH_URL   = 'https://auth.mercadolivre.com.br/authorization'
const ML_TOKEN_URL  = 'https://api.mercadolibre.com/oauth/token'
const ML_API_BASE   = 'https://api.mercadolibre.com'

const MOCK_ORDERS = [
  { id: 'mock-order-001', dateCreated: new Date().toISOString(), total: 89.90,  status: 'paid', buyer: { nickname: 'compradorX', email: 'x@test.com' }, items: [{ title: 'Produto A', quantity: 1, unitPrice: 89.90 }] },
  { id: 'mock-order-002', dateCreated: new Date().toISOString(), total: 149.00, status: 'paid', buyer: { nickname: 'compradorY', email: 'y@test.com' }, items: [{ title: 'Produto B', quantity: 2, unitPrice: 74.50 }] },
]

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code', client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI, ...(state && { state }),
  })
  return `${ML_AUTH_URL}?${params}`
}

export async function exchangeCode(code) {
  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code', client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET, code, redirect_uri: REDIRECT_URI,
    }),
  })
  if (!res.ok) throw new ExternalServiceError('ML token exchange failed')
  const { access_token, refresh_token } = await res.json()
  return { accessToken: access_token, refreshToken: refresh_token }
}

async function refreshToken(refreshTk) {
  const res = await fetch(ML_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'refresh_token', client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET, refresh_token: refreshTk,
    }),
  })
  if (!res.ok) throw new ExternalServiceError('ML token refresh failed')
  const { access_token } = await res.json()
  return access_token
}

export async function getOrders({ from, to }, storedRefreshToken) {
  if (!ENABLED) { console.log('[MercadoLivre] disabled'); return [] }
  if (MOCK) return MOCK_ORDERS

  try {
    const accessToken = await refreshToken(storedRefreshToken)
    const params = new URLSearchParams({ 'order.status': 'paid', 'order.date_created.from': from, 'order.date_created.to': to })
    const res = await fetch(`${ML_API_BASE}/orders/search?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new ExternalServiceError(`ML getOrders ${res.status}`)
    const { results } = await res.json()
    return results
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err
    throw new ExternalServiceError(`ML getOrders: ${err.message}`)
  }
}
