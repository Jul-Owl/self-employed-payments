# Self-Employed Payments

MVP-платформа для самозанятых, которая объединяет:

* приём оплат по ссылке;
* учёт операций;
* резервирование налога;
* удержание комиссии платформы;
* формирование чеков;
* управление доступным балансом;
* будущую онлайн-запись клиентов;
* будущую интеграцию с номинальным счётом банка.

## Основной пользовательский сценарий

1. Самозанятый создаёт платёжную ссылку.
2. Клиент оплачивает услугу.
3. Банк сообщает об оплате через webhook.
4. Платформа создаёт операцию.
5. Рассчитываются налог и комиссия платформы.
6. Создаётся чек.
7. Остаток становится доступен к выводу.

До подключения банковского API используется тестовая функция `simulate-payment`.

## Технологический стек

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* NestJS
* TypeScript
* Prisma ORM

### Database

* PostgreSQL

### Monorepo

* pnpm workspaces
* Turborepo

## Структура проекта

```text
apps/
  web/       пользовательский интерфейс
  api/       backend API
  admin/     будущая административная панель

packages/
  sdk/
  types/
```

## Локальный запуск

### Backend

```powershell
npx pnpm --filter api start:dev
```

Backend работает по адресу:

```text
http://localhost:3001
```

### Frontend

```powershell
npx pnpm --filter web dev
```

Frontend работает по адресу:

```text
http://localhost:3000
```

## Основные API endpoints

```text
GET  /payment-links
GET  /payment-links/:id
POST /payment-links
POST /payment-links/:id/simulate-payment

GET  /transactions
GET  /transactions/:id
POST /transactions

GET  /receipts
GET  /receipts/:id
POST /receipts

GET  /dashboard
```

## Важное правило

Файл `.env` не должен попадать в Git.

В нём хранится строка подключения к PostgreSQL и другие будущие секреты.

## Статус

Проект находится на стадии локального pre-MVP.

Текущий фокус:

* финансовый Ledger;
* универсальная модель услуг;
* календарь и онлайн-запись;
* управление тарифами и монетизацией;
* банковская интеграция.
