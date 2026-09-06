import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    describe('health', () => {
      it('reports liveness without infrastructure details', () => {
        expect(appController.getHealth()).toEqual({ status: 'ok' });
      });

      it('reports database readiness', async () => {
        prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

        await expect(appController.getReadiness()).resolves.toEqual({
          status: 'ready',
        });
      });
    });
  });
});
