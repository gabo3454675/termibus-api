import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('destino')
export class Destino {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string;

  @Column({ nullable: true })
  ruta: string;

  @Column({ type: 'int', default: 60 })
  duracion_estimada_min: number;

  @Column({ default: true })
  activo: boolean;
}
