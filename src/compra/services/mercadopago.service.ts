import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'; // 👈 Agregamos Payment
import { IPasarelaPago, RespuestaIntencionPago } from '../interfaces/pasarela-pago.interface';
import { Compra } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';
import * as crypto from 'crypto'; // 👈 Agregamos crypto para la seguridad

@Injectable()
export class MercadoPagoService implements IPasarelaPago {
  private clienteMP: MercadoPagoConfig;

  constructor() {
    this.clienteMP = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    });
  }

  async crearIntencionPago(
    compra: Compra,
    usuario: Usuario,
    categoria: Categoria,
  ): Promise<RespuestaIntencionPago> {
    try {
      const preference = new Preference(this.clienteMP);

      const respuesta = await preference.create({
        body: {
          items: [
            {
              id: categoria.id,
              title: categoria.titulo,
              description: 'Suscripción Elite Training Program',
              quantity: 1,
              unit_price: Number(categoria.precioArs),
              currency_id: 'ARS',
            },
          ],
          payer: {
            name: usuario.nombre,
            surname: usuario.apellido,
            email: usuario.correo,
          },
          back_urls: {
            success: `${process.env.FRONTEND_URL}/checkout/exito`,
            failure: `${process.env.FRONTEND_URL}/checkout/error`,
            pending: `${process.env.FRONTEND_URL}/checkout/pendiente`,
          },
          auto_return: 'approved',
          external_reference: compra.id,
        },
      });
 
      return {
        idPagoExterno: respuesta.id!,
        urlPago: respuesta.init_point,  
      };

    } catch (error) {
      console.error('Error al comunicarse con Mercado Pago:', error);
      throw new InternalServerErrorException('No se pudo generar el link de pago local.');
    }
  }
  
  validarFirmaWebhook(xSignature: string, xRequestId: string, dataId: string): boolean {
    try {
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
      if (!secret) return false;

      const parts = xSignature.split(',');
      let ts = '';
      let hash = '';

      parts.forEach((part) => {
        const [key, value] = part.split('=');
        if (key === 'ts') ts = value;
        if (key === 'v1') hash = value;
      });

      if (!ts || !hash) return false;

      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const generatedHash = hmac.digest('hex');

      return generatedHash === hash;
    } catch (error) {
      console.error('Error validando firma de Webhook:', error);
      return false;
    }
  }

  async obtenerDetallesPago(idPago: string) {
    try {
      const payment = new Payment(this.clienteMP);
      return await payment.get({ id: idPago });
    } catch (error) {
      console.error(`Error al buscar el pago ${idPago} en MP:`, error);
      return null;
    }
  }
}