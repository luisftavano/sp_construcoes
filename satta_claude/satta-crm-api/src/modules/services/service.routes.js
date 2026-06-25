import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import { createServiceSchema, updateServiceSchema } from './service.validators.js'
import * as controller from './service.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/',     controller.list)
router.get('/:id',  controller.get)
router.post('/',    validate({ body: createServiceSchema }), controller.create)
router.patch('/:id', validate({ body: updateServiceSchema }), controller.update)
router.delete('/:id', controller.remove)

export default router
