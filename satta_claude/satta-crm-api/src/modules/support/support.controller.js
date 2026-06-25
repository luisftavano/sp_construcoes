import { accountRepository } from '../auth/account.repository.js'
import { userRepository } from '../auth/user.repository.js'
import { NotFoundError } from '../../shared/errors/index.js'

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone
  return phone.slice(0, 5) + '****' + phone.slice(-4)
}

function maskEmail(email) {
  const [local, domain] = email.split('@')
  return local.slice(0, 2) + '***@' + domain
}

function detectQueryType(query) {
  const digits = query.replace(/\D/g, '')
  if (/^[A-Z]{2}-[A-Z0-9]{5}$/.test(query)) return 'accountCode'
  if (/^\+[1-9]\d{7,14}$/.test(query))       return 'phone'
  if (digits.length === 11 || digits.length === 14) return 'document'
  return 'unknown'
}

export async function lookup(req, res, next) {
  try {
    const { query } = req.query
    if (!query) return res.status(400).json({ error: 'query param required' })

    const type = detectQueryType(query)
    let account = null

    if (type === 'accountCode') {
      account = await accountRepository.findByAccountCode(query.toUpperCase())
    } else if (type === 'phone') {
      account = await accountRepository.findByPhone(query)
    } else if (type === 'document') {
      account = await accountRepository.findByDocument(query.replace(/\D/g, ''))
    }

    if (!account) throw new NotFoundError('Account not found')

    const users = await userRepository.findAllByAccount(account.id)

    res.json({
      accountCode:  account.accountCode,
      businessName: account.businessName,
      segment:      account.segment,
      status:       account.status,
      phone:        maskPhone(account.phone),
      lastActivityAt: account.lastActivityAt,
      users: users.map(u => ({
        name:  u.name,
        email: maskEmail(u.email),
        role:  u.role,
      })),
    })
  } catch (err) { next(err) }
}
