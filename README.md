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
http://localhost:3002
```

При отсутствии `PORT` в `apps/api/.env` backend использует порт `3001`.

### Frontend

```powershell
npx pnpm --filter web dev
```

Frontend работает по адресу:

```text
http://localhost:3000
```

## Локальная настройка окружения

Файл локальной конфигурации API находится в `apps/api/.env`. Шаблон
`apps/api/.env.example` показывает необходимые переменные без настоящих
учётных данных.

Минимально используются:

- `DATABASE_URL` — строка подключения к PostgreSQL;
- `PORT` — порт API, локально задан `3002`;
- `WEB_URL` — URL frontend для CORS, локально задан `http://localhost:3000`.
- `NEXT_PUBLIC_API_URL` — URL API для frontend в `apps/web/.env.local`;
  локально задан `http://localhost:3002`.

Чтобы изменить порт API, измените `PORT` в `apps/api/.env`; чтобы изменить
адрес frontend, измените `WEB_URL` в том же файле. После этого перезапустите
API. После изменения `apps/web/.env.local` перезапустите frontend.

## Deployment environments

The project has three isolated environments:

| Environment | Web URL | API URL | Database |
| --- | --- | --- | --- |
| LOCAL | `http://localhost:3000` | `http://localhost:3002` | local PostgreSQL |
| TEST | `https://test.self-made.online` | `https://api-test.self-made.online` | separate TEST PostgreSQL database |
| PRODUCTION | `https://self-made.online` | `https://api.self-made.online` | separate PROD PostgreSQL database |

Set `APP_ENV` to `local`, `test`, or `production`. `NODE_ENV=production` is
used for production Node builds; `APP_ENV` distinguishes TEST from PROD.
TEST and PROD must never share a `DATABASE_URL`.

### API environment

Configure these variables in the API deployment environment, never in Git:

```text
APP_ENV=test|production
NODE_ENV=production
DATABASE_URL=postgresql://...
WEB_URL=https://the-corresponding-web-origin
PORT=3001
```

`DATABASE_URL` and `WEB_URL` fail fast when missing outside LOCAL. `WEB_URL`
is the single allowed CORS origin and credentialed cookie requests are enabled.
Session cookies are HttpOnly and SameSite=Lax; they are Secure in TEST and
PRODUCTION.

### Web environment

Configure this at build time for the separate web deployment:

```text
APP_ENV=test|production
NEXT_PUBLIC_API_URL=https://the-corresponding-api-origin
```

`NEXT_PUBLIC_API_URL` is required outside LOCAL. Public booking is always
`/book/[slug]`; `/book` redirects to the local `dev-owner` compatibility route
only in LOCAL and returns not-found in TEST and PRODUCTION.

### Deployment commands

Install dependencies in each deployment build:

```powershell
pnpm install --frozen-lockfile
```

Deploy API migrations and build/start the API:

```powershell
pnpm --filter api migrate:deploy
pnpm --filter api build
pnpm --filter api start:prod
```

Use `prisma migrate deploy` only for TEST and PRODUCTION. Never use
`prisma migrate dev`, `prisma db push`, or a database reset there.

Build/start the web application:

```powershell
pnpm --filter web build
pnpm --filter web start
```

Infrastructure checks may call `GET /health` for process liveness and
`GET /health/ready` for PostgreSQL readiness. Neither endpoint returns
connection details or credentials.

### Data and privacy

Production personal data, production backups, and any external logs or storage
that contain personal data must stay in Russian infrastructure. Never copy
production personal data into TEST unless it has been anonymized. Secrets and
database credentials must not be committed.

Whether Organizer of Information Dissemination (ORI) / so-called
Yarovaya-law obligations apply is a separate legal and compliance question;
this document makes no determination.

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
* Catalog и CatalogItem;
* календарь и онлайн-запись;
* управление тарифами и монетизацией;
* банковская интеграция.
