import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, registerDecorator, ValidationOptions } from 'class-validator';

@ValidatorConstraint({ name: 'esCuitValido', async: false })
export class IsCuitValidoConstraint implements ValidatorConstraintInterface {
  validate(documento: string, args: ValidationArguments) {
    if (!documento) return false;
 
    if (documento.length >= 7 && documento.length <= 8) {
        return /^\d+$/.test(documento);
    }
    
 
    if (documento.length !== 11) return false;

 
    const [digitoVerificador] = documento.slice(-1);
    const base = documento.slice(0, -1);
    const multiplicadores = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let total = 0;

    for (let i = 0; i < multiplicadores.length; i++) {
        total += parseInt(base[i]) * multiplicadores[i];
    }

    const resto = total % 11;
    let calculado = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;

    return calculado === parseInt(digitoVerificador);
  }

  defaultMessage(args: ValidationArguments) {
    return 'El DNI/CUIT ingresado no es válido (Falla verificación matemática)';
  }
}

 
export function IsCuitValido(validationOptions?: ValidationOptions) {
   return function (object: Object, propertyName: string) {
     registerDecorator({
       target: object.constructor,
       propertyName: propertyName,
       options: validationOptions,
       constraints: [],
       validator: IsCuitValidoConstraint,
     });
   };
}