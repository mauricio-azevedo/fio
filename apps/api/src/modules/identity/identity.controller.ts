import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentPrincipal } from '../../common/auth/current-principal.decorator.js';
import { OidcAuthGuard } from '../../common/auth/oidc-auth.guard.js';
import type { AuthenticatedPrincipal } from '../../common/auth/principal.js';
import { IdentityService, type AccountView } from './identity.service.js';

@Controller('me')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  @UseGuards(OidcAuthGuard)
  async getMe(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<AccountView> {
    return this.identityService.findOrCreateAccount(principal);
  }
}
