import { saleRepository }     from '../sales/sale.repository.js'
import { saleItemRepository }  from '../sales/sale-item.repository.js'
import { expenseRepository }   from '../expenses/expense.repository.js'
import { customerRepository }  from '../customers/customer.repository.js'
import { appointmentRepository } from '../appointments/appointment.repository.js'

function inPeriod(dateStr, startDate, endDate) {
  return (!startDate || dateStr >= startDate) && (!endDate || dateStr <= endDate)
}

async function completedSalesInPeriod(accountId, startDate, endDate) {
  const all = await saleRepository.findAllByAccount(accountId)
  return all.filter(s => s.status !== 'cancelled' && inPeriod(s.soldAt, startDate, endDate))
}

export async function getFinancialSummary(accountId, startDate, endDate) {
  const [sales, totalExpenses] = await Promise.all([
    completedSalesInPeriod(accountId, startDate, endDate),
    expenseRepository.sumByAccount(accountId, startDate, endDate),
  ])

  const totalRevenue = sales.reduce((s, sale) => s + (sale.totalAmount ?? sale.amount ?? 0), 0)

  // Top 3 items sold in period — quick enrichment for Kango
  let topItems = []
  if (sales.length > 0) {
    const saleIds  = sales.map(s => s.id)
    const allItems = await Promise.all(saleIds.map(id => saleItemRepository.findBySaleId(id)))
    const flat     = allItems.flat()

    const agg = {}
    for (const item of flat) {
      const key = item.serviceId ?? item.inventoryItemId ?? item.name
      if (!agg[key]) agg[key] = { name: item.name, type: item.type, quantitySold: 0, totalRevenue: 0 }
      agg[key].quantitySold += item.quantity
      agg[key].totalRevenue += item.totalPrice
    }

    topItems = Object.values(agg)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 3)
  }

  return {
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    topItems,
    period: { startDate, endDate },
  }
}

export async function getSalesByCategory(accountId, startDate, endDate) {
  const sales = await completedSalesInPeriod(accountId, startDate, endDate)
  const map = {}
  for (const s of sales) {
    const cat = s.category ?? 'Sem categoria'
    map[cat] = (map[cat] ?? 0) + (s.totalAmount ?? s.amount ?? 0)
  }
  return Object.entries(map).map(([label, value]) => ({ label, value }))
}

export async function getCustomerActivityTrend(accountId) {
  const [sales, appointments] = await Promise.all([
    saleRepository.findAllByAccount(accountId),
    appointmentRepository.findAllByAccount(accountId),
  ])

  const monthCustomers = {}
  const record = (customerId, dateStr) => {
    const month = dateStr?.slice(0, 7)
    if (!month || !customerId) return
    monthCustomers[month] ??= new Set()
    monthCustomers[month].add(customerId)
  }

  sales.forEach(s => record(s.customerId, s.soldAt))
  appointments.forEach(a => record(a.customerId, a.startAt))

  return Object.entries(monthCustomers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, set]) => ({ label, value: set.size }))
}

// ──────────────────────────────────────────────────────────────────────────────
// New itemized reports
// ──────────────────────────────────────────────────────────────────────────────

export async function getTopSellingItems(accountId, { startDate, endDate, type, limit = 10 } = {}) {
  const sales   = await completedSalesInPeriod(accountId, startDate, endDate)
  const saleIds = sales.map(s => s.id)
  if (!saleIds.length) return []

  const allItems = (await Promise.all(saleIds.map(id => saleItemRepository.findBySaleId(id)))).flat()
  const filtered = type && type !== 'all' ? allItems.filter(i => i.type === type) : allItems

  const agg = {}
  for (const item of filtered) {
    const key = item.serviceId ?? item.inventoryItemId ?? item.name
    if (!agg[key]) {
      agg[key] = {
        itemId:           key,
        name:             item.name,
        type:             item.type,
        quantitySold:     0,
        totalRevenue:     0,
        unitPrices:       [],
      }
    }
    agg[key].quantitySold += item.quantity
    agg[key].totalRevenue += item.totalPrice
    agg[key].unitPrices.push(item.unitPrice)
  }

  return Object.values(agg)
    .sort((a, b) => b.quantitySold - a.quantitySold)
    .slice(0, limit)
    .map(({ unitPrices, ...rest }) => ({
      ...rest,
      averageUnitPrice: unitPrices.reduce((s, v) => s + v, 0) / unitPrices.length,
    }))
}

