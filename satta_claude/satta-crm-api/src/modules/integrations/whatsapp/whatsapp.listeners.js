import { eventBus } from '../../../shared/events/eventBus.js'
import { EventTypes } from '../../../shared/events/eventTypes.js'
import { sendToCustomer, sendAppointmentNotification } from './whatsapp.service.js'

export function registerWhatsappListeners() {
  // Kango tool "send_customer_message" → real WhatsApp dispatch
  eventBus.on(EventTypes.MESSAGE_REQUESTED, async ({ accountId, customerId, message }) => {
    try {
      await sendToCustomer(accountId, customerId, message)
    } catch (err) {
      console.error('[WhatsApp] message.requested handler error:', err.message)
    }
  })

  // Appointment created → confirmation message
  eventBus.on(EventTypes.APPOINTMENT_CREATED, async ({ appointment }) => {
    try {
      await sendAppointmentNotification(appointment.accountId, appointment, 'created')
    } catch (err) {
      console.error('[WhatsApp] appointment.created handler error:', err.message)
    }
  })

  // Appointment cancelled → cancellation notice
  eventBus.on(EventTypes.APPOINTMENT_CANCELLED, async ({ appointment }) => {
    try {
      await sendAppointmentNotification(appointment.accountId, appointment, 'cancelled')
    } catch (err) {
      console.error('[WhatsApp] appointment.cancelled handler error:', err.message)
    }
  })
}
