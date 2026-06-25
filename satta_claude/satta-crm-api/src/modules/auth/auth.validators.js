import { z } from 'zod'
import { SEGMENTS, BUSINESS_SIZE_RANGES } from './account.model.js'

const e164Phone = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone must be in E.164 format (e.g. +5511999999999)')

export const registerSchema = z.object({
  // Account fields
  businessName: z.string().min(2).max(100),
  document: z.string().min(11).max(18),         // validated in service
  phone: e164Phone,
  segment: z.enum(SEGMENTS),
  businessSizeRange: z.enum(BUSINESS_SIZE_RANGES).optional(),
  address: z.object({
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2).optional(),
  }).optional(),

  // Owner user fields
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
})

export const loginSchema = z.object({
  identifier: z.string().min(3),  // email or E.164 phone
  password: z.string().min(1),
})
