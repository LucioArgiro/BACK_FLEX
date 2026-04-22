import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comprobante } from './entities/comprobante.entity';
import { Compra } from '../compra/entities/compra.entity';
import { PdfService } from '../pdf/pdf.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ComprobanteService {
  private readonly logger = new Logger(ComprobanteService.name);

  constructor(
    @InjectRepository(Comprobante)
    private readonly comprobanteRepository: Repository<Comprobante>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    private readonly pdfService: PdfService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async generarYRegistrarComprobante(grupoPagoId: string, usuario: any) {
    try {
      const compras = await this.compraRepository.find({
        where: { grupoPagoId },
        relations: ['categoria'],
      });
      if (compras.length === 0) {
        throw new NotFoundException(`No se encontraron compras para el grupo: ${grupoPagoId}`);
      }
      const nuevoComprobante = this.comprobanteRepository.create({
        grupoPagoId,
        idUsuario: usuario.id,
        numeroRecibo: 'TEMP',
      });
      const comprobanteGuardado = await this.comprobanteRepository.save(nuevoComprobante);
      const numeroOficial = `FLEX-${comprobanteGuardado.numeroSecuencial.toString().padStart(4, '0')}`;
      this.logger.log(`Generando PDF para el recibo ${numeroOficial}...`);
      const pdfBuffer = await this.pdfService.generarComprobanteBuffer(compras, usuario, numeroOficial);
      this.logger.log(`Subiendo PDF ${numeroOficial} a Cloudinary...`);
      const uploadResult = await this.cloudinaryService.uploadPdfBuffer(
        pdfBuffer,
        numeroOficial
      );
      comprobanteGuardado.numeroRecibo = numeroOficial;
      comprobanteGuardado.urlPdf = uploadResult.secure_url;
      await this.comprobanteRepository.save(comprobanteGuardado);
      this.logger.log(`Comprobante ${numeroOficial} generado y guardado exitosamente.`);
      return {
        comprobante: comprobanteGuardado,
        buffer: pdfBuffer
      };
    } catch (error) {
      this.logger.error('Error en el proceso de generación de comprobante', error);
      throw error;
    }
  }

  async buscarPorUsuario(idUsuario: string) {
    return await this.comprobanteRepository.find({
      where: { idUsuario },
      order: { fechaEmision: 'DESC' }, 
    });
  }

  async buscarPorId(id: string) {
    const comprobante = await this.comprobanteRepository.findOne({ where: { id } });
    if (!comprobante) throw new NotFoundException('Comprobante no encontrado');
    return comprobante;
  }
}