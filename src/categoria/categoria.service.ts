import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';
// 👇 Importamos el servicio de Cloudinary
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }
  async crear(datos: any, file?: Express.Multer.File) {
    let imagenUrl = undefined;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      imagenUrl = uploadResult.secure_url;
    }

    const nuevaCategoria = this.categoriaRepository.create({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      precio: datos.precio,
      urlVideoMuestra: datos.urlVideoMuestra,
      imagenUrl: imagenUrl, 
    });

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

  async actualizar(id: string, datos: any, file?: Express.Multer.File) {
    const categoria = await this.obtenerPorId(id);
    if (file) {
      if (categoria.imagenUrl) {
        const publicId = this.extraerPublicId(categoria.imagenUrl);
        if (publicId) await this.cloudinaryService.deleteFile(publicId);
      }
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      datos.imagenUrl = uploadResult.secure_url;
    }

    this.categoriaRepository.merge(categoria, datos);
    return await this.categoriaRepository.save(categoria);
  }

  async eliminar(id: string) {
    const categoria = await this.obtenerPorId(id);
    if (categoria.imagenUrl) {
      const publicId = this.extraerPublicId(categoria.imagenUrl);
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
}