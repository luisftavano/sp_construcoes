export const SEGMENTS = ['barbershop', 'petshop', 'clinic', 'hotel', 'car_wash', 'beauty_salon', 'other']
export const BUSINESS_SIZE_RANGES = ['1', '2-5', '6-15', '16+']
export const ACCOUNT_STATUSES = ['trial', 'active', 'at_risk', 'churned']

/**
 * @typedef {Object} Account
 * @property {string} id
 * @property {string} businessName
 * @property {string} document - CPF or CNPJ (digits only)
 * @property {'cpf'|'cnpj'} documentType
 * @property {string} phone - E.164 format (+5511999999999)
 * @property {string} accountCode - "XX-XXXXX" unique short code
 * @property {string} segment
 * @property {string} [businessSizeRange]
 * @property {{ zipCode?, street?, number?, city?, state? }} [address]
 * @property {'trial'|'active'|'at_risk'|'churned'} status
 * @property {string} [lastActivityAt]
 * @property {Object} [accountSettings]         - user overrides for nicheConfig defaults
 * @property {boolean} [accountSettings.inventory.enabled]
 * @property {boolean} [accountSettings.sales.allowItemized]
 * @property {boolean} [accountSettings.kango.autoReplyEnabled]
 * @property {boolean} [accountSettings.kango.followUpInactiveEnabled]
 * @property {number}  [accountSettings.kango.inactiveDaysThreshold]
 * @property {string}  [accountSettings.kango.winbackOfferText]
 * @property {boolean} [accountSettings.kango.patternRemindersEnabled] - enable preventive pattern reminders
 * @property {number}  [accountSettings.kango.reminderTriggerMultiplier] - multiplier for trigger window (default 1.2, range 1.0-1.5)
 * @property {string} createdAt
 * @property {string} updatedAt
 */
