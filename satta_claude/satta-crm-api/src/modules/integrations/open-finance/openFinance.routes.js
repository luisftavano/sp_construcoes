import { Router } from 'express'
import { authenticate } from '../../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../../shared/middlewares/requireActiveSubscription.js'
import { connect, importTx, runScheduledImport } from './openFinance.controller.js'

const router = Router()

router.post('/connect',  authenticate, requireActiveSubscription, connect)
router.post('/import',   authenticate, requireActiveSubscription, importTx)

// External scheduler endpoint (no JWT, uses INTERNAL_CRON_TOKEN)
router.post('/run-import', runScheduledImport)

export default router
