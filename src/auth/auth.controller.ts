import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express'; 
import { AdminGuard } from './admin.guard'; // <-- 1. Importamos tu guardia

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('registro')
  async registrar(@Body() body: any) {
    return this.authService.registrar(body);
  }
  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const { token, usuario } = await this.authService.login(body.correo, body.contrasena);
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