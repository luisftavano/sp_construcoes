import { Router } from 'express'
import { authenticate }               from '../../shared/middlewares/authenticate.js'
import { requireActiveSubscription }  from '../../shared/middlewares/requireActiveSubscription.js'
import {
  runPatternRemindersHandler,
  previewHandler,
  triggerNowHandler,
  statsHandler,
} from './reminder.controller.js'

const router = Router()
const guard  = [authenticate, requireActiveSubscription]

// Cron endpoint — token-protected, no auth middleware
router.post('/run-pattern-reminders', runPatternRemindersHandler)

// Authenticated endpoints for the Kango panel
router.get('/preview',         ...guard, previewHandler)
router.post('/trigger-now',    ...guard, triggerNowHandler)
router.get('/stats',           ...guard, statsHandler)

export default router
