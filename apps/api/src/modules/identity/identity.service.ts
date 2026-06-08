import { Injectable } from '@nestjs/common';
import { PrismaClientService } from '../../common/database/prisma-client.service.js';
import type { AuthenticatedPrincipal } from '../../common/auth/principal.js';

export interface AccountView {
  id: string;
  email: string | null;
  displayName: string | null;
}

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaClientService) {}

  async findOrCreateAccount(principal: AuthenticatedPrincipal): Promise<AccountView> {
    const account = await this.prisma.account.upsert({
      where: {
        keycloakSubject: principal.subject,
      },
      update: {
        email: principal.email,
        displayName: principal.displayName,
      },
      create: {
        keycloakSubject: principal.subject,
        email: principal.email,
        displayName: principal.displayName,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    return account;
  }
}
