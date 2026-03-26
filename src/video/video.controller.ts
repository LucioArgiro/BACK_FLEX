import { Controller, Post, Body, Param, Get, Patch, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }

  @Post('solicitar-subida')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('imagen')) // 👈 Agregamos el interceptor
  solicitarSubida(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File // 👈 Atrapamos la imagen
  ) {
    // Aquí adentro le pasas el body y el file a tu videoService, 
    // lo subes a Cloudinary/S3, guardas la URL en la BD y devuelves el link de Mux.
    return this.videoService.solicitarUrlSubida(body, file);
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