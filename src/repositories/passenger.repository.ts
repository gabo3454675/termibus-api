import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not } from 'typeorm';
import { EstadoAbordaje } from '../common/enums';
import { Abordaje } from '../entities/operations/abordaje.entity';
import { Pasajero } from '../entities/operations/pasajero.entity';
import { SesionConductor } from '../entities/operations/sesion-conductor.entity';

@Injectable()
export class PassengerRepository {
  constructor(
    @InjectRepository(Pasajero)
    private readonly pasajeroRepo: Repository<Pasajero>,
    @InjectRepository(Abordaje)
    private readonly abordajeRepo: Repository<Abordaje>,
    @InjectRepository(SesionConductor)
    private readonly sesionRepo: Repository<SesionConductor>,
  ) {}

  async findPasajeroByCedula(
    cedula: string,
    organizationId: string,
  ): Promise<Pasajero | null> {
    return this.pasajeroRepo.findOne({
      where: { cedula, organization_id: organizationId },
    });
  }

  async findPasajeroByQrToken(qrToken: string): Promise<Pasajero | null> {
    return this.pasajeroRepo.findOne({ where: { qr_token: qrToken } });
  }

  async findAbordajesByDespacho(despachoId: string): Promise<Abordaje[]> {
    return this.abordajeRepo.find({
      where: { despacho_id: despachoId },
    });
  }

  async findSesionActiva(token: string): Promise<SesionConductor | null> {
    return this.sesionRepo.findOne({
      where: {
        token,
        activa: true,
        expira_en: MoreThan(new Date()),
      },
    });
  }

  async contarOcupacion(despachoId: string): Promise<number> {
    return this.abordajeRepo.count({
      where: {
        despacho_id: despachoId,
        estado: Not(EstadoAbordaje.CANCELADO),
      },
    });
  }

  get rawPasajero(): Repository<Pasajero> {
    return this.pasajeroRepo;
  }

  get rawAbordaje(): Repository<Abordaje> {
    return this.abordajeRepo;
  }

  get rawSesion(): Repository<SesionConductor> {
    return this.sesionRepo;
  }
}
