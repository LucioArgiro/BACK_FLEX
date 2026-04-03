import { IsNotEmpty, IsUUID } from 'class-validator';

export class CrearCompraDto {
  @IsNotEmpty({ message: 'El ID de la categoría es obligatorio' })
  @IsUUID('4', { message: 'El formato del ID de la categoría no es válido' })
  idCategoria: string;
}