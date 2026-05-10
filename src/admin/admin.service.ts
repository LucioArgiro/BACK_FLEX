import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Usuario, RolUsuario } from '../usuario/entities/usuario.entity';
import { Compra, EstadoPago } from '../compra/entities/compra.entity';
import { ResumenClienteDto } from './dto/resumen-cliente.dto';


@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
  ) {}

async obtenerEstadisticasGlobales() {
    const totalUsuarios = await this.usuarioRepository.count({
      where: { rol: RolUsuario.CLIENTE }
    });
    const estadisticas = await this.compraRepository.createQueryBuilder('compra')
      .where('compra.estado = :estadoAprobado', { estadoAprobado: EstadoPago.APROBADO })
      .select([
        'COUNT(compra.id) AS clasesVendidas',
        `SUM(CASE WHEN compra.moneda = 'ARS' THEN compra.montoCobrado ELSE 0 END) AS ingresosArs`,
        `SUM(CASE WHEN compra.moneda = 'USD' THEN compra.montoCobrado ELSE 0 END) AS ingresosUsd`
      ])
      .getRawOne();
   const hoy = new Date();
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);
    
    const comprasAnio = await this.compraRepository.find({
      where: { estado: EstadoPago.APROBADO, fechaCompra: MoreThanOrEqual(inicioAnio) }
    });
    const resumenPeriodos = {
      hoy: { ars: 0, usd: 0, ventasArs: 0, ventasUsd: 0 },
      semana: { ars: 0, usd: 0, ventasArs: 0, ventasUsd: 0 },
      mes: { ars: 0, usd: 0, ventasArs: 0, ventasUsd: 0 },
      anio: { ars: 0, usd: 0, ventasArs: 0, ventasUsd: 0 }
    };
    comprasAnio.forEach(compra => {
      const monto = Number(compra.montoCobrado) || 0;
      const fecha = new Date(compra.fechaCompra);
      const esArs = compra.moneda === 'ARS';
      const esUsd = compra.moneda === 'USD';
      if (esArs) { resumenPeriodos.anio.ars += monto; resumenPeriodos.anio.ventasArs++; }
      if (esUsd) { resumenPeriodos.anio.usd += monto; resumenPeriodos.anio.ventasUsd++; }
      if (fecha >= inicioMes) {
        if (esArs) { resumenPeriodos.mes.ars += monto; resumenPeriodos.mes.ventasArs++; }
        if (esUsd) { resumenPeriodos.mes.usd += monto; resumenPeriodos.mes.ventasUsd++; }
      }
      if (fecha >= hace7Dias) {
        if (esArs) { resumenPeriodos.semana.ars += monto; resumenPeriodos.semana.ventasArs++; }
        if (esUsd) { resumenPeriodos.semana.usd += monto; resumenPeriodos.semana.ventasUsd++; }
      }
      if (fecha >= inicioHoy) {
        if (esArs) { resumenPeriodos.hoy.ars += monto; resumenPeriodos.hoy.ventasArs++; }
        if (esUsd) { resumenPeriodos.hoy.usd += monto; resumenPeriodos.hoy.ventasUsd++; }
      }
    });

    return {
      totalUsuarios,
      clasesVendidas: Number(estadisticas.clasesVendidas) || 0,
      ingresosArs: Number(estadisticas.ingresosArs) || 0,
      ingresosUsd: Number(estadisticas.ingresosUsd) || 0,
      resumenPeriodos 
    };
  }

// back/src/admin/admin.service.ts

async obtenerHistorialClientes(page: number = 1, limit: number = 5) {
  const skip = (page - 1) * limit;
  const queryBuilder = this.usuarioRepository.createQueryBuilder('usuario')
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
    .offset(skip)
    .limit(limit);

  const resultados = await queryBuilder.getRawMany();
  const totalItems = await this.usuarioRepository.count({
    where: { rol: RolUsuario.CLIENTE }
  });
  const totalPages = Math.ceil(totalItems / limit);
  const data = resultados.map(row => ({
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
  return {
    data,
    meta: {
      totalItems,
      itemCount: data.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    }
  };
}

  async obtenerClasesMasCompradas(limite: number = 10) {
    const rawData = await this.compraRepository.createQueryBuilder('compra')
      .innerJoin('compra.categoria', 'categoria') 
      .where('compra.estado = :estadoAprobado', { estadoAprobado: EstadoPago.APROBADO })
      .select([
        'categoria.id AS id',
        'categoria.titulo AS titulo',
        'categoria.imagenTarjeta AS imagenTarjeta',
        'categoria.destacada AS destacada',
        'COUNT(compra.id) AS totalCompras',
        `SUM(CASE WHEN compra.moneda = 'ARS' THEN compra.montoCobrado ELSE 0 END) AS ingresosArs`,
        `SUM(CASE WHEN compra.moneda = 'USD' THEN compra.montoCobrado ELSE 0 END) AS ingresosUsd`
      ])
      .groupBy('categoria.id')
      .orderBy('totalCompras', 'DESC')
      .limit(limite)
      .getRawMany();
    return rawData.map(row => ({
      id: row.id,
      titulo: row.titulo,
      imagenTarjeta: row.imagenTarjeta || row.imagentarjeta,
      destacada: row.destacada === 1 || row.destacada === true, 
      totalCompras: Number(row.totalCompras || row.totalcompras) || 0,
      ingresosArs: Number(row.ingresosArs || row.ingresosars) || 0,
      ingresosUsd: Number(row.ingresosUsd || row.ingresosusd) || 0
    }));
  }
}