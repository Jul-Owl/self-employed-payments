import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CatalogItemPaymentPolicy,
  CatalogItemType,
  CatalogItemUnit,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

interface CatalogItemInput {
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

  findAll() {
    return this.prisma.catalogItem.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const catalogItem = await this.prisma.catalogItem.findUnique({
      where: { id },
    });

    if (!catalogItem) {
      throw new NotFoundException(`CatalogItem with id "${id}" was not found`);
    }

    return catalogItem;
  }

  create(dto: CreateCatalogItemDto) {
    return this.prisma.catalogItem.create({
      data: this.toPrismaData({
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

  async update(id: string, dto: UpdateCatalogItemDto) {
    const catalogItem = await this.findOne(id);

    return this.prisma.catalogItem.update({
      where: { id },
      data: this.toPrismaData({
        title: dto.title ?? catalogItem.title,
        description:
          dto.description === undefined ? catalogItem.description : dto.description,
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
        category: dto.category === undefined ? catalogItem.category : dto.category,
      }),
    });
  }

  async archive(id: string) {
    await this.findOne(id);

    return this.prisma.catalogItem.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  private toPrismaData(input: CatalogItemInput): Prisma.CatalogItemCreateInput {
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

    if (!needsPrepaymentValue && input.prepaymentValue !== null) {
      throw new BadRequestException(
        'prepaymentValue is only allowed for fixed or percent prepayment',
      );
    }
  }
}
