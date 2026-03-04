import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { MinioModule } from '../minio/minio.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),
    MinioModule, 
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}