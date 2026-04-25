import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @UseGuards(AdminGuard)
  @Get('clientes')
  async getHistorialClientes() {
    return await this.adminService.obtenerHistorialClientes();
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
}