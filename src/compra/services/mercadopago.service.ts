import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'; 
import { IPasarelaPago, RespuestaIntencionPago } from '../interfaces/pasarela-pago.interface';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Injectable()
export class MercadoPagoService implements IPasarelaPago {
  private clienteMP: MercadoPagoConfig;
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor() {
    this.clienteMP = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });
  }

  async crearIntencionPago(
    grupoPagoId: string, 
    usuario: Usuario,
    categorias: Categoria[], 
  ): Promise<RespuestaIntencionPago> {
    try {
      const preference = new Preference(this.clienteMP);

      const respuesta = await preference.create({
        body: {
          items: categorias.map(categoria => ({
            id: categoria.id,
            title: categoria.titulo,
            description: 'Acceso Vitalicio - Flex Studio',
            quantity: 1,
            unit_price: Number(categoria.precioArs),  
            currency_id: 'ARS',
          })),
          back_urls: {
            success: `${process.env.FRONTEND_URL}/checkout/exito`,
            failure: `${process.env.FRONTEND_URL}/checkout/error`,
            pending: `${process.env.FRONTEND_URL}/checkout/pendiente`,
          },
          auto_return: 'approved',
          external_reference: grupoPagoId, 
          // 💡 TIP: Cuando subas esto a producción, cambia esta línea por:
          // notification_url: process.env.WEBHOOK_URL,
          notification_url: 'https://ricki-subglacial-shenna.ngrok-free.dev/compras/webhook/mercadopago',
        },
      });

      return {
        idPagoExterno: respuesta.id!,
        urlPago: respuesta.init_point, 
      };

    } catch (error: any) {
      this.logger.error('Error al generar la preferencia de MP:', error.cause || error.message);
      throw new InternalServerErrorException('No se pudo generar el link de pago local.');
    }
  }

  // 👇 ESTA ES NUESTRA ÚNICA Y MEJOR CAPA DE SEGURIDAD AHORA 👇
  async obtenerDetallesPago(idPago: string) {
    try {
      const payment = new Payment(this.clienteMP);
      return await payment.get({ id: idPago });
    } catch (error) {
      this.logger.error(`Error al buscar el pago ${idPago} en MP:`, error);
      return null;
    }
  }
}