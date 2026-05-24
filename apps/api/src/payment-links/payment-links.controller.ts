import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PaymentLinksService } from './payment-links.service';

@Controller('payment-links')
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Get()
  findAll() {
    return this.paymentLinksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentLinksService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.paymentLinksService.create(body);
  }

  @Post(':id/simulate-payment')
  simulatePayment(@Param('id') id: string) {
    return this.paymentLinksService.simulatePayment(id);
  }
}