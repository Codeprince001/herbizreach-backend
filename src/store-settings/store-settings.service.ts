import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslationSource } from '@prisma/client';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { LocalesService } from '../locales/locales.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { UpsertStoreTranslationDto } from './dto/upsert-store-translation.dto';

const settingsInclude = {
  translations: { orderBy: { localeCode: 'asc' as const } },
} as const;

@Injectable()
export class StoreSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly localesService: LocalesService,
  ) {}

  async getForOwner(userId: string) {
    let row = await this.prisma.storeSettings.findUnique({
      where: { userId },
      include: settingsInclude,
    });
    if (!row) {
      await this.prisma.storeSettings.create({
        data: { userId },
      });
      row = await this.prisma.storeSettings.findUniqueOrThrow({
        where: { userId },
        include: settingsInclude,
      });
    }
    return row;
  }

  async updateForOwner(userId: string, dto: UpdateStoreSettingsDto) {
    await this.getForOwner(userId);
    return this.prisma.storeSettings.update({
      where: { userId },
      data: {
        ...(dto.whatsAppPhone !== undefined && { whatsAppPhone: dto.whatsAppPhone || null }),
        ...(dto.bannerUrl !== undefined && { bannerUrl: dto.bannerUrl || null }),
        ...(dto.profileImageUrl !== undefined && {
          profileImageUrl: dto.profileImageUrl?.trim() || null,
        }),
        ...(dto.accentColor !== undefined && { accentColor: dto.accentColor || null }),
        ...(dto.tagline !== undefined && { tagline: dto.tagline || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.showChatWidget !== undefined && { showChatWidget: dto.showChatWidget }),
      },
      include: settingsInclude,
    });
  }

  private profileDir(): string {
    const root = this.config.get<string>('uploadDir') ?? './uploads';
    return join(process.cwd(), root, 'store-profiles');
  }

  ensureProfileUploadDir() {
    const dir = this.profileDir();
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  buildLocalProfileImageUrl(filename: string): string {
    const base = this.config.get<string>('publicFilesBaseUrl') ?? 'http://localhost:4000';
    return `${base}/files/store-profiles/${filename}`;
  }

  private extensionFromMimetype(mime: string): string {
    if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg';
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/gif') return '.gif';
    return '.bin';
  }

  private async persistProfileImage(userId: string, file: Express.Multer.File): Promise<string> {
    const forceLocal = this.config.get<boolean>('useLocalImageUpload') === true;
    if (forceLocal) {
      this.ensureProfileUploadDir();
      const ext = this.extensionFromMimetype(file.mimetype);
      const filename = `${uuidv4()}${ext}`;
      const diskPath = join(this.profileDir(), filename);
      const { writeFileSync } = await import('fs');
      writeFileSync(diskPath, file.buffer);
      return this.buildLocalProfileImageUrl(filename);
    }
    if (this.cloudinaryService.isConfigured()) {
      return this.cloudinaryService.uploadImageBuffer(
        file.buffer,
        file.mimetype,
        `store-profiles/${userId}`,
      );
    }
    throw new BadRequestException(
      'Image upload: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET or USE_LOCAL_IMAGE_UPLOAD=true',
    );
  }

  async setProfileImageFromUpload(userId: string, file: Express.Multer.File | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }
    await this.getForOwner(userId);
    const url = await this.persistProfileImage(userId, file);
    return this.prisma.storeSettings.update({
      where: { userId },
      data: { profileImageUrl: url },
    });
  }

  async clearProfileImage(userId: string) {
    await this.getForOwner(userId);
    return this.prisma.storeSettings.update({
      where: { userId },
      data: { profileImageUrl: null },
    });
  }

  async upsertTranslationForOwner(
    userId: string,
    localeCode: string,
    dto: UpsertStoreTranslationDto,
  ) {
    const settings = await this.getForOwner(userId);
    const code = this.localesService.validateLocaleCode(localeCode);
    await this.localesService.assertLocaleEnabledForWrite(code);
    const existing = await this.prisma.storeSettingsTranslation.findUnique({
      where: {
        storeSettingsId_localeCode: { storeSettingsId: settings.id, localeCode: code },
      },
    });
    const nextTag =
      dto.tagline === undefined ? (existing?.tagline ?? null) : dto.tagline?.trim() || null;
    const nextDesc =
      dto.description === undefined ?
        (existing?.description ?? null)
      : dto.description?.trim() || null;
    if (!nextTag && !nextDesc) {
      throw new BadRequestException('Provide a tagline and/or description for this language');
    }
    let taglineSource = existing?.taglineSource ?? null;
    if (dto.tagline !== undefined) {
      taglineSource = nextTag ? (dto.taglineSource ?? TranslationSource.MANUAL) : null;
    }
    let descriptionSource = existing?.descriptionSource ?? null;
    if (dto.description !== undefined) {
      descriptionSource =
        nextDesc ? (dto.descriptionSource ?? TranslationSource.MANUAL) : null;
    }
    await this.prisma.storeSettingsTranslation.upsert({
      where: {
        storeSettingsId_localeCode: { storeSettingsId: settings.id, localeCode: code },
      },
      create: {
        storeSettingsId: settings.id,
        localeCode: code,
        tagline: nextTag,
        description: nextDesc,
        taglineSource,
        descriptionSource,
      },
      update: {
        tagline: nextTag,
        description: nextDesc,
        taglineSource,
        descriptionSource,
      },
    });
    return this.getForOwner(userId);
  }

  async deleteTranslationForOwner(userId: string, localeCode: string) {
    const settings = await this.getForOwner(userId);
    const code = this.localesService.validateLocaleCode(localeCode);
    await this.prisma.storeSettingsTranslation.deleteMany({
      where: { storeSettingsId: settings.id, localeCode: code },
    });
    return this.getForOwner(userId);
  }
}
