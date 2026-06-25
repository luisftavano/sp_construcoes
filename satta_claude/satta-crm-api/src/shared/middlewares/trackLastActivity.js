import { accountRepository } from '../../modules/auth/account.repository.js'

/**
 * Fire-and-forget update of account.lastActivityAt.
 * Does NOT await — never delays the response.
 */
export function trackLastActivity(req, res, next) {
  if (req.user?.accountId) {
    accountRepository
      .update(req.user.accountId, { lastActivityAt: new Date().toISOString() })
      .catch(() => {}) // ignore errors silently
  }
  next()
}
