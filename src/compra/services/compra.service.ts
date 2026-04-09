import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Compra, EstadoPago, PlataformaPago } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';
import { CrearCompraDto } from '../dto/crear-compra.dto';
import { MercadoPagoService } from './mercadopago.service';
import { PaypalService } from './paypal.service';
import * as crypto from 'crypto';

@Injectable()
export class CompraService {
  constructor(
    @InjectRepository(Compra)
    private readonly compraRepository: Repository<Compra>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(Categoria)
    private readonly categoriaRepository: Repository<Categoria>,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly paypalService: PaypalService,
  ) { }

  async iniciarProcesoCompra(idUsuario: string, dto: CrearCompraDto) {
    const usuario = await this.usuarioRepository.findOne({ where: { id: idUsuario } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    const categorias = await this.categoriaRepository.find({
      where: { id: In(dto.idsCategorias) }
    });

    if (categorias.length === 0) throw new NotFoundException('No se encontraron las clases seleccionadas');
    const comprasPrevias = await this.compraRepository.find({
      where: {
        idUsuario: idUsuario,
        idCategoria: In(dto.idsCategorias)
      }
    });

    const yaCompradas = comprasPrevias.filter(c => c.estado === 'APROBADO');
    if (yaCompradas.length > 0) {
      throw new BadRequestException('Ya posees una suscripción activa para una o más clases de este carrito.');
    }

    const grupoPagoId = crypto.randomUUID();
    const esArgentina = usuario.pais.toLowerCase() === 'argentina' || usuario.pais.toLowerCase() === 'ar';
    const plataformaSeleccionada = esArgentina ? PlataformaPago.MERCADOPAGO : PlataformaPago.PAYPAL;
    let nuevasCompras: Compra[] = [];
    for (const categoria of categorias) {
      let compra = comprasPrevias.find(c => c.idCategoria === categoria.id && c.estado === 'PENDIENTE');

      if (!compra) {
        compra = this.compraRepository.create({
          idUsuario: usuario.id,
          idCategoria: categoria.id,
          estado: EstadoPago.PENDIENTE,
          plataforma: plataformaSeleccionada,
          montoCobrado: esArgentina ? categoria.precioArs : categoria.precioUsd,
          moneda: esArgentina ? 'ARS' : 'USD',
        });
      }
      compra.grupoPagoId = grupoPagoId;
      nuevasCompras.push(compra);
    }

    nuevasCompras = await this.compraRepository.save(nuevasCompras);
    const pasarela = esArgentina ? this.mercadoPagoService : this.paypalService;
    const resultadoPago = await pasarela.crearIntencionPago(grupoPagoId, usuario, categorias);
    nuevasCompras.forEach(compra => {
      compra.idPagoExterno = resultadoPago.idPagoExterno;
      compra.urlPago = resultadoPago.urlPago || '';
    });
    await this.compraRepository.save(nuevasCompras);

    return {
      url: resultadoPago.urlPago,
      plataforma: plataformaSeleccionada,
    };
  }

  // --- WEBHOOK ---

  async procesarWebhookMercadoPago(headers: any, body: any) {
    const accion = body?.action || body?.type || body?.topic;
    const dataId = body?.data?.id || body?.id;
    if ((accion !== 'payment.created' && accion !== 'payment.updated' && accion !== 'payment') || !dataId) {
      return;
    }
    const pagoReal = await this.mercadoPagoService.obtenerDetallesPago(dataId);
    if (!pagoReal || !pagoReal.external_reference) return;
    const idGrupoLocal = pagoReal.external_reference;
    const comprasDelCarrito = await this.compraRepository.find({
      where: { grupoPagoId: idGrupoLocal }
    });

    if (comprasDelCarrito.length === 0) return;

    comprasDelCarrito.forEach(compra => {
      if (pagoReal.status === 'approved') {
        compra.estado = 'APROBADO' as any;
      } else if (pagoReal.status === 'rejected' || pagoReal.status === 'cancelled') {
        compra.estado = 'RECHAZADO' as any;
      }
    });

    await this.compraRepository.save(comprasDelCarrito);
    console.log(`✅ ¡ÉXITO! Orden ${idGrupoLocal} actualizada a: ${pagoReal.status?.toUpperCase()}`);
  }

  async obtenerMisClasesCompradas(idUsuario: string) {
    const comprasAprobadas = await this.compraRepository.find({
      where: {
        usuario: { id: idUsuario },
        estado: 'APROBADO' as any,
      },
      relations: ['categoria'],
    });

    const clasesUnicas: Categoria[] = [];
    const idsVistos = new Set<string>();

    for (const compra of comprasAprobadas) {
      if (compra.categoria && !idsVistos.has(compra.categoria.id)) {
        clasesUnicas.push(compra.categoria);
        idsVistos.add(compra.categoria.id);
      }
    }

    return clasesUnicas;
  }

  async obtenerDetalleClaseComprada(idUsuario: string, idCategoria: string) {
    const compra = await this.compraRepository.findOne({
      where: {
        usuario: { id: idUsuario },
        categoria: { id: idCategoria },
        estado: 'APROBADO' as any,
      },
      relations: ['categoria', 'categoria.videos'], // 👈 ¡Traemos los videos!
    });

    if (!compra) {
      throw new ForbiddenException('No tienes acceso a esta clase o no existe.');
    }

    return compra.categoria;
  }
}

