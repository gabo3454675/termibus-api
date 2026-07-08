import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Anden } from '../entities/anden.entity';
import { Despacho } from '../entities/despacho.entity';
import { DespachoAuditLog } from '../entities/despacho-audit-log.entity';
import { Unidad } from '../entities/unidad.entity';
import { AuditLogService } from './audit-log.service';
import { DespachosController } from './despachos.controller';
import { DespachosService } from './despachos.service';
import { DispatchStateMachine } from './state-machine/dispatch-state-machine';
import { FifoDispatchStrategy } from './strategies/fifo.strategy';
import { FullBusFirstStrategy } from './strategies/full-bus-first.strategy';
import { LinePriorityStrategy } from './strategies/line-priority.strategy';
import type { DispatchStrategy } from './strategies/dispatch-strategy.interface';

@Module({
  imports: [
    TypeOrmModule.forFeature([Despacho, Anden, Unidad, DespachoAuditLog]),
    ConfigModule,
  ],
  controllers: [DespachosController],
  providers: [
    DespachosService,
    AuditLogService,
    DispatchStateMachine,
    FifoDispatchStrategy,
    FullBusFirstStrategy,
    LinePriorityStrategy,
    {
      provide: 'DISPATCH_STRATEGY',
      useFactory: (
        fifo: FifoDispatchStrategy,
        fullBus: FullBusFirstStrategy,
        linePrio: LinePriorityStrategy,
        config: ConfigService,
      ): DispatchStrategy => {
        const name = config.get<string>('DISPATCH_STRATEGY', 'fifo');
        switch (name) {
          case 'full-bus-first':
            return fullBus;
          case 'line-priority':
            return linePrio;
          default:
            return fifo;
        }
      },
      inject: [
        FifoDispatchStrategy,
        FullBusFirstStrategy,
        LinePriorityStrategy,
        ConfigService,
      ],
    },
  ],
  exports: [DespachosService],
})
export class DespachosModule {}
