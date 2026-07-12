import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/auth.types';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards';
import { Rol } from '../common/enums';
import { SyncService } from './sync.service';
import { SyncPushDto } from './dto/sync-push.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  /**
   * Pull: Obtiene cambios desde un timestamp.
   * GET /sync/changes?since=2026-07-07T12:00:00Z&entity=despacho&limit=100
   */
  @Get('changes')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  async getChanges(
    @Req() req: Request & { user: AuthUser },
    @Query('since') since: string,
    @Query('entity') entity?: string,
    @Query('limit') limit?: string,
  ) {
    if (!since) {
      return { error: 'Se requiere el parámetro "since" (ISO8601)' };
    }
    return this.syncService.getChangesSince(since, req.user.orgId, {
      entity,
      terminalId: req.user.terminalId ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Push: Recibe cambios locales del frontend offline.
   * POST /sync/push
   * Body: { changes: [{ entity, entityId, action, data, clientTimestamp }] }
   */
  @Post('push')
  @Roles(Rol.ADMIN, Rol.DESPACHADOR)
  async pushChanges(
    @Req() req: Request & { user: AuthUser },
    @Body(new ValidationPipe({ whitelist: true })) pushDto: SyncPushDto,
  ) {
    if (!pushDto.changes?.length) {
      return {
        applied: 0,
        conflicts: [],
        serverTimestamp: new Date().toISOString(),
      };
    }

    const applied: string[] = [];
    const conflicts: Array<{ entityId: string; reason: string }> = [];

    for (const change of pushDto.changes) {
      try {
        await this.syncService.registerChange({
          organizationId: req.user.orgId,
          entity: change.entity,
          entityId: change.entityId,
          action: change.action as 'CREATE' | 'UPDATE' | 'DELETE',
          data: change.data ?? {},
          userId: req.user.id,
          terminalId: req.user.terminalId ?? undefined,
        });
        applied.push(change.entityId);
      } catch (error) {
        this.logger.error(
          `Error procesando cambio offline: ${(error as Error).message}`,
        );
        conflicts.push({
          entityId: change.entityId,
          reason: (error as Error).message,
        });
      }
    }

    return {
      applied: applied.length,
      conflicts,
      serverTimestamp: new Date().toISOString(),
    };
  }
}
