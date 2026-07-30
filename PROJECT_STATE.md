# Project State

Дата актуализации: 2026-07-13

## Текущее состояние

Собран локальный рабочий прототип сервиса для самозанятых.

## Архитектура

### Frontend

Приложение на Next.js.

Реализованы экраны:

* Dashboard;
* список платёжных ссылок;
* создание платёжной ссылки;
* детали платёжной ссылки;
* список операций;
* детали операции;
* список чеков;
* детали чека.

### Backend

API на NestJS.

Подключены модули:

* PaymentLinksModule;
* TransactionsModule;
* ReceiptsModule;
* DashboardModule;
* LedgerModule;
* WebhooksModule;
* PrismaModule.

### Database

Используется локальный PostgreSQL.

Prisma используется для:

* описания схемы;
* миграций;
* доступа к данным.

## Реализованные сущности

### PaymentLink

Назначение: ссылка для приёма оплаты.

Поля:

* id;
* title;
* amount;
* payerType;
* status;
* createdAt.

Статусы:

* ACTIVE;
* ARCHIVED.

### Transaction

Назначение: факт и финансовый результат оплаты.

Поля:

* id;
* title;
* client;
* grossAmount;
* taxAmount;
* platformFeeAmount;
* netAmount;
* date;
* status;
* createdAt;
* paymentLinkId.

Статусы:

* RECEIVED;
* PROCESSED.

### Receipt

Назначение: чек по операции.

Поля:

* id;
* title;
* client;
* amount;
* status;
* date;
* createdAt;
* transactionId.

Статусы:

* PENDING;
* ISSUED;
* FAILED.

### LedgerEntry

Назначение: проводка движения денег.

Поля:

* id;
* transactionId;
* type;
* direction;
* amount;
* createdAt.

Типы проводок:

* CLIENT_PAYMENT_RECEIVED;
* TAX_RESERVED;
* PLATFORM_FEE_RESERVED;
* SELF_EMPLOYED_BALANCE.

Направления:

* CREDIT (зачисление);
* DEBIT (резервирование/списание).

## Связи

```text
PaymentLink
  └── Transaction[]
        ├── Receipt
        └── LedgerEntry[] (4 записи)
```

## Денежная модель

Для тестового сценария:

```text
grossAmount
- taxAmount
- platformFeeAmount
= netAmount
```

Текущие тестовые правила:

* налог: 4%;
* комиссия платформы: 1% (временное правило MVP).

Модель монетизации (PERCENT, SUBSCRIPTION, HYBRID) будет определена на этапе Monetization.
При модели SUBSCRIPTION платформа установит platformFeeAmount=0 для клиентских платежей, 
а ежемесячная плата будет проходить отдельным денежным контуром на расчётный счёт платформы.

## Что уже работает

* создание платёжной ссылки;
* сохранение ссылки в PostgreSQL;
* просмотр списка и деталей;
* имитация оплаты;
* создание Transaction, Receipt и 4 LedgerEntry атомарно;
* связи между сущностями;
* Ledger как источник истины для финансовых показателей;
* Dashboard рассчитывает баланс через агрегацию LedgerEntry;
* simulate-payment и payment.succeeded (webhook) являются атомарными операциями;
* отображение налога, комиссии и суммы к выводу;
* frontend получает данные через backend API.

## Что пока является симуляцией

`POST /payment-links/:id/simulate-payment`

Этот endpoint временно заменяет будущий webhook банка.

## Важные продуктовые решения

### Денежные контуры

Клиентские платежи:

```text
Клиент
→ номинальный счёт
→ налоговый резерв
→ комиссия платформы при процентном тарифе
→ остаток самозанятого
```

Выручка платформы по подписке:

```text
Самозанятый
→ обычный расчётный счёт платформы
```

Эти два потока должны учитываться раздельно.

### Монетизация

Планируется поддержка:

* процентной комиссии;
* фиксированного ежемесячного тарифа;
* гибридного тарифа.

Тариф должен назначаться:

* всем клиентам;
* сегменту;
* группе;
* отдельному клиенту.

### Онлайн-запись

Предоплата не обязательна.

Для услуги должны поддерживаться:

* без предоплаты;
* фиксированная предоплата;
* процентная предоплата;
* полная оплата.

## Следующий технический этап

Добавление архитектуры CatalogItem.

**Документация:** [docs/architecture/CATALOG_ARCHITECTURE.md](./docs/architecture/CATALOG_ARCHITECTURE.md)
