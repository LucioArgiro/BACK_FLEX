import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../usuario/entities/usuario.entity';
import { JwtModule } from '@nestjs/jwt'; 
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    
    // 2. Registramos el módulo de JWT y le damos la configuración básica
    JwtModule.register({
      secret: 'SUPER_SECRETO_FLEX', // (Más adelante moveremos esto a un archivo .env)
      signOptions: { expiresIn: '1d' }, // El token será válido por 1 día
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}