import { ForbiddenError } from '../errors/index.js'

const VALID_ROLES = ['owner', 'admin', 'staff', 'support']

/**
 * Checks that req.user.role is one of the allowed roles.
 * Usage: authorize('admin', 'support')
 */
export function authorize(...roles) {
  const invalid = roles.filter(r => !VALID_ROLES.includes(r))
  if (invalid.length) throw new Error(`Unknown roles: ${invalid.join(', ')}`)

  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new ForbiddenError('Insufficient permissions'))
    }
    next()
  }
}
