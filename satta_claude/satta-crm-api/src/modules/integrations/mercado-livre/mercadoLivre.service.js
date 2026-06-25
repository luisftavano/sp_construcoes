/**
 * MÓDULO OPCIONAL — apenas para contas que vendem produto físico.
 */
import { getAuthUrl, exchangeCode, getOrders } from './mercadoLivre.client.js'
import { getRawConfig, saveCredentials } from '../integrationConfig.service.js'
import { createSale } from '../../sales/sale.service.js'
import { createCustomer } from '../../customers/customer.service.js'
import { customerRepository } from '../../customers/customer.repository.js'
import { saleRepository } from '../../sales/sale.repository.js'

const PROVIDER = 'mercado_livre'

export function buildAuthUrl(accountId) {
  return getAuthUrl(accountId)
}

export async function handleOAuthCallback(accountId, code) {
  const tokens = await exchangeCode(code)
  await saveCredentials(accountId, PROVIDER, { refreshToken: tokens.refreshToken })
  return { connected: true }
}

export async function syncOrders(accountId, { from, to }) {
  const config = await getRawConfig(accountId, PROVIDER)
  const refreshToken = config?.credentials?.refreshToken
  if (!refreshToken) throw new Error('Mercado Livre não conectado')

  const orders = await getOrders({ from, to }, refreshToken)
  let created = 0, skipped = 0

  for (const order of orders) {
    if (order.status !== 'paid') continue

    // Avoid duplicates
    const existing = await saleRepository.findOne({ accountId, externalOrderId: order.id })
    if (existing) { skipped++; continue }

    // Upsert customer
    let customer = await customerRepository.findOne({ accountId, email: order.buyer.email })
    if (!customer) {
      customer = await createCustomer(accountId, {
        name:  order.buyer.nickname,
        email: order.buyer.email,
        phone: null,
      })
    }

    await createSale(accountId, {
      customerId:      customer.id,
      description:     order.items.map(i => `${i.title} x${i.quantity}`).join(', '),
      amount:          order.total,
      paidAt:          order.dateCreated,
      origin:          'mercado_livre',
      externalOrderId: order.id,
    })
    created++
  }

  return { created, skipped }
}
