import { z } from 'zod'
import { APPOINTMENT_STATUSES } from './appointment.model.js'

export const createAppointmentSchema = z.object({
  customerId:    z.string().uuid(),
  serviceId:     z.string().uuid().optional(),
  resourceName:  z.string().max(100).optional(),
  title:         z.string().min(2).max(200),
  startAt:       z.string().datetime(),
  endAt:         z.string().datetime(),
  price:         z.number().min(0).optional(),
  notes:         z.string().max(1000).optional(),
  force:         z.boolean().default(false),  // bypass conflict check
}).refine(d => d.startAt < d.endAt, { message: 'startAt must be before endAt' })

export const updateAppointmentSchema = z.object({
  resourceName: z.string().max(100).optional(),
  title:        z.string().min(2).max(200).optional(),
  startAt:      z.string().datetime().optional(),
  endAt:        z.string().datetime().optional(),
  status:       z.enum(APPOINTMENT_STATUSES).optional(),
  price:        z.number().min(0).optional(),
  notes:        z.string().max(1000).optional(),
  force:        z.boolean().default(false),
})

export const agendaQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
})
