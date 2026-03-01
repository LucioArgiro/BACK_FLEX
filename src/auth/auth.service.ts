import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../usuario/entities/usuario.entity'; // <-- Revisa que tu ruta sea correcta
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt'; // <-- 1. Importación necesaria

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    
    private jwtService: JwtService 
  ) {}

  async registrar(datos: any) {
    const usuarioExiste = await this.usuarioRepository.findOne({
      where: { correo: datos.correo },
    });
    
    if (usuarioExiste) {
      throw new BadRequestException('El correo ya está registrado');
    }
    
    const salt = await bcrypt.genSalt(10);
    const contrasenaHasheada = await bcrypt.hash(datos.contrasena, salt);
    const nuevoUsuario = this.usuarioRepository.create({
      correo: datos.correo,
      contrasena: contrasenaHasheada,
      nombre: datos.nombre,
      apellido: datos.apellido,
      rol: datos.rol || 'CLIENTE', 
    });
    await this.usuarioRepository.save(nuevoUsuario);

    const { contrasena, ...usuarioLimpio } = nuevoUsuario;
    return usuarioLimpio;
  }

  async login(correo: string, contrasenaPlana: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { correo } });
    if (!usuario) throw new UnauthorizedException('Credenciales incorrectas');
    
    const esValida = await bcrypt.compare(contrasenaPlana, usuario.contrasena);
    if (!esValida) throw new UnauthorizedException('Credenciales incorrectas');
    
    const payload = { sub: usuario.id, correo: usuario.correo, rol: usuario.rol };
    const token = await this.jwtService.signAsync(payload);
    
    const { contrasena, ...usuarioLimpio } = usuario;
    return { token, usuario: usuarioLimpio };
  }
}