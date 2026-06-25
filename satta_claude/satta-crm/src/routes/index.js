import { Router } from 'express'
import bookingRouter      from '../modules/booking/booking.routes.js'
import notificationRouter from '../modules/notifications/notification.routes.js'
import whatsappRouter     from '../modules/whatsapp/whatsapp.routes.js'
import billingRouter      from '../modules/billing/billing.routes.js'

const apiRouter = Router()

apiRouter.use(whatsappRouter)
apiRouter.use(billingRouter)
apiRouter.use(bookingRouter)
apiRouter.use(notificationRouter)

export default apiRouter
