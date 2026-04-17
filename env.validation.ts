import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';

class VariablesDeEntorno {
    @IsString()
    @IsNotEmpty({ message: 'CRÍTICO: Falta el JWT_SECRET en el .env' })
    JWT_SECRET!: string;

    @IsString()
    @IsNotEmpty({ message: 'CRÍTICO: Falta el MERCADOPAGO_ACCESS_TOKEN en el .env' })
    MERCADOPAGO_ACCESS_TOKEN!: string;

    @IsString()
    @IsNotEmpty({ message: 'CRÍTICO: Falta el MP_WEBHOOK_SECRET en el .env' })
    MERCADOPAGO_WEBHOOK_SECRET!: string;

    @IsString()
    @IsNotEmpty({ message: 'CRÍTICO: Falta el RECAPTCHA_SECRET_KEY en el .env' })
    RECAPTCHA_SECRET_KEY!: string;

    @IsString()
    @IsNotEmpty({ message: 'CRÍTICO: Falta el PAYPAL_CLIENT_ID' })
    PAYPAL_CLIENT_ID!: string;

    @IsString()
    @IsNotEmpty({ message: 'CRÍTICO: Falta el PAYPAL_SECRET' })
    PAYPAL_SECRET!: string;
}

export function validarEntorno(config: Record<string, unknown>) {
    const configuracionValidada = plainToInstance(VariablesDeEntorno, config, {
        enableImplicitConversion: true,
    });

    const errores = validateSync(configuracionValidada, { skipMissingProperties: false });

    if (errores.length > 0) {
        const mensajesDeError = errores.map((error) => Object.values(error.constraints || {})).flat();
        throw new Error(`\n\n💥 ERROR FATAL DE CONFIGURACIÓN:\n${mensajesDeError.join('\n')}\n`);
    }

    return configuracionValidada;
}