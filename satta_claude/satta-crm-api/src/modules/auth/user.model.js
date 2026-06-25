export const USER_ROLES = ['owner', 'admin', 'staff', 'support']

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} accountId
 * @property {string} name
 * @property {string} email
 * @property {string} [phone] - E.164
 * @property {string} passwordHash
 * @property {'owner'|'admin'|'staff'|'support'} role
 * @property {boolean} phoneVerified
 * @property {string|null} [firstLoginAt] - null until first successful login; used to detect first-time users
 * @property {string} createdAt
 * @property {string} updatedAt
 */
