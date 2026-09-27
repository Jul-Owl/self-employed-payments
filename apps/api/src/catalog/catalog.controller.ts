import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CatalogImportPreviewDto } from './dto/catalog-import.dto';

@Controller('catalog')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.findAll(user.id);
  }

  @Get('bookable')
  findBookableServices(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.findBookableServices(user.id);
  }

  @Get('export/csv')
  exportCsv(@CurrentUser() user: AuthenticatedUser) { return this.catalogService.exportCsv(user.id); }

  @Post('import/csv/preview')
  previewCsv(@Body() dto: CatalogImportPreviewDto, @CurrentUser() user: AuthenticatedUser) { return this.catalogService.previewCsv(dto.csv, user.id); }

  @Post('import/csv')
  importCsv(@Body() dto: CatalogImportPreviewDto, @CurrentUser() user: AuthenticatedUser) { return this.catalogService.importCsv(dto.csv, user.id); }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.findOne(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateCatalogItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogService.update(id, dto, user.id);
  }

  @Delete(':id')
  archive(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.archive(id, user.id);
  }
}
