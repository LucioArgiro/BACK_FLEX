import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { AdminGuard } from './admin.guard';
import { CreateUsuarioDto } from '../usuario/dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('registro')
  async registrar(@Body() dto: CreateUsuarioDto) {
    return this.authService.registrar(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, usuario } = await this.authService.login(dto.correo, dto.contrasena);
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 1,
    });
    return {
      mensaje: 'Login exitoso',
      usuario
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { mensaje: 'Sesión cerrada exitosamente' };
  }

  @UseGuards(AdminGuard)
  @Get('panel-secreto')
  obtenerDatosSecretos(@Req() req: Request) {
    const usuario = req.user;
    return {
      mensaje: '¡Bienvenido a la bóveda secreta, jefe!',
      datos: usuario
    };
  }
}