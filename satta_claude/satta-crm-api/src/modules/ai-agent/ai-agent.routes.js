import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../shared/middlewares/requireActiveSubscription.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import * as controller from './ai-agent.controller.js'

const chatSchema = z.object({
  message:             z.string().min(1).max(2000),
  conversationHistory: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
})

const router = Router()
router.use(authenticate, requireActiveSubscription, trackLastActivity)

router.post('/chat', validate({ body: chatSchema }), controller.chat)

export default router
