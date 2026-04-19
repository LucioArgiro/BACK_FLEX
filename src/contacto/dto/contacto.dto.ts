import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ContactoDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo!: string;

  @IsString()
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(1000, { message: 'El mensaje es muy largo (máximo 1000 caracteres)' })
  mensaje!: string;

  @IsString()
  @IsNotEmpty({ message: 'Token de seguridad requerido' })
  captchaToken!: string;
}