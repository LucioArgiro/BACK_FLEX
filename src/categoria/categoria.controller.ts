import {Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, UploadedFiles, UseInterceptors, BadRequestException, ParseUUIDPipe} from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { AdminGuard } from 'src/auth/admin.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

interface ArchivosCategoria {
  imagenHero?: Express.Multer.File[];
  imagenTarjeta?: Express.Multer.File[];
  videoMuestra?: Express.Multer.File[];
}
 
const fileFilter = (req: any, file: Express.Multer.File, cb: Function) => {
  if (file.fieldname === 'imagenHero' || file.fieldname === 'imagenTarjeta') {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(new BadRequestException('Las imágenes deben ser formato JPG, PNG o WEBP'), false);
    }
  }

  if (file.fieldname === 'videoMuestra') {
    if (!file.mimetype.match(/\/(mp4|webm|mov)$/)) {
      return cb(new BadRequestException('El video debe ser formato MP4, WEBM o MOV'), false);
    }
  }
  cb(null, true);
};

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) { }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'imagenHero', maxCount: 1 },
    { name: 'imagenTarjeta', maxCount: 1 },
  ], { fileFilter }))
  crear(
    @Body() body: CreateCategoriaDto,
    @UploadedFiles() files: ArchivosCategoria
  ) {
    return this.categoriaService.crear(body, files);
  }

  @Get()
  obtenerTodas() {
    return this.categoriaService.obtenerTodas();
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriaService.obtenerPorId(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'imagenHero', maxCount: 1 },
    { name: 'imagenTarjeta', maxCount: 1 },
    { name: 'videoMuestra', maxCount: 1 },
  ], { fileFilter }))
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoriaDto,
    @UploadedFiles() files: ArchivosCategoria
  ) {
    return this.categoriaService.actualizar(id, body, files);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  eliminar(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriaService.eliminar(id);
  }
}