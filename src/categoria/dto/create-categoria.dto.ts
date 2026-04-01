import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsArray, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'La descripción de la tarjeta no puede superar los 255 caracteres.' })
  descripcionCard: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'La descripción breve (suscripción) no puede superar los 255 caracteres.' })
  descripcionBreve: string;

  @IsString()
  @IsOptional()
  descripcionDetallada?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;

  @IsString()
  @IsOptional()
  playbackIdMuestra?: string;

  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      return value;
    }
  })
  @IsArray({ message: 'Los beneficios deben ser un arreglo de objetos' })
  beneficios?: { titulo: string; descripcion: string; icono?: string }[];
  @IsOptional()
  @IsString()
  necesitaVideoMuestra?: string;
}