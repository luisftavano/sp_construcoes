import { Router } from 'express'
import { validate } from '../../shared/middlewares/validate.js'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { registerSchema, loginSchema } from './auth.validators.js'
import * as controller from './auth.controller.js'

const router = Router()

router.post('/register', validate({ body: registerSchema }), controller.register)
router.post('/login',    validate({ body: loginSchema }),    controller.login)
router.get('/me',        authenticate,                       controller.me)

export default router
