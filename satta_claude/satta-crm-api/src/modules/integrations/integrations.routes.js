import { Router } from 'express'
import { authenticate } from '../../shared/middlewares/authenticate.js'
import { authorize } from '../../shared/middlewares/authorize.js'
import { requireActiveSubscription } from '../../shared/middlewares/requireActiveSubscription.js'
import { list, detail, upsert, disconnect } from './integrations.controller.js'

import whatsappRoutes       from './whatsapp/whatsapp.routes.js'
import googleCalendarRoutes from './google-calendar/googleCalendar.routes.js'
import openFinanceRoutes    from './open-finance/openFinance.routes.js'
import mercadoLivreRoutes   from './mercado-livre/mercadoLivre.routes.js'
import ifoodRoutes           from './ifood/ifood.routes.js'

const router = Router()

const guard = [authenticate, requireActiveSubscription, authorize('owner', 'admin')]

router.get('/',                  ...guard, list)
router.get('/:provider',         ...guard, detail)
router.put('/:provider',         ...guard, upsert)
router.delete('/:provider',      ...guard, disconnect)

// Provider-specific sub-routes
router.use('/whatsapp',         whatsappRoutes)
router.use('/google-calendar',  googleCalendarRoutes)
router.use('/open-finance',     openFinanceRoutes)
router.use('/mercado-livre',    mercadoLivreRoutes)
router.use('/ifood',            ifoodRoutes)

export default router
