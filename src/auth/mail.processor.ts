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
      default:
        this.logger.warn(`No hay instrucciones para el trabajo: ${job.name}`);
    }
  }

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