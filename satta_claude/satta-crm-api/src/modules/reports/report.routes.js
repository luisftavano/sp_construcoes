import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import * as controller from './report.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/financial-summary',       controller.financialSummary)
router.get('/sales-by-category',       controller.salesByCategory)
router.get('/customer-activity-trend', controller.customerActivityTrend)
router.get('/top-items',               controller.topItems)
router.get('/revenue-by-category',     controller.revenueByCategory)
router.get('/profit-margin',           controller.profitMargin)
router.get('/average-ticket',          controller.averageTicket)
router.get('/payment-methods',         controller.paymentMethods)

export default router
