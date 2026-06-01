import { z } from 'zod';

export const createNotificationSchema = z.object({
  recipientId: z.string().optional(),
  recipientEmail: z.string().email('Invalid email address').optional(),
  type: z.enum([
    'LIKE',
    'COMMENT',
    'FOLLOW',
    'MESSAGE',
    'SYSTEM',
    'ALERT',
    'DEPLOYMENT',
    'PAYMENT',
  ]),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  title: z.string().min(1, 'Title is required').max(150, 'Title is too long'),
  message: z.string().min(1, 'Message is required'),
  metadata: z.record(z.any()).optional().nullable(),
}).refine((data) => data.recipientId || data.recipientEmail, {
  message: 'Either recipientId or recipientEmail must be provided',
  path: ['recipientId'],
});
