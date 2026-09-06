# Project State

Дата актуализации: 2026-09-05

## Текущее состояние

Собран локальный рабочий прототип сервиса для самозанятых.

## Пользователи и ownership

Реализовано: один `User` соответствует одному бизнесу MVP. Owner-facing API
требует действующую server-side session из HttpOnly cookie; пароль хранится
только как bcrypt hash. CatalogItem, Calendar configuration, Booking,
PaymentLink и Transaction изолированы по `ownerId`. Public booking использует
`/book/[publicSlug]`; slug определяет бизнес, а не передаётся как ownerId.

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
* публичная страница онлайн-записи `/book`.
* owner-экраны управления записями `/bookings`.

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
* CalendarModule;
* BookingModule;
* AvailabilityModule;
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

### Calendar availability

Calendar остаётся концептуальной областью; отдельной сущности Calendar нет.

Реализовано:

* базовый недельный график через WeeklyWorkingHours;
* государственные правила конкретной даты через OfficialCalendarDay;
* ручные переопределения даты через CalendarDateOverride;
* разрешение доступности даты с приоритетом:
  override > official calendar > weekly schedule.

### Booking

Реализовано:

* создание, просмотр, перенос, отмена и завершение записи;
* snapshot позиций CatalogItem в BookingItem;
* последовательный расчёт нескольких SERVICE с буферами только первой и
  последней услуги;
* проверка пересечений с подтверждёнными записями.

### Availability Core

Реализовано:

* вычисляемый endpoint `GET /availability`;
* слоты не хранятся в БД, а рассчитываются по Calendar, активным CatalogItem и
  CONFIRMED Booking;
* PRODUCT не влияет на длительность и зарезервированный интервал;
* Calendar остаётся источником истины для рабочего дня и его overrides.

### Public Online Booking

Реализовано:

* временный single-business public route `/book`;
* выбор одной или нескольких bookable SERVICE с сохранением порядка выбора;
* загрузка вычисляемой Availability и создание Booking через существующие API;
* обработка конфликтов занятых слотов с повторной загрузкой Availability;
* success state с фактическими данными созданной Booking.

`/book` является временным single-business public route MVP. После появления
ownership и public profile маршрут эволюционирует в business-specific public
booking URL. Исполнение предоплаты и платежи пока не подключены.

### Calendar / Booking Management UI

Реализовано:

* список записей владельца по выбранной дате и детали `/bookings/:id`;
* создание ручной записи, перенос, отмена и завершение через Booking Core;
* перенос использует BookingItem snapshots, а не текущие CatalogItem;
* `GET /bookings` поддерживает date range для календарных представлений.

Payment lifecycle по-прежнему не связан с Booking.

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
* API управления недельным графиком, государственными правилами и ручными
  переопределениями Calendar.

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

Notifications / Pilot UX hardening. Денежный следующий этап для Booking —
T-Bank и связь Booking ↔ Payment после получения integration requirements.

**Документация:** [docs/architecture/CATALOG_ARCHITECTURE.md](./docs/architecture/CATALOG_ARCHITECTURE.md)

**Карта предметной области:** [docs/architecture/DOMAIN_MODEL.md](./docs/architecture/DOMAIN_MODEL.md)
