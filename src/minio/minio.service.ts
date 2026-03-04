import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private minioClient: Minio.Client;
  private bucketName = 'flex-studio-videos';

  constructor() {

    this.minioClient = new Minio.Client({
      endPoint: 'localhost',
      port: 9000,
      useSSL: false,
      accessKey: 'admin_minio',
      secretKey: 'supersecretminio',
    });
  }


  async onModuleInit() {
    const existe = await this.minioClient.bucketExists(this.bucketName);
    if (!existe) {
      await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
      const policy = {
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${this.bucketName}/*`],
        }],
      };
      await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
      console.log(`Bucket '${this.bucketName}' creado y configurado como público.`);
    }
  }

  async subirArchivo(archivo: Express.Multer.File): Promise<string> {
    const nombreUnico = `${Date.now()}-${archivo.originalname.replace(/\s/g, '_')}`;
    
    try {
      await this.minioClient.putObject(
        this.bucketName,
        nombreUnico,
        archivo.buffer,
        archivo.size,
        { 'Content-Type': archivo.mimetype }
      );
      
      return `http://localhost:9000/${this.bucketName}/${nombreUnico}`;
    } catch (error) {
      throw new InternalServerErrorException('Error al subir el video a MinIO');
    }
  }

  async eliminarArchivo(urlCompleta: string): Promise<void> {
    try {
      const partes = urlCompleta.split('/');
      const nombreArchivo = partes[partes.length - 1];
      await this.minioClient.removeObject(this.bucketName, nombreArchivo);
      
      console.log(`🧹 Archivo físico eliminado de MinIO: ${nombreArchivo}`);
    } catch (error) {
      console.error('Error al intentar eliminar el archivo de MinIO:', error);
    }
  }
}