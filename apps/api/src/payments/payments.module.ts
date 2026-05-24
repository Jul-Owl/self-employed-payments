import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TbankModule } from '../providers/tbank/tbank.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule, TbankModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}