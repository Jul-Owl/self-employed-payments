import { BookingPaymentStatus, WebhookEventStatus } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService booking payments', () => {
  const tx = {
    webhookEvent: {
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    paymentLink: {
      findUnique: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    booking: {
      updateMany: jest.fn(),
    },
    receipt: {
      create: jest.fn(),
    },
  };

  const prisma = {
    webhookEvent: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => callback(tx)),
  };

  const ledgerService = {
    createTransactionEntries: jest.fn(),
  };

  const service = new WebhooksService(
    prisma as unknown as PrismaService,
    ledgerService as unknown as LedgerService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    tx.webhookEvent.create.mockResolvedValue({ id: 'webhook-1' });
    tx.webhookEvent.update.mockResolvedValue({ id: 'webhook-1' });
    tx.payment.updateMany.mockResolvedValue({ count: 1 });
    tx.transaction.create.mockResolvedValue({
      id: 'transaction-1',
      title: 'Booking payment',
      client: 'Client',
    });
    tx.booking.updateMany.mockResolvedValue({ count: 1 });
    tx.receipt.create.mockResolvedValue({ id: 'receipt-1' });
    ledgerService.createTransactionEntries.mockResolvedValue(undefined);
  });

  function mockBookingPayment(requiredPaymentAmount = 250) {
    tx.payment.findUnique.mockResolvedValue({
      id: 'payment-1',
      amount: requiredPaymentAmount,
      paymentLink: null,
      booking: {
        id: 'booking-1',
        ownerId: 'owner-a',
        requiredPaymentAmount,
      },
    });
  }

  it('associates a successful payment with its booking using the payment-owned tenant', async () => {
    mockBookingPayment();

    await service.handlePaymentWebhook({
      provider: 'test-provider',
      eventType: 'payment.succeeded',
      externalPaymentId: 'external-1',
      amount: 250,
      paymentLinkId: 'foreign-link-id',
      idempotencyKey: 'event-1',
    });

    expect(tx.paymentLink.findUnique).not.toHaveBeenCalled();
    expect(tx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: 'owner-a',
          paymentLinkId: null,
        }),
      }),
    );
    expect(tx.booking.updateMany).toHaveBeenCalledWith({
      where: { id: 'booking-1', paymentId: 'payment-1' },
      data: { paymentStatus: BookingPaymentStatus.PAID },
    });
  });

  it('rejects a booking payment with an amount different from its immutable requirement', async () => {
    mockBookingPayment();

    const result = await service.handlePaymentWebhook({
      provider: 'test-provider',
      eventType: 'payment.succeeded',
      externalPaymentId: 'external-1',
      amount: 200,
      idempotencyKey: 'event-2',
    });

    expect(result.transaction).toBeNull();
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: WebhookEventStatus.FAILED }),
      }),
    );
  });

  it('does not create another transaction or ledger posting when a success retry finds an already claimed payment', async () => {
    mockBookingPayment();
    tx.payment.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.handlePaymentWebhook({
      provider: 'test-provider',
      eventType: 'payment.succeeded',
      externalPaymentId: 'external-1',
      amount: 250,
      idempotencyKey: 'event-retry',
    });

    expect(result.duplicated).toBe(true);
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(ledgerService.createTransactionEntries).not.toHaveBeenCalled();
  });
});
