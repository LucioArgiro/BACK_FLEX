import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IPasarelaPago, RespuestaIntencionPago } from '../interfaces/pasarela-pago.interface';
import { Compra } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Injectable()
export class PaypalService implements IPasarelaPago {
  private readonly baseUrl = 'https://api-m.sandbox.paypal.com'; 

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
    grupoPagoId: string, // 👈 1. Ahora recibimos el ID del grupo
    usuario: Usuario,
    categorias: Categoria[], // 👈 2. Y la lista de clases
  ) {
    // 3. Calculamos el Total en USD sumando todas las clases del carrito
    const totalUsd = categorias.reduce((total, cat) => total + Number(cat.precioUsd), 0);
    
    // 4. Juntamos los títulos separados por coma para la descripción
    const nombresClases = categorias.map(cat => cat.titulo).join(', ');

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
            // 👇 Actualizamos estas tres propiedades
            reference_id: grupoPagoId, 
            description: `Clases: ${nombresClases}`.substring(0, 127), // PayPal limita a 127 caracteres
            amount: {
              currency_code: 'USD',
              value: totalUsd.toFixed(2), // Aseguramos formato texto con 2 decimales (ej: "45.00")
            },
          },
        ],
      }),
    });

    const order = await response.json();
    const urlAprobacion = order.links?.find((link: any) => link.rel === 'approve')?.href;

    return {
      idPagoExterno: order.id,
      urlPago: urlAprobacion || '',
    };
  }
 
}