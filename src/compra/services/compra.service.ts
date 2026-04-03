import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
  ) {}

  async iniciarProcesoCompra(idUsuario: string, dto: CrearCompraDto) {
    const usuario = await this.usuarioRepository.findOne({ where: { id: idUsuario } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    const categoria = await this.categoriaRepository.findOne({ where: { id: dto.idCategoria } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    const compraExistente = await this.compraRepository.findOne({
      where: { idUsuario, idCategoria: dto.idCategoria },
    });
    if (compraExistente && compraExistente.estado === EstadoPago.APROBADO) {
      throw new ConflictException('Ya tienes acceso a esta masterclass');
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
}