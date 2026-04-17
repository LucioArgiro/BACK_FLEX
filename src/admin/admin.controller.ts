import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from 'src/auth/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard) 
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('clientes')
  async getHistorialClientes() {
    return await this.adminService.obtenerHistorialClientes();
  }

  @Get('estadisticas')
  async getEstadisticas() {
    return await this.adminService.obtenerEstadisticasGlobales();
  }
}