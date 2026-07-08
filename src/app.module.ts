import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anden } from './entities/anden.entity';
import { Conductor } from './entities/conductor.entity';
import { Despacho } from './entities/despacho.entity';
import { DespachoAuditLog } from './entities/despacho-audit-log.entity';
import { Destino } from './entities/destino.entity';
import { LineaTransporte } from './entities/linea-transporte.entity';
import { Terminal } from './entities/terminal.entity';
import { SyncChangeLog } from './entities/sync-changelog.entity';
import { Unidad } from './entities/unidad.entity';
import { Usuario } from './entities/usuario.entity';
import { AuthModule } from './auth/auth.module';
import { LineasModule } from './lineas/lineas.module';
import { UnidadesModule } from './unidades/unidades.module';
import { ConductoresModule } from './conductores/conductores.module';
import { AndenesModule } from './andenes/andenes.module';
import { DestinosModule } from './destinos/destinos.module';
import { DespachosModule } from './despachos/despachos.module';
import { TableroModule } from './tablero/tablero.module';
import { ReportesModule } from './reportes/reportes.module';
import { SyncModule } from './sync/sync.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SeedModule } from './seed/seed.module';
import { ExternalModule } from './external/external.module';
import { CircuitBreakerModule } from './circuit-breaker';

const entities = [
  Terminal,
  LineaTransporte,
  Unidad,
  Conductor,
  Anden,
  Destino,
  Despacho,
  DespachoAuditLog,
  SyncChangeLog,
  Usuario,
];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // Rate limiting - 120 requests/minuto global
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 120,
    }]),

    // Cron jobs (limpieza semanal de sync changelog)
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const useSqlite = config.get<string>('USE_SQLITE') === 'true';
        if (useSqlite) {
          return {
            type: 'better-sqlite3' as const,
            database: config.get<string>('SQLITE_PATH') ?? 'termibus.sqlite',
            entities,
            synchronize: true,
          };
        }
        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST') ?? 'localhost',
          port: parseInt(config.get<string>('DB_PORT') ?? '5432', 10),
          username: config.get<string>('DB_USER') ?? 'termibus',
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
          entities,
          synchronize: config.get<string>('NODE_ENV') !== 'production',
          logging: config.get<string>('DB_LOGGING') === 'true',
        };
      },
    }),
    AuthModule,
    LineasModule,
    UnidadesModule,
    ConductoresModule,
    AndenesModule,
    DestinosModule,
    DespachosModule,
    TableroModule,
    ReportesModule,
    SyncModule,
    WebsocketModule,
    ExternalModule,
    CircuitBreakerModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
