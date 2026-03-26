import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, EstadoVideo } from './entities/video.entity';
import { VideoGateway } from './video.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Categoria } from '../categoria/entities/categoria.entity';
import Mux from '@mux/mux-node';

@Injectable()
export class VideoService {
  private muxClient: Mux;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    private readonly videoGateway: VideoGateway,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    this.muxClient = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });
  }

  async solicitarUrlSubida(datos: any, archivoMiniatura?: Express.Multer.File) {
    try {
      let urlImagen: string | undefined = undefined;
      if (archivoMiniatura) {
        const resultadoCloudinary = await this.cloudinaryService.uploadFile(archivoMiniatura, 'flex-studio/videos');
        urlImagen = resultadoCloudinary.secure_url;
      }
      const nuevoVideo = this.videoRepository.create({
        titulo: datos.titulo,
        idCategoria: datos.idCategoria,
        duracion: parseInt(datos.duracion) || 0,
        orden: parseInt(datos.orden) || 1,
        estado: EstadoVideo.PROCESANDO,
        imagenUrl: urlImagen,
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

  async procesarWebhookMux(evento: any) {
    const tipo = evento.type;
    const asset = evento?.data;
    const passthrough = asset?.passthrough;
    if (!passthrough) return { mensaje: 'Ignorado: No tiene passthrough' };
    if (passthrough.startsWith('categoria_')) {
      const categoriaId = passthrough.replace('categoria_', '');
      if (tipo === 'video.asset.ready') {
        await this.categoriaRepository.update(categoriaId, {
          playbackIdMuestra: asset.playback_ids[0].id,
          assetIdMuestra: asset.id,
        });
        console.log(`✅ [Webhook] Video de muestra para Categoría [${categoriaId}] procesado y LISTO`);
      }
      else if (tipo === 'video.asset.errored') {
        console.error(`❌ [Webhook] Mux falló al procesar el video de muestra de la Categoría [${categoriaId}]`);
      }
      return { mensaje: 'Webhook de categoría procesado' };
    }
    if (tipo === 'video.asset.ready') {
      const video = await this.videoRepository.findOne({ where: { id: passthrough } });
      if (video) {
        video.assetId = asset.id;
        video.playbackId = asset.playback_ids[0].id;
        video.estado = EstadoVideo.LISTO;
        await this.videoRepository.save(video);
        this.videoGateway.notificarVideoActualizado(video);
        console.log(`✅ [Webhook] Video [${video.titulo}] procesado y LISTO`);
      }
    }

    if (tipo === 'video.asset.errored') {
      const video = await this.videoRepository.findOne({ where: { id: passthrough } });
      if (video) {
        video.estado = EstadoVideo.ERROR;
        await this.videoRepository.save(video);
        this.videoGateway.notificarVideoActualizado(video);
        console.error(`❌ [Webhook] Error en Mux al procesar el video [${video.titulo}]`);
      }
    }

    return { mensaje: 'Webhook de video procesado' };
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
    if (video.assetId) {
      try {
        await this.muxClient.video.assets.delete(video.assetId);
        console.log(`🗑️ Video destruido en Mux (Asset: ${video.assetId})`);
      } catch (error: any) {
        console.error(`⚠️ Aviso: No se pudo borrar de Mux:`, error.message);
      }
    }
    if (video.imagenUrl) {
      const publicId = this.cloudinaryService.extraerPublicId(video.imagenUrl);
      if (publicId) {
        try {
          await this.cloudinaryService.deleteFile(publicId);
          console.log(`🖼️ Imagen miniatura destruida en Cloudinary: ${publicId}`);
        } catch (error) {
          console.error(`⚠️ Aviso: No se pudo borrar la imagen de Cloudinary:`, error);
        }
      }
    }
    await this.videoRepository.remove(video);
    return { mensaje: 'Video e imagen eliminados con éxito' };
  }
}