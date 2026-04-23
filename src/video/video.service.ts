import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, EstadoVideo } from './entities/video.entity';
import { VideoGateway } from './video.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Categoria } from '../categoria/entities/categoria.entity';
import { Compra, EstadoPago } from '../compra/entities/compra.entity';
import Mux from '@mux/mux-node';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideoService {
  private muxClient: Mux;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    private readonly videoGateway: VideoGateway,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
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
        const resultadoCloudinary = await this.cloudinaryService.uploadFile(
          archivoMiniatura,
          'flex-studio/videos',
        );
        urlImagen = resultadoCloudinary.secure_url;
      }
      const nuevoVideo = this.videoRepository.create({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        idCategoria: datos.idCategoria,
        duracion: parseInt(datos.duracion) || 0,
        orden: parseInt(datos.orden) || 1,
        estado: EstadoVideo.PROCESANDO,
        imagenUrl: urlImagen,
      });

      const videoGuardado = await this.videoRepository.save(nuevoVideo);
      const upload = await this.muxClient.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['signed'],
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
      throw new InternalServerErrorException(
        'No se pudo generar el enlace de subida',
      );
    }
  }

  private formatearDuracion(segundosTotales: number): string {
    if (!segundosTotales || segundosTotales === 0) return '0:00';
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  }

  async procesarWebhookMux(body: any, headers: any) {
    const entorno = process.env.NODE_ENV || 'development';
    if (entorno === 'production') {
      const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error(
          '🚨 [Webhook Mux] Falta el secreto del webhook en el .env',
        );
        throw new ForbiddenException('Petición denegada');
      }

      try {
        const payload = typeof body === 'string' ? body : JSON.stringify(body);
        this.muxClient.webhooks.verifySignature(
          payload,
          headers,
          webhookSecret,
        );
      } catch (error) {
        console.error(
          '🚨 [Webhook Mux] INTENTO DE HACKEO: Firma de Mux inválida.',
          error,
        );
        throw new ForbiddenException('Firma de seguridad inválida');
      }
    } else {
      console.warn(
        '⚠️ Webhook de Mux recibido en modo desarrollo. Saltando validación de firma...',
      );
    }
    const evento = typeof body === 'string' ? JSON.parse(body) : body;

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
        console.log(
          `✅ [Webhook] Video de muestra para Categoría [${categoriaId}] procesado y LISTO`,
        );
      } else if (tipo === 'video.asset.errored') {
        console.error(
          `❌ [Webhook] Mux falló al procesar el video de muestra de la Categoría [${categoriaId}]`,
        );
      }
      return { mensaje: 'Webhook de categoría procesado' };
    }

    if (tipo === 'video.asset.ready') {
      const video = await this.videoRepository.findOne({
        where: { id: passthrough },
      });
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
      const video = await this.videoRepository.findOne({
        where: { id: passthrough },
      });
      if (video) {
        video.estado = EstadoVideo.ERROR;
        await this.videoRepository.save(video);
        this.videoGateway.notificarVideoActualizado(video);
        console.error(
          `❌ [Webhook] Error en Mux al procesar el video [${video.titulo}]`,
        );
      }
    }

    return { mensaje: 'Webhook de video procesado' };
  }

 async obtenerTodos() {
    const videos = await this.videoRepository.find({
      relations: ['categoria'],
      order: { orden: 'ASC' },
    });
    return videos.map((video) => ({
      ...video,
      duracionFormateada: this.formatearDuracion(video.duracion),
    }));
  }

async obtenerPorCategoria(idCategoria: string) {
    const videos = await this.videoRepository.find({
      where: { idCategoria },
      order: { orden: 'ASC' },
    });
    return videos.map((video) => ({
      ...video,
      duracionFormateada: this.formatearDuracion(video.duracion),
    }));
  }

 async obtenerPorId(id: string) {
    const video = await this.videoRepository.findOne({
      where: { id },
      relations: ['categoria'],
    });
    if (!video) throw new NotFoundException(`El video no existe`);
    return {
      ...video,
      duracionFormateada: this.formatearDuracion(video.duracion),
    };
  }


  async actualizar(
    id: string,
    datos: UpdateVideoDto,
    archivoMiniatura?: Express.Multer.File,
  ) {
    const videoPuro = await this.videoRepository.findOne({ where: { id } });
    if (!videoPuro) {
      throw new NotFoundException(`El video no existe`);
    }
    
    if (archivoMiniatura) {
      if (videoPuro.imagenUrl) {
        const publicId = this.cloudinaryService.extraerPublicId(videoPuro.imagenUrl);
        if (publicId) {
          try {
            await this.cloudinaryService.deleteFile(publicId);
            console.log(`Miniatura anterior destruida en Cloudinary: ${publicId}`);
          } catch (error) {
            console.error('Aviso: No se pudo borrar la miniatura vieja', error);
          }
        }
      }
      const uploadResult = await this.cloudinaryService.uploadFile(
        archivoMiniatura,
        'flex-studio/videos',
      );
      videoPuro.imagenUrl = uploadResult.secure_url; 
    }
    if (datos.titulo) videoPuro.titulo = datos.titulo;
    if (datos.descripcion !== undefined) videoPuro.descripcion = datos.descripcion;
    if (datos.idCategoria) videoPuro.idCategoria = datos.idCategoria;
    if (datos.duracion) videoPuro.duracion = Number(datos.duracion);
    if (datos.orden) videoPuro.orden = Number(datos.orden);
    return await this.videoRepository.save(videoPuro);
  }

  async eliminar(id: string) {
    const video = await this.obtenerPorId(id);
    if (video.assetId) {
      try {
        await this.muxClient.video.assets.delete(video.assetId);
        console.log(`Video borrado en Mux (Asset: ${video.assetId})`);
      } catch (error: any) {
        console.error(`Aviso: No se pudo borrar de Mux:`, error.message);
      }
    }
    if (video.imagenUrl) {
      const publicId = this.cloudinaryService.extraerPublicId(video.imagenUrl);
      if (publicId) {
        try {
          await this.cloudinaryService.deleteFile(publicId);
          console.log(`Imagen miniatura borrada en Cloudinary: ${publicId}`);
        } catch (error) {
          console.error(
            `Aviso: No se pudo borrar la imagen de Cloudinary:`,
            error,
          );
        }
      }
    }
    await this.videoRepository.remove(video);
    return { mensaje: 'Video e imagen eliminados con éxito' };
  }

  async obtenerCredencialesReproduccion(idVideo: string, idUsuario: string) {
    // 1. Buscamos el video
    const video = await this.obtenerPorId(idVideo);
    if (!video || !video.playbackId) {
      throw new NotFoundException(
        'El video no está disponible para reproducción.',
      );
    }

    // 2. EL AUDITOR: Verificamos que el usuario haya comprado la categoría de este video
    const compra = await this.compraRepository.findOne({
      where: {
        idUsuario: idUsuario,
        idCategoria: video.idCategoria,
        estado: EstadoPago.APROBADO,
      },
    });

    if (!compra) {
      throw new ForbiddenException('No tienes permisos para ver este video.');
    }

    try {
      const token = await this.muxClient.jwt.signPlaybackId(
        video.playbackId, 
        {
          keyId: process.env.MUX_SIGNING_KEY_ID!, 
          keySecret: process.env.MUX_SIGNING_KEY_PRIVATE!,
          expiration: '3h',  
        }
      );

      return {
        playbackId: video.playbackId,
        token: token,
      };
    } catch (error) {
      console.error('Error firmando token de Mux:', error);
      throw new InternalServerErrorException(
        'Error al generar credenciales de video.',
      );
    }
  }
}
