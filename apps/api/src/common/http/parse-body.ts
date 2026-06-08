import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

export function parseBody<TSchema extends z.ZodType>(
  schema: TSchema,
  body: unknown,
): z.infer<TSchema> {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestException({
      message: 'Request body validation failed',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  return result.data;
}
