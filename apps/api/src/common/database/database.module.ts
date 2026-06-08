import { Global, Module } from '@nestjs/common';
import { PrismaClientService } from './prisma-client.service.js';

@Global()
@Module({
  providers: [PrismaClientService],
  exports: [PrismaClientService],
})
export class DatabaseModule {}
