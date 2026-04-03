import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
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
}