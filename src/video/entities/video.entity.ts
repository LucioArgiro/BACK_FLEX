import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titulo: string;

  @Column()
  idCloudflare: string;

  @Column({ type: 'int' })
  orden: number;

  @Column({ type: 'int', nullable: true })
  duracion: number;

  @Column()
  idCategoria: string;

  // Relación: Muchos videos pertenecen a una categoría
  @ManyToOne(() => Categoria, (categoria) => categoria.videos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idCategoria' })
  categoria: Categoria;
}