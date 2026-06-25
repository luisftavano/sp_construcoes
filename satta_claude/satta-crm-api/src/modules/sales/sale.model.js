/**
 * @typedef {'completed'|'cancelled'|'pending'} SaleStatus
 * @typedef {'dinheiro'|'pix'|'cartao_credito'|'cartao_debito'|'fiado'|'outro'} PaymentMethod
 *
 * @typedef {Object} Sale
 * @property {string}  id
 * @property {string}  accountId
 * @property {string}  [customerId]
 * @property {SaleStatus} status
 * @property {number}  amount           - sum of all SaleItem.totalPrice (stored for fast queries)
 * @property {number}  [discountAmount] - discount applied to the sale, default 0
 * @property {number}  totalAmount      - amount - discountAmount
 * @property {PaymentMethod} [paymentMethod]
 * @property {string}  [notes]          - free-text observation (replaces the old description field)
 * @property {string}  soldAt           - ISO 8601, when the sale occurred
 * @property {string}  [source]         - 'appointment' | 'manual' | etc.
 * @property {string}  createdAt
 * @property {string}  updatedAt
 */

export const PAYMENT_METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'fiado', 'outro']
