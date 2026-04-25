import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ComprobanteService } from './ComprobanteService';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { AdminGuard } from '../auth/admin.guard';  

@Controller('comprobantes')
@UseGuards(JwtAuthGuard, AdminGuard)  
export class ComprobanteController {
  constructor(private readonly comprobanteService: ComprobanteService) {}


  @Get('usuario/:idUsuario')
  async obtenerPorUsuario(@Param('idUsuario', ParseUUIDPipe) idUsuario: string) {
    return await this.comprobanteService.buscarPorUsuario(idUsuario);
  }

  @Get(':id')
  async obtenerUno(@Param('id', ParseUUIDPipe) id: string) {
    return await this.comprobanteService.buscarPorId(id);
  }
}