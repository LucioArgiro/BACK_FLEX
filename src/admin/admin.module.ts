import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Usuario } from '../usuario/entities/usuario.entity';
 import { Compra } from '../compra/entities/compra.entity';
 import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Compra])],
  controllers: [AdminController],
  providers: [AdminService, CloudinaryService],
})
export class AdminModule {}