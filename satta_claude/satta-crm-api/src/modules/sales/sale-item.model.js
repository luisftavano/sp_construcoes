/**
 * @typedef {'service'|'product'} SaleItemType
 *
 * @typedef {Object} SaleItem
 * @property {string}  id
 * @property {string}  saleId
 * @property {string}  accountId
 * @property {SaleItemType} type
 * @property {string|null}  serviceId        - filled when type='service', null if custom/uncatalogued
 * @property {string|null}  inventoryItemId  - filled when type='product'
 * @property {string}  name                 - snapshot at time of sale (survives renames)
 * @property {number}  quantity
 * @property {number}  unitPrice            - snapshot at time of sale
 * @property {number}  [costPrice]          - snapshot from inventory.costPrice (for margin reports)
 * @property {number}  totalPrice           - quantity * unitPrice (stored for fast aggregation)
 * @property {string}  createdAt
 */
