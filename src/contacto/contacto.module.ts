import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContactoController } from './contacto.controller';
import { AuthModule } from '../auth/auth.module'; 

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email-queue',  
    }),
    AuthModule,  
  ],
  controllers: [ContactoController],
})
export class ContactoModule {}