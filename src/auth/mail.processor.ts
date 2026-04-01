import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';


@Processor('email-queue')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailerService: MailerService) {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Procesando trabajo en segundo plano: ${job.name} (ID: ${job.id})`);
    switch (job.name) {
      case 'enviar-bienvenida':
        await this.enviarCorreoBienvenida(job.data);
        break;
      default:
        this.logger.warn(`No hay instrucciones para el trabajo: ${job.name}`);
    }
  }

  private async enviarCorreoBienvenida(data: { correo: string; nombre: string }) {
    try {
      await this.mailerService.sendMail({
        to: data.correo,
        subject: '¡Bienvenido a Flex Studio!',
        template: './bienvenida',
        context: {
          nombre: data.nombre,
        },
      });
      this.logger.log(`Correo de bienvenida enviado con éxito a ${data.correo}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando el correo a ${data.correo}`, error.stack);
      throw error; 
    }
  }
}