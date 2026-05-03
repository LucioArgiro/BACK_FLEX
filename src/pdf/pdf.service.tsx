import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { Compra } from '../compra/entities/compra.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { ComprobantePDF } from './comprobante.template';

@Injectable()
export class PdfService implements OnModuleInit {
  private logoBase64: string | null = null;
  private readonly logger = new Logger(PdfService.name);

  async onModuleInit() {
    try {
      const imageUrl = 'https://res.cloudinary.com/dmp7mcwie/image/upload/v1774490155/logofooter_u3j6cz.png';
      const response = await fetch(imageUrl);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        this.logoBase64 = 'data:image/png;base64,' + Buffer.from(arrayBuffer).toString('base64');
        this.logger.log('Logo de Flex Studio cacheado en memoria para React PDF.');
      }
    } catch (error) {
      this.logger.warn('No se pudo descargar el logo. Los PDFs se generarán sin imagen.');
    }
  }

  async generarComprobanteBuffer(compras: Compra[], usuario: Usuario, numeroRecibo: string): Promise<Buffer> {
    try {
      const fechaComprobante = new Date().toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: 'short', 
        day: 'numeric',
      });

      const pdfBuffer = await renderToBuffer(
        <ComprobantePDF
          usuario={usuario}
          compras={compras}
          numeroRecibo={numeroRecibo} 
          fecha={fechaComprobante}
          logoBase64={this.logoBase64}
        />
      );

      return pdfBuffer;
    } catch (error) {
      this.logger.error('Error al renderizar el PDF con React', error);
      throw error;
    }
  }
}