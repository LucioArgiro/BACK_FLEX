import { Controller, Post, Body, Param, Get, Patch, Delete, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }

  @Post('solicitar-subida')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('imagen'))
  solicitarSubida(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File
  ) {

    return this.videoService.solicitarUrlSubida(body, file);
  }

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
  @UseInterceptors(FileInterceptor('imagen')) // 👈 1. Agregamos el interceptor
  actualizar(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File // 👈 2. Atrapamos el archivo
  ) {
    return this.videoService.actualizar(id, body, file); // 👈 3. Se lo pasamos al servicio
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  eliminar(@Param('id') id: string) {
    return this.videoService.eliminar(id);
  }
}