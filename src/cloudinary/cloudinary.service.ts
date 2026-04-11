import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('cloudinary.cloudName');
    const apiKey = this.config.get<string>('cloudinary.apiKey');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async uploadImageBuffer(
    buffer: Buffer,
    mimeType: string,
    subPath: string,
  ): Promise<string> {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }
    const folder = `${this.config.get<string>('cloudinary.folder') ?? 'herbizreach'}/${subPath}`;
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      overwrite: true,
    });
    if (!result?.secure_url) {
      this.logger.error('Cloudinary upload returned no secure_url');
      throw new Error('Image upload failed');
    }
    return result.secure_url as string;
  }
}
