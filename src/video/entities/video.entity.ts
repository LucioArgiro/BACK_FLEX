import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Entity('videos')
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  titulo: string;

  // 👇 ID de Mux para tareas de administración (como eliminar el video)
  @Column()
  assetId: string; 

  // 👇 ID de Mux exclusivo para el reproductor del Frontend
  @Column()
  playbackId: string;

  // 👇 URL de Cloudinary para la portada del video (opcional al inicio)
  @Column({ nullable: true })
  imagenUrl: string;

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