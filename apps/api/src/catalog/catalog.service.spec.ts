import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CatalogItemPaymentPolicy,
  CatalogItemType,
  CatalogItemUnit,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';

describe('CatalogService', () => {
  const catalogItem = {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };
  const prisma = { catalogItem, $transaction: jest.fn() } as unknown as PrismaService;
  const service = new CatalogService(prisma);
  const OWNER_ID = 'owner-id';
  const create = (dto: CreateCatalogItemDto) => service.create(dto, OWNER_ID);
  const archive = (id: string) => service.archive(id, OWNER_ID);
  const findBookableServices = () => service.findBookableServices(OWNER_ID);
  const update = (id: string, dto: Parameters<CatalogService['update']>[1]) =>
    service.update(id, dto, OWNER_ID);

  const serviceDto: CreateCatalogItemDto = {
    title: 'Консультация',
    type: CatalogItemType.SERVICE,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a SERVICE without a unit', () => {
    create(serviceDto);

    expect(catalogItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Консультация',
        type: CatalogItemType.SERVICE,
        unit: null,
        isBookable: true,
      }),
    });
  });

  it('creates a PRODUCT and normalizes service-only fields', () => {
    create({
      title: 'Материалы',
      type: CatalogItemType.PRODUCT,
      unit: CatalogItemUnit.PIECE,
      isBookable: true,
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 15,
    });

    expect(catalogItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: CatalogItemType.PRODUCT,
        unit: CatalogItemUnit.PIECE,
        isBookable: false,
        durationMinutes: null,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        paymentPolicy: null,
        prepaymentValue: null,
      }),
    });
  });

  it('rejects a PRODUCT without a unit', () => {
    expect(() =>
      create({
        title: 'Материалы',
        type: CatalogItemType.PRODUCT,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a unit for a SERVICE', () => {
    expect(() =>
      create({
        ...serviceDto,
        unit: CatalogItemUnit.HOUR,
      }),
    ).toThrow('unit is only allowed for PRODUCT');
  });

  it.each([
    CatalogItemPaymentPolicy.FIXED_PREPAYMENT,
    CatalogItemPaymentPolicy.PERCENT_PREPAYMENT,
  ])('rejects %s without prepaymentValue', (paymentPolicy) => {
    expect(() =>
      create({
        ...serviceDto,
        paymentPolicy,
      }),
    ).toThrow('prepaymentValue is required for fixed or percent prepayment');
  });

  it.each([
    CatalogItemPaymentPolicy.NO_PREPAYMENT,
    CatalogItemPaymentPolicy.FULL_PREPAYMENT,
  ])('rejects a surplus prepaymentValue for %s', (paymentPolicy) => {
    expect(() =>
      create({
        ...serviceDto,
        paymentPolicy,
        prepaymentValue: 100,
      }),
    ).toThrow(
      'prepaymentValue is only allowed for fixed or percent prepayment',
    );
  });

  it.each([
    [CatalogItemPaymentPolicy.FIXED_PREPAYMENT, 0],
    [CatalogItemPaymentPolicy.PERCENT_PREPAYMENT, 0],
    [CatalogItemPaymentPolicy.PERCENT_PREPAYMENT, 101],
  ])(
    'rejects invalid prepayment value %i for %s',
    (paymentPolicy, prepaymentValue) => {
      expect(() =>
        create({
          ...serviceDto,
          paymentPolicy,
          prepaymentValue,
        }),
      ).toThrow(BadRequestException);
    },
  );

  it('archives an item by setting isActive to false', async () => {
    catalogItem.findFirst.mockResolvedValue({
      id: 'catalog-item-id',
    });

    await archive('catalog-item-id');

    expect(catalogItem.update).toHaveBeenCalledWith({
      where: { id: 'catalog-item-id' },
      data: { isActive: false },
    });
  });

  it('returns only active bookable SERVICE items for public booking', async () => {
    catalogItem.findMany.mockResolvedValue([]);

    await findBookableServices();

    expect(catalogItem.findMany).toHaveBeenCalledWith({
      where: {
        ownerId: OWNER_ID,
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
  });

  it('does not expose a CatalogItem owned by another user', async () => {
    catalogItem.findFirst.mockResolvedValue(null);

    await expect(service.findOne('other-owner-item', OWNER_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(catalogItem.findFirst).toHaveBeenCalledWith({
      where: { id: 'other-owner-item', ownerId: OWNER_ID },
    });
  });

  it('preserves PRODUCT invariants on PATCH', async () => {
    catalogItem.findFirst.mockResolvedValue({
      id: 'catalog-item-id',
      title: 'Материалы',
      description: null,
      type: CatalogItemType.PRODUCT,
      isActive: true,
      isBookable: false,
      price: null,
      durationMinutes: null,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      unit: CatalogItemUnit.PIECE,
      paymentPolicy: null,
      prepaymentValue: null,
      category: null,
    });

    await update('catalog-item-id', {
      isBookable: true,
      durationMinutes: 45,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
    });

    expect(catalogItem.update).toHaveBeenCalledWith({
      where: { id: 'catalog-item-id' },
      data: expect.objectContaining({
        type: CatalogItemType.PRODUCT,
        isBookable: false,
        durationMinutes: null,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      }),
    });
  });

  it('exports SERVICE, PRODUCT, inactive state and escaped UTF-8 fields for its owner only', async () => {
    catalogItem.findMany.mockResolvedValue([{ type: CatalogItemType.SERVICE, title: 'Услуга, "тест"', description: 'строка\nдва', price: 100, category: null, isActive: false, durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, isBookable: true, unit: null, paymentPolicy: null, prepaymentValue: null }]);
    await expect(service.exportCsv(OWNER_ID)).resolves.toContain('"Услуга, ""тест"""');
    expect(catalogItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: OWNER_ID } }));
  });

  it('previews UTF-8 valid PRODUCT rows without writes and reports invalid row numbers', () => {
    const csv = 'type,title,description,price,category,isActive,durationMinutes,bufferBeforeMinutes,bufferAfterMinutes,isBookable,unit,paymentPolicy,prepaymentValue\r\nPRODUCT,Материал,,300,,true,,, ,false,PIECE,,\r\nSERVICE,Плохая,,x,,true,60,0,0,true,,,\r\n';
    const preview = service.previewCsv(csv.replace(', ,', ',,'), OWNER_ID);
    expect(preview.validRows).toHaveLength(1);
    expect(preview.invalidRows[0]).toMatchObject({ rowNumber: 3 });
    expect(catalogItem.create).not.toHaveBeenCalled();
  });
});
