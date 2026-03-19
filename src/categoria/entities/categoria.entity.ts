import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Video } from '../../video/entities/video.entity';
import { Compra } from '../../compra/entities/compra.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  @Column()
  titulo: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcionBreve: string;

  @Column({ type: 'text', nullable: true })
  descripcionDetallada: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ nullable: true })
  playbackIdMuestra: string;

  @Column({ nullable: true })
  imagenHero: string;

  @Column({ nullable: true })
  imagenTarjeta: string;

  @Column({ type: 'simple-json', nullable: true })
  beneficios: { titulo: string; descripcion: string; icono?: string }[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @OneToMany(() => Video, (video) => video.categoria)
  videos: Video[];

  @OneToMany(() => Compra, (compra) => compra.categoria)
  compras: Compra[];
}