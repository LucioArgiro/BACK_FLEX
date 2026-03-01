import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw err || new UnauthorizedException('Debes iniciar sesión primero');
    }
    if (user.rol !== 'ADMIN') {
      throw new UnauthorizedException('No tienes permisos para ver la bóveda secreta');
    }
    
    return user;
  }
}