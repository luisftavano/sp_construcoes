import { Router } from 'express'
import { authenticate } from '../../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../../shared/middlewares/requireActiveSubscription.js'
import { startConnect, checkStatus, disconnect, sendManual, runReminders } from './whatsapp.controller.js'

const router = Router()
const guard = [authenticate, requireActiveSubscription]

router.post('/start-connect', ...guard, startConnect)
router.get('/status',         ...guard, checkStatus)
router.post('/disconnect',    ...guard, disconnect)
router.post('/send',          ...guard, sendManual)
router.post('/run-reminders', runReminders)

export default router
