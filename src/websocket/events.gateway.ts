import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import {
  DESPACHO_EVENTS,
  DespachoEventPayload,
  DespachoEstadoCambiadoPayload,
} from '../events/despacho.events';
import { UNIDAD_EVENTS, UnidadEstadoCambiadoPayload } from '../events/unidad.events';
import { Anden } from '../entities/anden.entity';

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'] },
  namespace: '/ws',
})
export class EventsGateway implements OnGatewayConnection, OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
  ) {}

  onModuleInit() {
    // Consumir eventos de despacho (wildcard 'despacho.*')
    this.eventEmitter.on('despacho.*', (payload: DespachoEventPayload) => {
      this.server.emit(`despacho:${payload.estado}`, payload);
    });

    // Consumir evento de estado cambiado de despacho
    this.eventEmitter.on(
      DESPACHO_EVENTS.ESTADO_CAMBIADO,
      (payload: DespachoEstadoCambiadoPayload) => {
        this.server.emit('despacho:estado_cambiado', payload);
      },
    );

    // Consumir eventos de cambio de estado de unidad
    this.eventEmitter.on(
      UNIDAD_EVENTS.ESTADO_CAMBIADO,
      (payload: UnidadEstadoCambiadoPayload) => {
        this.server.emit('unidad:estado_cambiado', payload);
      },
    );

    // Consumir eventos de andén actualizado
    this.eventEmitter.on(
      'anden.updated',
      (payload: { anden: Anden; despacho: unknown }) => {
        this.server.emit('anden:updated', {
          anden_id: payload.anden.id,
          numero: payload.anden.numero,
          estado: payload.anden.estado,
          despacho_actual: payload.despacho,
        });
      },
    );

    // Consumir eventos de cola actualizada
    this.eventEmitter.on(
      'cola.updated',
      (payload: { terminalId: string; data: unknown }) => {
        this.server.to(`terminal:${payload.terminalId}`).emit('cola:updated', payload.data);
      },
    );

    // Consumir evento de conductor confirmado
    this.eventEmitter.on('conductor.confirmado', (payload: unknown) => {
      this.server.emit('conductor:confirmado', payload);
    });

    // Abordaje de pasajero — actualiza cupos en salidas
    this.eventEmitter.on(
      'abordaje.registrado',
      (payload: {
        despacho_id: string;
        terminal_id: string;
        ocupacion: number;
        capacidad: number;
        pasajero: unknown;
      }) => {
        this.server.emit('abordaje:registrado', payload);
        this.server.to(`terminal:${payload.terminal_id}`).emit('abordaje:registrado', payload);
      },
    );
  }

  handleConnection(client: Socket) {
    // Extraer token de auth o query
    const token =
      client.handshake.auth?.token ||
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<{
        terminal_id?: string;
        rol?: string;
      }>(token);

      // Asignar rooms según payload verificado
      if (payload.terminal_id) {
        client.join(`terminal:${payload.terminal_id}`);
      }

      // Solo ADMIN y DESPACHADOR pueden acceder a tablero
      if (payload.rol === 'ADMIN' || payload.rol === 'DESPACHADOR') {
        client.join('tablero');
      }
    } catch {
      client.disconnect();
    }
  }

}
