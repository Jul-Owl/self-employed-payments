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
* каталог товаров и услуг.

### Backend

API на NestJS.

Подключены модули:

* PaymentLinksModule;
* TransactionsModule;
* ReceiptsModule;
* DashboardModule;
* LedgerModule;
* WebhooksModule;
* CatalogModule;
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
* FAILED.

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

### CatalogItem

Назначение: изменяемый шаблон товара или услуги для будущих продаж и
бронирований. Не является продажей, бронированием или финансовой операцией.

Реализовано:

* типы SERVICE и PRODUCT;
* типовые цена, описание и категория;
* параметры SERVICE: длительность, буферы, доступность для записи и
  предоплата;
* единица измерения PRODUCT;
* мягкая архивация через isActive;
* CRUD API `/catalog`.

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

Модель монетизации будет определена на этапе Monetization. Базовые модели —
Commission (PERCENT) и Subscription; Hybrid является их комбинацией.
При модели Subscription платформа установит platformFeeAmount=0 для клиентских платежей,
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
* создание, редактирование и архивирование CatalogItem через API и frontend.

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

* Commission — процентной комиссии;
* Subscription — фиксированного ежемесячного тарифа;
* Hybrid как комбинации Commission и Subscription.

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

Calendar and Booking.

**Документация:** [docs/architecture/CATALOG_ARCHITECTURE.md](./docs/architecture/CATALOG_ARCHITECTURE.md)

**Карта предметной области:** [docs/architecture/DOMAIN_MODEL.md](./docs/architecture/DOMAIN_MODEL.md)
