import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Video } from '../../video/entities/video.entity';
import { Compra } from '../../compra/entities/compra.entity';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 }) // Mejor que Float para dinero
  precio: number;

  @Column({ nullable: true })
  urlVideoMuestra: string;

  @CreateDateColumn()
  fechaCreacion: Date;

  // Relaciones
  @OneToMany(() => Video, (video) => video.categoria)
  videos: Video[];

  @OneToMany(() => Compra, (compra) => compra.categoria)
  compras: Compra[];
}