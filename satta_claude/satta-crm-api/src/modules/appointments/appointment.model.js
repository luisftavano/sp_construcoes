export const APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']

/**
 * @typedef {Object} Appointment
 * @property {string} id
 * @property {string} accountId
 * @property {string} customerId
 * @property {string} [serviceId]
 * @property {string} [resourceName] - free-form resource label ("Box 1", "Dra. Ana")
 * @property {string} title
 * @property {string} startAt - ISO 8601
 * @property {string} endAt   - ISO 8601
 * @property {'scheduled'|'confirmed'|'completed'|'cancelled'|'no_show'} status
 * @property {number} [price] - snapshot of the price at booking time
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} updatedAt
 */
