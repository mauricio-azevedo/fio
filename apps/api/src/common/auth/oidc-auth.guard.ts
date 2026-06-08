import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
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
  private readonly jwks = createRemoteJWKSet(
    new URL(`${this.env.KEYCLOAK_ISSUER}/protocol/openid-connect/certs`),
  );

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PrincipalRequest>();
    const token = this.extractBearerToken(request);

    if (token === null) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.env.KEYCLOAK_ISSUER,
        audience: this.env.KEYCLOAK_AUDIENCE,
      });

      request.principal = this.toPrincipal(payload as TokenClaims);
      return true;
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        throw new UnauthorizedException('Invalid bearer token');
      }

      throw error;
    }
  }

  private toPrincipal(claims: TokenClaims): AuthenticatedPrincipal {
    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new UnauthorizedException('Token subject is missing');
    }

    return {
      subject: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : null,
      displayName:
        typeof claims.name === 'string'
          ? claims.name
          : typeof claims.preferred_username === 'string'
            ? claims.preferred_username
            : null,
    };
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
