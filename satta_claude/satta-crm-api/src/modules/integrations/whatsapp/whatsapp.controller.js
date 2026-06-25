import { createInstance, deleteInstance, getQrCode, getStatus, sendMessage } from './whatsapp.client.js'
import { getRawConfig, saveCredentials, disconnectIntegration } from '../integrationConfig.service.js'
import { customerRepository } from '../../customers/customer.repository.js'
import { sendAppointmentReminders } from './whatsapp.service.js'

const REMINDER_TOKEN = process.env.INTERNAL_CRON_TOKEN

export async function startConnect(req, res, next) {
  try {
    const accountId = req.user.accountId
    const existing = await getRawConfig(accountId, 'whatsapp')

    let instanceId    = existing?.credentials?.instanceId
    let instanceToken = existing?.credentials?.instanceToken

    if (!instanceId) {
      const instance = await createInstance(accountId)
      instanceId    = instance.instanceId
      instanceToken = instance.instanceToken
      await saveCredentials(accountId, 'whatsapp', { instanceId, instanceToken })
    }

    const qr = await getQrCode(instanceId, instanceToken)
    res.json({ data: { qrCode: qr.value, connected: qr.connected } })
  } catch (err) { next(err) }
}

export async function checkStatus(req, res, next) {
  try {
    const accountId = req.user.accountId
    const config = await getRawConfig(accountId, 'whatsapp')
    if (!config?.credentials?.instanceId) {
      return res.json({ data: { connected: false } })
    }
    const { instanceId, instanceToken } = config.credentials
    const status = await getStatus(instanceId, instanceToken)

    if (status.connected && config.credentials.phone !== status.phone) {
      await saveCredentials(accountId, 'whatsapp', {
        ...config.credentials,
        phone: status.phone,
        connectedAt: new Date().toISOString(),
      })
    }

    res.json({ data: status })
  } catch (err) { next(err) }
}

export async function disconnect(req, res, next) {
  try {
    const accountId = req.user.accountId
    const config = await getRawConfig(accountId, 'whatsapp')
    if (config?.credentials?.instanceId) {
      await deleteInstance(config.credentials.instanceId, config.credentials.instanceToken).catch(() => {})
    }
    await disconnectIntegration(accountId, 'whatsapp')
    res.json({ data: { connected: false } })
  } catch (err) { next(err) }
}

export async function sendManual(req, res, next) {
  try {
    const { customerId, message } = req.body
    const config = await getRawConfig(req.user.accountId, 'whatsapp')
    if (!config?.credentials?.instanceId) {
      return res.status(422).json({ error: 'WhatsApp não conectado' })
    }
    const customer = await customerRepository.findById(customerId)
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' })

    const result = await sendMessage({
      instanceId:    config.credentials.instanceId,
      instanceToken: config.credentials.instanceToken,
      to:      customer.phone,
      message,
    })
    res.status(201).json({ data: result })
  } catch (err) { next(err) }
}

export async function runReminders(req, res, next) {
  try {
    const token = req.headers['x-cron-token']
    if (!REMINDER_TOKEN || token !== REMINDER_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { accountId } = req.query
    if (!accountId) return res.status(400).json({ error: 'accountId required' })
    const results = await sendAppointmentReminders(accountId)
    res.json({ data: results })
  } catch (err) { next(err) }
}
