// contacto.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CaptchaService } from '../auth/captcha.service';
import { ContactoDto } from './dto/contacto.dto';
import { Throttle } from '@nestjs/throttler'; 

@Controller('contacto')
export class ContactoController {
  constructor(
    private readonly captchaService: CaptchaService,
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
  ) {}

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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