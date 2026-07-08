import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { EstadoDespacho } from '../../common/enums';
import { DESPACHO_EVENTS, DespachoEstadoCambiadoPayload } from '../../events/despacho.events';
import { DispatchStateMachine } from './dispatch-state-machine';

describe('DispatchStateMachine', () => {
  let machine: DispatchStateMachine;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchStateMachine,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    machine = module.get<DispatchStateMachine>(DispatchStateMachine);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('transition', () => {
    it('should allow EN_COLA → ASIGNADO via "asignar"', () => {
      const result = machine.transition(EstadoDespacho.EN_COLA, 'asignar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.ASIGNADO);
    });

    it('should allow EN_COLA → CANCELADO via "cancelar"', () => {
      const result = machine.transition(EstadoDespacho.EN_COLA, 'cancelar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.CANCELADO);
    });

    it('should allow EN_COLA → RETRASADO via "retrasar"', () => {
      const result = machine.transition(EstadoDespacho.EN_COLA, 'retrasar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.RETRASADO);
    });

    it('should allow ASIGNADO → EN_ANDEN via "confirmar"', () => {
      const result = machine.transition(EstadoDespacho.ASIGNADO, 'confirmar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.EN_ANDEN);
    });

    it('should allow ASIGNADO → DESPACHADO via "despachar"', () => {
      const result = machine.transition(EstadoDespacho.ASIGNADO, 'despachar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.DESPACHADO);
    });

    it('should allow ASIGNADO → CANCELADO via "cancelar"', () => {
      const result = machine.transition(EstadoDespacho.ASIGNADO, 'cancelar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.CANCELADO);
    });

    it('should allow ASIGNADO → RETRASADO via "retrasar"', () => {
      const result = machine.transition(EstadoDespacho.ASIGNADO, 'retrasar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.RETRASADO);
    });

    it('should allow ASIGNADO → ASIGNADO via "reasignar" (self-transition)', () => {
      const result = machine.transition(EstadoDespacho.ASIGNADO, 'reasignar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.ASIGNADO);
    });

    it('should allow EN_ANDEN → DESPACHADO via "despachar"', () => {
      const result = machine.transition(EstadoDespacho.EN_ANDEN, 'despachar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.DESPACHADO);
    });

    it('should allow EN_ANDEN → CANCELADO via "cancelar"', () => {
      const result = machine.transition(EstadoDespacho.EN_ANDEN, 'cancelar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.CANCELADO);
    });

    it('should allow EN_ANDEN → RETRASADO via "retrasar"', () => {
      const result = machine.transition(EstadoDespacho.EN_ANDEN, 'retrasar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.RETRASADO);
    });

    it('should allow DESPACHADO → EN_RUTA via "salida_ruta"', () => {
      const result = machine.transition(EstadoDespacho.DESPACHADO, 'salida_ruta', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.EN_RUTA);
    });

    it('should allow DESPACHADO → COMPLETADO via "completar"', () => {
      const result = machine.transition(EstadoDespacho.DESPACHADO, 'completar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.COMPLETADO);
    });

    it('should allow EN_RUTA → COMPLETADO via "completar"', () => {
      const result = machine.transition(EstadoDespacho.EN_RUTA, 'completar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.COMPLETADO);
    });

    it('should allow RETRASADO → EN_COLA via "reasignar"', () => {
      const result = machine.transition(EstadoDespacho.RETRASADO, 'reasignar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.EN_COLA);
    });

    it('should allow RETRASADO → CANCELADO via "cancelar"', () => {
      const result = machine.transition(EstadoDespacho.RETRASADO, 'cancelar', {
        despachoId: 'd1',
      });
      expect(result).toBe(EstadoDespacho.CANCELADO);
    });

    it('should throw for terminal states', () => {
      expect(() =>
        machine.transition(EstadoDespacho.CANCELADO, 'cancelar', { despachoId: 'd1' }),
      ).toThrow(BadRequestException);

      expect(() =>
        machine.transition(EstadoDespacho.COMPLETADO, 'completar', { despachoId: 'd1' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid transition', () => {
      expect(() =>
        machine.transition(EstadoDespacho.EN_COLA, 'completar', { despachoId: 'd1' }),
      ).toThrow(BadRequestException);
    });

    it('should emit ESTADO_CAMBIADO event on valid transition', () => {
      machine.transition(EstadoDespacho.EN_COLA, 'asignar', {
        despachoId: 'd1',
        usuarioId: 'u1',
        razon: 'test',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        DESPACHO_EVENTS.ESTADO_CAMBIADO,
        expect.objectContaining({
          despachoId: 'd1',
          estadoAnterior: EstadoDespacho.EN_COLA,
          estadoNuevo: EstadoDespacho.ASIGNADO,
          usuarioId: 'u1',
          razon: 'test',
        }),
      );
    });

    it('should include timestamp in the event payload', () => {
      const before = Date.now();
      machine.transition(EstadoDespacho.EN_COLA, 'asignar', { despachoId: 'd1' });
      const after = Date.now();

      const call = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const payload: DespachoEstadoCambiadoPayload = call[1];
      expect(payload.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(payload.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('should not emit event for invalid transition', () => {
      try {
        machine.transition(EstadoDespacho.CANCELADO, 'asignar', { despachoId: 'd1' });
      } catch {
        // Expected
      }

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transitions', () => {
      expect(machine.canTransition(EstadoDespacho.EN_COLA, 'asignar')).toBe(true);
      expect(machine.canTransition(EstadoDespacho.ASIGNADO, 'confirmar')).toBe(true);
      expect(machine.canTransition(EstadoDespacho.EN_ANDEN, 'despachar')).toBe(true);
    });

    it('should return false for invalid transitions', () => {
      expect(machine.canTransition(EstadoDespacho.EN_COLA, 'salida_ruta')).toBe(false);
      expect(machine.canTransition(EstadoDespacho.DESPACHADO, 'asignar')).toBe(false);
      expect(machine.canTransition(EstadoDespacho.COMPLETADO, 'completar')).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return all event keys for a given state', () => {
      const events = machine.getAllowedTransitions(EstadoDespacho.EN_COLA);
      expect(events).toEqual(['asignar', 'cancelar', 'retrasar']);
    });

    it('should return empty array for terminal states', () => {
      expect(machine.getAllowedTransitions(EstadoDespacho.CANCELADO)).toEqual([]);
      expect(machine.getAllowedTransitions(EstadoDespacho.COMPLETADO)).toEqual([]);
    });
  });
});
