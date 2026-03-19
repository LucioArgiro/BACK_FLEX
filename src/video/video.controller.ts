import { Controller, Post, Body, Param, Get, Patch, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideoService } from './video.service';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}


  @Post()
  @UseInterceptors(FileInterceptor('video'))
  @UseGuards(AdminGuard)
  crear(
    @Body() body: any, 
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.videoService.crearConVideo(body, file);
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