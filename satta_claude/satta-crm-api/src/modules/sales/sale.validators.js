import { z } from 'zod'
import { PAYMENT_METHODS } from './sale.model.js'

const serviceItemSchema = z.object({
  type:       z.literal('service'),
  serviceId:  z.string().uuid().optional(),
  name:       z.string().max(200).optional(),
  quantity:   z.number().positive(),
  unitPrice:  z.number().min(0).optional(),
})

const productItemSchema = z.object({
  type:            z.literal('product'),
  inventoryItemId: z.string().uuid(),
  name:            z.string().max(200).optional(),
  quantity:        z.number().positive(),
  unitPrice:       z.number().min(0).optional(),
})

const saleItemSchema = z.discriminatedUnion('type', [serviceItemSchema, productItemSchema])

export const createSaleSchema = z.object({
  customerId:     z.string().uuid().optional(),
  items:          z.array(saleItemSchema).min(1, 'At least one item is required'),
  discountAmount: z.number().min(0).default(0),
  paymentMethod:  z.enum(PAYMENT_METHODS).optional(),
  notes:          z.string().max(500).optional(),
  soldAt:         z.string().datetime().optional(),
  force:          z.boolean().optional(),
})

export const cancelSaleSchema = z.object({}).optional()
