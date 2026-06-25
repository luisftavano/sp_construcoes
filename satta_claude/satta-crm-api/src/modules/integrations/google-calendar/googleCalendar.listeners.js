import { eventBus } from '../../../shared/events/eventBus.js'
import { EventTypes } from '../../../shared/events/eventTypes.js'
import {
  syncAppointmentCreated,
  syncAppointmentUpdated,
  syncAppointmentCancelled,
} from './googleCalendar.service.js'

// Sync is one-way: CRM → Google Calendar.
// Bidirectional sync (Google webhook → CRM) is deferred to a future version.

export function registerGoogleCalendarListeners() {
  eventBus.on(EventTypes.APPOINTMENT_CREATED, async ({ appointment }) => {
    try {
      await syncAppointmentCreated(appointment)
    } catch (err) {
      console.error('[GoogleCalendar] appointment.created handler error:', err.message)
    }
  })

  eventBus.on(EventTypes.APPOINTMENT_UPDATED, async ({ appointment }) => {
    try {
      await syncAppointmentUpdated(appointment)
    } catch (err) {
      console.error('[GoogleCalendar] appointment.updated handler error:', err.message)
    }
  })

  eventBus.on(EventTypes.APPOINTMENT_CANCELLED, async ({ appointment }) => {
    try {
      await syncAppointmentCancelled(appointment)
    } catch (err) {
      console.error('[GoogleCalendar] appointment.cancelled handler error:', err.message)
    }
  })
}
