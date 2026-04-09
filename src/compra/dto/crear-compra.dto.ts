import { IsNotEmpty, IsArray, IsUUID } from 'class-validator';

export class CrearCompraDto {
  @IsNotEmpty({ message: 'El carrito no puede estar vacío' })
  @IsArray({ message: 'Se esperaba una lista de clases' })
  @IsUUID('4', { each: true, message: 'Uno de los IDs de las clases no es válido' })
  idsCategorias!: string[]; // 👈 Ahora es un Array
}