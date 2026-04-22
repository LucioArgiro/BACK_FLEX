import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ComprobanteService } from './ComprobanteService';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Tu guard de JWT
import { AdminGuard } from '../auth/admin.guard'; // Tu guard de Admin

@Controller('comprobantes')
@UseGuards(JwtAuthGuard, AdminGuard)  
export class ComprobanteController {
  constructor(private readonly comprobanteService: ComprobanteService) {}


  @Get('usuario/:idUsuario')
  async obtenerPorUsuario(@Param('idUsuario') idUsuario: string) {
    return await this.comprobanteService.buscarPorUsuario(idUsuario);
  }

  // Obtener los detalles de un recibo específico
  @Get(':id')
  async obtenerUno(@Param('id') id: string) {
    return await this.comprobanteService.buscarPorId(id);
  }
}