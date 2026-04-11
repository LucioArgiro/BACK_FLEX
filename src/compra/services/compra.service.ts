import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

    // Validación de compras previas
    const comprasPrevias = await this.compraRepository.find({
      where: {
        idUsuario: idUsuario,
        idCategoria: In(dto.idsCategorias)
      }
    });

    const yaCompradas = comprasPrevias.filter(c => c.estado === EstadoPago.APROBADO);
    if (yaCompradas.length > 0) {
      throw new BadRequestException('Ya posees una suscripción activa para una o más clases de este carrito.');
    }

    const grupoPagoId = crypto.randomUUID();
    
    // SEMÁFORO DE PAÍS
    const esArgentina = usuario.pais?.toLowerCase() === 'argentina' || usuario.pais?.toLowerCase() === 'ar';
    const plataformaSeleccionada = esArgentina ? PlataformaPago.MERCADOPAGO : PlataformaPago.PAYPAL;
    
    let nuevasCompras: Compra[] = [];

    for (const categoria of categorias) {
      // Reutilizamos registros pendientes si existen para no llenar la DB de basura
      let compra = comprasPrevias.find(c => c.idCategoria === categoria.id && c.estado === EstadoPago.PENDIENTE);

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

    // Guardamos la intención inicial
    nuevasCompras = await this.compraRepository.save(nuevasCompras);

    // Seleccionamos pasarela
    const pasarela = esArgentina ? this.mercadoPagoService : this.paypalService;
    
    // Llamada a la API externa (MP o PayPal)
    const resultadoPago = await pasarela.crearIntencionPago(grupoPagoId, usuario, categorias);

    // Actualizamos los registros con los IDs que nos devolvió la pasarela
    nuevasCompras.forEach(compra => {
      compra.idPagoExterno = resultadoPago.idPagoExterno;
      compra.urlPago = resultadoPago.urlPago || '';
    });
    
    await this.compraRepository.save(nuevasCompras);

    // 👇 MEJORA: Devolvemos también el idPagoExterno para que el Botón de PayPal lo use
    return {
      url: resultadoPago.urlPago,
      plataforma: plataformaSeleccionada,
      idPagoExterno: resultadoPago.idPagoExterno, // 👈 CRÍTICO para el SDK de PayPal
    };
  }

  // --- LÓGICA DE WEBHOOKS (Sin cambios para no romper nada) ---

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
    let requiereActualizacion = false;

    comprasDelCarrito.forEach(compra => {
      if (compra.estado === EstadoPago.APROBADO) return;
      
      if (pagoReal.status === 'approved') {
        compra.estado = EstadoPago.APROBADO;
        requiereActualizacion = true;
      } else if (pagoReal.status === 'rejected' || pagoReal.status === 'cancelled') {
        compra.estado = EstadoPago.RECHAZADO; 
        requiereActualizacion = true;
      }
    });

    if (requiereActualizacion) {
      await this.compraRepository.save(comprasDelCarrito);
      console.log(`¡ÉXITO! Orden ${idGrupoLocal} actualizada a: ${pagoReal.status?.toUpperCase()}`);
    }
  }

  async procesarWebhookPayPal(body: any) {
    const tipoEvento = body?.event_type;
    if (tipoEvento !== 'CHECKOUT.ORDER.APPROVED' && tipoEvento !== 'PAYMENT.CAPTURE.COMPLETED') {
      return;
    }
    const resource = body?.resource;
    let idGrupoLocal = '';
    if (resource?.purchase_units && resource.purchase_units.length > 0) {
      idGrupoLocal = resource.purchase_units[0].reference_id;
    } else if (resource?.custom_id) {
      idGrupoLocal = resource.custom_id;
    }
    if (!idGrupoLocal) return;
    const comprasDelCarrito = await this.compraRepository.find({
      where: { grupoPagoId: idGrupoLocal }
    });
    if (comprasDelCarrito.length === 0) return;
    let requiereActualizacion = false;
    comprasDelCarrito.forEach(compra => {
      if (compra.estado === EstadoPago.APROBADO) return;
      compra.estado = EstadoPago.APROBADO;
      requiereActualizacion = true;
    });

    if (requiereActualizacion) {
      await this.compraRepository.save(comprasDelCarrito);
      console.log(`✅ ¡ÉXITO! Orden PayPal ${idGrupoLocal} actualizada a APROBADO`);
    }
  }

  // --- OBTENCIÓN DE CLASES ---

  async obtenerMisClasesCompradas(idUsuario: string) {
    const comprasAprobadas = await this.compraRepository.find({
      where: { idUsuario, estado: EstadoPago.APROBADO },
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
    // 💡 Mejora: agregamos el idCategoria al filtro para que sea preciso
    const compra = await this.compraRepository.findOne({
      where: { 
        idUsuario, 
        idCategoria, 
        estado: EstadoPago.APROBADO 
      },
      relations: ['categoria', 'categoria.videos'],  
    });

    if (!compra) {
      throw new ForbiddenException('No tienes acceso a esta clase o no existe.');
    }

    return compra.categoria;
  }
}