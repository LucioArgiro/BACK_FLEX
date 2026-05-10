import { PartialType } from '@nestjs/mapped-types';
import { CrearVideoDto } from './crear-video.dto'; ;

export class UpdateVideoDto extends PartialType(CrearVideoDto) {}
