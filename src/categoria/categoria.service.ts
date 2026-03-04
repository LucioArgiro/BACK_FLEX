import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';

@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
  ) {}

  async crear(datos: any) {
    const nuevaCategoria = this.categoriaRepository.create({
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      precio: datos.precio,
      urlVideoMuestra: datos.urlVideoMuestra,
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

  async actualizar(id: string, datos: any) {
    const categoria=await this.obtenerPorId(id);
    this.categoriaRepository.merge(categoria, datos);
    return await this.categoriaRepository.save(categoria);
  }

  async eliminar(id: string) {
    const categoria = await this.obtenerPorId(id);
    return await this.categoriaRepository.remove(categoria);
    return { mensaje: `Categoría con ID ${id} eliminada` };
  }
}