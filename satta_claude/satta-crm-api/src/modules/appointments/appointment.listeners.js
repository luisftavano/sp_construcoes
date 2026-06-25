import { eventBus }    from '../../shared/events/eventBus.js'
import { EventTypes }  from '../../shared/events/eventTypes.js'
import { createSale }  from '../sales/sale.service.js'

export function registerAppointmentListeners() {
  eventBus.on(EventTypes.APPOINTMENT_COMPLETED, async ({ appointment }) => {
    if (!appointment.price || appointment.price <= 0) return

    try {
      await createSale(appointment.accountId, {
        customerId: appointment.customerId,
        source:     'appointment',
        soldAt:     appointment.endAt ?? new Date().toISOString(),
        force:      true, // appointments never block on stock
        items: [{
          type:      'service',
          serviceId: appointment.serviceId ?? null,
          name:      appointment.title,
          quantity:  1,
          unitPrice: appointment.price,
        }],
      })
    } catch (err) {
      console.error('[appointment-listener] Failed to create sale on completion:', err.message, { appointmentId: appointment.id })
    }
  })
}
