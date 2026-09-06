import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
@UseGuards(AuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.receiptsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.receiptsService.findOne(id, user.id);
  }

  @Post()
  create(@Body() body: any, @CurrentUser() user: AuthenticatedUser) {
    return this.receiptsService.create(body, user.id);
  }
}