import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { IPasarelaPago, RespuestaIntencionPago } from '../interfaces/pasarela-pago.interface';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Injectable()
export class PaypalService implements IPasarelaPago {
  private readonly logger = new Logger(PaypalService.name);
  private get baseUrl(): string {
    return process.env.NODE_ENV === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private async obtenerTokenAcceso(): Promise<string> {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    if (!clientId || !secret) {
      throw new InternalServerErrorException('Faltan credenciales de PayPal en el .env');
    }

    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.json();
    return data.access_token;
  }

  async crearIntencionPago(
    grupoPagoId: string,
    usuario: Usuario,
    categorias: Categoria[],
  ): Promise<RespuestaIntencionPago> {
    try {
      const token = await this.obtenerTokenAcceso();
      const totalUsd = categorias.reduce((acc, cat) => acc + Number(cat.precioUsd), 0).toFixed(2);

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: grupoPagoId,
            description: 'Acceso Vitalicio - Flex Studio',
            amount: {
              currency_code: 'USD',
              value: totalUsd,
            },
          },
        ],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/checkout/exito?grupoId=${grupoPagoId}`,
          cancel_url: `${process.env.FRONTEND_URL}/checkout/error`,
          brand_name: 'Flex Studio Candelaria Imbaud',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW',
        },
      };

      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear la orden en PayPal');
      }
      const linkPago = data.links.find((link: any) => link.rel === 'approve')?.href;

      return {
        idPagoExterno: data.id,
        urlPago: linkPago,
      };

    } catch (error: any) {
      this.logger.error('Error al generar la preferencia de PayPal:', error);
      throw new InternalServerErrorException('No se pudo generar el link de pago internacional.');
    }
  }

  async validarFirmaWebhook(headers: any, body: any): Promise<boolean> {
    try {
      const token = await this.obtenerTokenAcceso();
      const webhookId = process.env.PAYPAL_WEBHOOK_ID; 

      if (!webhookId) {
        this.logger.error('Falta PAYPAL_WEBHOOK_ID en el .env');
        return false;
      }

      const payload = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: webhookId,
        webhook_event: body,
      };

      const response = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return data.verification_status === 'SUCCESS';

    } catch (error) {
      this.logger.error('Error al intentar validar la firma de PayPal:', error);
      return false;
    }
  }
}