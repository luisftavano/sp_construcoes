import { Router } from 'express'
import { createCheckout, createPortal } from './billing.controller.js'
import { authenticate } from '../../shared/middlewares/authenticate.js'

const router = Router()

router.post('/billing/checkout', authenticate, createCheckout)
router.post('/billing/portal',   authenticate, createPortal)

export default router
