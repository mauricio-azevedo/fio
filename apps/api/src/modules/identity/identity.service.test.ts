import { describe, expect, it } from 'vitest';
import type { AuthenticatedPrincipal } from '../../common/auth/principal.js';
import { IdentityService } from './identity.service.js';

function createPrismaStub() {
  return {
    account: {
      upsert: async (args: unknown) => {
        expect(args).toEqual({
          where: {
            keycloakSubject: 'subject-123',
          },
          update: {
            email: 'ana@example.com',
            displayName: 'Ana',
          },
          create: {
            keycloakSubject: 'subject-123',
            email: 'ana@example.com',
            displayName: 'Ana',
          },
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        });

        return {
          id: 'account-123',
          email: 'ana@example.com',
          displayName: 'Ana',
        };
      },
    },
  };
}

describe('IdentityService', () => {
  it('upserts account by external subject', async () => {
    const service = new IdentityService(createPrismaStub() as never);
    const principal: AuthenticatedPrincipal = {
      subject: 'subject-123',
      email: 'ana@example.com',
      displayName: 'Ana',
    };

    await expect(service.findOrCreateAccount(principal)).resolves.toEqual({
      id: 'account-123',
      email: 'ana@example.com',
      displayName: 'Ana',
    });
  });
});
