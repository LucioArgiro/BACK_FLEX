import { IsArray, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { PlataformaPago } from '../entities/compra.entity';

export class CrearCompraDto {
    @IsNotEmpty({ message: 'El carrito no puede estar vacío' })
    @IsArray({ message: 'Se esperaba una lista de clases' })
    @IsUUID('4', { each: true, message: 'Uno de los IDs de las clases no es válido' })
    idsCategorias!: string[];

    @IsEnum(PlataformaPago, { message: 'La plataforma debe ser MERCADOPAGO o PAYPAL' })
    @IsNotEmpty({ message: 'Debes elegir un método de pago' })
    plataforma!: PlataformaPago;

    @IsString()
    @IsNotEmpty({ message: 'El token de seguridad (Captcha) es obligatorio' })
    captchaToken!: string;
}