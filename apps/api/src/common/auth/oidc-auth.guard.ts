import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { loadEnv } from '../config/env.js';
import type { AuthenticatedPrincipal } from './principal.js';

interface PrincipalRequest extends Request {
  principal?: AuthenticatedPrincipal;
}

interface TokenClaims {
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
}

@Injectable()
export class OidcAuthGuard implements CanActivate {
  private readonly env = loadEnv();
  private readonly jwks = createRemoteJWKSet(new URL(`${this.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`));

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PrincipalRequest>();
    const token = this.extractBearerToken(request);

    if (token === null) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.env.KEYCLOAK_ISSUER,
      audience: this.env.KEYCLOAK_AUDIENCE,
    });

    const claims = payload as TokenClaims;

    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new UnauthorizedException('Token subject is missing');
    }

    request.principal = {
      subject: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : null,
      displayName:
        typeof claims.name === 'string'
          ? claims.name
          : typeof claims.preferred_username === 'string'
            ? claims.preferred_username
            : null,
    };

    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (authorization === undefined) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
      return null;
    }

    return token;
  }
}
