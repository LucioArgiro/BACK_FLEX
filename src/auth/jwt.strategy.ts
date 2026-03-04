import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request) => {
          return request?.cookies?.access_token; 
        },
        
      ]),
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRETO_FLEX', 
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, correo: payload.correo, rol: payload.rol };
  }
}