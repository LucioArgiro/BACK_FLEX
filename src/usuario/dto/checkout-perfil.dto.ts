import { IsString, IsNotEmpty, IsOptional, ValidateIf, Matches } from 'class-validator';
import { IsCuitValido } from './is-cuit.validator';

export class CheckoutPerfilDto {
 
  @ValidateIf(o => o.pais === 'Argentina')
  @IsNotEmpty({ message: 'El DNI/CUIT es obligatorio para residentes argentinos' })
  @Matches(/^\d{8,11}$/, {
    message: 'El documento debe ser un DNI (8 dígitos) o CUIT/CUIL (11 dígitos) sin guiones'
  })
  @IsCuitValido()
  documentoIdentidad!: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  provincia?: string;

  @IsString()
  @IsOptional()
  ciudad?: string;

  @IsString()
  @IsOptional()
  codigoPostal?: string;
}