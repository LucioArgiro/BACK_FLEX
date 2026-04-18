import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Usuario } from '../usuario/entities/usuario.entity';
 import { Compra } from '../compra/entities/compra.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Compra])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}