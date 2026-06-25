import { registerAccountListeners }         from '../../modules/auth/account.listeners.js'
import { registerAppointmentListeners }     from '../../modules/appointments/appointment.listeners.js'
import { registerSaleListeners }            from '../../modules/sales/sale.listeners.js'
import { registerSaleStockSyncListeners }   from '../../modules/inventory/saleStockSync.listener.js'
import { registerWhatsappListeners }        from '../../modules/integrations/whatsapp/whatsapp.listeners.js'
import { registerGoogleCalendarListeners }  from '../../modules/integrations/google-calendar/googleCalendar.listeners.js'
import { registerReminderListeners }        from '../../modules/reminders/reminder.listeners.js'

export function registerAllEventListeners() {
  registerAccountListeners()
  registerAppointmentListeners()
  registerSaleListeners()
  registerSaleStockSyncListeners()
  registerWhatsappListeners()
  registerGoogleCalendarListeners()
  registerReminderListeners()
}
