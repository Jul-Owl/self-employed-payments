import { Module } from '@nestjs/common';
import { LedgerModule } from '../ledger/ledger.module';
import { BookingModule } from '../booking/booking.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [PrismaModule, LedgerModule, BookingModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
