import { randomUUID } from 'crypto'
import { ExternalServiceError } from '../../../shared/errors/index.js'

const MOCK          = process.env.GOOGLE_CALENDAR_MOCK !== 'false'
const ENABLED       = process.env.ENABLE_GOOGLE_CALENDAR === 'true'
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI

const GOOGLE_AUTH_BASE  = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL  = 'https://oauth2.googleapis.com/token'
const CALENDAR_BASE_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar.events',
    access_type:   'offline',
    prompt:        'consent',
    ...(state && { state }),
  })
  return `${GOOGLE_AUTH_BASE}?${params}`
}

export async function exchangeCode(code) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new ExternalServiceError('Google token exchange failed')
  const { access_token, refresh_token, expires_in } = await res.json()
  // Return only what we store — no logging
  return { accessToken: access_token, refreshToken: refresh_token, expiresIn: expires_in }
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken, client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET, grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new ExternalServiceError('Google token refresh failed')
  const { access_token } = await res.json()
  return access_token
}

async function callApi(method, url, accessToken, body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    ...(body && { body: JSON.stringify(body) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ExternalServiceError(`Google Calendar API ${res.status}: ${JSON.stringify(err)}`)
  }
  return res.status === 204 ? null : res.json()
}

/**
 * @param {{ summary: string, description?: string, startAt: string, endAt: string }} event
 * @param {string} refreshToken  - stored per account in IntegrationConfig.credentials
 */
export async function createEvent({ summary, description, startAt, endAt }, refreshToken) {
  if (!ENABLED) {
    console.log(`[GoogleCalendar] disabled — would create: ${summary}`)
    return { externalEventId: `disabled-${randomUUID()}` }
  }
  if (MOCK) {
    console.log(`[GoogleCalendar MOCK] createEvent: ${summary}`)
    return { externalEventId: `mock-${randomUUID()}` }
  }
  try {
    const accessToken = await refreshAccessToken(refreshToken)
    const data = await callApi('POST', CALENDAR_BASE_URL, accessToken, {
      summary, description,
      start: { dateTime: startAt, timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: endAt,   timeZone: 'America/Sao_Paulo' },
    })
    return { externalEventId: data.id }
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err
    throw new ExternalServiceError(`Google Calendar createEvent: ${err.message}`)
  }
}

export async function updateEvent(externalEventId, patch, refreshToken) {
  if (!ENABLED || MOCK) {
    console.log(`[GoogleCalendar${MOCK ? ' MOCK' : ' disabled'}] updateEvent: ${externalEventId}`)
    return
  }
  try {
    const accessToken = await refreshAccessToken(refreshToken)
    await callApi('PATCH', `${CALENDAR_BASE_URL}/${externalEventId}`, accessToken, patch)
  } catch (err) {
    throw new ExternalServiceError(`Google Calendar updateEvent: ${err.message}`)
  }
}

export async function deleteEvent(externalEventId, refreshToken) {
  if (!ENABLED || MOCK) {
    console.log(`[GoogleCalendar${MOCK ? ' MOCK' : ' disabled'}] deleteEvent: ${externalEventId}`)
    return
  }
  try {
    const accessToken = await refreshAccessToken(refreshToken)
    await callApi('DELETE', `${CALENDAR_BASE_URL}/${externalEventId}`, accessToken)
  } catch (err) {
    throw new ExternalServiceError(`Google Calendar deleteEvent: ${err.message}`)
  }
}
