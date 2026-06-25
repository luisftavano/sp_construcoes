import { getAuthUrl, exchangeCode, createEvent, updateEvent, deleteEvent } from './googleCalendar.client.js'
import { getRawConfig, saveCredentials } from '../integrationConfig.service.js'
import { appointmentRepository } from '../../appointments/appointment.repository.js'

const PROVIDER = 'google_calendar'

async function getRefreshToken(accountId) {
  const config = await getRawConfig(accountId, PROVIDER)
  return config?.credentials?.refreshToken ?? null
}

export function buildAuthUrl(accountId) {
  return getAuthUrl(accountId)
}

export async function handleOAuthCallback(accountId, code) {
  const tokens = await exchangeCode(code)
  // Store only refreshToken — accessToken is ephemeral and re-obtained on each call
  await saveCredentials(accountId, PROVIDER, { refreshToken: tokens.refreshToken })
  return { connected: true }
}

export async function syncAppointmentCreated(appointment) {
  const refreshToken = await getRefreshToken(appointment.accountId)
  if (!refreshToken) return

  const { externalEventId } = await createEvent({
    summary:     appointment.title,
    description: appointment.notes ?? '',
    startAt:     appointment.startAt,
    endAt:       appointment.endAt,
  }, refreshToken)

  // Save externalCalendarEventId back to the appointment (best-effort)
  try {
    await appointmentRepository.update(appointment.id, { externalCalendarEventId: externalEventId })
  } catch (err) {
    console.error('[GoogleCalendar] failed to save externalCalendarEventId:', err.message)
  }
}

export async function syncAppointmentUpdated(appointment) {
  const refreshToken = await getRefreshToken(appointment.accountId)
  if (!refreshToken || !appointment.externalCalendarEventId) return

  await updateEvent(appointment.externalCalendarEventId, {
    summary:     appointment.title,
    description: appointment.notes ?? '',
    start: { dateTime: appointment.startAt, timeZone: 'America/Sao_Paulo' },
    end:   { dateTime: appointment.endAt,   timeZone: 'America/Sao_Paulo' },
  }, refreshToken)
}

export async function syncAppointmentCancelled(appointment) {
  const refreshToken = await getRefreshToken(appointment.accountId)
  if (!refreshToken || !appointment.externalCalendarEventId) return

  await deleteEvent(appointment.externalCalendarEventId, refreshToken)
}
