import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import { createSaleSchema } from './sale.validators.js'
import * as controller from './sale.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/',           controller.list)
router.get('/:id',        controller.get)
router.post('/',          validate({ body: createSaleSchema }), controller.create)
router.post('/:id/cancel', controller.cancel)
router.delete('/:id',     controller.remove)

export default router
