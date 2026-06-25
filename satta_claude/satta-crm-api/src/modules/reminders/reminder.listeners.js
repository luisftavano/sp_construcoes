import { eventBus }    from '../../shared/events/eventBus.js'
import { EventTypes }  from '../../shared/events/eventTypes.js'
import { trackConversion } from './reminder.service.js'

export function registerReminderListeners() {
  // Sale created → check if the customer had a pending pattern reminder
  eventBus.on(EventTypes.SALE_CREATED, async ({ sale }) => {
    if (!sale?.accountId || !sale?.customerId) return
    try {
      await trackConversion(sale.accountId, sale.customerId)
    } catch (err) {
      console.error('[PatternReminder] conversion tracking (sale) failed:', err.message)
    }
  })

  // Appointment booked → also counts as conversion (client responded)
  eventBus.on(EventTypes.APPOINTMENT_CREATED, async ({ appointment }) => {
    if (!appointment?.accountId || !appointment?.customerId) return
    try {
      await trackConversion(appointment.accountId, appointment.customerId)
    } catch (err) {
      console.error('[PatternReminder] conversion tracking (appointment) failed:', err.message)
    }
  })
}
