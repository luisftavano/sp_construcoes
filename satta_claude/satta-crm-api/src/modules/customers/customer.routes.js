import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import { createCustomerSchema, updateCustomerSchema, paginationSchema } from './customer.validators.js'
import * as controller from './customer.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/custom-field-template', controller.customFieldTemplate)
router.get('/',    validate({ query: paginationSchema }), controller.list)
router.get('/:id', controller.get)
router.post('/',   validate({ body: createCustomerSchema }), controller.create)
router.patch('/:id', validate({ body: updateCustomerSchema }), controller.update)
router.delete('/:id', controller.remove)

export default router
