/**
 * @typedef {'whatsapp'|'google_calendar'|'open_finance'|'mercado_livre'} Provider
 *
 * @typedef {Object} IntegrationConfig
 * @property {string}   id
 * @property {string}   accountId
 * @property {Provider} provider
 * @property {boolean}  enabled
 * @property {Object}   [credentials] - NEVER expose in API responses
 * @property {Object}   [settings]    - provider-specific public settings
 * @property {string}   createdAt
 * @property {string}   updatedAt
 */

export const PROVIDERS = ['whatsapp', 'google_calendar', 'open_finance', 'mercado_livre', 'ifood']
