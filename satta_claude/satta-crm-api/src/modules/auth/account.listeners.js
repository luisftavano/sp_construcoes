import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { accountRepository } from './account.repository.js'

/** Maps subscription events to the corresponding account status. */
export function registerAccountListeners() {
  eventBus.on(EventTypes.SUBSCRIPTION_ACTIVATED, async ({ accountId }) => {
    await accountRepository.update(accountId, { status: 'active' })
  })

  eventBus.on(EventTypes.SUBSCRIPTION_PAYMENT_OVERDUE, async ({ accountId }) => {
    await accountRepository.update(accountId, { status: 'at_risk' })
  })

  eventBus.on(EventTypes.SUBSCRIPTION_CANCELLED, async ({ accountId }) => {
    await accountRepository.update(accountId, { status: 'churned' })
  })
}
