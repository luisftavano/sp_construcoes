import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { updateAccountSettingsSchema, updateAccountInfoSchema } from './account.validators.js'
import * as controller from './account.controller.js'

const router = Router()

router.use(authenticate)

router.get('/settings',          controller.getSettings)
router.patch('/settings',        validate({ body: updateAccountSettingsSchema }), controller.patchSettings)
router.get('/info',              controller.getInfo)
router.patch('/info',            validate({ body: updateAccountInfoSchema }), controller.patchInfo)
router.post('/onboarding/complete', controller.postCompleteOnboarding)

export default router
