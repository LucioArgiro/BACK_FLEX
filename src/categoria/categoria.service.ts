import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { UpdateCategoriaDto } from './dto/update-categoria.dto';
import Mux from '@mux/mux-node';

interface ArchivosCategoria {
  imagenHero?: Express.Multer.File[];
  imagenTarjeta?: Express.Multer.File[];
  videoMuestra?: Express.Multer.File[]; 
}

@Injectable()
export class CategoriaService {
  private muxClient: Mux;

  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    private readonly cloudinaryService: CloudinaryService,
  ) { 
    this.muxClient = new Mux({
      tokenId: process.env.MUX_TOKEN_ID,
      tokenSecret: process.env.MUX_TOKEN_SECRET,
    });
  }

  async crear(datos: CreateCategoriaDto, files?: ArchivosCategoria) {
    const nuevaCategoria = this.categoriaRepository.create({
      titulo: datos.titulo,
      descripcionCard:datos.descripcionCard,
      descripcionBreve: datos.descripcionBreve,
      descripcionDetallada: datos.descripcionDetallada,
      precio: datos.precio,
      playbackIdMuestra: datos.playbackIdMuestra,
      beneficios: datos.beneficios,
    });

    if (files?.imagenHero && files.imagenHero.length > 0) {
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenHero[0]);
      nuevaCategoria.imagenHero = uploadResult.secure_url;
    }

    if (files?.imagenTarjeta && files.imagenTarjeta.length > 0) {
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenTarjeta[0]);
      nuevaCategoria.imagenTarjeta = uploadResult.secure_url;
    }

    if (files?.videoMuestra && files.videoMuestra.length > 0) {
      const playbackId = await this.subirVideoAMux(files.videoMuestra[0]);
      nuevaCategoria.playbackIdMuestra = playbackId; 
    }

    return await this.categoriaRepository.save(nuevaCategoria);
  }

  async obtenerTodas() {
    return await this.categoriaRepository.find({
      relations: ['videos'],
    });
  }

  async obtenerPorId(id: string) {
    const categoria = await this.categoriaRepository.findOne({
      where: { id },
      relations: ['videos'],
    });
    if (!categoria) {
      throw new NotFoundException(`La categoría con ID ${id} no existe`);
    }
    return categoria;
  }

  async actualizar(id: string, datos: UpdateCategoriaDto, files?: ArchivosCategoria) {
    const categoria = await this.obtenerPorId(id);
    if (files?.imagenHero && files.imagenHero.length > 0) {
      if (categoria.imagenHero) {
        const publicId = this.extraerPublicId(categoria.imagenHero);
        if (publicId) await this.cloudinaryService.deleteFile(publicId);
      }
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenHero[0]);
      categoria.imagenHero = uploadResult.secure_url;
    }
    if (files?.imagenTarjeta && files.imagenTarjeta.length > 0) {
      if (categoria.imagenTarjeta) {
        const publicId = this.extraerPublicId(categoria.imagenTarjeta);
        if (publicId) await this.cloudinaryService.deleteFile(publicId);
      }
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenTarjeta[0]);
      categoria.imagenTarjeta = uploadResult.secure_url;
    }
    if (files?.videoMuestra && files.videoMuestra.length > 0) {
      const playbackId = await this.subirVideoAMux(files.videoMuestra[0]);
      datos.playbackIdMuestra = playbackId; 
    }

    this.categoriaRepository.merge(categoria, datos);
    return await this.categoriaRepository.save(categoria);
  }

  async eliminar(id: string) {
    const categoria = await this.obtenerPorId(id);
    if (categoria.imagenHero) {
      const publicId = this.extraerPublicId(categoria.imagenHero);
      if (publicId) await this.cloudinaryService.deleteFile(publicId);
    }
    if (categoria.imagenTarjeta) {
      const publicId = this.extraerPublicId(categoria.imagenTarjeta);
      if (publicId) await this.cloudinaryService.deleteFile(publicId);
    }
    await this.categoriaRepository.remove(categoria);
    return { mensaje: `Categoría con ID ${id} eliminada` };
  }

  private extraerPublicId(url: string): string | null {
    if (!url) return null;
    const partes = url.split('/');
    const indexCarpeta = partes.findIndex((p) => p === 'flex-studio');
    if (indexCarpeta !== -1) {
      const publicIdConExtension = partes.slice(indexCarpeta).join('/');
      return publicIdConExtension.split('.')[0];
    }
    return null;
  }

  private async subirVideoAMux(archivo: Express.Multer.File): Promise<string> {
    try {
      console.log(`[Categoria] Iniciando subida a Mux del archivo: ${archivo.originalname}`);
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
        headers: { 'Content-Type': archivo.mimetype },
      });

      console.log('[Categoria] Archivo recibido por Mux. Esperando a que genere el ID...');
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
        throw new Error('Mux tardó demasiado en procesar.');
      }
      
      const asset = await this.muxClient.video.assets.retrieve(assetId);
      const playbackId = asset.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        throw new Error('El video se procesó pero no generó un ID de reproducción.');
      }

      console.log(`[Categoria] ¡Subida exitosa a Mux! Playback ID: ${playbackId}`);
      return playbackId;

    } catch (err) {
      console.error('[Categoria] Error procesando el archivo con Mux:', err);
      throw new InternalServerErrorException('Error interno procesando el archivo de video');
    }
  }
}