import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOwner(userId: string) {
    let row = await this.prisma.storeSettings.findUnique({ where: { userId } });
    if (!row) {
      row = await this.prisma.storeSettings.create({
        data: { userId },
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
        ...(dto.accentColor !== undefined && { accentColor: dto.accentColor || null }),
        ...(dto.tagline !== undefined && { tagline: dto.tagline || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
        ...(dto.showChatWidget !== undefined && { showChatWidget: dto.showChatWidget }),
      },
    });
  }
}
