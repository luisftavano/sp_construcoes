import { PaymentRequiredError } from '../errors/index.js'
import { accountRepository } from '../../modules/auth/account.repository.js'

/** Blocks requests when the account subscription is not active or in trial. */
export async function requireActiveSubscription(req, res, next) {
  try {
    const account = await accountRepository.findById(req.user.accountId)
    if (!account) return next()
    const allowed = ['trial', 'active']
    if (!allowed.includes(account.status)) {
      return next(new PaymentRequiredError('Active subscription required to access this feature'))
    }
    next()
  } catch (err) {
    next(err)
  }
}
