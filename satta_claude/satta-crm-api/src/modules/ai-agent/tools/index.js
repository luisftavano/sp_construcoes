import * as reportService from '../../reports/report.service.js'
import * as customerService from '../../customers/customer.service.js'
import { customerRepository } from '../../customers/customer.repository.js'
import * as appointmentService from '../../appointments/appointment.service.js'
import * as expenseService from '../../expenses/expense.service.js'
import * as saleService from '../../sales/sale.service.js'
import * as inventoryService from '../../inventory/inventory.service.js'
import * as accountService from '../../auth/account.service.js'
import { AmbiguousInventoryMatchError } from '../../../shared/errors/index.js'
import { eventBus } from '../../../shared/events/eventBus.js'
import { EventTypes } from '../../../shared/events/eventTypes.js'

/**
 * Tool definitions in JSON Schema format for the Kango API.
 * accountId is NEVER passed by the AI — always injected by the controller.
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_financial_summary',
    description: 'Returns total revenue, expenses and net profit for a period',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        endDate:   { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
      },
    },
  },
  {
    name: 'find_customer_by_document',
    description: 'Finds a customer by CPF or CNPJ',
    parameters: {
      type: 'object',
      required: ['document'],
      properties: {
        document: { type: 'string', description: 'CPF or CNPJ (with or without formatting)' },
      },
    },
  },
  {
    name: 'list_inactive_customers',
    description: 'Lists customers with no sales or appointments in the last N days',
    parameters: {
      type: 'object',
      properties: {
        daysSinceLastSale: { type: 'number', default: 30 },
      },
    },
  },
  {
    name: 'create_appointment',
    description: 'Schedules a new appointment',
    parameters: {
      type: 'object',
      required: ['customerId', 'title', 'startAt', 'endAt'],
      properties: {
        customerId:   { type: 'string' },
        serviceId:    { type: 'string' },
        title:        { type: 'string' },
        startAt:      { type: 'string', description: 'ISO 8601 datetime' },
        endAt:        { type: 'string', description: 'ISO 8601 datetime' },
        resourceName: { type: 'string' },
        notes:        { type: 'string' },
      },
    },
  },
  {
    name: 'create_expense',
    description: 'Registers a business expense',
    parameters: {
      type: 'object',
      required: ['description', 'amount'],
      properties: {
        description: { type: 'string' },
        amount:      { type: 'number' },
        category:    { type: 'string' },
        paidAt:      { type: 'string' },
      },
    },
  },
  {
    name: 'create_sale',
    description: 'Records a new itemized sale. Each item must be either a service (type=service) or a product from inventory (type=product). Amount is calculated automatically from items. Stock is decremented for product items.',
    parameters: {
      type: 'object',
      required: ['items'],
      properties: {
        customerId:     { type: 'string' },
        paymentMethod:  { type: 'string', enum: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'fiado', 'outro'] },
        discountAmount: { type: 'number', description: 'Discount value in BRL, subtracted from total.' },
        notes:          { type: 'string' },
        soldAt:         { type: 'string', description: 'ISO 8601 datetime' },
        force:          { type: 'boolean', description: 'Allow sale even when product stock is insufficient.' },
        items: {
          type: 'array',
          description: 'At least one item required. Each item is a service or a product.',
          items: {
            type: 'object',
            required: ['type', 'quantity'],
            properties: {
              type:            { type: 'string', enum: ['service', 'product'] },
              serviceId:       { type: 'string', description: 'Required when type=service and service is from catalog.' },
              inventoryItemId: { type: 'string', description: 'Required when type=product.' },
              name:            { type: 'string', description: 'Snapshot name. Auto-filled from catalog if omitted.' },
              quantity:        { type: 'number' },
              unitPrice:       { type: 'number', description: 'Price per unit. Auto-filled from catalog if omitted.' },
            },
          },
        },
      },
    },
  },
  {
    name: 'send_customer_message',
    description: 'Requests a message to be sent to a customer (WhatsApp/SMS — async)',
    parameters: {
      type: 'object',
      required: ['customerId', 'message'],
      properties: {
        customerId: { type: 'string' },
        message:    { type: 'string' },
      },
    },
  },
  {
    name: 'adjust_inventory',
    description: 'Adds or removes quantity from an inventory item. Use positive quantityChange to add stock, negative to remove.',
    parameters: {
      type: 'object',
      required: ['quantityChange'],
      properties: {
        name:           { type: 'string', description: 'Item name (fuzzy match). Required if itemId is not provided.' },
        brand:          { type: 'string', description: 'Optional brand to narrow the search.' },
        itemId:         { type: 'string', description: 'Exact inventory item ID. Use instead of name when known.' },
        quantityChange: { type: 'number', description: 'Amount to add (positive) or remove (negative).' },
        unit:           { type: 'string', enum: ['unidade', 'kg', 'litro', 'caixa', 'pacote'] },
      },
    },
  },
  {
    name: 'create_inventory_item',
    description: 'Creates a new item in the inventory catalog.',
    parameters: {
      type: 'object',
      required: ['name', 'quantity'],
      properties: {
        name:          { type: 'string' },
        brand:         { type: 'string' },
        quantity:      { type: 'number' },
        unit:          { type: 'string', enum: ['unidade', 'kg', 'litro', 'caixa', 'pacote'] },
        category:      { type: 'string' },
        minStockAlert: { type: 'number', description: 'Emit low-stock alert when quantity drops to or below this.' },
        sellPrice:     { type: 'number' },
        costPrice:     { type: 'number' },
      },
    },
  },
  {
    name: 'list_low_stock_items',
    description: 'Returns all inventory items where current quantity is at or below the configured minStockAlert.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'complete_onboarding',
    description: 'Creates the default services for the business niche and returns what was set up. Call this once when the user finishes the first-login onboarding flow.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'generate_personalized_message',
    description: 'Fetches customer context to help Kango draft a personalized message',
    parameters: {
      type: 'object',
      required: ['customerId'],
      properties: {
        customerId: { type: 'string' },
        context:    { type: 'string', description: 'Purpose of the message (e.g. birthday, follow-up)' },
      },
    },
  },
  {
    name: 'get_top_selling_items',
    description: 'Returns the most sold services and/or products in a period, sorted by quantity. Use to answer "what sold the most?" or "what are my best sellers?"',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        endDate:   { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        type:      { type: 'string', enum: ['service', 'product', 'all'], description: 'Filter by item type. Default: all.' },
        limit:     { type: 'number', description: 'Max results. Default: 10.' },
      },
    },
  },
  {
    name: 'get_profit_analysis',
    description: 'Returns profit margin per product/service (requires costPrice set on inventory items). Use to answer "what gives the most profit?" or "what has the worst margin?"',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        endDate:   { type: 'string', description: 'ISO date (YYYY-MM-DD)' },
        limit:     { type: 'number', description: 'Max results. Default: 10.' },
      },
    },
  },
]

/**
 * Executes a tool call with the given arguments.
 * accountId is always injected here — never trusted from the AI.
 *
 * Pass dryRun: true to preview the action without persisting.
 */
