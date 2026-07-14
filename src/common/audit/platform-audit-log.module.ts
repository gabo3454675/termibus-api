import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuditLog } from '../../entities/platform/platform-audit-log.entity';
import { PlatformAuditLogService } from './platform-audit-log.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([PlatformAuditLog])],
  providers: [PlatformAuditLogService],
  exports: [PlatformAuditLogService],
})
export class PlatformAuditLogModule {}
