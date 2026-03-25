import { Controller, Post, Body, Param, Get, Patch, Delete, UseGuards, Headers } from '@nestjs/common';
import { VideoService } from './video.service';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  // 1. Endpoint para pedir la URL (Protegido por tu Guard)
  @Post('solicitar-subida')
  @UseGuards(AdminGuard)
  solicitarSubida(@Body() body: any) {
    return this.videoService.solicitarUrlSubida(body);
  }

  // 2. Endpoint para el Webhook de Mux (Público, no lleva Guard porque Mux no tiene tu token)
  @Post('webhook')
  manejarWebhook(@Body() body: any) {
    return this.videoService.procesarWebhookMux(body);
  }

  @Get()
  obtenerTodos() {
    return this.videoService.obtenerTodos();
  }

  @Get('categoria/:idCategoria')
  obtenerPorCategoria(@Param('idCategoria') idCategoria: string) {
    return this.videoService.obtenerPorCategoria(idCategoria);
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.videoService.obtenerPorId(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  actualizar(@Param('id') id: string, @Body() body: any) {
    return this.videoService.actualizar(id, body);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  eliminar(@Param('id') id: string) {
    return this.videoService.eliminar(id);
  }
}