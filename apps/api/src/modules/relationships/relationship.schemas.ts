import { z } from 'zod';

const relationshipCircleSchema = z.enum(['core', 'close', 'casual', 'professional', 'family']);
const preferredChannelSchema = z.enum(['message', 'call', 'in_person', 'email']);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');

export const createRelationshipSchema = z.object({
  name: z.string().trim().min(1).max(160),
  circle: relationshipCircleSchema,
  preferredChannel: preferredChannelSchema,
  cadenceDays: z.number().int().min(1).max(3650),
  lastContactOn: isoDateSchema.nullable().optional(),
  pausedUntil: isoDateSchema.nullable().optional(),
});

export const updateRelationshipSchema = createRelationshipSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided');

export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type UpdateRelationshipInput = z.infer<typeof updateRelationshipSchema>;
