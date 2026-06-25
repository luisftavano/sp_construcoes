import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'

class InMemoryPatternReminderLogRepository extends InMemoryRepository {
  async findByAccount(accountId) {
    return this.findAll({ accountId })
  }

  async findByCustomer(accountId, customerId) {
    return this.findAll({ accountId, customerId })
  }

  /** Most recent unconverted log for a customer, or null. */
  async findLatestUnconverted(accountId, customerId) {
    const all = await this.findAll({ accountId, customerId, converted: false })
    return all.sort((a, b) => (b.sentAt > a.sentAt ? 1 : -1))[0] ?? null
  }
}

export const patternReminderLogRepository = new InMemoryPatternReminderLogRepository()
