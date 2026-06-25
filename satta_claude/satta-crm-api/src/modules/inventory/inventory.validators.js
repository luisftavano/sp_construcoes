import { z } from 'zod'

const unitEnum = z.enum(['unidade', 'kg', 'litro', 'caixa', 'pacote'])

export const createInventoryItemSchema = z.object({
  name:          z.string().min(1).max(100),
  brand:         z.string().max(100).optional(),
  category:      z.string().max(50).optional(),
  quantity:      z.number().min(0).default(0),
  unit:          unitEnum.default('unidade'),
  minStockAlert: z.number().min(0).optional(),
  costPrice:     z.number().min(0).optional(),
  sellPrice:     z.number().min(0).optional(),
  notes:         z.string().max(500).optional(),
})

export const updateInventoryItemSchema = createInventoryItemSchema.partial()

export const adjustQuantitySchema = z.object({
  quantityChange: z.number(), // negative values reduce stock
})
