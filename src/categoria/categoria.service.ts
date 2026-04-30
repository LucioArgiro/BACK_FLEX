import { Injectable, NotFoundException } from '@nestjs/common';
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


  async crear(datos: CreateCategoriaDto & { imagenHeroUrl?: string, imagenTarjetaUrl?: string, necesitaVideoMuestra?: string }, files?: ArchivosCategoria) {
    const nuevaCategoria = this.categoriaRepository.create({
      titulo: datos.titulo,
      descripcionCard: datos.descripcionCard,
      descripcionBreve: datos.descripcionBreve,
      descripcionDetallada: datos.descripcionDetallada,
      precioArs: datos.precioArs,
      precioUsd: datos.precioUsd,
      beneficios: datos.beneficios,
    });

    if (files?.imagenHero && files.imagenHero.length > 0) {
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenHero[0], 'flex-studio/categorias');
      nuevaCategoria.imagenHero = uploadResult.secure_url;
    } else if (datos.imagenHeroUrl) {
      nuevaCategoria.imagenHero = datos.imagenHeroUrl;
    }
    if (files?.imagenTarjeta && files.imagenTarjeta.length > 0) {
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenTarjeta[0], 'flex-studio/categorias');
      nuevaCategoria.imagenTarjeta = uploadResult.secure_url;
    } else if (datos.imagenTarjetaUrl) {
      nuevaCategoria.imagenTarjeta = datos.imagenTarjetaUrl;
    }
    const categoriaGuardada = await this.categoriaRepository.save(nuevaCategoria);
    let uploadUrlMux: string | undefined = undefined;
    if (datos.necesitaVideoMuestra === 'true') {
      console.log(`[Categoria] Solicitando URL de subida a Mux para la categoría ${categoriaGuardada.id}`);
      const upload = await this.muxClient.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
          passthrough: `categoria_${categoriaGuardada.id}`,
        },
        cors_origin: '*',
      });
      uploadUrlMux = upload.url;
    }
    return {
      categoria: categoriaGuardada,
      uploadUrl: uploadUrlMux
    };
  }


async obtenerTodas() {
    return await this.categoriaRepository.createQueryBuilder('categoria')
      .loadRelationCountAndMap('categoria.cantidadVideos', 'categoria.videos')
      .getMany();
  }
  async obtenerPorId(id: string) {
    const categoria = await this.categoriaRepository.findOne({
      where: { id },
    });

    if (!categoria) {
      throw new NotFoundException(`La categoría con ID ${id} no existe`);
    }
    return categoria;
  }


async actualizar(id: string, datos: UpdateCategoriaDto & { eliminarImagenHero?: string, eliminarImagenTarjeta?: string, imagenHeroUrl?: string, imagenTarjetaUrl?: string, necesitaVideoMuestra?: string }, files?: ArchivosCategoria) {
    const categoria = await this.obtenerPorId(id);
    if (datos.eliminarImagenHero === 'true' && categoria.imagenHero) {
      const publicId = this.extraerPublicId(categoria.imagenHero);
      if (publicId) await this.cloudinaryService.deleteFile(publicId).catch(e => console.error(e));
      categoria.imagenHero = null;
    }
    if (datos.eliminarImagenTarjeta === 'true' && categoria.imagenTarjeta) {
      const publicId = this.extraerPublicId(categoria.imagenTarjeta);
      if (publicId) await this.cloudinaryService.deleteFile(publicId).catch(e => console.error(e));
      categoria.imagenTarjeta = null;
    }
    if (files?.imagenHero && files.imagenHero.length > 0) {
      if (categoria.imagenHero) {
        const publicId = this.extraerPublicId(categoria.imagenHero);
        if (publicId) await this.cloudinaryService.deleteFile(publicId);
      }
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenHero[0], 'flex-studio/categorias');
      categoria.imagenHero = uploadResult.secure_url;
    } else if (datos.imagenHeroUrl) {
      categoria.imagenHero = datos.imagenHeroUrl;
    }
    if (files?.imagenTarjeta && files.imagenTarjeta.length > 0) {
      if (categoria.imagenTarjeta) {
        const publicId = this.extraerPublicId(categoria.imagenTarjeta);
        if (publicId) await this.cloudinaryService.deleteFile(publicId);
      }
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenTarjeta[0], 'flex-studio/categorias');
      categoria.imagenTarjeta = uploadResult.secure_url;
    } else if (datos.imagenTarjetaUrl) {
      categoria.imagenTarjeta = datos.imagenTarjetaUrl;
    }
    let uploadUrlMux: string | undefined = undefined;
    if (datos.necesitaVideoMuestra === 'true') {
      if (categoria.assetIdMuestra) {
        await this.muxClient.video.assets.delete(categoria.assetIdMuestra).catch(e => console.error(e));
      }
      categoria.assetIdMuestra = null;
      categoria.playbackIdMuestra = null;
      const upload = await this.muxClient.video.uploads.create({
        new_asset_settings: {
          playback_policy: ['public'],
          passthrough: `categoria_${categoria.id}`,
        },
        cors_origin: '*',
      });
      uploadUrlMux = upload.url;
    }
    else if (datos.necesitaVideoMuestra === 'false' && categoria.assetIdMuestra) {
      await this.muxClient.video.assets.delete(categoria.assetIdMuestra).catch(e => console.error(e));
      categoria.assetIdMuestra = null;
      categoria.playbackIdMuestra = null;
    }
    const { necesitaVideoMuestra, eliminarImagenHero, eliminarImagenTarjeta, imagenHeroUrl, imagenTarjetaUrl, ...datosActualizar } = datos;
    this.categoriaRepository.merge(categoria, datosActualizar);
    const categoriaGuardada = await this.categoriaRepository.save(categoria);

    return {
      categoria: categoriaGuardada,
      uploadUrl: uploadUrlMux
    };
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
    if (categoria.assetIdMuestra) {
      await this.muxClient.video.assets.delete(categoria.assetIdMuestra).catch(e => console.error(`Aviso: No se pudo borrar de Mux`, e));
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
}