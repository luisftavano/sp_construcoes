import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryAccountRepository extends InMemoryRepository {
  async findByAccountCode(code) {
    return this.findOne({ accountCode: code })
  }

  async findByDocument(document) {
    return this.findOne({ document })
  }

  async findByPhone(phone) {
    return this.findOne({ phone })
  }

  async accountCodeExists(code) {
    return (await this.findByAccountCode(code)) !== null
  }
}

class FirestoreAccountRepository extends FirestoreRepository {
  constructor() { super('accounts') }

  async findByAccountCode(code) {
    return this.findOne({ accountCode: code })
  }

  async findByDocument(document) {
    return this.findOne({ document })
  }

  async findByPhone(phone) {
    return this.findOne({ phone })
  }

  async accountCodeExists(code) {
    return (await this.findByAccountCode(code)) !== null
  }
}

export const accountRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreAccountRepository()
    : new InMemoryAccountRepository()
