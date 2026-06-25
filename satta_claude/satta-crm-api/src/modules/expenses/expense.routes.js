import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import { createExpenseSchema } from './expense.validators.js'
import * as controller from './expense.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/',    controller.list)
router.post('/',   validate({ body: createExpenseSchema }), controller.create)
router.delete('/:id', controller.remove)

export default router
