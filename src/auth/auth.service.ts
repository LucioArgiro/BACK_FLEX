import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuario/entities/usuario.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUsuarioDto } from 'src/usuario/dto/create-usuario.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  async registrar(dto: CreateUsuarioDto) {
    const usuarioExiste = await this.usuarioRepository.findOne({
      where: { correo: dto.correo },
    });

    if (usuarioExiste) {
      throw new BadRequestException('El correo ya está registrado');
    }
    const salt = await bcrypt.genSalt(10);
    const contrasenaHasheada = await bcrypt.hash(dto.contrasena, salt);
    const nuevoUsuario = this.usuarioRepository.create({
      ...dto,
      contrasena: contrasenaHasheada,
    });
    await this.usuarioRepository.save(nuevoUsuario);
    try {
      await this.emailQueue.add('enviar-bienvenida', {
        correo: nuevoUsuario.correo,
        nombre: nuevoUsuario.nombre,
      });
      console.log('📦 Tarea de correo encolada en Redis con éxito');
    } catch (error) {
      console.error('No se pudo encolar el correo:', error);
    }
    const { contrasena, ...usuarioLimpio } = nuevoUsuario;

    return {
      mensaje: 'Usuario registrado exitosamente',
      usuario: usuarioLimpio
    };
  }

  async login(correo: string, contrasenaPlana: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });
    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas');
    const esValida = await bcrypt.compare(contrasenaPlana, usuario.contrasena);
    if (!esValida) throw new UnauthorizedException('Credenciales incorrectas');
    const payload = { sub: usuario.id, correo: usuario.correo, rol: usuario.rol };
    const token = await this.jwtService.signAsync(payload);
    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.correo,
        rol: usuario.rol
      }
    };
  }
}