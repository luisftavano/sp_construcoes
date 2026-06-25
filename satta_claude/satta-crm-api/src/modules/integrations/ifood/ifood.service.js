import { fetchOrders } from './ifood.client.js'
import { getRawConfig } from '../integrationConfig.service.js'
import { customerRepository } from '../../customers/customer.repository.js'
import { saleRepository } from '../../sales/sale.repository.js'
import { ValidationError } from '../../../shared/errors/index.js'

const MOCK = process.env.IFOOD_MOCK !== 'false'

export async function syncOrders(accountId, { from, to } = {}) {
  const config = await getRawConfig(accountId, 'ifood')

  if (!MOCK && !config?.credentials?.clientId) {
    throw new ValidationError('iFood não configurado. Informe client_id e client_secret.')
  }

  const creds = config?.credentials ?? {}
  const orders = await fetchOrders({ ...creds, from, to })

  let created = 0
  let skipped = 0

  for (const order of orders) {
    const externalOrderId = `ifood:${order.id}`

    const existing = await saleRepository.findOne?.({ accountId, externalOrderId })
    if (existing) { skipped++; continue }

    let customerId = null
    const phone = order.customer?.phone?.replace(/\D/g, '')

    if (phone) {
      const byPhone = await customerRepository.findOne?.({ accountId, phone })
      if (byPhone) {
        customerId = byPhone.id
      } else {
        const newCustomer = await customerRepository.create({
          accountId,
          nome: order.customer.name ?? 'Cliente iFood',
          phone,
          cpf: order.customer.taxPayerIdentificationNumber ?? null,
          source: 'ifood',
          etapa: 'cliente',
        })
        customerId = newCustomer.id
      }
    }

    const valorCentavos = order.total?.orderAmount ?? 0
    await saleRepository.create({
      accountId,
      customerId,
      description: `Pedido iFood #${order.reference ?? order.id} — ${order.orderType ?? 'DELIVERY'}`,
      amount: valorCentavos / 100,
      status: 'paid',
      source: 'ifood',
      externalOrderId,
      createdAt: order.createdAt,
    })

    created++
  }

  return { created, skipped, total: orders.length }
}
