import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LocalNotificationProvider } from './local-notification.provider';
import { NOTIFICATION_PROVIDER } from './notification.provider';
import { NotificationsController } from './notifications.controller';
import { NotificationService } from './notifications.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    LocalNotificationProvider,
    {
      provide: NOTIFICATION_PROVIDER,
      useExisting: LocalNotificationProvider,
    },
  ],
  exports: [NotificationService, NOTIFICATION_PROVIDER],
})
export class NotificationsModule {}
