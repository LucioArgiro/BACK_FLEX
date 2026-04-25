import { Controller, Post, Body, Req, Res, UseGuards, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CompraService } from './services/compra.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MercadoPagoService } from './services/mercadopago.service'; 
import { PaypalService } from './services/paypal.service';
import { CaptchaService } from '../auth/captcha.service';
import { Throttle } from '@nestjs/throttler';

@Controller('compras')
export class CompraController {
  constructor(
    private readonly compraService: CompraService,
    private readonly mercadoPagoService: MercadoPagoService, 
    private readonly PaypalService: PaypalService,
    private readonly captchaService: CaptchaService,
  ) { }

@UseGuards(JwtAuthGuard)
  @Post('iniciar')
  @Throttle({ default: { limit: 5, ttl: 60000 } })  
  async iniciarCompra(@Req() req, @Body() crearCompraDto: CrearCompraDto) {
    await this.captchaService.validarToken(crearCompraDto.captchaToken);
    const { captchaToken, ...datosCompraLimpios } = crearCompraDto;
    const idUsuario = req.user.id;
    return this.compraService.iniciarProcesoCompra(idUsuario, datosCompraLimpios);
  }

  @Post('webhook/mercadopago')
  async recibirWebhookMP(@Req() req: Request, @Res() res: Response) {
    console.log('🔔 ¡DING DONG! LLEGÓ EL WEBHOOK DE MP:', req.query);
    const entorno = process.env.NODE_ENV || 'development';
    if (entorno === 'production') {
      const firmaValida = this.mercadoPagoService.validarFirma(req.headers, req.body);
      if (!firmaValida) {
        console.error('🚨 INTENTO DE HACKEO: Firma de Webhook inválida.');
        return res.status(403).send('Firma de seguridad inválida');
      }
    } else {
      console.warn('⚠️ Webhook recibido en modo desarrollo. Saltando validación de firma...');
    }
    res.status(200).send('OK');
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
  async obtenerDetalleClase(@Req() req: any, @Param('id', ParseUUIDPipe) idCategoria: string) {
    return await this.compraService.obtenerDetalleClaseComprada(req.user.id, idCategoria);
  }

  @Post('webhook/paypal')
  async recibirWebhookPayPal(@Req() req: Request, @Res() res: Response) {
    console.log('🔔 ¡DING DONG! LLEGÓ EL WEBHOOK DE PAYPAL:', req.body?.event_type);
    const entorno = process.env.NODE_ENV || 'development';
    if (entorno === 'production') {
      const firmaValida = await this.PaypalService.validarFirmaWebhook(req.headers, req.body);
      if (!firmaValida) {
        console.error('🚨 INTENTO DE HACKEO: Firma de Webhook de PayPal inválida.');
        return res.status(403).send('Firma de seguridad inválida');
      }
    } else {
      console.warn('⚠️ Webhook de PayPal en modo desarrollo. Saltando validación de firma...');
    }
    res.status(200).send('OK');
    try {
      await this.compraService.procesarWebhookPayPal(req.body);
    } catch (error) {
      console.error('Error procesando webhook de PayPal:', error);
    }
  }
}