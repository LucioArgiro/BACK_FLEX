import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CategoriaService } from './categoria.service';
import { JwtStrategy } from 'src/auth/jwt.strategy';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('categorias')
export class CategoriaController {
  constructor(private readonly categoriaService: CategoriaService) {}


  @Post()
  @UseGuards(JwtStrategy, AdminGuard) 
  crear(@Body() body: any) {
    return this.categoriaService.crear(body);
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
  actualizar(@Param('id') id: string, @Body() body: any) {
    return this.categoriaService.actualizar(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtStrategy, AdminGuard)
  eliminar(@Param('id') id: string) {
    return this.categoriaService.eliminar(id);
  }
}