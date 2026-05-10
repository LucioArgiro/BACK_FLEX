  import { Controller, Post, Body, Param, Get, Patch, Delete, UseGuards, UseInterceptors, UploadedFile, Headers, Req, ParseUUIDPipe } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { VideoService } from './video.service';
  import { AdminGuard } from 'src/auth/admin.guard';
  import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
  import { CrearVideoDto } from './dto/crear-video.dto';
  import { UpdateVideoDto } from './dto/update-video.dto';

  @Controller('videos')
  export class VideoController {
    constructor(private readonly videoService: VideoService) { }

    @Post('solicitar-subida')
    @UseGuards(AdminGuard)
    @UseInterceptors(FileInterceptor('imagen'))
    solicitarSubida(
      @Body() body: CrearVideoDto,
      @UploadedFile() file: Express.Multer.File
    ) {

      return this.videoService.solicitarUrlSubida(body, file);
    }

    @Post('webhook')
    manejarWebhook(@Body() body: any, @Headers() headers: any) {  
      return this.videoService.procesarWebhookMux(body, headers);  
    }

    @Get()
    @UseGuards(AdminGuard)
    obtenerTodos() {
      return this.videoService.obtenerTodos();
    }

    @Get('categoria/:idCategoria')
    @UseGuards(AdminGuard)
    obtenerPorCategoria(@Param('idCategoria', ParseUUIDPipe) idCategoria: string) {
      return this.videoService.obtenerPorCategoria(idCategoria);
    }

    @Get(':id')
    @UseGuards(AdminGuard)
    obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
      return this.videoService.obtenerPorId(id);
    }

    @Patch(':id')
    @UseGuards(AdminGuard)
    @UseInterceptors(FileInterceptor('imagen'))
    actualizar(
      @Param('id', ParseUUIDPipe) id: string,
      @Body() body: UpdateVideoDto,
      @UploadedFile() file: Express.Multer.File
    ) {
      return this.videoService.actualizar(id, body, file);
    }

    @Delete(':id')
    @UseGuards(AdminGuard)
    eliminar(@Param('id', ParseUUIDPipe) id: string) {
      return this.videoService.eliminar(id);
    }

    @Get('reproducir/:idVideo')
    @UseGuards(JwtAuthGuard) 
    obtenerParaReproduccion(@Param('idVideo', ParseUUIDPipe) idVideo: string, @Req() req: any) {
      const idUsuario = req.user.id;
  
      return this.videoService.obtenerCredencialesReproduccion(idVideo, idUsuario);
    }

    @UseGuards(JwtAuthGuard) 
    @Post(':id/completar')
    marcarCompletado(@Param('id', ParseUUIDPipe) videoId: string, @Req() req: any) {
      return this.videoService.marcarComoCompletado(req.user.id, videoId);
    }

    @UseGuards(JwtAuthGuard)
    @Get('progreso/categoria/:categoriaId')
    obtenerProgreso(@Param('categoriaId', ParseUUIDPipe) categoriaId: string, @Req() req: any) {
      return this.videoService.obtenerProgresoClase(req.user.id, categoriaId);
    }
  }