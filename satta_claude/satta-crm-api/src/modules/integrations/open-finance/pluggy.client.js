import { ExternalServiceError } from '../../../shared/errors/index.js'

const MOCK       = process.env.OPEN_FINANCE_MOCK !== 'false'
const ENABLED    = process.env.ENABLE_OPEN_FINANCE === 'true'
const CLIENT_ID  = process.env.PLUGGY_CLIENT_ID
const CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET
const API_URL    = process.env.PLUGGY_API_URL ?? 'https://api.pluggy.ai'

const MOCK_TRANSACTIONS = [
  { id: 'mock-tx-001', date: new Date().toISOString().slice(0, 10), description: 'Pix recebido - cliente João',  amount:  350.00, type: 'CREDIT', category: 'Serviços' },
  { id: 'mock-tx-002', date: new Date().toISOString().slice(0, 10), description: 'Pix recebido - cliente Maria', amount:  180.00, type: 'CREDIT', category: 'Serviços' },
  { id: 'mock-tx-003', date: new Date().toISOString().slice(0, 10), description: 'Fornecedor XYZ',               amount: -120.00, type: 'DEBIT',  category: 'Fornecedores' },
  { id: 'mock-tx-004', date: new Date().toISOString().slice(0, 10), description: 'Aluguel',                      amount: -800.00, type: 'DEBIT',  category: 'Aluguel' },
  { id: 'mock-tx-005', date: new Date().toISOString().slice(0, 10), description: 'Pagamento cartão cliente',      amount:  220.00, type: 'CREDIT', category: 'Serviços' },
]

let _apiKey = null

async function getApiKey() {
  if (_apiKey) return _apiKey
  const res = await fetch(`${API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  })
  if (!res.ok) throw new ExternalServiceError('Pluggy authentication failed')
  const { apiKey } = await res.json()
  _apiKey = apiKey
  // apiKey is short-lived; clear cache after 30 min
  setTimeout(() => { _apiKey = null }, 30 * 60 * 1000)
  return apiKey
}

export async function getAccounts(itemId) {
  if (!ENABLED) { console.log('[OpenFinance] disabled'); return [] }
  if (MOCK) return [{ id: 'mock-account-001', itemId, name: 'Conta Mock', type: 'BANK' }]

  try {
    const apiKey = await getApiKey()
    const res = await fetch(`${API_URL}/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    })
    if (!res.ok) throw new ExternalServiceError(`Pluggy getAccounts ${res.status}`)
    const { results } = await res.json()
    return results
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err
    throw new ExternalServiceError(`Pluggy getAccounts: ${err.message}`)
  }
}

export async function getTransactions(pluggyAccountId, { from, to }) {
  if (!ENABLED) { console.log('[OpenFinance] disabled'); return [] }
  if (MOCK) return MOCK_TRANSACTIONS

  try {
    const apiKey = await getApiKey()
    const params = new URLSearchParams({ accountId: pluggyAccountId, from, to, pageSize: '100' })
    const res = await fetch(`${API_URL}/transactions?${params}`, {
      headers: { 'X-API-KEY': apiKey },
    })
    if (!res.ok) throw new ExternalServiceError(`Pluggy getTransactions ${res.status}`)
    const { results } = await res.json()
    return results
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err
    throw new ExternalServiceError(`Pluggy getTransactions: ${err.message}`)
  }
}
