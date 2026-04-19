import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuario/entities/usuario.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUsuarioDto } from 'src/usuario/dto/create-usuario.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CaptchaService } from './captcha.service';
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly captchaService: CaptchaService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) { }

 async registrar(dto: CreateUsuarioDto) {
    await this.captchaService.validarToken(dto.captchaToken);
    const { captchaToken, ...datosUsuario } = dto;
    const usuarioExiste = await this.usuarioRepository.findOne({ where: { correo: datosUsuario.correo } });
    if (usuarioExiste) throw new BadRequestException('El correo ya está registrado');

    const salt = await bcrypt.genSalt(10);
    const contrasenaHasheada = await bcrypt.hash(datosUsuario.contrasena, salt);
    
    const codigoSecreto = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 15);
    
    const nuevoUsuario = this.usuarioRepository.create({
      ...datosUsuario,
      contrasena: contrasenaHasheada,
      correoVerificado: false,
      codigoOtp: codigoSecreto,
      expiracionOtp: expiracion,
    });
    
    await this.usuarioRepository.save(nuevoUsuario);
    
    try {
      await this.emailQueue.add('enviar-otp', {
        correo: nuevoUsuario.correo,
        nombre: nuevoUsuario.nombre,
        codigo: codigoSecreto
      });
      console.log(`\n 🚀 [MODO DEV] CÓDIGO OTP PARA ${nuevoUsuario.correo}: [ ${codigoSecreto} ] \n`);
    } catch (error) {
      console.error('No se pudo encolar el correo OTP:', error);
    }

    return {
      mensaje: 'Registro exitoso. Revisa tu correo para verificar la cuenta.',
      requiereVerificacion: true,
      correo: nuevoUsuario.correo
    };
  }

  async verificarEmail(correo: string, codigo: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });
    if (!usuario) throw new BadRequestException('Usuario no encontrado');
  if (usuario.correoVerificado) throw new BadRequestException('El correo ya está verificado');
    if (!usuario.expiracionOtp || !usuario.codigoOtp) {
      throw new BadRequestException('No hay un código pendiente de verificación para este usuario.');
    }
    if (new Date() > usuario.expiracionOtp) throw new BadRequestException('El código ha expirado. Regístrate nuevamente o solicita otro.');
    if (usuario.codigoOtp !== codigo) throw new BadRequestException('El código es incorrecto.');

    usuario.correoVerificado = true;
    usuario.codigoOtp = null;
    usuario.expiracionOtp = null;
    await this.usuarioRepository.save(usuario);

    try {
      await this.emailQueue.add('enviar-bienvenida', {
        correo: usuario.correo,
        nombre: usuario.nombre,
      });
    } catch (error) {
      console.error('No se pudo encolar bienvenida post-verificación:', error);
    }

    return { mensaje: '¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.' };
  }

async login(correo: string, contrasenaPlana: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });
    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas');
    if (!usuario.correoVerificado) {
      throw new UnauthorizedException('Debes verificar tu correo antes de iniciar sesión.');
    }
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
        rol: usuario.rol,
        pais: usuario.pais,
      }
    };
  }

  async solicitarRecuperacion(correo: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });
    if (!usuario) return { mensaje: 'Revisa tu correo electrónico. Enviamos un enlace de recuperación.' };
    const token = crypto.randomUUID();
    const expiracion = new Date();
    expiracion.setHours(expiracion.getHours() + 1); 

    usuario.tokenRecuperacion = token;
    usuario.expiracionRecuperacion = expiracion;
    await this.usuarioRepository.save(usuario);

    try {
      await this.emailQueue.add('enviar-recuperacion', {
        correo: usuario.correo,
        nombre: usuario.nombre,
        token: token
      });
      console.log(`\n 🚀 [MODO DEV] LINK DE RECUPERACIÓN PARA ${usuario.correo}: http://localhost:5173/reset-password?token=${token} \n`);
    } catch (error) {
      console.error('No se pudo encolar el correo de recuperación:', error);
    }

    return { mensaje: 'Revisa tu correo electrónico. Enviamos un enlace de recuperación.' };
  }

  async cambiarContrasena(token: string, nuevaContrasena: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { tokenRecuperacion: token } });
    if (!usuario) {
      throw new BadRequestException('El enlace de recuperación es inválido o ha expirado.');
    }
    if (new Date() > usuario.expiracionRecuperacion!) {
      usuario.tokenRecuperacion = null;
      usuario.expiracionRecuperacion = null;
      await this.usuarioRepository.save(usuario);
      throw new BadRequestException('El enlace ha expirado. Por favor solicita uno nuevo.');
    }
    const salt = await bcrypt.genSalt(10);
    usuario.contrasena = await bcrypt.hash(nuevaContrasena, salt);
    usuario.tokenRecuperacion = null;
    usuario.expiracionRecuperacion = null;
    await this.usuarioRepository.save(usuario);

    return { mensaje: 'Contraseña actualizada exitosamente! Ya puedes iniciar sesión.' };
  }
}