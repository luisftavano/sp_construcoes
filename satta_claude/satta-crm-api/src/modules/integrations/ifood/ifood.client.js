import { ValidationError } from '../../../shared/errors/index.js'

const BASE_URL = 'https://merchant-api.ifood.com.br'
const MOCK = process.env.IFOOD_MOCK !== 'false'

const MOCK_ORDERS = [
  {
    id: 'mock-order-001',
    reference: 'ORD-001',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    orderType: 'DELIVERY',
    customer: { name: 'Ana Souza', phone: '11999990001', taxPayerIdentificationNumber: '12345678900' },
    items: [{ name: 'Prato Executivo', quantity: 2, unitPrice: 3500, totalPrice: 7000 }],
    payments: { methods: [{ method: 'CREDIT', value: 7000 }] },
    total: { orderAmount: 7000 },
  },
  {
    id: 'mock-order-002',
    reference: 'ORD-002',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    orderType: 'TAKEOUT',
    customer: { name: 'Carlos Lima', phone: '11999990002', taxPayerIdentificationNumber: null },
    items: [{ name: 'Marmita P', quantity: 1, unitPrice: 1800, totalPrice: 1800 }],
    payments: { methods: [{ method: 'PIX', value: 1800 }] },
    total: { orderAmount: 1800 },
  },
]

async function getToken(clientId, clientSecret) {
  const params = new URLSearchParams({
    grantType: 'client_credentials',
    clientId,
    clientSecret,
  })
  const res = await fetch(`${BASE_URL}/authentication/v1.0/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) throw new ValidationError('Credenciais iFood inválidas')
  const data = await res.json()
  return data.accessToken
}

export async function fetchOrders({ clientId, clientSecret, from, to }) {
  if (MOCK) return MOCK_ORDERS

  const token = await getToken(clientId, clientSecret)

  const events = await fetch(`${BASE_URL}/order/v1.0/events:polling`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json())

  const orderIds = [...new Set(events.map(e => e.orderId))]

  const orders = await Promise.all(
    orderIds.map(id =>
      fetch(`${BASE_URL}/order/v1.0/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json())
    )
  )

  if (events.length) {
    await fetch(`${BASE_URL}/order/v1.0/events/acknowledgment`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(events.map(e => ({ id: e.id, code: e.code, orderId: e.orderId }))),
    })
  }

  const fromDate = from ? new Date(from) : new Date(0)
  const toDate   = to   ? new Date(to)   : new Date()

  return orders.filter(o => {
    const d = new Date(o.createdAt)
    return d >= fromDate && d <= toDate
  })
}
