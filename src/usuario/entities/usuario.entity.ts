import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Compra } from '../../compra/entities/compra.entity';

export enum RolUsuario {
  ADMIN = 'ADMIN',
  CLIENTE = 'CLIENTE',
}

@Entity('usuarios')

export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  correo: string;

  @Column()
  contrasena: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ nullable: true })
  telefono: string;

  @Column({ type: 'date', nullable: true })
  fechaNacimiento: Date;

  @Column({ nullable: true })
  pais: string;

  @Column({ nullable: true })
  provincia: string;

  @Column({ nullable: true })
  ciudad: string;

  @Column({ nullable: true })
  direccion: string;

  @Column({ nullable: true })
  codigoPostal: string;

  @Column({ type: 'enum', enum: RolUsuario, default: RolUsuario.CLIENTE })
  rol: RolUsuario;

  @CreateDateColumn()
  fechaCreacion: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;

  // Relación: Un usuario puede tener muchas compras
  @OneToMany(() => Compra, (compra) => compra.usuario)
  compras: Compra[];
}