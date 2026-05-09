import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaptchaService {
  constructor(private readonly configService: ConfigService) {}
  async validarToken(token: string, ip?: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');

    if (!secretKey) {
      console.warn('No se encontró RECAPTCHA_SECRET_KEY. Saltando validación en desarrollo.');
      return true; 
    }

    try {
      const params = new URLSearchParams({
        secret: secretKey,
        response: token,
      });
      if (ip) {
        params.append('remoteip', ip);
      }
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      const data = await response.json();
      if (!data.success || (data.score !== undefined && data.score < 0.5)) {
        console.error('🚨 Posible Bot detectado o error de reCAPTCHA:', data);
        throw new UnauthorizedException('No pudimos verificar que seas humano o tu conexión es inusual.');
      }
      return true;
    } catch (error) {
      console.error('Error de red al validar Captcha:', error);
      throw new UnauthorizedException('Error al verificar la seguridad de la petición.');
    }
  }
}