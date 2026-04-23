import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm'; 
import { Compra, EstadoPago, PlataformaPago } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';
import { CrearCompraDto } from '../dto/crear-compra.dto';
import { MercadoPagoService } from './mercadopago.service';
import { PaypalService } from './paypal.service';
import { Cron, CronExpression } from '@nestjs/schedule'; 
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
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
    @InjectQueue('email-queue') private readonly emailQueue: Queue,
    
  ) { }

  
 async iniciarProcesoCompra(idUsuario: string, dto: Omit<CrearCompraDto, 'captchaToken'>) {
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
    const yaCompradas = comprasPrevias.filter(c => c.estado === EstadoPago.APROBADO);
    if (yaCompradas.length > 0) {
      throw new BadRequestException('Ya posees una suscripción activa para una o más clases de este carrito.');
    }

    const grupoPagoId = crypto.randomUUID();
    const plataformaSeleccionada = dto.plataforma;
    const esMercadoPago = plataformaSeleccionada === PlataformaPago.MERCADOPAGO;
    let nuevasCompras: Compra[] = [];
    for (const categoria of categorias) {
      let compra = comprasPrevias.find(c => c.idCategoria === categoria.id && c.estado === EstadoPago.PENDIENTE);
      if (!compra) {
        compra = this.compraRepository.create({
          idUsuario: usuario.id,
          idCategoria: categoria.id,
          estado: EstadoPago.PENDIENTE,
        });
      }
      
      compra.plataforma = plataformaSeleccionada;
      compra.montoCobrado = esMercadoPago ? categoria.precioArs : categoria.precioUsd;
      compra.moneda = esMercadoPago ? 'ARS' : 'USD';
      compra.grupoPagoId = grupoPagoId;
      nuevasCompras.push(compra);
    }
    nuevasCompras = await this.compraRepository.save(nuevasCompras);
    const pasarela = esMercadoPago ? this.mercadoPagoService : this.paypalService;
    const resultadoPago = await pasarela.crearIntencionPago(grupoPagoId, usuario, categorias);
    
    nuevasCompras.forEach(compra => {
      compra.idPagoExterno = resultadoPago.idPagoExterno;
      compra.urlPago = resultadoPago.urlPago || '';
    });

    await this.compraRepository.save(nuevasCompras);
    
    return {
      url: resultadoPago.urlPago,
      plataforma: plataformaSeleccionada,
      idPagoExterno: resultadoPago.idPagoExterno, 
    };
  }

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
      where: { grupoPagoId: idGrupoLocal },
      relations: ['usuario', 'categoria'] 
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
      const todasAprobadas = comprasDelCarrito.every(c => c.estado === EstadoPago.APROBADO);
      if (todasAprobadas && comprasDelCarrito[0].usuario) {
        await this.emailQueue.add('enviar-comprobante', {
          usuario: comprasDelCarrito[0].usuario,
          compras: comprasDelCarrito
        });
      }
    }
  }

  async procesarWebhookPayPal(body: any) {
    const tipoEvento = body?.event_type;
    const resource = body?.resource;
    let idGrupoLocal = '';
    
    if (resource?.purchase_units && resource.purchase_units.length > 0) {
      idGrupoLocal = resource.purchase_units[0].reference_id;
    } else if (resource?.custom_id) {
      idGrupoLocal = resource.custom_id;
    }
    
    if (!idGrupoLocal) return;
    
    const comprasDelCarrito = await this.compraRepository.find({
      where: { grupoPagoId: idGrupoLocal },
      relations: ['usuario', 'categoria']
    });
    
    if (comprasDelCarrito.length === 0) return;
    let requiereActualizacion = false;
    if (tipoEvento === 'PAYMENT.CAPTURE.REFUNDED' || tipoEvento === 'PAYMENT.CAPTURE.REVERSED') {
      comprasDelCarrito.forEach(compra => {
        compra.estado = EstadoPago.RECHAZADO;
        requiereActualizacion = true;
      });
      if (requiereActualizacion) {
        await this.compraRepository.save(comprasDelCarrito);
        console.log(`❌ [Webhook PayPal]: Orden ${idGrupoLocal} REEMBOLSADA/REVOCADA.`);
      }
      return;
    }
    if (tipoEvento !== 'CHECKOUT.ORDER.APPROVED' && tipoEvento !== 'PAYMENT.CAPTURE.COMPLETED') {
      return;
    }
    comprasDelCarrito.forEach(compra => {
      if (compra.estado === EstadoPago.APROBADO) return;
      compra.estado = EstadoPago.APROBADO;
      requiereActualizacion = true;
    });

  if (requiereActualizacion) {
      await this.compraRepository.save(comprasDelCarrito);
      console.log(`¡ÉXITO! Orden PayPal ${idGrupoLocal} actualizada a APROBADO`);
      const todasAprobadas = comprasDelCarrito.every(c => c.estado === EstadoPago.APROBADO);
      if (todasAprobadas && comprasDelCarrito[0].usuario) {
        await this.emailQueue.add('enviar-comprobante', {
          usuario: comprasDelCarrito[0].usuario,
          compras: comprasDelCarrito
        });
      }
  }
}

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
    const compra = await this.compraRepository.findOne({
      where: { idUsuario, idCategoria, estado: EstadoPago.APROBADO },
      relations: ['categoria', 'categoria.videos'],
    });

    if (!compra) {
      throw new ForbiddenException('No tienes acceso a esta clase o no existe.');
    }

    const categoriaLimpia = {
      ...compra.categoria,
      videos: compra.categoria.videos.map(video => {
        const minutos = Math.floor((video.duracion || 0) / 60);
        const segundos = (video.duracion || 0) % 60;
        const tiempoFormateado = `${minutos}:${segundos.toString().padStart(2, '0')}`;

        return {
          id: video.id,
          titulo: video.titulo,
          descripcion: video.descripcion,  
          orden: video.orden,
          duracion: video.duracion,
          duracionFormateada: tiempoFormateado,  
          imagenUrl: video.imagenUrl,
          estado: video.estado,
 
        };
      })
    };

    return categoriaLimpia;
  }


  @Cron(CronExpression.EVERY_5_MINUTES)
  async limpiarComprasPendientes() {
    try {
      const hace15Minutos = new Date(Date.now() - 15 * 60 * 1000);
      const resultado = await this.compraRepository.delete({
        estado: EstadoPago.PENDIENTE,
        fechaCompra: LessThan(hace15Minutos), 
      });
 
      if (resultado.affected && resultado.affected > 0) {
        console.log(`[Limpieza Automática]: Se eliminaron ${resultado.affected} órdenes PENDIENTES caducadas.`);
      }
    } catch (error) {
      console.error('Error durante la limpieza automática de compras:', error);
    }
  }
}