export async function getRevenueByCategory(accountId, { startDate, endDate } = {}) {
  const sales   = await completedSalesInPeriod(accountId, startDate, endDate)
  const saleIds = sales.map(s => s.id)
  if (!saleIds.length) return []

  const allItems = (await Promise.all(saleIds.map(id => saleItemRepository.findBySaleId(id)))).flat()

  const agg = {}
  for (const item of allItems) {
    const cat = item.category ?? 'Sem categoria'
    const key = `${item.type}::${cat}`
    if (!agg[key]) agg[key] = { category: cat, type: item.type, totalRevenue: 0, itemCount: 0 }
    agg[key].totalRevenue += item.totalPrice
    agg[key].itemCount++
  }

  return Object.values(agg).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export async function getProfitMarginByItem(accountId, { startDate, endDate, limit = 10 } = {}) {
  const sales   = await completedSalesInPeriod(accountId, startDate, endDate)
  const saleIds = sales.map(s => s.id)
  if (!saleIds.length) return []

  const allItems = (await Promise.all(saleIds.map(id => saleItemRepository.findBySaleId(id)))).flat()
  const withCost = allItems.filter(i => i.costPrice != null && i.costPrice > 0)

  const agg = {}
  for (const item of withCost) {
    const key = item.inventoryItemId ?? item.name
    if (!agg[key]) {
      agg[key] = { itemId: key, name: item.name, type: item.type, revenues: [], costs: [] }
    }
    agg[key].revenues.push(item.unitPrice)
    agg[key].costs.push(item.costPrice)
  }

  return Object.values(agg)
    .map(({ revenues, costs, ...rest }) => {
      const avgPrice  = revenues.reduce((s, v) => s + v, 0) / revenues.length
      const avgCost   = costs.reduce((s, v) => s + v, 0) / costs.length
      const margin    = avgPrice > 0 ? ((avgPrice - avgCost) / avgPrice) * 100 : 0
      return { ...rest, averagePrice: avgPrice, averageCost: avgCost, marginPercent: Math.round(margin * 100) / 100 }
    })
    .sort((a, b) => b.marginPercent - a.marginPercent)
    .slice(0, limit)
}

export async function getAverageTicket(accountId, { startDate, endDate } = {}) {
  const sales = await completedSalesInPeriod(accountId, startDate, endDate)
  if (!sales.length) return { averageTicket: 0, saleCount: 0, totalRevenue: 0 }

  const totalRevenue = sales.reduce((s, sale) => s + (sale.totalAmount ?? sale.amount ?? 0), 0)
  const averageTicket = totalRevenue / sales.length

  // Simple period-over-period: compare with same-length window before startDate
  let comparison = null
  if (startDate && endDate) {
    const days    = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000)
    const prevEnd = new Date(new Date(startDate).getTime() - 86400000).toISOString().slice(0, 10)
    const prevStart = new Date(new Date(startDate).getTime() - days * 86400000).toISOString().slice(0, 10)
    const prevSales = await completedSalesInPeriod(accountId, prevStart, prevEnd)
    if (prevSales.length) {
      const prevRevenue = prevSales.reduce((s, sale) => s + (sale.totalAmount ?? sale.amount ?? 0), 0)
      const prevTicket  = prevRevenue / prevSales.length
      comparison = {
        previousAverageTicket: prevTicket,
        changePercent: prevTicket > 0 ? Math.round(((averageTicket - prevTicket) / prevTicket) * 10000) / 100 : null,
      }
    }
  }

  return { averageTicket, saleCount: sales.length, totalRevenue, comparison }
}

export async function getSalesByPaymentMethod(accountId, { startDate, endDate } = {}) {
  const sales = await completedSalesInPeriod(accountId, startDate, endDate)
  const agg = {}
  for (const sale of sales) {
    const method = sale.paymentMethod ?? 'outro'
    if (!agg[method]) agg[method] = { method, totalRevenue: 0, saleCount: 0 }
    agg[method].totalRevenue += sale.totalAmount ?? sale.amount ?? 0
    agg[method].saleCount++
  }
  return Object.values(agg).sort((a, b) => b.totalRevenue - a.totalRevenue)
}