export async function executeTool(name, args, accountId, { dryRun = false } = {}) {
  switch (name) {
    case 'get_financial_summary':
      return reportService.getFinancialSummary(accountId, args.startDate, args.endDate)

    case 'find_customer_by_document': {
      const doc = String(args.document).replace(/\D/g, '')
      const customer = await customerRepository.findByDocumentAndAccount(doc, accountId)
      return customer ?? { found: false }
    }

    case 'list_inactive_customers':
      return customerService.listInactiveCustomers(accountId, args.daysSinceLastSale ?? 30)

    case 'create_appointment':
      if (dryRun) return { dryRun: true, preview: { accountId, ...args } }
      return appointmentService.createAppointment(accountId, args)

    case 'create_expense':
      if (dryRun) return { dryRun: true, preview: { accountId, ...args } }
      return expenseService.createExpense(accountId, args)

    case 'create_sale': {
      if (dryRun) {
        const stockImpact = []
        for (const item of (args.items ?? [])) {
          if (item.type !== 'product' || !item.inventoryItemId) continue
          const inv = await inventoryService.getInventoryItem(accountId, item.inventoryItemId).catch(() => null)
          if (inv) {
            stockImpact.push({
              name: `${inv.name}${inv.brand ? ` (${inv.brand})` : ''}`,
              before: inv.quantity,
              after: inv.quantity - item.quantity,
              unit: inv.unit,
              insufficientStock: inv.quantity < item.quantity,
            })
          }
        }
        return { dryRun: true, preview: { accountId, ...args }, stockImpact }
      }
      return saleService.createSale(accountId, args)
    }

    case 'adjust_inventory': {
      try {
        if (dryRun) {
          // Preview: find the item and describe what will happen
          const candidates = args.itemId
            ? [await inventoryService.getInventoryItem(accountId, args.itemId).catch(() => null)].filter(Boolean)
            : await inventoryService.listInventory(accountId).then(r =>
                r.data.filter(i =>
                  i.name.toLowerCase().includes(String(args.name ?? '').toLowerCase())
                )
              )

          if (candidates.length > 1) {
            return { dryRun: true, ambiguous: true, candidates }
          }
          if (candidates.length === 0) {
            const action = args.quantityChange > 0 ? 'criar um novo item' : 'não encontrar'
            return { dryRun: true, preview: `Vou ${action} "${args.name}" no estoque.`, willCreate: args.quantityChange > 0 }
          }
          const item = candidates[0]
          const after = item.quantity + args.quantityChange
          return {
            dryRun: true,
            preview: `Vou ${args.quantityChange > 0 ? 'adicionar' : 'remover'} ${Math.abs(args.quantityChange)} ${item.unit} de ${item.name}${item.brand ? ` (${item.brand})` : ''} ao estoque. Quantidade: ${item.quantity} → ${after}.`,
            item,
            after,
          }
        }

        const result = await inventoryService.adjustInventoryQuantity(accountId, args)
        return result
      } catch (err) {
        if (err instanceof AmbiguousInventoryMatchError) {
          return { ambiguous: true, candidates: err.candidates, message: err.message }
        }
        throw err
      }
    }

    case 'create_inventory_item':
      if (dryRun) return { dryRun: true, preview: { accountId, ...args } }
      return inventoryService.createInventoryItem(accountId, args)

    case 'list_low_stock_items':
      return inventoryService.getLowStockItems(accountId)

    case 'send_customer_message': {
      if (dryRun) return { dryRun: true, preview: { customerId: args.customerId, message: args.message } }
      // Registers intent — real delivery handled by future WhatsApp listener
      eventBus.emit(EventTypes.MESSAGE_REQUESTED, {
        accountId,
        customerId: args.customerId,
        message:    args.message,
        requestedAt: new Date().toISOString(),
      })
      return { queued: true, customerId: args.customerId }
    }

    case 'complete_onboarding':
      return accountService.completeOnboarding(accountId)

    case 'generate_personalized_message': {
      const customer = await customerService.getCustomer(args.customerId, accountId)
      return {
        customerName: customer.name,
        context:      args.context ?? 'general',
        hint: `Draft a message for ${customer.name} considering their history.`,
      }
    }

    case 'get_top_selling_items':
      return reportService.getTopSellingItems(accountId, {
        startDate: args.startDate,
        endDate:   args.endDate,
        type:      args.type ?? 'all',
        limit:     args.limit ?? 10,
      })

    case 'get_profit_analysis':
      return reportService.getProfitMarginByItem(accountId, {
        startDate: args.startDate,
        endDate:   args.endDate,
        limit:     args.limit ?? 10,
      })

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
