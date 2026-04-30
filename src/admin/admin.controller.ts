import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from 'src/auth/admin.guard';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly cloudinaryService: CloudinaryService) { }

@UseGuards(AdminGuard)
@Get('clientes')
async getHistorialClientes(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '5'
) {
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  return await this.adminService.obtenerHistorialClientes(
    pageNumber > 0 ? pageNumber : 1, 
    limitNumber > 0 ? limitNumber : 10
  );
}

  @UseGuards(AdminGuard)
  @Get('estadisticas')
  async getEstadisticas() {
    return await this.adminService.obtenerEstadisticasGlobales();
  }

  @UseGuards(AdminGuard)
  @Get('clases-mas-compradas')
  async obtenerClasesMasCompradas(@Query('limite') limite?: number) {
    return this.adminService.obtenerClasesMasCompradas(limite || 10);
  }

  @Get('galeria')
  async obtenerGaleria(
    @Query('cursor') cursor?: string, 
    @Query('folder') folder?: string
  ) {
    return this.cloudinaryService.obtenerGaleria(cursor, folder || 'flex-studio');
  }
}