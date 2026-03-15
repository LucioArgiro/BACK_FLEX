import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { AdminGuard } from 'src/auth/admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) { }


  @Post()
  @UseGuards(JwtStrategy, AdminGuard)
  @UseInterceptors(FileInterceptor('imagen'))
  crear(
    @Body() body: CreateCategoriaDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.categoriaService.crear(body, file);
  }

  @Get()
  obtenerTodas() {
    return this.categoriaService.obtenerTodas();
  }

  @Get(':id')
  obtenerPorId(@Param('id') id: string) {
    return this.categoriaService.obtenerPorId(id);
  }

  @Patch(':id')
  @UseGuards(JwtStrategy, AdminGuard)
  @UseInterceptors(FileInterceptor('imagen')) 
  actualizar(@Param('id') id: string, @Body() body: any, @UploadedFile() file?: Express.Multer.File ) {
    return this.categoriaService.actualizar(id, body, file);
  }

  @Delete(':id')
  @UseGuards(JwtStrategy, AdminGuard)
  eliminar(@Param('id') id: string) {
    return this.categoriaService.eliminar(id);
  }
}