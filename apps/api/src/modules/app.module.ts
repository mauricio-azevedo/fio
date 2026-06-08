import { Module } from '@nestjs/common';
import { DatabaseModule } from '../common/database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { RelationshipsModule } from './relationships/relationships.module.js';

@Module({
  imports: [DatabaseModule, HealthModule, IdentityModule, RelationshipsModule],
})
export class AppModule {}
