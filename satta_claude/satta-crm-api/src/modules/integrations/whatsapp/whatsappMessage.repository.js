import { InMemoryRepository } from '../../../shared/repositories/InMemoryRepository.js'

class InMemoryWhatsappMessageRepository extends InMemoryRepository {
  async findAllByAccount(accountId) {
    return this.findAll({ accountId }, { orderBy: 'createdAt' })
  }
}

export const whatsappMessageRepository = new InMemoryWhatsappMessageRepository()
