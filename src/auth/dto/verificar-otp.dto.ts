import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerificarOtpDto {
  @IsEmail()
  correo!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener exactamente 6 dígitos' })
  codigo!: string;
}