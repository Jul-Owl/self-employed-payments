import { Module } from '@nestjs/common';
import { TbankPaymentsService } from './tbank-payments.service';

@Module({
  providers: [TbankPaymentsService],
  exports: [TbankPaymentsService],
})
export class TbankModule {}