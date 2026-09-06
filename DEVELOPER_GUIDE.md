# Developer Guide

## Общий процесс разработки

Перед началом любой задачи необходимо:

1. Прочитать:

- README.md
- PROJECT_BRIEF.md
- PROJECT_STATE.md
- ROADMAP.md
- AGENTS.md
- docs/architecture/DOMAIN_MODEL.md
- docs/architecture/CATALOG_ARCHITECTURE.md (если работа связана с каталогом услуг/товаров)

2. Понять текущий этап Roadmap.

3. Только после этого менять код.

---

# Работа с Git

После каждого законченного этапа:

git add .

git commit -m "..."

git push

Большие незакоммиченные изменения не допускаются.

---

# Работа с Prisma

После изменения schema.prisma

Выполнить:

npx pnpm --filter api exec prisma migrate dev --name migration_name

После миграции:

npx pnpm --filter api exec prisma generate

Только потом запускать backend.

For TEST and PRODUCTION use only:

```powershell
pnpm --filter api migrate:deploy
```

Do not use `prisma migrate dev`, `prisma db push`, or a database reset outside
local development.

---

# Backend

Backend запускается:

npx pnpm --filter api start:dev

Порт:

3001

## Authentication and tenant boundary

Owner API routes use an opaque server-side Session from an HttpOnly,
SameSite=Lax cookie. Passwords are stored only as bcrypt hashes. Never accept
`ownerId` from an API request: owner scope comes from the validated session,
or, for public booking only, from the resolved `publicSlug`. Foreign owner
resources must be treated as not found.

## Deployment configuration

`APP_ENV` is `local`, `test`, or `production`; it distinguishes TEST from PROD.
Outside LOCAL, `DATABASE_URL`, `WEB_URL`, and the web build-time
`NEXT_PUBLIC_API_URL` must be explicitly configured. TEST and PROD must use
different PostgreSQL databases. Do not add infrastructure credentials to the
repository.

## Booking notifications

Notifications are transactional Booking lifecycle records. The MVP has an
EMAIL-only local/dev provider; it must not send externally. Dispatch due
PENDING notifications through NotificationService. Reminder policy is 24
hours before service start; reminders whose scheduled time is already past are
skipped.

---

# Frontend

Frontend запускается:

npx pnpm --filter web dev

Порт:

3000

---

# Перед изменением БД

Нельзя:

- удалять таблицы;
- менять существующие миграции;
- переименовывать сущности без необходимости.

Все изменения только через новые миграции.

---

# Правила разработки

Контроллеры должны быть максимально простыми.

Бизнес-логика находится в Service.

Работа с БД только через Prisma.

Любая финансовая операция должна быть атомарной.

---

# Работа с деньгами

Деньги никогда не считаются на frontend.

Frontend только отображает значения backend.

Все денежные поля хранятся целыми числами.

---

# Ledger

Ledger является единственным источником истины.

После его внедрения:

никакие балансы не рассчитываются напрямую по Transaction.

Все расчеты идут через LedgerEntry.

---

# Работа с AI

Перед изменением проекта AI обязан:

прочитать:

- README.md
- PROJECT_BRIEF.md
- PROJECT_STATE.md
- ROADMAP.md
- AGENTS.md

Запрещается:

- придумывать новую архитектуру;
- переименовывать существующие сущности без причины;
- менять продуктовую модель.

Если AI не уверен —

сначала задает вопрос,

потом меняет код.

---

# Работа с Copilot

Перед большой задачей сначала выполнить анализ проекта.

Только потом переходить к изменениям.

Предпочтительный формат:

1. План изменений.

2. Список файлов.

3. Изменение.

4. Проверка.

5. Commit.

---

# Основной порядок разработки

1. Ledger

2. Catalog (CatalogItem)

3. Calendar

4. Booking

5. Monetization

6. Subscription Billing

7. Users

8. Bank Integration

9. Receipts

10. Payouts

11. Admin Panel

Переходить к следующему этапу только после завершения предыдущего.

---

# Главный принцип проекта

Проект является MVP.

Предпочтение всегда отдается:

простоте,

понятности,

расширяемости,

а не идеальной архитектуре.