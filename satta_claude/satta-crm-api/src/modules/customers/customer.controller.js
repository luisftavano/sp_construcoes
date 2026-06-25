import * as customerService from './customer.service.js'
import { accountRepository } from '../auth/account.repository.js'
import { getTemplateForSegment } from './customFieldTemplates.js'

export async function list(req, res, next) {
  try {
    const result = await customerService.listCustomers(req.user.accountId, req.query)
    res.json(result)
  } catch (err) { next(err) }
}

export async function get(req, res, next) {
  try {
    const customer = await customerService.getCustomer(req.params.id, req.user.accountId)
    res.json(customer)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const customer = await customerService.createCustomer(req.user.accountId, req.body)
    res.status(201).json(customer)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.user.accountId, req.body)
    res.json(customer)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    await customerService.deleteCustomer(req.params.id, req.user.accountId)
    res.status(204).end()
  } catch (err) { next(err) }
}

export async function customFieldTemplate(req, res, next) {
  try {
    const account = await accountRepository.findById(req.user.accountId)
    const template = getTemplateForSegment(account?.segment ?? 'other')
    res.json(template)
  } catch (err) { next(err) }
}
