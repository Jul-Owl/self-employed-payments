# Information Architecture v1

> **Статус:** целевая информационная архитектура v1. Она не описывает
> фактически реализованные экраны и маршруты; актуальное состояние
> зафиксировано в [PROJECT_STATE.md](./PROJECT_STATE.md).

## Основные разделы

### 1. Dashboard
- баланс
- статус
- последние операции

### 2. Payments
- список ссылок
- создание ссылки

### 3. Transactions
- список операций
- детали операции

### 4. Receipts
- список чеков
- статус

### 5. Payouts
- вывод денег
- история

### 6. Settings
- профиль
- настройки

---

## Routes

### Auth
/login
/verify

### App
/dashboard
/dashboard/payments
/dashboard/payments/new
/dashboard/transactions
/dashboard/transactions/[id]
/dashboard/receipts
/dashboard/payouts
/dashboard/settings

### Public
/pay/[token]

### Admin
/admin
/admin/users
/admin/payments
/admin/ledger
/admin/receipts
/admin/payouts