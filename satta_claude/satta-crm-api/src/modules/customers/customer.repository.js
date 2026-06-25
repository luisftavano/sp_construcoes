import { InMemoryRepository } from '../../shared/repositories/InMemoryRepository.js'
import { FirestoreRepository } from '../../shared/repositories/FirestoreRepository.js'

class InMemoryCustomerRepository extends InMemoryRepository {
  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }

  async findByIdAndAccount(id, accountId) {
    const c = await this.findById(id)
    return c?.accountId === accountId ? c : null
  }

  /** Used by Kango tool: find customer by CPF/CNPJ within an account. */
  async findByDocumentAndAccount(document, accountId) {
    return this.findOne({ document, accountId })
  }
}

class FirestoreCustomerRepository extends FirestoreRepository {
  constructor() { super('customers') }

  async findAllByAccount(accountId, opts) {
    return this.findAll({ accountId }, opts)
  }

  async findByIdAndAccount(id, accountId) {
    const c = await this.findById(id)
    return c?.accountId === accountId ? c : null
  }

  async findByDocumentAndAccount(document, accountId) {
    return this.findOne({ document, accountId })
  }
}

export const customerRepository =
  process.env.USE_FIRESTORE === 'true'
    ? new FirestoreCustomerRepository()
    : new InMemoryCustomerRepository()
