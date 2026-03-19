import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './entities/video.entity';
import Mux from '@mux/mux-node';

@Injectable()
export class VideoService {
  private muxClient: Mux;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {
    this.muxClient = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });
  }

  async crearConVideo(datos: any, archivo: Express.Multer.File) {
    if (!archivo) {
      throw new BadRequestException('El archivo de video es obligatorio');
    }

    try {
      console.log(`Iniciando subida a Mux del archivo: ${archivo.originalname}`);
      const upload = await this.muxClient.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
          video_quality: 'basic',
        },
        cors_origin: '*',
      });
      const fileBlob = new Blob([new Uint8Array(archivo.buffer)], { type: archivo.mimetype });

      await fetch(upload.url, {
        method: 'PUT',
        body: fileBlob,
        headers: {
          'Content-Type': archivo.mimetype,
        },
      });

      console.log('Archivo recibido por Mux. Esperando a que genere el ID de reproducción...');
      let assetId: string | null = null;
      let intentos = 0;
      while (!assetId && intentos < 15) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const uploadStatus = await this.muxClient.video.uploads.retrieve(upload.id);

        if (uploadStatus.asset_id) {
          assetId = uploadStatus.asset_id;
        }
        intentos++;
      }

      if (!assetId) {
        throw new Error('Mux tardó demasiado en procesar. El video se subió, pero no se pudo guardar en la base de datos.');
      }
      const asset = await this.muxClient.video.assets.retrieve(assetId);
      const playbackId = asset.playback_ids?.[0]?.id;
      if (!playbackId) {
        throw new Error('El video se procesó pero no generó un ID de reproducción.');
      }

      console.log(`¡Subida exitosa a Mux! Playback ID: ${playbackId}`);
      const nuevoVideo = this.videoRepository.create({
        titulo: datos.titulo,
        assetId: assetId,        
        playbackId: playbackId, 
        orden: parseInt(datos.orden) || 1,
        duracion: parseInt(datos.duracion) || 0,
        idCategoria: datos.idCategoria,
      });

      return await this.videoRepository.save(nuevoVideo);

    } catch (err) {
      console.error('Error procesando el archivo con Mux:', err);
      throw new InternalServerErrorException('Error interno procesando el archivo de video');
    }
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

    // ⚠️ NOTA DE ARQUITECTURA: 
    // Para automatizar el borrado en Mux, se necesita el "Asset ID", pero nosotros 
    // guardamos el "Playback ID". Por ahora, si borras un video aquí, tendrás que 
    // borrarlo manualmente en el panel web de Mux. 
    // Si luego quieres automatizarlo, agregaremos una columna `idAssetMux` en MySQL.

    await this.videoRepository.remove(video);
    return { mensaje: 'Video eliminado con éxito de la base de datos' };
  }
}