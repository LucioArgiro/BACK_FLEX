import { Controller, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CompraService } from './services/compra.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('compras')
export class CompraController {
  constructor(private readonly compraService: CompraService) {}

  @UseGuards(JwtAuthGuard) 
  @Post('iniciar')
  async iniciarCompra(@Req() req, @Body() crearCompraDto: CrearCompraDto) {
    const idUsuario = req.user.id; 
    return this.compraService.iniciarProcesoCompra(idUsuario, crearCompraDto);
  }

  @Post('webhook/mercadopago')
  async recibirWebhookMP(@Req() req: Request, @Res() res: Response) {
    res.status(200).send('OK');
    try {
      await this.compraService.procesarWebhookMercadoPago(req.headers, req.body);
    } catch (error) {
      console.error('Error procesando webhook de MP:', error);
    }
  }
}