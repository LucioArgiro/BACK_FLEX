import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Generated } from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity';

@Entity('comprobantes')
@Index(['grupoPagoId'])
@Index(['numeroSecuencial'])
export class Comprobante {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  @Generated('increment')
  numeroSecuencial!: number;

  @Column({ unique: true })
  numeroRecibo!: string;


  @Column()
  grupoPagoId!: string;

  @Column({ type: 'varchar', nullable: true })
  urlPdf!: string | null;

  @CreateDateColumn()
  fechaEmision!: Date;

  @Column()
  idUsuario!: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.comprobantes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idUsuario' })
  usuario!: Usuario;
}