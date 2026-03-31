import { Controller, Get, Body, Patch, UseGuards, Req } from '@nestjs/common';
import { UsuarioService } from './usuario.service';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}
  @UseGuards(JwtAuthGuard) 
  @Get('me')
  async obtenerMiPerfil(@Req() req: Request) {
    const userId = (req.user as any).id; 
    const usuario = await this.usuarioService.findOne(userId);
    const { contrasena, ...datosPublicos } = usuario;
    return datosPublicos;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async actualizarMiPerfil(
    @Req() req: Request, 
    @Body() updateUsuarioDto: UpdateUsuarioDto
  ) {
    const userId = (req.user as any).id;
    const usuarioActualizado = await this.usuarioService.update(userId, updateUsuarioDto);
    const { contrasena, ...datosPublicos } = usuarioActualizado;
    return datosPublicos;
  }
}