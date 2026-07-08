import { BadRequestException } from '@nestjs/common';

export class UnidadNoDisponibleError extends BadRequestException {
  constructor(unidadId: string, estadoActual: string) {
    super({
      statusCode: 400,
      error: 'Unidad no disponible',
      message: `La unidad ${unidadId} no está disponible (estado: ${estadoActual}).`,
      unidadId,
      estadoActual,
    });
    this.name = 'UnidadNoDisponibleError';
  }
}
