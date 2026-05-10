import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CheckoutPerfilDto } from './dto/checkout-perfil.dto';

@Injectable()
export class UsuarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async findOne(id: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return usuario;
  }


  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.findOne(id);
    this.usuarioRepository.merge(usuario, updateUsuarioDto);
    return await this.usuarioRepository.save(usuario);
  }


  async updateCheckout(id: string, checkoutDto: CheckoutPerfilDto) {
    const usuario = await this.findOne(id);
    if (usuario.pais === 'Argentina' && !checkoutDto.documentoIdentidad) {
        throw new BadRequestException('Por normativas de facturación, el DNI/CUIT es obligatorio para residentes en Argentina.');
    }
    this.usuarioRepository.merge(usuario, checkoutDto);
    return await this.usuarioRepository.save(usuario);
  }
}