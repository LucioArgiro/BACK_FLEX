import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { VideoGateway } from './video.gateway';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    CloudinaryModule
  ],
  controllers: [VideoController],
  providers: [VideoService, VideoGateway],
})
export class VideoModule {}