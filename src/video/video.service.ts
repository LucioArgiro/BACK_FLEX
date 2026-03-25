import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, EstadoVideo } from './entities/video.entity';
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

  async solicitarUrlSubida(datos: any) {
    try {

      const nuevoVideo = this.videoRepository.create({
        titulo: datos.titulo,
        idCategoria: datos.idCategoria,
        duracion: parseInt(datos.duracion) || 0,
        orden: parseInt(datos.orden) || 1,
        estado: EstadoVideo.PROCESANDO,
      });

      const videoGuardado = await this.videoRepository.save(nuevoVideo);
      const upload = await this.muxClient.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
          passthrough: videoGuardado.id,
        },
        cors_origin: '*',
      });
      return {
        uploadUrl: upload.url,
        videoId: videoGuardado.id,
      };
    } catch (err) {
      console.error('Error al generar URL de subida:', err);
      throw new InternalServerErrorException('No se pudo generar el enlace de subida');
    }
  }

  // 2. MUX AVISA QUE EL VIDEO ESTÁ LISTO (WEBHOOK)
  async procesarWebhookMux(evento: any) {
    const tipo = evento.type;
    if (tipo === 'video.asset.ready') {
      const asset = evento.data;
      const videoId = asset.passthrough;

      if (!videoId) return { mensaje: 'Ignorado: No tiene passthrough' };

      // Buscamos el video y lo actualizamos
      const video = await this.videoRepository.findOne({ where: { id: videoId } });
      if (video) {
        video.assetId = asset.id;
        video.playbackId = asset.playback_ids[0].id;
        video.estado = EstadoVideo.LISTO;  
        await this.videoRepository.save(video);
        console.log(`✅ Video [${video.titulo}] procesado y LISTO`);
      }
    }

    if (tipo === 'video.asset.errored') {
      const asset = evento.data;
      const videoId = asset.passthrough;
      if (videoId) {
        await this.videoRepository.update(videoId, { estado: EstadoVideo.ERROR });  
        console.error(`❌ Error en Mux procesando el video ID: ${videoId}`);
      }
    }

    return { recibido: true };
  }

  async obtenerTodos() {
    return await this.videoRepository.find({ relations: ['categoria'], order: { orden: 'ASC' } });
  }

  async obtenerPorCategoria(idCategoria: string) {
    return await this.videoRepository.find({ where: { idCategoria }, order: { orden: 'ASC' } });
  }

  async obtenerPorId(id: string) {
    const video = await this.videoRepository.findOne({ where: { id }, relations: ['categoria'] });
    if (!video) throw new NotFoundException(`El video no existe`);
    return video;
  }

  async actualizar(id: string, datos: any) {
    const video = await this.obtenerPorId(id);
    this.videoRepository.merge(video, datos);
    return await this.videoRepository.save(video);
  }

  async eliminar(id: string) {
    const video = await this.obtenerPorId(id);
    await this.videoRepository.remove(video);
    return { mensaje: 'Video eliminado' };
  }
}