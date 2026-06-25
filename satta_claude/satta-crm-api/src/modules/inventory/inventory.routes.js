import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { requireActiveSubscription } from '../../shared/middlewares/requireActiveSubscription.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import { createInventoryItemSchema, updateInventoryItemSchema, adjustQuantitySchema } from './inventory.validators.js'
import * as controller from './inventory.controller.js'

const router = Router()
router.use(authenticate, requireActiveSubscription, trackLastActivity)

router.get('/',           controller.list)
router.get('/low-stock',  controller.lowStock)
router.get('/:id',        controller.get)
router.post('/',          validate({ body: createInventoryItemSchema }), controller.create)
router.patch('/:id',      validate({ body: updateInventoryItemSchema }), controller.update)
router.post('/:id/adjust', validate({ body: adjustQuantitySchema }), controller.adjust)
router.delete('/:id',     controller.remove)

export default router
