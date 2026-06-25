import { z } from 'zod'

export const createRevenueSchema = z.object({
  description: z.string().min(2).max(200),
  amount:      z.number().min(0),
  category:    z.string().max(50).optional(),
  receivedAt:  z.string().datetime().optional(),
})
