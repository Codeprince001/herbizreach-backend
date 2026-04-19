import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private app: admin.app.App | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    try {
      const jsonRaw = this.config.get<string>('firebase.serviceAccountJson');
      const projectId = this.config.get<string>('firebase.projectId');
      const clientEmail = this.config.get<string>('firebase.clientEmail');
      const privateKey = this.config.get<string>('firebase.privateKey');

      if (jsonRaw?.trim()) {
        const parsed = JSON.parse(jsonRaw) as admin.ServiceAccount;
        if (!admin.apps.length) {
          this.app = admin.initializeApp({ credential: admin.credential.cert(parsed) });
        } else {
          this.app = admin.app();
        }
        this.logger.log('Firebase Admin initialized (service account JSON)');
        return;
      }

      if (projectId && clientEmail && privateKey) {
        if (!admin.apps.length) {
          this.app = admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        } else {
          this.app = admin.app();
        }
        this.logger.log('Firebase Admin initialized (split env vars)');
        return;
      }

      this.logger.warn(
        'FCM disabled: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
      );
    } catch (e) {
      this.logger.warn(
        `FCM disabled: Firebase Admin init failed (${e instanceof Error ? e.message : String(e)})`,
      );
    }
  }

  isEnabled(): boolean {
    return this.app !== null;
  }

  async registerToken(userId: string, token: string): Promise<void> {
    if (!token.trim()) {
      return;
    }
    await this.prisma.$transaction([
      this.prisma.userFcmToken.deleteMany({ where: { token: token.trim() } }),
      this.prisma.userFcmToken.create({
        data: { userId, token: token.trim() },
      }),
    ]);
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.prisma.userFcmToken.deleteMany({
      where: { userId, token: token.trim() },
    });
  }

  async sendPushForStoreInboundChat(
    storeUserId: string,
    conversationId: string,
    title: string,
    body: string,
  ): Promise<void> {
    if (!this.app) {
      return;
    }
    const rows = await this.prisma.userFcmToken.findMany({
      where: { userId: storeUserId },
      select: { token: true },
    });
    if (!rows.length) {
      return;
    }

    const appUrl = (this.config.get<string>('appPublicUrl') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const link = `${appUrl}/chat?conversation=${encodeURIComponent(conversationId)}`;
    const tokens = rows.map((r) => r.token);

    const messaging = admin.messaging();
    let res: Awaited<ReturnType<typeof messaging.sendEachForMulticast>>;
    try {
      res = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: {
          conversationId,
          type: 'CHAT',
        },
        webpush: {
          fcmOptions: { link },
          notification: { title, body },
        },
      });
    } catch (e) {
      this.logger.warn(`FCM multicast failed: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    const staleTokenCodes = new Set([
      'messaging/registration-token-not-registered',
      'messaging/invalid-registration-token',
    ]);
    const invalidTokens: string[] = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        this.logger.debug(`FCM send failed: ${r.error?.message ?? 'unknown'}`);
        if (r.error?.code && staleTokenCodes.has(r.error.code)) {
          invalidTokens.push(tokens[i]!);
        }
      }
    });

    if (invalidTokens.length) {
      await this.prisma.userFcmToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }
  }
}
