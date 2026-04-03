import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IPasarelaPago, RespuestaIntencionPago } from '../interfaces/pasarela-pago.interface';
import { Compra } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Injectable()
export class PaypalService implements IPasarelaPago {
  private readonly baseUrl = 'https://api-m.sandbox.paypal.com'; // Cambiar a api-m.paypal.com en producción
 
  private async obtenerAccessToken(): Promise<string> {
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`,
    ).toString('base64');

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: { Authorization: `Basic ${auth}` },
    });

    const data = await response.json();
    return data.access_token;
  }

  async crearIntencionPago(
    compra: Compra,
    usuario: Usuario,
    categoria: Categoria,
  ): Promise<RespuestaIntencionPago> {
    try {
      const token = await this.obtenerAccessToken();
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: compra.id, 
              description: `Suscripción: ${categoria.titulo}`,
              amount: {
                currency_code: 'USD',
                value: categoria.precioUsd.toString(), 
              },
            },
          ],
        }),
      });

      const order = await response.json();
      const urlAprobacion = order.links.find((link: any) => link.rel === 'approve')?.href;

      return {
        idPagoExterno: order.id,
        urlPago: urlAprobacion,
      };
    } catch (error) {
      console.error('Error al comunicarse con PayPal:', error);
      throw new InternalServerErrorException('No se pudo generar el pago internacional.');
    }
  }
}