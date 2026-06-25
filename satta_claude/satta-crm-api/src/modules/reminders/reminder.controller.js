import {
  getCustomersReadyForReminder,
  runPatternReminders,
  runPatternRemindersAllAccounts,
  getReminderStats,
} from './reminder.service.js'

const CRON_TOKEN = process.env.INTERNAL_CRON_TOKEN

// ── Cron endpoint (called by Cloud Scheduler / external cron) ──────────────

/**
 * POST /reminders/run-pattern-reminders
 * Protected by X-Internal-Token header.
 * Body { accountId } → one account. Empty body → all enabled accounts.
 */
export async function runPatternRemindersHandler(req, res, next) {
  try {
    const token = req.headers['x-cron-token']
    if (!CRON_TOKEN || token !== CRON_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { accountId } = req.body ?? {}
    const results = accountId
      ? await runPatternReminders(accountId)
      : await runPatternRemindersAllAccounts()
    res.json({ data: results })
  } catch (err) { next(err) }
}

// ── Authenticated endpoints (used by Kango panel) ─────────────────────────

/**
 * GET /reminders/preview
 * Returns customers who would receive a reminder today — without sending anything.
 */
export async function previewHandler(req, res, next) {
  try {
    const { accountId } = req.user
    const customers = await getCustomersReadyForReminder(accountId)
    res.json({
      customers: customers.map(c => ({
        id:                  c.id,
        name:                c.name,
        phone:               c.phone ? '****' + c.phone.slice(-4) : null,
        diasDesdeUltimaVisita: c.diasDesdeUltimaVisita,
        averageIntervalDays:   c.averageIntervalDays,
        lastVisitAt:           c.lastVisitAt,
      })),
      totalCount: customers.length,
    })
  } catch (err) { next(err) }
}

/**
 * POST /reminders/trigger-now
 * Authenticated: runs reminders for the calling account immediately.
 * Used by the "Disparar agora" button in the Kango panel.
 */
export async function triggerNowHandler(req, res, next) {
  try {
    const { accountId } = req.user
    const results = await runPatternReminders(accountId)
    res.json({ data: results })
  } catch (err) { next(err) }
}

/**
 * GET /reminders/stats
 * Returns monthly conversion stats for the Kango settings panel.
 */
export async function statsHandler(req, res, next) {
  try {
    const { accountId } = req.user
    const stats = await getReminderStats(accountId)
    res.json(stats)
  } catch (err) { next(err) }
}
