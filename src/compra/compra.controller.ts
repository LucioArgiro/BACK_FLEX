import { Controller, Post, Body, Req, Res, UseGuards, Get, Param } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CompraService } from './services/compra.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// 👇 NUEVO: Importamos el servicio de MP para validar la firma
import { MercadoPagoService } from './services/mercadopago.service'; 

@Controller('compras')
export class CompraController {
  constructor(
    private readonly compraService: CompraService,
    private readonly mercadoPagoService: MercadoPagoService, // 👈 Inyectado aquí
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post('iniciar')
  async iniciarCompra(@Req() req, @Body() crearCompraDto: CrearCompraDto) {
    const idUsuario = req.user.id;
    return this.compraService.iniciarProcesoCompra(idUsuario, crearCompraDto);
  }

  @Post('webhook/mercadopago')
  async recibirWebhookMP(@Req() req: Request, @Res() res: Response) {
    console.log('🔔 ¡DING DONG! LLEGÓ EL WEBHOOK DE MP:', req.query);

    // 👇 1. LEEMOS EL ENTORNO (Si no existe, asumimos que es desarrollo por seguridad)
    const entorno = process.env.NODE_ENV || 'development';

    // 👇 2. EL INTERRUPTOR DE SEGURIDAD
    if (entorno === 'production') {
      // 🔒 MODO PARANOIA: Validamos la firma criptográfica
      const firmaValida = this.mercadoPagoService.validarFirma(req.headers, req.body);
      
      if (!firmaValida) {
        console.error('🚨 INTENTO DE HACKEO: Firma de Webhook inválida.');
        // Cortamos la ejecución INMEDIATAMENTE y devolvemos error
        return res.status(403).send('Firma de seguridad inválida');
      }
    } else {
      // 🛠️ MODO DESARROLLO: Dejamos pasar los webhooks de Postman o Ngrok
      console.warn('⚠️ Webhook recibido en modo desarrollo. Saltando validación de firma...');
    }

    // 👇 3. RESPONDEMOS RÁPIDO A MERCADOPAGO (Solo llegamos aquí si es seguro)
    res.status(200).send('OK');

    // 👇 4. PROCESAMOS LA COMPRA EN SEGUNDO PLANO
    try {
      await this.compraService.procesarWebhookMercadoPago(req.headers, req.body);
    } catch (error) {
      console.error('Error procesando webhook de MP:', error);
    }
  }

  @UseGuards(JwtAuthGuard)  
  @Get('mis-clases')
  async obtenerMisClases(@Req() req: any) {
    const idUsuario = req.user.id; 
    return await this.compraService.obtenerMisClasesCompradas(idUsuario);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mis-clases/:id')
  async obtenerDetalleClase(@Req() req: any, @Param('id') idCategoria: string) {
    return await this.compraService.obtenerDetalleClaseComprada(req.user.id, idCategoria);
  }
}