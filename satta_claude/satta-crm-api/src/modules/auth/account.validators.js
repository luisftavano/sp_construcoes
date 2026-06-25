import { z } from 'zod'

export const updateAccountSettingsSchema = z.object({
  inventory: z.object({
    enabled: z.boolean(),
  }).partial().optional(),
  sales: z.object({
    allowItemized: z.boolean(),
  }).partial().optional(),
  kango: z.object({
    autoReplyEnabled:         z.boolean(),
    followUpInactiveEnabled:  z.boolean(),
    inactiveDaysThreshold:    z.number().int().min(1).max(365),
    winbackOfferText:         z.string().max(500),
  }).partial().optional(),
})

export const updateAccountInfoSchema = z.object({
  businessName:     z.string().min(2).max(100),
  phone:            z.string().regex(/^\+[1-9]\d{7,14}$/),
  businessSizeRange: z.enum(['1', '2-5', '6-15', '16+']),
  address: z.object({
    zipCode: z.string(),
    street:  z.string(),
    number:  z.string(),
    city:    z.string(),
    state:   z.string(),
  }).partial(),
}).partial()
