import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

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

  // 👇 Aquí convertimos tu diseño en una función que inyecta las variables
  private generarHtmlBienvenida(nombre: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://flexstudio-two.vercel.app';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Bienvenido a Flex Studio</title>
          <style>
              body { font-family: 'Arial', sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 40px auto; background-color: #131313; border-radius: 20px; border: 1px solid #333; overflow: hidden; }
              .header { background-color: #131313; padding: 30px; text-align: center; border-bottom: 2px solid #d7f250; }
              .header img { max-width: 200px; }
              .content { padding: 40px 30px; text-align: center; }
              h1 { color: #d7f250; font-size: 28px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
              p { color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
              .btn { display: inline-block; background-color: #d7f250; color: #131313; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; }
              .footer { background-color: #0a0a0a; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <img src="https://res.cloudinary.com/dmp7mcwie/image/upload/v1774488885/Logo_hfou8a.png" alt="Flex Studio Logo">
              </div>
              <div class="content">
                  <h1>¡Hola, ${nombre}!</h1>
                  <p>Bienvenido/a a Flex Studio. Estamos felices de que te sumes a nuestra comunidad. Prepárate para llevar tu entrenamiento al siguiente nivel.</p>
                  <p>Ya puedes acceder a tu panel para completar tu perfil y ver las clases disponibles.</p>
                  
                  <a href="${frontendUrl}/login" class="btn">Ir a mi cuenta</a>
              </div>
              <div class="footer">
                  <p>© 2026 Flex Studio - Candelaria Imbaud. Todos los derechos reservados.</p>
              </div>
          </div>
      </body>
      </html>
    `;
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

      this.logger.log(`✅ Correo de bienvenida enviado a ${data.correo}. ID: ${resendData?.id}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando el correo vía API a ${data.correo}`, error);
      throw error; 
    }
  }
}