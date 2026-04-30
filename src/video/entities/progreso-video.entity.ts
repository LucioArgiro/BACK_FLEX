import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Video } from './video.entity';

@Entity('progreso_videos')
@Unique(['usuario', 'video']) 
export class ProgresoVideo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuarioId' })
  usuario!: Usuario;

  @ManyToOne(() => Video, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'videoId' })
  video!: Video;

  @CreateDateColumn()
  fechaCompletado!: Date;
}