import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CatalogItemPaymentPolicy,
  CatalogItemType,
  CatalogItemUnit,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { CATALOG_CSV_COLUMNS, csvStringify, parseCsv } from './catalog-csv.helper';

interface CatalogItemInput {
  ownerId: string;
  title: string;
  description: string | null;
  type: CatalogItemType;
  isActive: boolean;
  isBookable: boolean;
  price: number | null;
  durationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  unit: CatalogItemUnit | null;
  paymentPolicy: CatalogItemPaymentPolicy | null;
  prepaymentValue: number | null;
  category: string | null;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(ownerId: string) {
    return this.prisma.catalogItem.findMany({
      where: { ownerId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findBookableServices(ownerId: string) {
    return this.prisma.catalogItem.findMany({
      where: {
        ownerId,
        type: CatalogItemType.SERVICE,
        isActive: true,
        isBookable: true,
        price: { not: null },
        durationMinutes: { gt: 0 },
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        durationMinutes: true,
        paymentPolicy: true,
        prepaymentValue: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, ownerId: string) {
    const catalogItem = await this.prisma.catalogItem.findFirst({
      where: { id, ownerId },
    });

    if (!catalogItem) {
      throw new NotFoundException(`CatalogItem with id "${id}" was not found`);
    }

    return catalogItem;
  }

  create(dto: CreateCatalogItemDto, ownerId: string) {
    return this.prisma.catalogItem.create({
      data: this.toPrismaData({
        ownerId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        isActive: dto.isActive ?? true,
        isBookable: dto.isBookable ?? true,
        price: dto.price ?? null,
        durationMinutes: dto.durationMinutes ?? null,
        bufferBeforeMinutes: dto.bufferBeforeMinutes ?? 0,
        bufferAfterMinutes: dto.bufferAfterMinutes ?? 0,
        unit: dto.unit ?? null,
        paymentPolicy: dto.paymentPolicy ?? null,
        prepaymentValue: dto.prepaymentValue ?? null,
        category: dto.category ?? null,
      }),
    });
  }

  async update(id: string, dto: UpdateCatalogItemDto, ownerId: string) {
    const catalogItem = await this.findOne(id, ownerId);

    return this.prisma.catalogItem.update({
      where: { id },
      data: this.toPrismaData({
        ownerId: catalogItem.ownerId,
        title: dto.title ?? catalogItem.title,
        description:
          dto.description === undefined
            ? catalogItem.description
            : dto.description,
        type: dto.type ?? catalogItem.type,
        isActive: dto.isActive ?? catalogItem.isActive,
        isBookable: dto.isBookable ?? catalogItem.isBookable,
        price: dto.price === undefined ? catalogItem.price : dto.price,
        durationMinutes:
          dto.durationMinutes === undefined
            ? catalogItem.durationMinutes
            : dto.durationMinutes,
        bufferBeforeMinutes:
          dto.bufferBeforeMinutes ?? catalogItem.bufferBeforeMinutes,
        bufferAfterMinutes:
          dto.bufferAfterMinutes ?? catalogItem.bufferAfterMinutes,
        unit: dto.unit === undefined ? catalogItem.unit : dto.unit,
        paymentPolicy:
          dto.paymentPolicy === undefined
            ? catalogItem.paymentPolicy
            : dto.paymentPolicy,
        prepaymentValue:
          dto.prepaymentValue === undefined
            ? catalogItem.prepaymentValue
            : dto.prepaymentValue,
        category:
          dto.category === undefined ? catalogItem.category : dto.category,
      }),
    });
  }

  async archive(id: string, ownerId: string) {
    await this.findOne(id, ownerId);

    return this.prisma.catalogItem.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  async exportCsv(ownerId: string) {
    const items = await this.prisma.catalogItem.findMany({ where: { ownerId }, orderBy: [{ createdAt: 'asc' }] });
    return csvStringify(CATALOG_CSV_COLUMNS, items.map((item) => ({
      type: item.type, title: item.title, description: item.description, price: item.price,
      category: item.category, isActive: item.isActive, durationMinutes: item.durationMinutes,
      bufferBeforeMinutes: item.bufferBeforeMinutes, bufferAfterMinutes: item.bufferAfterMinutes,
      isBookable: item.isBookable, unit: item.unit, paymentPolicy: item.paymentPolicy,
      prepaymentValue: item.prepaymentValue,
    })));
  }

  previewCsv(csv: string, ownerId: string) {
    const rows = parseCsv(csv.replace(/^\uFEFF/, ''));
    const header = rows.shift() ?? [];
    const missing = CATALOG_CSV_COLUMNS.filter((column) => !header.includes(column));
    if (missing.length) throw new BadRequestException(`CSV is missing columns: ${missing.join(', ')}`);
    const seen = new Set<string>();
    const results = rows.filter((row) => row.some((value) => value !== '')).map((row, index) => {
      const source = Object.fromEntries(header.map((column, position) => [column, row[position] ?? '']));
      const key = `${source.type}|${source.title}`;
      const errors: string[] = [];
      if (seen.has(key)) errors.push('Duplicate type/title row in this file'); else seen.add(key);
      try { this.toPrismaData(this.csvInput(source, ownerId)); } catch (error) { errors.push(error instanceof Error ? error.message : 'Invalid row'); }
      return { rowNumber: index + 2, source, errors };
    });
    return { validRows: results.filter((row) => row.errors.length === 0), invalidRows: results.filter((row) => row.errors.length > 0) };
  }

  async importCsv(csv: string, ownerId: string) {
    const preview = this.previewCsv(csv, ownerId);
    if (preview.invalidRows.length) throw new BadRequestException({ message: 'CSV has invalid rows; nothing was imported', preview });
    await this.prisma.$transaction((tx) => Promise.all(preview.validRows.map((row) => tx.catalogItem.create({ data: this.toPrismaData(this.csvInput(row.source, ownerId)) }))));
    return { created: preview.validRows.length };
  }

  private csvInput(source: Record<string, string>, ownerId: string): CatalogItemInput {
    const optional = (value: string) => value === '' ? null : value;
    const numeric = (name: string) => { const value = optional(source[name]); if (value === null) return null; if (!/^\d+$/.test(value)) throw new BadRequestException(`${name} must be an integer`); return Number(value); };
    const bool = (name: string) => { if (source[name] === 'true') return true; if (source[name] === 'false') return false; throw new BadRequestException(`${name} must be true or false`); };
    if (!Object.values(CatalogItemType).includes(source.type as CatalogItemType)) throw new BadRequestException('type is invalid');
    if (!source.title.trim()) throw new BadRequestException('title is required');
    const unit = optional(source.unit) as CatalogItemUnit | null;
    const policy = optional(source.paymentPolicy) as CatalogItemPaymentPolicy | null;
    if (unit && !Object.values(CatalogItemUnit).includes(unit)) throw new BadRequestException('unit is invalid');
    if (policy && !Object.values(CatalogItemPaymentPolicy).includes(policy)) throw new BadRequestException('paymentPolicy is invalid');
    return { ownerId, title: source.title.trim(), description: optional(source.description), type: source.type as CatalogItemType,
      isActive: bool('isActive'), isBookable: bool('isBookable'), price: numeric('price'), category: optional(source.category),
      durationMinutes: numeric('durationMinutes'), bufferBeforeMinutes: numeric('bufferBeforeMinutes') ?? 0,
      bufferAfterMinutes: numeric('bufferAfterMinutes') ?? 0, unit, paymentPolicy: policy, prepaymentValue: numeric('prepaymentValue') };
  }

  private toPrismaData(
    input: CatalogItemInput,
  ): Prisma.CatalogItemUncheckedCreateInput {
    this.validateBusinessRules(input);

    if (input.type === CatalogItemType.PRODUCT) {
      return {
        ...input,
        isBookable: false,
        durationMinutes: null,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        paymentPolicy: null,
        prepaymentValue: null,
      };
    }

    return {
      ...input,
      unit: null,
    };
  }

  private validateBusinessRules(input: CatalogItemInput) {
    if (input.type === CatalogItemType.PRODUCT && !input.unit) {
      throw new BadRequestException('unit is required for PRODUCT');
    }

    if (input.type === CatalogItemType.SERVICE && input.unit) {
      throw new BadRequestException('unit is only allowed for PRODUCT');
    }

    const needsPrepaymentValue =
      input.paymentPolicy === CatalogItemPaymentPolicy.FIXED_PREPAYMENT ||
      input.paymentPolicy === CatalogItemPaymentPolicy.PERCENT_PREPAYMENT;

    if (needsPrepaymentValue && input.prepaymentValue === null) {
      throw new BadRequestException(
        'prepaymentValue is required for fixed or percent prepayment',
      );
    }

    if (needsPrepaymentValue && input.prepaymentValue !== null) {
      if (input.prepaymentValue <= 0) {
        throw new BadRequestException(
          'prepaymentValue must be greater than zero for fixed or percent prepayment',
        );
      }

      if (
        input.paymentPolicy === CatalogItemPaymentPolicy.PERCENT_PREPAYMENT &&
        input.prepaymentValue > 100
      ) {
        throw new BadRequestException(
          'percent prepaymentValue must not be greater than 100',
        );
      }
    }

    if (!needsPrepaymentValue && input.prepaymentValue !== null) {
      throw new BadRequestException(
        'prepaymentValue is only allowed for fixed or percent prepayment',
      );
    }
  }
}
