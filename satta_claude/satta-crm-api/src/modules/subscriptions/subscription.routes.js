import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'

const router = Router()
router.use(authenticate)

// Stub — integrate with Asaas API when ready
router.get('/', (req, res) => res.json({ message: 'Subscription endpoint — Asaas integration pending' }))

export default router
