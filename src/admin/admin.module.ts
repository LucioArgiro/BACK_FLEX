import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Usuario } from '../usuario/entities/usuario.entity';
// Importar Compra no es estrictamente necesario aquí porque consultamos desde Usuario,
// pero si luego haces consultas desde compras, lo agregas.

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}