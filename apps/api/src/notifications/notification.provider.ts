import { NotificationType, Prisma } from '@prisma/client';

export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

export interface NotificationDelivery {
  id: string;
  type: NotificationType;
  recipient: string;
  payloadSnapshot: Prisma.JsonValue;
}

export interface NotificationProvider {
  send(notification: NotificationDelivery): Promise<void>;
}
