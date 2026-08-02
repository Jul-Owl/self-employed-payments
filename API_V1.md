# API v1

> **Статус:** целевая спецификация API v1. Она не описывает фактически
> реализованные endpoints; актуальное состояние зафиксировано в
> [PROJECT_STATE.md](./PROJECT_STATE.md).

## Auth

POST /v1/auth/request-code  
POST /v1/auth/verify-code  

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