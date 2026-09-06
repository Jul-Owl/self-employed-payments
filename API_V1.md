# API v1

> **Статус:** целевая спецификация API v1. Она не описывает фактически
> реализованные endpoints; актуальное состояние зафиксировано в
> [PROJECT_STATE.md](./PROJECT_STATE.md).

## Auth

POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/me

---

## User

GET /v1/me  
PATCH /v1/me/profile  

---

## Payment Links

GET /v1/payment-links  
POST /v1/payment-links  
GET /v1/payment-links/:id  

---

## Public Payments

GET /v1/public/payment-links/:token  
POST /v1/public/payment-links/:token/intents  

---

## Public Booking

GET /public/:slug/catalog
GET /public/:slug/availability?date=YYYY-MM-DD&catalogItemIds=id1&catalogItemIds=id2&stepMinutes=15
POST /public/:slug/bookings
GET /bookings?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
GET /bookings/:id
GET /bookings/:id/availability?date=YYYY-MM-DD&stepMinutes=15
PATCH /bookings/:id/reschedule
PATCH /bookings/:id/cancel
PATCH /bookings/:id/complete

Owner endpoints требуют session-cookie. Публичная страница использует
`/book/:slug`; платежи и исполнение предоплаты для Booking не подключены.

---

## Transactions

GET /v1/transactions  
GET /v1/transactions/:id  

---

## Balance

GET /v1/balances/me  

---

## Receipts

GET /v1/receipts  
GET /v1/receipts/:id  

---

## Payouts

GET /v1/payouts  
POST /v1/payouts  

---

## Webhooks

POST /v1/webhooks/tbank/payments  
POST /v1/webhooks/tbank/payouts  