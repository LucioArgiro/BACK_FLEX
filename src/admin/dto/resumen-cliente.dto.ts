export class ResumenClienteDto {
  id!: string;
  nombreCompleto!: string;
  correo!: string;
  pais!: string;
  telefono!: string | null;
  fechaRegistro!: Date;
  totalClasesCompradas!: number;
  totalInvertidoArs!: number;
  totalInvertidoUsd!: number;
  fechaUltimaCompra!: Date | null;
}