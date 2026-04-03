import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompraController } from './compra.controller';
import { CompraService } from './services/compra.service';
import { MercadoPagoService } from './services/mercadopago.service';
import { PaypalService } from './services/paypal.service';
import { Compra } from './entities/compra.entity';
import { Usuario } from '../usuario/entities/usuario.entity';
import { Categoria } from '../categoria/entities/categoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, Usuario, Categoria]),
  ],
  controllers: [
    CompraController,
  ],
  providers: [
    CompraService,
    MercadoPagoService,
    PaypalService,
  ],
  exports: [
    CompraService,
  ],
})
export class CompraModule {}