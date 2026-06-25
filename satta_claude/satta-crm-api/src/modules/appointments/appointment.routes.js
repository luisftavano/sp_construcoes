import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { validate } from '../../shared/middlewares/validate.js'
import { trackLastActivity } from '../../shared/middlewares/trackLastActivity.js'
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  agendaQuerySchema,
} from './appointment.validators.js'
import * as controller from './appointment.controller.js'

const router = Router()
router.use(authenticate, trackLastActivity)

router.get('/agenda', validate({ query: agendaQuerySchema }), controller.agenda)
router.get('/',     controller.list)
router.get('/:id',  controller.get)
router.post('/',    validate({ body: createAppointmentSchema }), controller.create)
router.patch('/:id', validate({ body: updateAppointmentSchema }), controller.update)
router.post('/:id/cancel', controller.cancel)

export default router
