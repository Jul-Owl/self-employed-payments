import { Body, Controller, Get, Post } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payments')
  handlePaymentWebhook(@Body() body: any) {
    return this.webhooksService.handlePaymentWebhook(body);
  }

  @Get()
  findAll() {
    return this.webhooksService.findAll();
  }
}