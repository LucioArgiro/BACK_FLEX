import { PartialType } from '@nestjs/mapped-types';
import { CreateCompraDto } from './create-compra.dto';

export class UpdateCompraDto extends PartialType(CreateCompraDto) {}
