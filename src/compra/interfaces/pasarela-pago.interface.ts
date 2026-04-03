import { Usuario } from '../../usuario/entities/usuario.entity';
import { Categoria } from '../../categoria/entities/categoria.entity';
import { Compra } from '../entities/compra.entity';

export interface RespuestaIntencionPago {
  idPagoExterno: string; 
  urlPago?: string;       
  clientSecret?: string;  
}

export interface IPasarelaPago {
  crearIntencionPago(
    compra: Compra,
    usuario: Usuario,
    categoria: Categoria,
  ): Promise<RespuestaIntencionPago>;
}