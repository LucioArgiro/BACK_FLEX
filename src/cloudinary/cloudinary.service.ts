import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File, folderName: string = 'flex-studio/categorias'): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: folderName },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  deleteFile(publicId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }

  extraerPublicId(url: string): string | null {
    try {
      const partes = url.split('/upload/');
      if (partes.length < 2) return null;
      let ruta = partes[1];
      if (ruta.startsWith('v') && ruta.includes('/')) {
        ruta = ruta.substring(ruta.indexOf('/') + 1);
      }
      const publicId = ruta.substring(0, ruta.lastIndexOf('.'));
      return publicId || ruta;
    } catch (error) {
      return null;
    }
  }

  uploadPdfBuffer(buffer: Buffer, nombreArchivo: string, folderName: string = 'flex-studio/comprobantes'): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          public_id: nombreArchivo,
          format: 'pdf',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async obtenerGaleria(nextCursor?: string, folderPrefix: string = 'flex-studio'): Promise<any> {
    return new Promise((resolve, reject) => {
      let search = cloudinary.search
        .expression('folder:flex-studio/* AND resource_type:image AND -folder:flex-studio/comprobantes/*')
        .sort_by('created_at', 'desc') 
        .max_results(24); 
      if (nextCursor) {
        search = search.next_cursor(nextCursor);
      }

      search.execute().then(result => {
        const imagenes = result.resources.map(res => ({
          publicId: res.public_id,
          url: res.secure_url,
          formato: res.format,
          fecha: res.created_at,
          ancho: res.width,
          alto: res.height
        }));

        resolve({
          imagenes,
          nextCursor: result.next_cursor || null,
          total: result.total_count
        });
      }).catch(error => {
        reject(error);
      });
    });
  }
}