import { Injectable, NotFoundException, InternalServerErrorException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video, EstadoVideo } from './entities/video.entity';
import { ProgresoVideo } from './entities/progreso-video.entity';
import { VideoGateway } from './video.gateway';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Categoria } from '../categoria/entities/categoria.entity';
import { Compra, EstadoPago } from '../compra/entities/compra.entity';
import Mux from '@mux/mux-node';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideoService {
  private muxClient: Mux;
  private readonly logger = new Logger(VideoService.name);

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
    private readonly videoGateway: VideoGateway,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    @InjectRepository(ProgresoVideo)
    private progresoRepository: Repository<ProgresoVideo>,
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
      } else if (datos.imagenUrl) {
        urlImagen = datos.imagenUrl;
      }

      const nuevoVideo = this.videoRepository.create({
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        idCategoria: datos.idCategoria,
        duracion: 0,
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
  async procesarWebhookMux(body: any, headers: any) {
    const entorno = process.env.NODE_ENV || 'development';
    if (entorno === 'production') {
      const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error(
          '[Webhook Mux] Falta el secreto del webhook en el .env',
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
          '[Webhook Mux] INTENTO DE HACKEO: Firma de Mux inválida.',
          error,
        );
        throw new ForbiddenException('Firma de seguridad inválida');
      }
    } else {
      console.warn(
        'Webhook de Mux recibido en modo desarrollo. Saltando validación de firma...',
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
          `[Webhook] Video de muestra para Categoría [${categoriaId}] procesado y LISTO`,
        );
      } else if (tipo === 'video.asset.errored') {
        console.error(
          `[Webhook] Mux falló al procesar el video de muestra de la Categoría [${categoriaId}]`,
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
        if (asset.duration) {
          video.duracion = Math.round(asset.duration);
        }

        await this.videoRepository.save(video);
        this.videoGateway.notificarVideoActualizado(video);
        console.log(`[Webhook] Video [${video.titulo}] procesado y LISTO. Duración real: ${video.duracion}s`);
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
        console.error(`❌ [Webhook] Error en Mux al procesar el video [${video.titulo}]`,
        );
      }
    }

    return { mensaje: 'Webhook de video procesado' };
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
    if (!video) throw new NotFoundException(`El video no existe`);
    return video;
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
    } else if (datos.imagenUrl) {
      videoPuro.imagenUrl = datos.imagenUrl;
    }
    if (datos.titulo) videoPuro.titulo = datos.titulo;
    if (datos.descripcion !== undefined) videoPuro.descripcion = datos.descripcion;
    if (datos.idCategoria) videoPuro.idCategoria = datos.idCategoria;
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
    const video = await this.obtenerPorId(idVideo);
    if (!video || !video.playbackId) {
      throw new NotFoundException('El video no está disponible para reproducción.');
    }
    if (!video.idCategoria) {
      this.logger.error(`CRÍTICO: El video ${idVideo} no tiene una categoría asignada en la DB.`);
      throw new InternalServerErrorException('Error de integridad de datos en el video.');
    }
    const compra = await this.compraRepository.findOne({
      where: {
        idUsuario: idUsuario,
        idCategoria: video.idCategoria,
        estado: EstadoPago.APROBADO,
      },
    });
    if (!compra) {
      this.logger.warn(`Intento de acceso denegado: Usuario [${idUsuario}] intentó ver Video [${idVideo}] sin compra válida.`);
      throw new ForbiddenException('No tienes permisos para ver este video o tu suscripción ha expirado.');
    }
    const keyId = process.env.MUX_SIGNING_KEY_ID;
    const keyPrivateRaw = process.env.MUX_SIGNING_KEY_PRIVATE;
    if (!keyId || !keyPrivateRaw) {
      this.logger.error('CRÍTICO: Faltan las llaves de firmado de Mux (MUX_SIGNING_KEY_ID o MUX_SIGNING_KEY_PRIVATE).');
      throw new InternalServerErrorException('Error de configuración en el servidor de video.');
    }
    const keyPrivateDecodificada = Buffer.from(keyPrivateRaw, 'base64').toString('utf-8');

    try {
      const token = await this.muxClient.jwt.signPlaybackId(
        video.playbackId,
        {
          keyId: keyId,
          keySecret: keyPrivateDecodificada,
          expiration: '3h',  
        }
      );

      return {
        playbackId: video.playbackId,
        token: token,
      };
    } catch (error) {
      this.logger.error(`Error firmando token de Mux para video ${idVideo}:`, error);
      throw new InternalServerErrorException('Error al generar credenciales de video seguras.');
    }
  }

  async marcarComoCompletado(usuarioId: string, videoId: string) {
    const existe = await this.progresoRepository.findOne({
      where: { usuario: { id: usuarioId }, video: { id: videoId } }
    });
    if (!existe) {
      const nuevoProgreso = this.progresoRepository.create({
        usuario: { id: usuarioId },
        video: { id: videoId }
      });
      await this.progresoRepository.save(nuevoProgreso);
    }
    return { success: true, message: 'Video marcado como completado' };
  }

  async obtenerProgresoClase(usuarioId: string, idCategoria: string) {
    const progresos = await this.progresoRepository.find({
      where: {
        usuario: { id: usuarioId },
        video: { idCategoria: idCategoria }
      },
      relations: ['video']
    });
    return progresos.map(p => p.video.id);
  }
}