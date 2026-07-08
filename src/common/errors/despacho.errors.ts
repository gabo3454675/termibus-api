import { NotFoundException, BadRequestException } from '@nestjs/common';

/**
 * Error lanzado cuando se intenta una transición de estado inválida.
 *
 * Ejemplo de uso:
 * ```typescript
 * throw new DespachoEstadoInvalidoError(
 *   '402',
 *   EstadoDespacho.EN_COLA,
 *   'despachar',
 *   ['asignar', 'cancelar'],
 * );
 * ```
 *
 * ¿Por qué una excepción personalizada en lugar de BadRequestException?
 *   - El frontend necesita saber qué transiciones SON válidas para
 *     mostrar botones contextuales.
 *   - El mensaje en español incluye acción correctiva para el operador.
 */
export class DespachoEstadoInvalidoError extends BadRequestException {
  constructor(
    public readonly despachoId: string,
    public readonly estadoActual: string,
    public readonly eventoSolicitado: string,
    public readonly transicionesPermitidas: string[],
  ) {
    super({
      statusCode: 400,
      error: 'Transición inválida',
      message:
        `No se puede aplicar "${eventoSolicitado}" al despacho ${despachoId} ` +
        `porque está en estado "${estadoActual}". ` +
        `Acciones permitidas: ${transicionesPermitidas.join(', ')}.`,
      despachoId,
      estadoActual,
      transicionesPermitidas,
    });
    this.name = 'DespachoEstadoInvalidoError';
  }
}

/**
 * Error lanzado cuando un recurso del dominio no se encuentra.
 * Incluye el tipo de recurso y el ID para mejor trazabilidad.
 */
export class RecursoNoEncontradoError extends NotFoundException {
  constructor(
    public readonly tipo: string,
    public readonly id: string,
    detalle?: string,
  ) {
    super({
      statusCode: 404,
      error: 'Recurso no encontrado',
      message: detalle ?? `${tipo} con ID ${id} no encontrado.`,
      tipo,
      id,
    });
    this.name = 'RecursoNoEncontradoError';
  }
}

/**
 * Error lanzado cuando un andén no está disponible para asignación.
 */
export class AndenNoDisponibleError extends BadRequestException {
  constructor(
    public readonly andenId: string,
    public readonly estadoActual: string,
  ) {
    super({
      statusCode: 400,
      error: 'Andén no disponible',
      message: `El andén ${andenId} no está disponible (estado: ${estadoActual}).`,
      andenId,
      estadoActual,
    });
    this.name = 'AndenNoDisponibleError';
  }
}

/**
 * Error lanzado cuando se intenta operar sobre un despacho
 * que no pertenece al conductor autenticado.
 */
export class DespachoNoPerteneceError extends BadRequestException {
  constructor(despachoId: string, conductorId: string) {
    super({
      statusCode: 403,
      error: 'Acceso denegado',
      message: `El despacho ${despachoId} no pertenece al conductor ${conductorId}.`,
      despachoId,
    });
    this.name = 'DespachoNoPerteneceError';
  }
}
