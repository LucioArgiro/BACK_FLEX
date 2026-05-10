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

  private formatearDuracionTotal(segundosTotales: number): string {
    if (!segundosTotales || segundosTotales === 0) return '0m';
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    if (horas > 0) {
      return `${horas}h ${minutos.toString().padStart(2, '0')}m`;
    }
    return `${minutos}m`;
  }

  async obtenerTodas() {
    const categorias = await this.categoriaRepository.find({
      relations: ['videos'],
    });
    return categorias.map((categoria) => {
      const cantidadVideos = categoria.videos?.length || 0;
      const segundosTotales = categoria.videos?.reduce((total, video) => {
        return total + (video.duracion || 0);
      }, 0) || 0;
      const { videos, ...categoriaSinVideos } = categoria;
      return {
        ...categoriaSinVideos,
        cantidadVideos,
        duracionTotalFormateada: this.formatearDuracionTotal(segundosTotales),
      };
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

  async obtenerDetallePublico(id: string) {
    const categoria = await this.obtenerPorId(id);

    const cantidadVideos = categoria.videos?.length || 0;
    const segundosTotales = categoria.videos?.reduce((total, video) => {
      return total + (video.duracion || 0);
    }, 0) || 0;

    const { videos, ...categoriaSinVideos } = categoria;

    return {
      ...categoriaSinVideos,
      cantidadVideos,
      duracionTotalFormateada: this.formatearDuracionTotal(segundosTotales),
    };
  }

  async actualizar(id: string, datos: UpdateCategoriaDto & { eliminarImagenHero?: string, eliminarImagenTarjeta?: string, imagenHeroUrl?: string, imagenTarjetaUrl?: string, necesitaVideoMuestra?: string }, files?: ArchivosCategoria) {
    const categoria = await this.obtenerPorId(id);
    
    if (datos.eliminarImagenHero === 'true' && categoria.imagenHero) {
      const publicId = this.extraerPublicId(categoria.imagenHero);
      if (publicId) {
        try {
            await this.cloudinaryService.deleteFile(publicId);
        } catch (error) {
            console.warn(`[Cloudinary] No se pudo borrar la imagen Hero: ${publicId}`);
        }
      }
      categoria.imagenHero = null;
    }
    
    if (datos.eliminarImagenTarjeta === 'true' && categoria.imagenTarjeta) {
      const publicId = this.extraerPublicId(categoria.imagenTarjeta);
      if (publicId) {
          try {
              await this.cloudinaryService.deleteFile(publicId);
          } catch (error) {
              console.warn(`[Cloudinary] No se pudo borrar la imagen Tarjeta: ${publicId}`);
          }
      }
      categoria.imagenTarjeta = null;
    }
    
    if (files?.imagenHero && files.imagenHero.length > 0) {
      if (categoria.imagenHero) {
        const publicId = this.extraerPublicId(categoria.imagenHero);
        if (publicId) {
            try { await this.cloudinaryService.deleteFile(publicId); } catch (e) {}
        }
      }
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenHero[0], 'flex-studio/categorias');
      categoria.imagenHero = uploadResult.secure_url;
    } else if (datos.imagenHeroUrl) {
      categoria.imagenHero = datos.imagenHeroUrl;
    }
    
    if (files?.imagenTarjeta && files.imagenTarjeta.length > 0) {
      if (categoria.imagenTarjeta) {
        const publicId = this.extraerPublicId(categoria.imagenTarjeta);
        if (publicId) {
            try { await this.cloudinaryService.deleteFile(publicId); } catch (e) {}
        }
      }
      const uploadResult = await this.cloudinaryService.uploadFile(files.imagenTarjeta[0], 'flex-studio/categorias');
      categoria.imagenTarjeta = uploadResult.secure_url;
    } else if (datos.imagenTarjetaUrl) {
      categoria.imagenTarjeta = datos.imagenTarjetaUrl;
    }
    
    let uploadUrlMux: string | undefined = undefined;
    
    if (datos.necesitaVideoMuestra === 'true') {
      if (categoria.assetIdMuestra) {
        // 👇 FIX: Try/Catch seguro para MUX
        try {
            await this.muxClient.video.assets.delete(categoria.assetIdMuestra);
        } catch (error) {
            console.warn(`[Mux] El video viejo no se encontró en Mux o ya fue borrado. Ignorando error.`);
        }
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
      // 👇 FIX: Try/Catch seguro para MUX
      try {
          await this.muxClient.video.assets.delete(categoria.assetIdMuestra);
      } catch (error) {
          console.warn(`[Mux] El video viejo no se encontró al intentar desactivar el video de muestra.`);
      }
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
      if (publicId) {
          try { await this.cloudinaryService.deleteFile(publicId); } catch (e) {}
      }
    }
    
    if (categoria.imagenTarjeta) {
      const publicId = this.extraerPublicId(categoria.imagenTarjeta);
      if (publicId) {
          try { await this.cloudinaryService.deleteFile(publicId); } catch (e) {}
      }
    }
    
    if (categoria.assetIdMuestra) {
      // 👇 FIX: Try/Catch seguro para MUX
      try {
          await this.muxClient.video.assets.delete(categoria.assetIdMuestra);
      } catch (error) {
          console.warn(`[Mux] Aviso: No se pudo borrar el video de Mux al eliminar la categoría con ID ${id}.`);
      }
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