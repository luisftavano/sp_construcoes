import { z } from 'zod'

export const createServiceSchema = z.object({
  name:            z.string().min(2).max(100),
  description:     z.string().max(500).optional(),
  price:           z.number().min(0),
  durationMinutes: z.number().int().min(1).nullable().optional(),
  category:        z.string().max(50).optional(),
  active:          z.boolean().default(true),
})

export const updateServiceSchema = createServiceSchema.partial()
