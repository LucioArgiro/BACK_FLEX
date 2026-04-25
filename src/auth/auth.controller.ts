import { Controller, Post, Body, Res, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';
import { AdminGuard } from './admin.guard';
import { CreateUsuarioDto } from '../usuario/dto/create-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { VerificarOtpDto } from './dto/verificar-otp.dto';
import { CaptchaService } from './captcha.service';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService
  ) { }

  @Post('registro')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  async registrar(@Body() dto: CreateUsuarioDto) {
    return this.authService.registrar(dto);
  }

  @Post('verificar-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  async verificarEmail(@Body() dto: VerificarOtpDto) {
    return this.authService.verificarEmail(dto.correo, dto.codigo);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    await this.captchaService.validarToken(dto.captchaToken);

    const { token, usuario } = await this.authService.login(dto.correo, dto.contrasena);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 1,
    });

    return { usuario };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });
    return { mensaje: 'Sesión cerrada exitosamente' };
  }

  @Post('solicitar-recuperacion')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) 
  async solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    await this.captchaService.validarToken(dto.captchaToken);
    return this.authService.solicitarRecuperacion(dto.correo);
  }

  @Post('cambiar-contrasena')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async cambiarContrasena(@Body() dto: CambiarContrasenaDto) {
    return this.authService.cambiarContrasena(dto.token, dto.nuevaContrasena);
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