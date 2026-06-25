import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { authorize } from '../../shared/middlewares/authorize.js'
import * as controller from './support.controller.js'

const router = Router()

router.get('/lookup', authenticate, authorize('support', 'admin'), controller.lookup)

export default router
