/**
 * @typedef {Object} PatternReminderLog
 * @property {string}       id
 * @property {string}       accountId
 * @property {string}       customerId
 * @property {string}       sentAt                - ISO timestamp when the reminder was sent
 * @property {string}       message               - exact message that was sent
 * @property {number}       daysSinceLastVisit    - snapshot at time of send
 * @property {number}       averageIntervalDays   - snapshot at time of send
 * @property {boolean}      converted             - true if customer returned after this reminder
 * @property {string|null}  convertedAt           - ISO timestamp of conversion
 * @property {string}       createdAt
 * @property {string}       updatedAt
 */
