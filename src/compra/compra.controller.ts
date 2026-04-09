import { Controller, Post, Body, Req, Res, UseGuards, Get, Param } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CompraService } from './services/compra.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('compras')
export class CompraController {
  constructor(private readonly compraService: CompraService) { }

  @UseGuards(JwtAuthGuard)
  @Post('iniciar')
  async iniciarCompra(@Req() req, @Body() crearCompraDto: CrearCompraDto) {
    const idUsuario = req.user.id;
    return this.compraService.iniciarProcesoCompra(idUsuario, crearCompraDto);
  }

  @Post('webhook/mercadopago')
  async recibirWebhookMP(@Req() req: Request, @Res() res: Response) {
    console.log('🔔 ¡DING DONG! LLEGÓ EL WEBHOOK DE MP:', req.query);
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
  async obtenerDetalleClase(@Req() req: any, @Param('id') idCategoria: string) {
    return await this.compraService.obtenerDetalleClaseComprada(req.user.id, idCategoria);
  }
}

