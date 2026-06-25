import { Router } from 'express'
import { authenticate } from '../../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../../shared/middlewares/requireActiveSubscription.js'
import { connect, sync, disconnect } from './ifood.controller.js'

const router = Router()

router.post('/connect',    authenticate, requireActiveSubscription, connect)
router.post('/sync',       authenticate, requireActiveSubscription, sync)
router.post('/disconnect', authenticate, requireActiveSubscription, disconnect)

export default router
