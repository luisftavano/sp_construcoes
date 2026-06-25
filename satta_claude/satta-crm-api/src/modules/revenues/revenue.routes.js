import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import { createRevenueSchema } from './revenue.validators.js'
import * as controller from './revenue.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/',    controller.list)
router.post('/',   validate({ body: createRevenueSchema }), controller.create)
router.delete('/:id', controller.remove)

export default router
