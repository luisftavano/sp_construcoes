import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'

class InMemoryIntegrationConfigRepository extends InMemoryRepository {
  async findByAccountAndProvider(accountId, provider) {
    return this.findOne({ accountId, provider })
  }

  async findAllByAccount(accountId) {
    return this.findAll({ accountId })
  }
}

export const integrationConfigRepository = new InMemoryIntegrationConfigRepository()
