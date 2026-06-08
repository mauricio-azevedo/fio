import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { RelationshipsController } from './relationships.controller.js';
import { RelationshipsService } from './relationships.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService],
})
export class RelationshipsModule {}
