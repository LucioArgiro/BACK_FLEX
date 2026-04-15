import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario, RolUsuario } from '../usuario/entities/usuario.entity';
import { EstadoPago } from '../compra/entities/compra.entity';
import { ResumenClienteDto } from './dto/resumen-cliente.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async obtenerHistorialClientes(): Promise<ResumenClienteDto[]> {
    const resultados = await this.usuarioRepository.createQueryBuilder('usuario')
      .leftJoin(
        'usuario.compras', 
        'compra', 
        'compra.estado = :estadoAprobado', 
        { estadoAprobado: EstadoPago.APROBADO }
      )
      .where('usuario.rol = :rolCliente', { rolCliente: RolUsuario.CLIENTE })
      .select([
        'usuario.id AS id',
        'usuario.nombre AS nombre',
        'usuario.apellido AS apellido',
        'usuario.correo AS correo',
        'usuario.pais AS pais',
        'usuario.telefono AS telefono',
        'usuario.fechaCreacion AS fechaRegistro'
      ])
      .addSelect('COUNT(compra.id)', 'totalClasesCompradas')
      .addSelect(`SUM(CASE WHEN compra.moneda = 'ARS' THEN compra.montoCobrado ELSE 0 END)`, 'totalInvertidoArs')
      .addSelect(`SUM(CASE WHEN compra.moneda = 'USD' THEN compra.montoCobrado ELSE 0 END)`, 'totalInvertidoUsd')
      .addSelect('MAX(compra.fechaCompra)', 'fechaUltimaCompra')
      .groupBy('usuario.id')
      .orderBy('fechaUltimaCompra', 'DESC') 
      .getRawMany();


    return resultados.map(row => ({
      id: row.id,
      nombreCompleto: `${row.nombre} ${row.apellido}`.trim(),
      correo: row.correo,
      pais: row.pais || 'No especificado',
      telefono: row.telefono,
      fechaRegistro: row.fechaRegistro,
      totalClasesCompradas: Number(row.totalClasesCompradas) || 0,
      totalInvertidoArs: Number(row.totalInvertidoArs) || 0,
      totalInvertidoUsd: Number(row.totalInvertidoUsd) || 0,
      fechaUltimaCompra: row.fechaUltimaCompra || null,
    }));
  }
}