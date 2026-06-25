import * as reportService from './report.service.js'

export async function financialSummary(req, res, next) {
  try {
    const { startDate, endDate } = req.query
    res.json(await reportService.getFinancialSummary(req.user.accountId, startDate, endDate))
  } catch (err) { next(err) }
}

export async function salesByCategory(req, res, next) {
  try {
    const { startDate, endDate } = req.query
    res.json(await reportService.getSalesByCategory(req.user.accountId, startDate, endDate))
  } catch (err) { next(err) }
}

export async function customerActivityTrend(req, res, next) {
  try {
    res.json(await reportService.getCustomerActivityTrend(req.user.accountId))
  } catch (err) { next(err) }
}

export async function topItems(req, res, next) {
  try {
    const { startDate, endDate, type, limit } = req.query
    res.json(await reportService.getTopSellingItems(req.user.accountId, {
      startDate, endDate, type, limit: limit ? parseInt(limit) : 10,
    }))
  } catch (err) { next(err) }
}

export async function revenueByCategory(req, res, next) {
  try {
    const { startDate, endDate } = req.query
    res.json(await reportService.getRevenueByCategory(req.user.accountId, { startDate, endDate }))
  } catch (err) { next(err) }
}

export async function profitMargin(req, res, next) {
  try {
    const { startDate, endDate, limit } = req.query
    res.json(await reportService.getProfitMarginByItem(req.user.accountId, {
      startDate, endDate, limit: limit ? parseInt(limit) : 10,
    }))
  } catch (err) { next(err) }
}

export async function averageTicket(req, res, next) {
  try {
    const { startDate, endDate } = req.query
    res.json(await reportService.getAverageTicket(req.user.accountId, { startDate, endDate }))
  } catch (err) { next(err) }
}

export async function paymentMethods(req, res, next) {
  try {
    const { startDate, endDate } = req.query
    res.json(await reportService.getSalesByPaymentMethod(req.user.accountId, { startDate, endDate }))
  } catch (err) { next(err) }
}
