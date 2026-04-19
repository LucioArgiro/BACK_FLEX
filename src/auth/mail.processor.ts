import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Processor('email-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly resend: Resend;
  
  constructor(private readonly configService: ConfigService) {
    super();
    this.resend = new Resend(this.configService.get<string>('EMAIL_PASS'));
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Procesando trabajo por API: ${job.name} (ID: ${job.id})`);

    switch (job.name) {
      case 'enviar-bienvenida':
        await this.enviarCorreoBienvenida(job.data);
        break;
      case 'enviar-otp':
        await this.enviarCorreoOtp(job.data);
        break;
      case 'enviar-recuperacion':
        await this.enviarCorreoRecuperacion(job.data);
        break;
      case 'enviar-consulta':
        await this.enviarCorreoConsulta(job.data);
        break;
      default:
        this.logger.warn(`No hay instrucciones para el trabajo: ${job.name}`);
    }
  }

  private generarHtmlConsulta(nombre: string, correo: string, mensaje: string): string {
    const filePath = path.join(process.cwd(), 'dist', 'src', 'templates', 'consulta.hbs');
    const templateBase = fs.readFileSync(filePath, 'utf8');
    const templateCompilado = handlebars.compile(templateBase);
    return templateCompilado({ nombre, correo, mensaje });
  }

  private async enviarCorreoConsulta(data: { nombre: string; correo: string; mensaje: string }) {
    try {
      const { data: resendData, error } = await this.resend.emails.send({
        from: `Flex Studio Web <${this.configService.get('EMAIL_FROM') || 'onboarding@resend.dev'}>`,
        to: 'flexstudio89@gmail.com',  
        replyTo: data.correo,        
        subject: `Nueva Consulta de ${data.nombre}`,
        html: this.generarHtmlConsulta(data.nombre, data.correo, data.mensaje),
      });

      if (error) throw new Error(JSON.stringify(error));
      this.logger.log(`Consulta de ${data.correo} enviada a Cande. ID: ${resendData?.id}`);
    } catch (error) {
      this.logger.error(`Error enviando consulta de ${data.correo}`, error);
      throw error;
    }
  }


  private generarHtmlRecuperacion(nombre: string, token: string): string {
    const filePath = path.join(process.cwd(), 'dist', 'src', 'templates', 'recuperacion.hbs');
    const templateBase = fs.readFileSync(filePath, 'utf8');
    const templateCompilado = handlebars.compile(templateBase);
    const frontUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const linkRecuperacion = `${frontUrl}/reset-password?token=${token}`;

    return templateCompilado({ nombre, linkRecuperacion });
  }

  private async enviarCorreoRecuperacion(data: { correo: string; nombre: string; token: string }) {
    try {
      const { data: resendData, error } = await this.resend.emails.send({
        from: `Flex Studio <${this.configService.get('EMAIL_FROM') || 'onboarding@resend.dev'}>`,
        to: data.correo,
        subject: 'Recupera tu contraseña - Flex Studio',
        html: this.generarHtmlRecuperacion(data.nombre, data.token),
      });

      if (error) throw new Error(JSON.stringify(error));
      this.logger.log(`Correo de RECUPERACIÓN enviado a ${data.correo}. ID: ${resendData?.id}`);
    } catch (error) {
      this.logger.error(`Error enviando correo de recuperación vía API a ${data.correo}`, error);
      throw error;
    }
  }

  // --- MÉTODOS DE OTP (REGISTRO) ---
  private generarHtmlOtp(nombre: string, codigo: string): string {
    const filePath = path.join(process.cwd(), 'dist', 'src', 'templates', 'otp.hbs');
    const templateBase = fs.readFileSync(filePath, 'utf8');
    const templateCompilado = handlebars.compile(templateBase);
    return templateCompilado({ nombre, codigo });
  }

  private async enviarCorreoOtp(data: { correo: string; nombre: string; codigo: string }) {
    try {
      const { data: resendData, error } = await this.resend.emails.send({
        from: `Flex Studio <${this.configService.get('EMAIL_FROM') || 'onboarding@resend.dev'}>`,
        to: data.correo,
        subject: 'Tu código de verificación - Flex Studio',
        html: this.generarHtmlOtp(data.nombre, data.codigo),
      });

      if (error) throw new Error(JSON.stringify(error));
      this.logger.log(`Correo OTP enviado a ${data.correo}. ID: ${resendData?.id}`);
    } catch (error) {
      this.logger.error(`Error enviando OTP vía API a ${data.correo}`, error);
      throw error;
    }
  }

  // --- MÉTODOS DE BIENVENIDA ---
  private generarHtmlBienvenida(nombre: string): string {
    const filePath = path.join(process.cwd(), 'dist', 'src', 'templates', 'bienvenida.hbs');
    const templateBase = fs.readFileSync(filePath, 'utf8');
    const templateCompilado = handlebars.compile(templateBase);
    return templateCompilado({ nombre });
  }

  private async enviarCorreoBienvenida(data: { correo: string; nombre: string }) {
    try {
      const { data: resendData, error } = await this.resend.emails.send({
        from: `Flex Studio <${this.configService.get('EMAIL_FROM') || 'onboarding@resend.dev'}>`,
        to: data.correo,
        subject: '¡Bienvenido a Flex Studio!',
        html: this.generarHtmlBienvenida(data.nombre),
      });

      if (error) {
        throw new Error(JSON.stringify(error));
      }

      this.logger.log(`Correo de bienvenida enviado a ${data.correo}. ID: ${resendData?.id}`);
    } catch (error) {
      this.logger.error(`Error enviando el correo vía API a ${data.correo}`, error);
      throw error;
    }
  }
}