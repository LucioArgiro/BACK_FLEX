import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);

  constructor(private configService: ConfigService) {}

  async validarToken(token: string): Promise<boolean> {
    if (!token) {
      throw new BadRequestException('Falta el token de seguridad (Captcha)');
    }

    const secretKey = this.configService.get<string>('RECAPTCHA_SECRET_KEY');
    
    try {
      const response = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();
      if (!data.success || data.score < 0.5) {
        this.logger.warn(`Intento de registro bloqueado. Score del bot: ${data.score}`);
        throw new BadRequestException('Actividad sospechosa detectada');
      }

      return true;
    } catch (error) {
      this.logger.error('Error de comunicación con Google reCAPTCHA', error);
      throw new BadRequestException('Error al verificar la seguridad de la petición');
    }
  }
}