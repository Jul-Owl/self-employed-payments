import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationDelivery,
  NotificationProvider,
} from './notification.provider';

@Injectable()
export class LocalNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(LocalNotificationProvider.name);

  async send(notification: NotificationDelivery): Promise<void> {
    this.logger.log(
      `Local notification ${notification.id} (${notification.type}) for ${notification.recipient}`,
    );
  }
}
