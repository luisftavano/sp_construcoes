import { sendMessage } from './whatsapp.client.js'
import { whatsappMessageRepository } from './whatsappMessage.repository.js'
import { getRawConfig } from '../integrationConfig.service.js'
import { customerRepository } from '../../customers/customer.repository.js'
import { appointmentRepository } from '../../appointments/appointment.repository.js'
import { ValidationError, NotFoundError } from '../../../shared/errors/index.js'

const MOCK = process.env.WHATSAPP_MOCK !== 'false'

async function assertConnected(accountId) {
  // In mock mode we allow sending without real credentials
  if (MOCK) return
  const config = await getRawConfig(accountId, 'whatsapp')
  if (!config?.enabled || !config?.credentials || Object.keys(config.credentials).length === 0) {
    throw new ValidationError('WhatsApp não conectado para esta conta')
  }
}

function toE164(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return `+${digits}`
  return `+55${digits}`
}

async function record(accountId, customerId, to, body, status, providerId) {
  return whatsappMessageRepository.create({
    accountId, customerId, to, body, status, providerId,
    direction: 'outbound',
  })
}

export async function sendToCustomer(accountId, customerId, message) {
  await assertConnected(accountId)

  const customer = await customerRepository.findByIdAndAccount(customerId, accountId)
  if (!customer) throw new NotFoundError('Customer not found')
  if (!customer.phone) throw new ValidationError('Customer has no phone number')

  const to = toE164(customer.phone)
  const { providerId, status } = await sendMessage({ to, message })

  return record(accountId, customerId, to, message, status, providerId)
}

export async function sendRaw(accountId, to, message, customerId = null) {
  await assertConnected(accountId)
  const phone = toE164(to)
  const { providerId, status } = await sendMessage({ to: phone, message })
  return record(accountId, customerId, phone, message, status, providerId)
}

/**
 * Send appointment confirmation to customer.
 * Skips silently if the account's whatsapp setting "notifyOnAppointment" is false.
 */
export async function sendAppointmentNotification(accountId, appointment, type = 'created') {
  const config = await getRawConfig(accountId, 'whatsapp')
  if (!config?.enabled || !config?.settings?.notifyOnAppointment) return

  const customer = await customerRepository.findByIdAndAccount(appointment.customerId, accountId)
  if (!customer?.phone) return

  const date = new Date(appointment.startAt)
  const dateStr = date.toLocaleDateString('pt-BR')
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const msgs = {
    created:   `Olá ${customer.name}! Seu agendamento foi confirmado para ${dateStr} às ${timeStr}${appointment.title ? ` — ${appointment.title}` : ''}.`,
    reminder:  `Lembrete: você tem um agendamento amanhã, ${dateStr} às ${timeStr}${appointment.title ? ` — ${appointment.title}` : ''}.`,
    cancelled: `Seu agendamento de ${dateStr} às ${timeStr} foi cancelado. Entre em contato para remarcar.`,
  }

  const message = msgs[type] ?? msgs.created
  const to = toE164(customer.phone)

  try {
    const { providerId, status } = await sendMessage({ to, message })
    await record(accountId, appointment.customerId, to, message, status, providerId)
  } catch (err) {
    // Falha na integração não derruba o fluxo principal
    console.error('[WhatsApp] notification failed:', err.message)
  }
}

/**
 * Scan appointments starting tomorrow and send reminders.
 * Designed to be called by an external scheduler (Cloud Scheduler / cron).
 */
export async function sendAppointmentReminders(accountId) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().slice(0, 10)

  const appointments = await appointmentRepository.findByDate(accountId, dateStr)
  const results = []

  for (const appt of appointments) {
    if (['cancelled', 'no_show', 'completed'].includes(appt.status)) continue
    try {
      await sendAppointmentNotification(accountId, appt, 'reminder')
      results.push({ appointmentId: appt.id, sent: true })
    } catch (err) {
      results.push({ appointmentId: appt.id, sent: false, error: err.message })
    }
  }

  return results
}
