import { randomUUID } from 'crypto'
import { ExternalServiceError } from '../../../shared/errors/index.js'

const MOCK           = process.env.WHATSAPP_MOCK !== 'false'
const ZAPI_TOKEN     = process.env.ZAPI_CLIENT_TOKEN ?? ''
const BASE           = 'https://api.z-api.io'

function instanceUrl(instanceId, instanceToken) {
  return `${BASE}/instances/${instanceId}/token/${instanceToken}`
}

function zapiHeaders() {
  return { 'Client-Token': ZAPI_TOKEN, 'Content-Type': 'application/json' }
}

// ── Instância ─────────────────────────────────────────

export async function createInstance(accountId) {
  if (MOCK) return { instanceId: `mock-${accountId}`, instanceToken: 'mock-token' }

  const res = await fetch(`${BASE}/instances`, {
    method: 'POST',
    headers: zapiHeaders(),
    body: JSON.stringify({ name: `satta-${accountId}` }),
  })
  if (!res.ok) throw new ExternalServiceError('Erro ao criar instância Z-API')
  return res.json()
}

export async function deleteInstance(instanceId, instanceToken) {
  if (MOCK) return
  await fetch(instanceUrl(instanceId, instanceToken), {
    method: 'DELETE',
    headers: zapiHeaders(),
  })
}

// ── QR code ───────────────────────────────────────────

export async function getQrCode(instanceId, instanceToken) {
  if (MOCK) {
    return {
      value: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=satta-crm-${instanceId}`,
      connected: false,
    }
  }
  const res = await fetch(`${instanceUrl(instanceId, instanceToken)}/qr-code/image`, {
    headers: zapiHeaders(),
  })
  if (!res.ok) throw new ExternalServiceError('Erro ao buscar QR code')
  const data = await res.json()
  return { value: data.value, connected: false }
}

// ── Status ────────────────────────────────────────────

export async function getStatus(instanceId, instanceToken) {
  if (MOCK) return { connected: false, phone: null }

  const res = await fetch(`${instanceUrl(instanceId, instanceToken)}/status`, {
    headers: zapiHeaders(),
  })
  if (!res.ok) throw new ExternalServiceError('Erro ao verificar status')
  const data = await res.json()
  return { connected: data.value === 'CONNECTED', phone: data.phone ?? null }
}

// ── Envio de mensagem ─────────────────────────────────

export async function sendMessage({ instanceId, instanceToken, to, message }) {
  if (MOCK) {
    console.log(`[WhatsApp MOCK] → ${to}: ${message}`)
    return { providerId: `mock-${randomUUID()}`, status: 'sent' }
  }
  const res = await fetch(`${instanceUrl(instanceId, instanceToken)}/send-text`, {
    method: 'POST',
    headers: zapiHeaders(),
    body: JSON.stringify({ phone: to, message }),
  })
  if (!res.ok) throw new ExternalServiceError(`Z-API send error ${res.status}`)
  const data = await res.json()
  return { providerId: data.zaapId ?? randomUUID(), status: 'sent' }
}
