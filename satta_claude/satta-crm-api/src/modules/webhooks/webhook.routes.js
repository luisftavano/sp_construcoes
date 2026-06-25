import { Router } from 'express'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'

const router = Router()

// Receives Asaas payment webhooks
router.post('/asaas', (req, res) => {
  const { event, payment } = req.body
  const accountId = payment?.externalReference  // set when creating Asaas subscription

  if (event === 'PAYMENT_RECEIVED') {
    eventBus.emit(EventTypes.SUBSCRIPTION_ACTIVATED, { accountId })
  } else if (event === 'PAYMENT_OVERDUE') {
    eventBus.emit(EventTypes.SUBSCRIPTION_PAYMENT_OVERDUE, { accountId })
  } else if (event === 'SUBSCRIPTION_CANCELLED') {
    eventBus.emit(EventTypes.SUBSCRIPTION_CANCELLED, { accountId })
  }

  res.status(200).json({ received: true })
})

export default router
