import { z } from 'zod'

export const createCustomerSchema = z.object({
  name:         z.string().min(2).max(100),
  email:        z.string().email().optional(),
  phone:        z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  document:     z.string().min(11).max(18).optional(),
  notes:        z.string().max(500).optional(),
  customFields: z.record(z.any()).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
