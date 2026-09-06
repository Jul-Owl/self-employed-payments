import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PaymentLinksService } from './payment-links.service';

@Controller('payment-links')
@UseGuards(AuthGuard)
export class PaymentLinksController {
  constructor(private readonly paymentLinksService: PaymentLinksService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.paymentLinksService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentLinksService.findOne(id, user.id);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentLinksService.create(body, user.id);
  }

  @Post(':id/simulate-payment')
  simulatePayment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentLinksService.simulatePayment(id, user.id);
  }
}