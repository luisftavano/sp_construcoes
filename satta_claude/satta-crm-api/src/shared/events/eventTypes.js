export const EventTypes = {
  // Auth / Account
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_STATUS_CHANGED: 'account.status_changed',

  // Subscriptions
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_PAYMENT_OVERDUE: 'subscription.payment_overdue',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Customers
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',

  // Services (catalog)
  SERVICE_CREATED: 'service.created',
  SERVICE_UPDATED: 'service.updated',
  SERVICE_DELETED: 'service.deleted',

  // Appointments
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_UPDATED: 'appointment.updated',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_COMPLETED: 'appointment.completed',

  // Sales
  SALE_CREATED: 'sale.created',
  SALE_UPDATED: 'sale.updated',
  SALE_DELETED: 'sale.deleted',

  // Sales (additional)
  SALE_CANCELLED: 'sale.cancelled',

  // Inventory
  INVENTORY_ITEM_CREATED:      'inventory.item_created',
  INVENTORY_ITEM_UPDATED:      'inventory.item_updated',
  INVENTORY_ITEM_DELETED:      'inventory.item_deleted',
  INVENTORY_QUANTITY_ADJUSTED: 'inventory.quantity_adjusted',
  INVENTORY_LOW_STOCK_REACHED: 'inventory.low_stock_reached',

  // Expenses
  EXPENSE_CREATED: 'expense.created',

  // Messaging
  MESSAGE_REQUESTED: 'message.requested',

  // Integrations
  INTEGRATION_CONNECTED:    'integration.connected',
  INTEGRATION_DISCONNECTED: 'integration.disconnected',

  // Pattern reminders (preventive, before winback)
  CUSTOMER_PATTERN_REMINDER_SENT:      'customer.pattern_reminder_sent',
  CUSTOMER_PATTERN_REMINDER_CONVERTED: 'customer.pattern_reminder_converted',
}
