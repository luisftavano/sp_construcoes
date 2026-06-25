import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryUserRepository extends InMemoryRepository {
  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() })
  }

  async findByPhone(phone) {
    return this.findOne({ phone })
  }

  async findAllByAccount(accountId) {
    return this.findAll({ accountId })
  }
}

class FirestoreUserRepository extends FirestoreRepository {
  constructor() { super('users') }

  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() })
  }

  async findByPhone(phone) {
    return this.findOne({ phone })
  }

  async findAllByAccount(accountId) {
    return this.findAll({ accountId })
  }
}

export const userRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreUserRepository()
    : new InMemoryUserRepository()
