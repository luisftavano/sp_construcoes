import { Router } from 'express'
import authRoutes         from '../modules/auth/auth.routes.js'
import customerRoutes     from '../modules/customers/customer.routes.js'
import serviceRoutes      from '../modules/services/service.routes.js'
import appointmentRoutes  from '../modules/appointments/appointment.routes.js'
import saleRoutes         from '../modules/sales/sale.routes.js'
import expenseRoutes      from '../modules/expenses/expense.routes.js'
import revenueRoutes      from '../modules/revenues/revenue.routes.js'
import reportRoutes       from '../modules/reports/report.routes.js'
import subscriptionRoutes from '../modules/subscriptions/subscription.routes.js'
import webhookRoutes      from '../modules/webhooks/webhook.routes.js'
import supportRoutes      from '../modules/support/support.routes.js'
import aiRoutes           from '../modules/ai-agent/ai-agent.routes.js'
import integrationRoutes  from '../modules/integrations/integrations.routes.js'
import inventoryRoutes    from '../modules/inventory/inventory.routes.js'
import accountRoutes      from '../modules/auth/account.routes.js'
import reminderRoutes     from '../modules/reminders/reminder.routes.js'

const router = Router()

router.use('/auth',          authRoutes)
router.use('/account',       accountRoutes)

router.use('/customers',     customerRoutes)
router.use('/services',      serviceRoutes)
router.use('/appointments',  appointmentRoutes)
router.use('/sales',         saleRoutes)
router.use('/expenses',      expenseRoutes)
router.use('/revenues',      revenueRoutes)
router.use('/reports',       reportRoutes)
router.use('/subscriptions', subscriptionRoutes)
router.use('/webhooks',      webhookRoutes)
router.use('/support',       supportRoutes)
router.use('/ai',            aiRoutes)
router.use('/integrations',  integrationRoutes)
router.use('/inventory',     inventoryRoutes)
router.use('/reminders',     reminderRoutes)

export default router
