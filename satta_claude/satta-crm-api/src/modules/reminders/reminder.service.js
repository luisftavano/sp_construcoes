import { customerRepository }        from '../customers/customer.repository.js'
import { saleRepository }             from '../sales/sale.repository.js'
import { appointmentRepository }      from '../appointments/appointment.repository.js'
import { accountRepository }          from '../auth/account.repository.js'
import { getRawConfig }               from '../integrations/integrationConfig.service.js'
import { sendToCustomer }             from '../integrations/whatsapp/whatsapp.service.js'
import { buildPatternReminderMessage } from '../integrations/whatsapp/patternReminderTemplates.js'
import { patternReminderLogRepository } from './patternReminderLog.repository.js'
import { eventBus }                   from '../../shared/events/eventBus.js'
import { EventTypes }                 from '../../shared/events/eventTypes.js'

const MOCK = process.env.WHATSAPP_MOCK !== 'false'

// ── Activity signals ────────────────────────────────────────────────────────

/**
 * Computes visit pattern for a single customer.
 * A "visit" is a unique calendar date where a sale OR a completed appointment exists.
 *
 * @returns {{ visitDates: string[], visitCount: number, lastVisitAt: string|null, averageIntervalDays: number }}
 */
export async function getCustomerActivitySignals(accountId, customerId) {
  const [sales, appointments] = await Promise.all([
    saleRepository.findAll({ accountId, customerId }),
    appointmentRepository.findAll({ accountId, customerId }),
  ])

  const dateSet = new Set()
  for (const s of sales) {
    if (s.soldAt) dateSet.add(s.soldAt.slice(0, 10))
  }
  for (const a of appointments) {
    if (a.startAt && ['completed', 'concluido'].includes(a.status)) {
      dateSet.add(a.startAt.slice(0, 10))
    }
  }

  const visitDates = [...dateSet].sort()
  const visitCount = visitDates.length
  const lastVisitAt = visitDates.at(-1) ?? null

  let averageIntervalDays = 0
  if (visitDates.length >= 2) {
    let totalDays = 0
    for (let i = 1; i < visitDates.length; i++) {
      totalDays += (new Date(visitDates[i]) - new Date(visitDates[i - 1])) / 86_400_000
    }
    averageIntervalDays = totalDays / (visitDates.length - 1)
  }

  return { visitDates, visitCount, lastVisitAt, averageIntervalDays }
}

// ── Ready-for-reminder detection ────────────────────────────────────────────

/**
 * Returns customers who are ready to receive a preventive pattern reminder:
 * - At least 3 confirmed visits (reliable pattern)
 * - Still within "active" window (not yet winback territory)
 * - Past the trigger window (1.2× average interval by default)
 * - Not reminded in the current cycle
 * - No future confirmed appointment
 */
export async function getCustomersReadyForReminder(accountId) {
  const [customers, config, whatsappConfig] = await Promise.all([
    customerRepository.findAllByAccount(accountId),
    Promise.resolve(null), // placeholder — account fetched below
    getRawConfig(accountId, 'whatsapp').catch(() => null),
  ])

  const account = await accountRepository.findById(accountId)
  const triggerMultiplier = clampMultiplier(
    account?.accountSettings?.kango?.reminderTriggerMultiplier
    ?? whatsappConfig?.settings?.reminderTriggerMultiplier
    ?? 1.2
  )

  const now = Date.now()
  const todayStr = new Date().toISOString().slice(0, 10)

  const ready = await Promise.all(
    customers.map(async (customer) => {
      const signals = await getCustomerActivitySignals(accountId, customer.id)
      const { visitCount, lastVisitAt, averageIntervalDays } = signals

      // Need at least 3 visits to have a reliable pattern
      if (visitCount < 3 || !lastVisitAt || averageIntervalDays <= 0) return null

      const diasDesdeUltimaVisita = (now - new Date(lastVisitAt).getTime()) / 86_400_000
      const janelaDeGatilho = averageIntervalDays * triggerMultiplier

      // Not yet at trigger window
      if (diasDesdeUltimaVisita < janelaDeGatilho) return null

      // Already in winback territory (2× interval) — winback handles it
      if (diasDesdeUltimaVisita >= averageIntervalDays * 2) return null

      // Already reminded this cycle: last reminder is more recent than last visit
      if (customer.lastPatternReminderSentAt) {
        const lastReminderAt = new Date(customer.lastPatternReminderSentAt).getTime()
        const lastVisitMs   = new Date(lastVisitAt).getTime()
        if (lastReminderAt > lastVisitMs) return null // already reminded since last visit
      }

      // Has a future confirmed appointment — don't remind
      const futureAppts = await appointmentRepository.findAll({ accountId, customerId: customer.id })
      const hasFutureAppt = futureAppts.some(a =>
        a.startAt > todayStr &&
        !['cancelled', 'no_show'].includes(a.status)
      )
      if (hasFutureAppt) return null

      return {
        ...customer,
        diasDesdeUltimaVisita: Math.round(diasDesdeUltimaVisita * 10) / 10,
        averageIntervalDays:   Math.round(averageIntervalDays * 10) / 10,
        lastVisitAt,
      }
    })
  )

  return ready.filter(Boolean)
}

// ── Run reminders for one account ──────────────────────────────────────────

/**
 * Sends pattern reminders for all eligible customers of one account.
 * Respects business hours from integrationConfig.settings.businessHoursStart/End (default 9–18).
 */
