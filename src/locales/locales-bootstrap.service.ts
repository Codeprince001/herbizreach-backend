import { Injectable, OnModuleInit } from '@nestjs/common';
import { LocalesService } from './locales.service';

@Injectable()
export class LocalesBootstrapService implements OnModuleInit {
  constructor(private readonly locales: LocalesService) {}

  async onModuleInit() {
    await this.locales.ensureDefaultLocales();
  }
}
