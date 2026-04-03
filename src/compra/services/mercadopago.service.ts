import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { IPasarelaPago, RespuestaIntencionPago } from '../interfaces/pasarela-pago.interface';
import { Compra } from '../entities/compra.entity';
import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';

@Injectable()
export class MercadoPagoService implements IPasarelaPago {
  private clienteMP: MercadoPagoConfig;

  constructor() {
    // Inicializamos el SDK de Mercado Pago con tu Access Token.
    // Asegúrate de poner MERCADOPAGO_ACCESS_TOKEN en tu archivo .env
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
      // Creamos una nueva "Preferencia" (así le llama MP al Checkout Pro)
      const preference = new Preference(this.clienteMP);

      const respuesta = await preference.create({
        body: {
          items: [
            {
              id: categoria.id,
              title: categoria.titulo,
              description: 'Suscripción Elite Training Program',
              quantity: 1,
              // Leemos el precio exacto de la base de datos para ARS
              unit_price: Number(categoria.precioArs), 
              currency_id: 'ARS',
            },
          ],
          payer: {
            name: usuario.nombre,
            surname: usuario.apellido,
            email: usuario.correo,
          },
          // ¿A dónde enviamos al usuario después de pagar? (Configurar en el .env)
          back_urls: {
            success: `${process.env.FRONTEND_URL}/checkout/exito`,
            failure: `${process.env.FRONTEND_URL}/checkout/error`,
            pending: `${process.env.FRONTEND_URL}/checkout/pendiente`,
          },
          auto_return: 'approved',
          
          // ¡CRÍTICO PARA LA ARQUITECTURA! 
          // Pasamos el ID de nuestra tabla 'compras' para que cuando MP nos envíe 
          // el webhook avisando del pago, sepamos a qué compra corresponde.
          external_reference: compra.id, 
        },
      });

      // Cumplimos con el contrato de nuestra Interfaz
      return {
        idPagoExterno: respuesta.id!,
        urlPago: respuesta.init_point, // Este es el link al que redirigiremos al frontend
      };
      
    } catch (error) {
      console.error('Error al comunicarse con Mercado Pago:', error);
      throw new InternalServerErrorException('No se pudo generar el link de pago local.');
    }
  }
}