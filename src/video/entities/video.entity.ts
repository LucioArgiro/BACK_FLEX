import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../../categoria/entities/categoria.entity';

export enum EstadoVideo {
  PROCESANDO = 'PROCESANDO',
  LISTO = 'LISTO',
  ERROR = 'ERROR',
}

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titulo: string;
  @Column({ nullable: true })
  assetId: string;

  @Column({ nullable: true })
  playbackId: string;

  @Column({ type: 'enum', enum: EstadoVideo, default: EstadoVideo.PROCESANDO })
  estado: EstadoVideo;
  
  @Column({ nullable: true })
  imagenUrl: string;
  @Column({ type: 'int' })
  orden: number;
  @Column({ type: 'int', nullable: true })
  duracion: number;
  @Column()
  idCategoria: string;
  @ManyToOne(() => Categoria, (categoria) => categoria.videos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idCategoria' })
  categoria: Categoria;
}