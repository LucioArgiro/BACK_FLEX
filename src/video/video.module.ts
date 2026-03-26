import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { VideoGateway } from './video.gateway';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { Categoria } from 'src/categoria/entities/categoria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video, Categoria]),
    CloudinaryModule
  ],
  controllers: [VideoController],
  providers: [VideoService, VideoGateway],
})
export class VideoModule {}