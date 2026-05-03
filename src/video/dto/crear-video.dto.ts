import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CrearVideoDto {
  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo!: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  @IsNotEmpty({ message: 'El ID de la categoría es obligatorio' })
  idCategoria!: string;

  @IsOptional()
  orden?: string | number;

  @IsString()
  @IsOptional()
  imagenUrl?: string;
}