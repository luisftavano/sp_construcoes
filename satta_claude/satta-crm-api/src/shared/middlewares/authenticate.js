import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { UnauthorizedError } from '../errors/index.js'

if (!getApps().length) {
  initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Bearer token required'))
  }

  const token = header.slice(7)

  try {
    const decoded = await getAuth().verifyIdToken(token)
    req.user = {
      uid:       decoded.uid,
      accountId: decoded.uid,
      email:     decoded.email,
      role:      'owner',
    }
    return next()
  } catch {
    next(new UnauthorizedError('Invalid or expired token'))
  }
}
