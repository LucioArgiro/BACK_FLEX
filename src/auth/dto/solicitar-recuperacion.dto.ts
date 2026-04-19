 
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SolicitarRecuperacionDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo!: string;

 
  @IsString()
  @IsNotEmpty({ message: 'El token de seguridad es obligatorio' })
  captchaToken!: string; 
}