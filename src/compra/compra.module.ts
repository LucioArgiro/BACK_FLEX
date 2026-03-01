import { Module } from '@nestjs/common';
import { CompraService } from './compra.service';
import { CompraController } from './compra.controller';

@Module({
  controllers: [CompraController],
  providers: [CompraService],
})
export class CompraModule {}
