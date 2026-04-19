import { Controller, Post, Body } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CaptchaService } from '../auth/captcha.service';
import { ContactoDto } from './dto/contacto.dto';

@Controller('contacto')
export class ContactoController {
  constructor(
    private readonly captchaService: CaptchaService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  @Post()
  async enviarConsulta(@Body() dto: ContactoDto) {
    await this.captchaService.validarToken(dto.captchaToken);
    await this.emailQueue.add('enviar-consulta', {
      nombre: dto.nombre,
      correo: dto.correo,
      mensaje: dto.mensaje,
    });

    return { mensaje: '¡Mensaje enviado con éxito! Te responderemos pronto.' };
  }
}