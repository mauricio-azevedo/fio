import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { OidcAuthGuard } from '../../common/auth/oidc-auth.guard.js';
import { CurrentPrincipal } from '../../common/auth/current-principal.decorator.js';
import type { AuthenticatedPrincipal } from '../../common/auth/principal.js';
import { parseBody } from '../../common/http/parse-body.js';
import { IdentityService } from '../identity/identity.service.js';
import { createRelationshipSchema, updateRelationshipSchema } from './relationship.schemas.js';
import { RelationshipsService } from './relationships.service.js';
import type { RelationshipView } from './relationships.service.js';

@Controller('relationships')
@UseGuards(OidcAuthGuard)
export class RelationshipsController {
  constructor(
    @Inject(IdentityService) private readonly identityService: IdentityService,
    @Inject(RelationshipsService) private readonly relationshipsService: RelationshipsService,
  ) {}

  @Get()
  async list(@CurrentPrincipal() principal: AuthenticatedPrincipal): Promise<RelationshipView[]> {
    const account = await this.identityService.findOrCreateAccount(principal);

    return this.relationshipsService.list(account.id);
  }

  @Post()
  async create(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() body: unknown,
  ): Promise<RelationshipView> {
    const account = await this.identityService.findOrCreateAccount(principal);
    const input = parseBody(createRelationshipSchema, body);

    return this.relationshipsService.create(account.id, input);
  }

  @Get(':relationshipId')
  async get(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('relationshipId') relationshipId: string,
  ): Promise<RelationshipView> {
    const account = await this.identityService.findOrCreateAccount(principal);

    return this.relationshipsService.get(account.id, relationshipId);
  }

  @Patch(':relationshipId')
  async update(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('relationshipId') relationshipId: string,
    @Body() body: unknown,
  ): Promise<RelationshipView> {
    const account = await this.identityService.findOrCreateAccount(principal);
    const input = parseBody(updateRelationshipSchema, body);

    return this.relationshipsService.update(account.id, relationshipId, input);
  }

  @Delete(':relationshipId')
  @HttpCode(204)
  async delete(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('relationshipId') relationshipId: string,
  ): Promise<void> {
    const account = await this.identityService.findOrCreateAccount(principal);

    await this.relationshipsService.delete(account.id, relationshipId);
  }
}
