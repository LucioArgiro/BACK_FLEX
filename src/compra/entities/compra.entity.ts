import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

// 👇 Definimos los estados posibles del pago
export enum EstadoPago {
  PENDIENTE = 'PENDIENTE',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

// 👇 Definimos las pasarelas que usamos
export enum PlataformaPago {
  MERCADOPAGO = 'MERCADOPAGO',
  PAYPAL = 'PAYPAL',
}

@Entity('compras')
@Unique(['idUsuario', 'idCategoria'])
export class Compra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  idUsuario: string;

  @Column()
  idCategoria: string;
  
  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  estado: EstadoPago;

  @Column({ type: 'enum', enum: PlataformaPago, nullable: true })
  plataforma: PlataformaPago;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  montoCobrado: number;

  @Column({ type: 'varchar', length: 3, nullable: true })
  moneda: string; 

  @Column({ nullable: true })
  idPagoExterno: string;  

  @Column({ nullable: true })
  urlPago: string; 

  @CreateDateColumn()
  fechaCompra: Date;

 
  @ManyToOne(() => Usuario, (usuario) => usuario.compras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idUsuario' })
  usuario: Usuario;

  @ManyToOne(() => Categoria, (categoria) => categoria.compras, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'idCategoria' })
  categoria: Categoria;
}