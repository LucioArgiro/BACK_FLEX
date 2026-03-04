import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './entities/video.entity';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class VideoService {
  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    private minioService: MinioService,
  ) { }

  async crearConVideo(datos: any, archivo: Express.Multer.File) {
    if (!archivo) {
      throw new BadRequestException('El archivo de video es obligatorio');
    }

    const urlMinio = await this.minioService.subirArchivo(archivo);

    const nuevoVideo = this.videoRepository.create({
      titulo: datos.titulo,
      idCloudflare: urlMinio,
      orden: parseInt(datos.orden) || 1,
      duracion: parseInt(datos.duracion) || 0,
      idCategoria: datos.idCategoria,
    });

    return await this.videoRepository.save(nuevoVideo);
  }

  async obtenerTodos() {
    return await this.videoRepository.find({
      relations: ['categoria'],
      order: { orden: 'ASC' },
    });
  }


  async obtenerPorCategoria(idCategoria: string) {
    return await this.videoRepository.find({
      where: { idCategoria },
      order: { orden: 'ASC' },
    });
  }

  async obtenerPorId(id: string) {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['categoria'],
    });

    if (!video) {
      throw new NotFoundException(`El video con ID ${id} no existe`);
    }
    return video;
  }

  async actualizar(id: string, datos: any) {
    const video = await this.obtenerPorId(id);
    if (datos.orden) datos.orden = parseInt(datos.orden);
    if (datos.duracion) datos.duracion = parseInt(datos.duracion);
    this.videoRepository.merge(video, datos);
    return await this.videoRepository.save(video);
  }

  async eliminar(id: string) {
    const video = await this.obtenerPorId(id);
    if (video.idCloudflare) {
      await this.minioService.eliminarArchivo(video.idCloudflare);
    }
    await this.videoRepository.remove(video);
    return { mensaje: 'Video y archivo físico eliminados con éxito' };
  }
}