import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCategoriaDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @IsString()
  @IsOptional()
  descripcionCard?: string;

  @IsString()
  @IsOptional()
  descripcionBreve?: string;

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