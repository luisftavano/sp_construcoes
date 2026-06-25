/**
 * @typedef {'unidade'|'kg'|'litro'|'caixa'|'pacote'} InventoryUnit
 *
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} accountId
 * @property {string} name
 * @property {string} [brand]
 * @property {string} [category]
 * @property {number} quantity
 * @property {InventoryUnit} unit
 * @property {number} [minStockAlert]   - emits low_stock_reached when quantity <= this
 * @property {number} [costPrice]
 * @property {number} [sellPrice]
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} updatedAt
 */