export async function runPatternReminders(accountId) {
  const [whatsappConfig, account] = await Promise.all([
    getRawConfig(accountId, 'whatsapp').catch(() => null),
    accountRepository.findById(accountId),
  ])

  if (!account) return { skipped: 0, sent: 0, results: [] }

  // Business hours guard (São Paulo timezone)
  if (!isWithinBusinessHours(whatsappConfig?.settings)) {
    return { skipped: 0, sent: 0, results: [], reason: 'outside_business_hours' }
  }

  const customers = await getCustomersReadyForReminder(accountId)
  const settings  = whatsappConfig?.settings ?? {}
  const segment   = account.segment ?? 'other'
  const businessName = account.businessName ?? ''

  const results = []
  let sent = 0

  for (const customer of customers) {
    try {
      const petName = segment === 'petshop' ? (customer.customFields?.petName ?? null) : null

      const message = buildPatternReminderMessage(segment, {
        customerName:        customer.name,
        businessName,
        daysSinceLastVisit:  customer.diasDesdeUltimaVisita,
        averageIntervalDays: customer.averageIntervalDays,
        petName,
      }, settings)

      await sendToCustomer(accountId, customer.id, message)

      const now = new Date().toISOString()

      // Update customer's lastPatternReminderSentAt
      await customerRepository.update(customer.id, { lastPatternReminderSentAt: now })

      // Record in log for conversion tracking
      await patternReminderLogRepository.create({
        accountId,
        customerId: customer.id,
        sentAt: now,
        message,
        daysSinceLastVisit:  customer.diasDesdeUltimaVisita,
        averageIntervalDays: customer.averageIntervalDays,
        converted:   false,
        convertedAt: null,
      })

      eventBus.emit(EventTypes.CUSTOMER_PATTERN_REMINDER_SENT, {
        accountId,
        customerId:          customer.id,
        daysSinceLastVisit:  customer.diasDesdeUltimaVisita,
        averageIntervalDays: customer.averageIntervalDays,
      })

      console.info(`[PatternReminder] sent to ${customer.name} (${customer.id}) — ${customer.diasDesdeUltimaVisita}d since last visit`)

      results.push({ customerId: customer.id, customerName: customer.name, sent: true })
      sent++
    } catch (err) {
      console.error(`[PatternReminder] failed for ${customer.id}:`, err.message)
      results.push({ customerId: customer.id, customerName: customer.name, sent: false, error: err.message })
    }
  }

  return { sent, skipped: customers.length - sent, results }
}

// ── Run for all accounts ────────────────────────────────────────────────────

export async function runPatternRemindersAllAccounts() {
  const accounts = await accountRepository.findAll()

  const eligible = accounts.filter(a =>
    a.accountSettings?.kango?.patternRemindersEnabled === true
  )

  const allResults = []
  for (const account of eligible) {
    // In real mode, check if whatsapp is connected
    if (!MOCK) {
      const waCfg = await getRawConfig(account.id, 'whatsapp').catch(() => null)
      if (!waCfg?.enabled) continue
    }

    try {
      const result = await runPatternReminders(account.id)
      allResults.push({ accountId: account.id, ...result })
    } catch (err) {
      console.error(`[PatternReminder] account ${account.id} failed:`, err.message)
      allResults.push({ accountId: account.id, error: err.message })
    }
  }

  return allResults
}

// ── Conversion tracking ─────────────────────────────────────────────────────

/**
 * Called when a sale or appointment is created.
 * Marks the most recent unconverted reminder log as converted.
 */
export async function trackConversion(accountId, customerId) {
  const log = await patternReminderLogRepository.findLatestUnconverted(accountId, customerId)
  if (!log) return

  const now = new Date().toISOString()
  await patternReminderLogRepository.update(log.id, { converted: true, convertedAt: now })

  // Update customer record too
  await customerRepository.update(customerId, { patternReminderConvertedAt: now })

  eventBus.emit(EventTypes.CUSTOMER_PATTERN_REMINDER_CONVERTED, {
    accountId,
    customerId,
    logId: log.id,
    daysSinceReminder: (new Date(now) - new Date(log.sentAt)) / 86_400_000,
  })
}

// ── Stats ────────────────────────────────────────────────────────────────────

export async function getReminderStats(accountId) {
  const logs = await patternReminderLogRepository.findByAccount(accountId)

  // Stats for current calendar month
  const monthStart = new Date().toISOString().slice(0, 7) + '-01'
  const thisMonth  = logs.filter(l => l.sentAt >= monthStart)

  const totalSent      = thisMonth.length
  const converted      = thisMonth.filter(l => l.converted)
  const totalConverted = converted.length
  const conversionRate = totalSent > 0
    ? ((totalConverted / totalSent) * 100).toFixed(1) + '%'
    : '0%'

  const avgDaysToConvert = converted.length > 0
    ? +(converted.reduce((sum, l) => {
        return sum + (new Date(l.convertedAt) - new Date(l.sentAt)) / 86_400_000
      }, 0) / converted.length).toFixed(1)
    : 0

  // Simple topRespondingSegment based on conversion rate — placeholder analysis
  const topRespondingSegment = totalConverted > 0
    ? 'clientes ativos há mais de 6 meses'
    : null

  return {
    totalSent,
    totalConverted,
    conversionRate,
    avgDaysToConvert,
    topRespondingSegment,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function clampMultiplier(v) {
  const n = Number(v)
  if (isNaN(n)) return 1.2
  return Math.min(1.5, Math.max(1.0, n))
}

function isWithinBusinessHours(settings = {}) {
  const startH = settings.businessHoursStart ?? 9
  const endH   = settings.businessHoursEnd   ?? 18
  const hour   = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  })
  const h = parseInt(hour, 10)
  return h >= startH && h < endH
}
