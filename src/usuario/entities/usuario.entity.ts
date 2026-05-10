import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Compra } from '../../compra/entities/compra.entity';
import { Comprobante } from '../../comprobante/entities/comprobante.entity';

export enum RolUsuario {
  ADMIN = 'ADMIN',
  CLIENTE = 'CLIENTE',
}

@Entity('usuarios')

export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  correo!: string;

  @Column()
  contrasena!: string;

  @Column()
  nombre!: string;

  @Column()
  apellido!: string;

  @Column({ nullable: true })
  telefono!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  fechaNacimiento!: string;

  @Column({ nullable: true })
  documentoIdentidad!: string;

  @Column({ nullable: true })
  pais!: string;

  @Column({ nullable: true })
  provincia!: string;

  @Column({ nullable: true })
  ciudad!: string;

  @Column({ nullable: true })
  direccion!: string;

  @Column({ nullable: true })
  codigoPostal!: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CLIENTE })
  rol!: RolUsuario;

  @Column({ default: false })
  correoVerificado!: boolean;

  @Column({ type: 'varchar', nullable: true })
  codigoOtp!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiracionOtp!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  idSesionActual!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tokenRecuperacion!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  expiracionRecuperacion!: Date | null;

  @CreateDateColumn()
  fechaCreacion!: Date;

  @UpdateDateColumn()
  fechaActualizacion!: Date;

  @OneToMany(() => Compra, (compra) => compra.usuario)
  compras!: Compra[];

  @OneToMany(() => Comprobante, (comprobante) => comprobante.usuario)
  comprobantes!: Comprobante[];
}