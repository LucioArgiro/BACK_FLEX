import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comprobante } from './entities/comprobante.entity';
import { ComprobanteService } from './ComprobanteService';
import { Compra } from '../compra/entities/compra.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PdfService } from '../pdf/pdf.service'; 
import { ComprobanteController } from './comprobante.controller'; 

@Module({
 imports: [TypeOrmModule.forFeature([Comprobante, Compra]), CloudinaryModule],
  providers: [ComprobanteService, PdfService],
  controllers: [ComprobanteController],  
  exports: [ComprobanteService],
})
export class ComprobanteModule {}