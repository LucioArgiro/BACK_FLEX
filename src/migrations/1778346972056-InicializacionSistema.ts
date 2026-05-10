import { MigrationInterface, QueryRunner } from "typeorm";

export class InicializacionSistema1778346972056 implements MigrationInterface {
    name = 'InicializacionSistema1778346972056'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`comprobantes\` (\`id\` varchar(36) NOT NULL, \`numeroSecuencial\` int NOT NULL AUTO_INCREMENT, \`numeroRecibo\` varchar(255) NOT NULL, \`grupoPagoId\` varchar(255) NOT NULL, \`urlPdf\` varchar(255) NULL, \`fechaEmision\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`idUsuario\` varchar(255) NOT NULL, INDEX \`IDX_b8697a4013e9c03075d074bd1a\` (\`numeroSecuencial\`), INDEX \`IDX_0f0e08110ac9b668a34e7fd177\` (\`grupoPagoId\`), UNIQUE INDEX \`IDX_e723b6d77dda19989722886929\` (\`numeroRecibo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`usuarios\` (\`id\` varchar(36) NOT NULL, \`correo\` varchar(255) NOT NULL, \`contrasena\` varchar(255) NOT NULL, \`nombre\` varchar(255) NOT NULL, \`apellido\` varchar(255) NOT NULL, \`telefono\` varchar(255) NULL, \`fechaNacimiento\` varchar(10) NULL, \`documentoIdentidad\` varchar(255) NULL, \`pais\` varchar(255) NULL, \`provincia\` varchar(255) NULL, \`ciudad\` varchar(255) NULL, \`direccion\` varchar(255) NULL, \`codigoPostal\` varchar(255) NULL, \`rol\` enum ('ADMIN', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE', \`correoVerificado\` tinyint NOT NULL DEFAULT 0, \`codigoOtp\` varchar(255) NULL, \`expiracionOtp\` timestamp NULL, \`idSesionActual\` varchar(255) NULL, \`tokenRecuperacion\` varchar(255) NULL, \`expiracionRecuperacion\` timestamp NULL, \`fechaCreacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`fechaActualizacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_63665765c1a778a770c9bd585d\` (\`correo\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`compras\` (\`id\` varchar(36) NOT NULL, \`idUsuario\` varchar(255) NOT NULL, \`idCategoria\` varchar(255) NOT NULL, \`estado\` enum ('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE', \`plataforma\` enum ('MERCADOPAGO', 'PAYPAL') NULL, \`montoCobrado\` decimal(10,2) NULL, \`moneda\` varchar(3) NULL, \`idPagoExterno\` varchar(255) NULL, \`urlPago\` varchar(255) NULL, \`grupoPagoId\` varchar(255) NULL, \`fechaCompra\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_783ce0a1984043756f1dd5177f\` (\`grupoPagoId\`), INDEX \`IDX_5126c0470a79b87b8f64b8f4a1\` (\`idUsuario\`, \`estado\`), INDEX \`IDX_f9e9be0e7a1ba50dfb02e1ff7e\` (\`estado\`, \`fechaCompra\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`categorias\` (\`id\` varchar(36) NOT NULL, \`titulo\` varchar(255) NOT NULL, \`descripcionCard\` varchar(255) NULL, \`descripcionBreve\` varchar(255) NULL, \`descripcionDetallada\` text NULL, \`precioArs\` decimal(10,2) NULL, \`precioUsd\` decimal(10,2) NULL, \`destacada\` tinyint NOT NULL DEFAULT 0, \`assetIdMuestra\` varchar(255) NULL, \`playbackIdMuestra\` varchar(255) NULL, \`imagenHero\` varchar(255) NULL, \`imagenTarjeta\` varchar(255) NULL, \`beneficios\` text NULL, \`fechaCreacion\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`videos\` (\`id\` varchar(36) NOT NULL, \`titulo\` varchar(255) NOT NULL, \`descripcion\` text NULL, \`assetId\` varchar(255) NULL, \`playbackId\` varchar(255) NULL, \`estado\` enum ('PROCESANDO', 'LISTO', 'ERROR') NOT NULL DEFAULT 'PROCESANDO', \`imagenUrl\` varchar(255) NULL, \`orden\` int NOT NULL, \`duracion\` int NULL, \`idCategoria\` varchar(255) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`progreso_videos\` (\`id\` varchar(36) NOT NULL, \`fechaCompletado\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`usuarioId\` varchar(36) NULL, \`videoId\` varchar(36) NULL, UNIQUE INDEX \`IDX_d42aedd935ff62f310246639ba\` (\`usuarioId\`, \`videoId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`comprobantes\` ADD CONSTRAINT \`FK_5aa54d7d5607963b883bf044331\` FOREIGN KEY (\`idUsuario\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`compras\` ADD CONSTRAINT \`FK_37bc209d1c68d0a719e486dc618\` FOREIGN KEY (\`idUsuario\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`compras\` ADD CONSTRAINT \`FK_0fef2daa0a587aa99dbb5e00bd3\` FOREIGN KEY (\`idCategoria\`) REFERENCES \`categorias\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`videos\` ADD CONSTRAINT \`FK_e9482dfad035e8f43c1fffcf650\` FOREIGN KEY (\`idCategoria\`) REFERENCES \`categorias\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`progreso_videos\` ADD CONSTRAINT \`FK_527215d81f77a2c0956208a11a5\` FOREIGN KEY (\`usuarioId\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`progreso_videos\` ADD CONSTRAINT \`FK_b3aae799d5aa47487037b203d4a\` FOREIGN KEY (\`videoId\`) REFERENCES \`videos\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`progreso_videos\` DROP FOREIGN KEY \`FK_b3aae799d5aa47487037b203d4a\``);
        await queryRunner.query(`ALTER TABLE \`progreso_videos\` DROP FOREIGN KEY \`FK_527215d81f77a2c0956208a11a5\``);
        await queryRunner.query(`ALTER TABLE \`videos\` DROP FOREIGN KEY \`FK_e9482dfad035e8f43c1fffcf650\``);
        await queryRunner.query(`ALTER TABLE \`compras\` DROP FOREIGN KEY \`FK_0fef2daa0a587aa99dbb5e00bd3\``);
        await queryRunner.query(`ALTER TABLE \`compras\` DROP FOREIGN KEY \`FK_37bc209d1c68d0a719e486dc618\``);
        await queryRunner.query(`ALTER TABLE \`comprobantes\` DROP FOREIGN KEY \`FK_5aa54d7d5607963b883bf044331\``);
        await queryRunner.query(`DROP INDEX \`IDX_d42aedd935ff62f310246639ba\` ON \`progreso_videos\``);
        await queryRunner.query(`DROP TABLE \`progreso_videos\``);
        await queryRunner.query(`DROP TABLE \`videos\``);
        await queryRunner.query(`DROP TABLE \`categorias\``);
        await queryRunner.query(`DROP INDEX \`IDX_f9e9be0e7a1ba50dfb02e1ff7e\` ON \`compras\``);
        await queryRunner.query(`DROP INDEX \`IDX_5126c0470a79b87b8f64b8f4a1\` ON \`compras\``);
        await queryRunner.query(`DROP INDEX \`IDX_783ce0a1984043756f1dd5177f\` ON \`compras\``);
        await queryRunner.query(`DROP TABLE \`compras\``);
        await queryRunner.query(`DROP INDEX \`IDX_63665765c1a778a770c9bd585d\` ON \`usuarios\``);
        await queryRunner.query(`DROP TABLE \`usuarios\``);
        await queryRunner.query(`DROP INDEX \`IDX_e723b6d77dda19989722886929\` ON \`comprobantes\``);
        await queryRunner.query(`DROP INDEX \`IDX_0f0e08110ac9b668a34e7fd177\` ON \`comprobantes\``);
        await queryRunner.query(`DROP INDEX \`IDX_b8697a4013e9c03075d074bd1a\` ON \`comprobantes\``);
        await queryRunner.query(`DROP TABLE \`comprobantes\``);
    }

}
