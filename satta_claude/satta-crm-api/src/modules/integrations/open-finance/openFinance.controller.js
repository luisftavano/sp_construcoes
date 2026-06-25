import { connectItem, importTransactions } from './openFinance.service.js'

export async function connect(req, res, next) {
  try {
    const { itemId } = req.body
    const result = await connectItem(req.user.accountId, itemId)
    res.json({ data: result })
  } catch (err) { next(err) }
}

export async function importTx(req, res, next) {
  try {
    const { from, to } = req.body
    const result = await importTransactions(req.user.accountId, { from, to })
    res.json({ data: result })
  } catch (err) { next(err) }
}

const CRON_TOKEN = process.env.INTERNAL_CRON_TOKEN

/** Called by external cron. Protected by INTERNAL_CRON_TOKEN header. */
export async function runScheduledImport(req, res, next) {
  try {
    if (!CRON_TOKEN || req.headers['x-cron-token'] !== CRON_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { accountId, from, to } = req.query
    if (!accountId) return res.status(400).json({ error: 'accountId required' })

    const result = await importTransactions(accountId, {
      from: from ?? new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      to:   to   ?? new Date().toISOString().slice(0, 10),
    })
    res.json({ data: result })
  } catch (err) { next(err) }
}
