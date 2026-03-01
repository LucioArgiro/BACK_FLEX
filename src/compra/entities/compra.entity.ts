import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Entity('compras')
@Unique(['idUsuario', 'idCategoria']) // Evita que un usuario compre la misma categoría dos veces
export class Compra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  idUsuario: string;

  @Column()
  idCategoria: string;

  @Column({ nullable: true })
  idPago: string;

  @CreateDateColumn()
  fechaCompra: Date;

  // Relaciones
  @ManyToOne(() => Usuario, (usuario) => usuario.compras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idUsuario' })
  usuario: Usuario;

  @ManyToOne(() => Categoria, (categoria) => categoria.compras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idCategoria' })
  categoria: Categoria;
}