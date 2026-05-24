import { Body, Controller, Get, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  createPayment(@Body() body: any) {
    return this.paymentsService.createPayment(body);
  }

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }
}