import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { accountRepository } from './account.repository.js'
import { userRepository } from './user.repository.js'
import { detectDocumentType, isValidDocument } from '../../shared/utils/documentValidator.js'
import { generateUniqueAccountCode } from '../../shared/utils/generateAccountCode.js'
import { eventBus } from '../../shared/events/eventBus.js'
import { EventTypes } from '../../shared/events/eventTypes.js'
import { ConflictError, InvalidDocumentError, UnauthorizedError } from '../../shared/errors/index.js'

function issueToken(user, account) {
  return jwt.sign(
    { sub: user.id, accountId: account.id, role: user.role, segment: account.segment },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  )
}

export async function register(data) {
  const { businessName, document, phone, segment, businessSizeRange, address, name, email, password } = data

  // Validate document
  const cleanDoc = document.replace(/\D/g, '')
  if (!isValidDocument(cleanDoc)) throw new InvalidDocumentError()
  const documentType = detectDocumentType(cleanDoc)

  // Uniqueness checks
  if (await userRepository.findByEmail(email)) throw new ConflictError('Email already in use')
  if (await accountRepository.findByDocument(cleanDoc)) throw new ConflictError('Document already registered')

  // Generate unique account code
  const accountCode = await generateUniqueAccountCode(
    code => accountRepository.accountCodeExists(code)
  )

  const account = await accountRepository.create({
    businessName,
    document: cleanDoc,
    documentType,
    phone,
    accountCode,
    segment,
    businessSizeRange,
    address,
    status: 'trial',
    lastActivityAt: new Date().toISOString(),
  })

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await userRepository.create({
    accountId: account.id,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'owner',
    phoneVerified: false,
    firstLoginAt: null,
  })

  eventBus.emit(EventTypes.ACCOUNT_CREATED, { account, user })

  const token = issueToken(user, account)
  return { token, account, user: sanitizeUser(user) }
}

export async function login({ identifier, password }) {
  // Detect if identifier is email or E.164 phone
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
  const isPhone = /^\+[1-9]\d{7,14}$/.test(identifier)

  let user = null
  if (isEmail) {
    user = await userRepository.findByEmail(identifier)
  } else if (isPhone) {
    user = await userRepository.findByPhone(identifier)
  }

  if (!user) throw new UnauthorizedError('Invalid credentials')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new UnauthorizedError('Invalid credentials')

  const account = await accountRepository.findById(user.accountId)

  let isFirstLogin = false
  if (user.firstLoginAt == null) {
    const now = new Date().toISOString()
    await userRepository.update(user.id, { firstLoginAt: now })
    user = { ...user, firstLoginAt: now }
    isFirstLogin = true
  }

  const token = issueToken(user, account)
  return { token, account, user: sanitizeUser(user), isFirstLogin }
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user
  return safe
}
