import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Compra, EstadoPago, PlataformaPago } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';
import { CrearCompraDto } from '../dto/crear-compra.dto';
import { MercadoPagoService } from './mercadopago.service';
import { PaypalService } from './paypal.service';

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
    const categoria = await this.categoriaRepository.findOne({ where: { id: dto.idCategoria } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    const compraExistente = await this.compraRepository.findOne({
  where: { 
    usuario: { id: idUsuario }, 
    categoria: { id: dto.idCategoria } 
  }
});

if (compraExistente) {
  if (compraExistente.estado === 'APROBADO') {
    throw new BadRequestException('Ya posees una suscripción activa para este plan.');
  }
  
  if (compraExistente.estado === 'PENDIENTE') {
    const respuestaMP = await this.mercadoPagoService.crearIntencionPago(
      compraExistente, 
      usuario, 
      categoria
    );
    return respuestaMP; 
  }
}

    const esArgentina = usuario.pais.toLowerCase() === 'argentina' || usuario.pais.toLowerCase() === 'ar';
    const plataformaSeleccionada = esArgentina ? PlataformaPago.MERCADOPAGO : PlataformaPago.PAYPAL;

    let nuevaCompra = this.compraRepository.create({
      idUsuario: usuario.id,
      idCategoria: categoria.id,
      estado: EstadoPago.PENDIENTE,
      plataforma: plataformaSeleccionada,
      montoCobrado: esArgentina ? categoria.precioArs : categoria.precioUsd,
      moneda: esArgentina ? 'ARS' : 'USD',
    });

    

    nuevaCompra = await this.compraRepository.save(nuevaCompra);
    const pasarela = esArgentina ? this.mercadoPagoService : this.paypalService;
    const resultadoPago = await pasarela.crearIntencionPago(nuevaCompra, usuario, categoria);
    nuevaCompra.idPagoExterno = resultadoPago.idPagoExterno;
    nuevaCompra.urlPago = resultadoPago.urlPago || '';
    await this.compraRepository.save(nuevaCompra);

    return {
      url: resultadoPago.urlPago,
      plataforma: plataformaSeleccionada,
    };
  }

  async procesarWebhookMercadoPago(headers: any, body: any) {
    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];
    const accion = body.action || body.topic;
    const dataId = body.data?.id;
    if (accion !== 'payment.created' && accion !== 'payment.updated') {
      return;
    }

    if (!xSignature || !xRequestId || !dataId) {
      console.warn('Webhook MP ignorado por falta de headers o datos');
      return;
    }

 
    const esValido = this.mercadoPagoService.validarFirmaWebhook(xSignature, xRequestId, dataId);
    if (!esValido) {
      console.error('¡ALERTA DE SEGURIDAD! Firma de webhook inválida.');
      return;
    }

 
    const pagoReal = await this.mercadoPagoService.obtenerDetallesPago(dataId);
    if (!pagoReal) return;

    const idCompraLocal = pagoReal.external_reference;
    if (!idCompraLocal) return;
 
    const compra = await this.compraRepository.findOne({ where: { id: idCompraLocal } });
    if (!compra) {
      console.error(`Compra local ${idCompraLocal} no encontrada.`);
      return;
    }

    if (pagoReal.status === 'approved') {
      compra.estado = 'APROBADO' as any;
      console.log(`✅ ¡Pago Aprobado! Compra ${compra.id} actualizada.`);
    } else if (pagoReal.status === 'rejected' || pagoReal.status === 'cancelled') {
      compra.estado = 'RECHAZADO' as any;
      console.log(`❌ Pago Rechazado. Compra ${compra.id} actualizada.`);
    }

    await this.compraRepository.save(compra);
  }
}