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
  ) {}
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
      imagenUrl: imagenUrl, // Guardamos el link en MySQL
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

  // Actualizamos para que también pueda recibir una nueva foto
  async actualizar(id: string, datos: any, file?: Express.Multer.File) {
    const categoria = await this.obtenerPorId(id);
    
    // Si la clienta sube una FOTO NUEVA al editar, la subimos a Cloudinary
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      datos.imagenUrl = uploadResult.secure_url;
    }

    this.categoriaRepository.merge(categoria, datos);
    return await this.categoriaRepository.save(categoria);
  }

  async eliminar(id: string) {
    const categoria = await this.obtenerPorId(id);
    await this.categoriaRepository.remove(categoria);
    return { mensaje: `Categoría con ID ${id} eliminada` };
  }
}