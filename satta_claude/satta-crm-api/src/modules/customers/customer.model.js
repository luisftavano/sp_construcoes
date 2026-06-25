/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} accountId
 * @property {string} name
 * @property {string} [email]
 * @property {string} [phone] - E.164
 * @property {string} [document] - CPF or CNPJ digits only (used as lookup key by Kango)
 * @property {string} [documentType] - 'cpf' | 'cnpj'
 * @property {string} [notes]
 * @property {Record<string, any>} [customFields] - segment-specific fields
 * @property {string|null} [lastPatternReminderSentAt] - ISO timestamp of last preventive pattern reminder
 * @property {string|null} [patternReminderConvertedAt] - ISO timestamp when client returned after a pattern reminder
 * @property {string} createdAt
 * @property {string} updatedAt
 */
