import { IsString, IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsDateString, Matches } from 'class-validator';


export class CreateUsuarioDto {

  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/, {
    message: 'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
  })
  contrasena: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;

  // --- CAMPOS OPCIONALES ---

  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @IsPhoneNumber(undefined, { message: 'El formato del número telefónico es inválido internacionalmente' })
  telefono: string;

  // Usamos IsDateString porque desde React enviaremos la fecha como texto (ej: "1995-08-25")
  @IsDateString({}, { message: 'La fecha debe tener un formato válido (YYYY-MM-DD)' })
  @IsOptional()
  fechaNacimiento?: string;

  @IsString()
  @IsOptional()
  pais?: string;

  @IsString()
  @IsOptional()
  provincia?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  codigoPostal?: string;

}