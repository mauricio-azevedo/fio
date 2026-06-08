import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedPrincipal } from './principal.js';

interface PrincipalRequest extends Request {
  principal?: AuthenticatedPrincipal;
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<PrincipalRequest>();

    if (request.principal === undefined) {
      throw new Error('Authenticated principal missing from request');
    }

    return request.principal;
  },
);
