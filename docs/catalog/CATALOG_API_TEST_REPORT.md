# Catalog API: отчёт об интеграционной проверке

Дата: 2 августа 2026

## Конфигурация среды

| Компонент | Адрес | Источник настройки |
| --- | --- | --- |
| Backend API | `http://localhost:3002` | `apps/api/.env`: `PORT=3002` |
| Frontend | `http://localhost:3000` | Next.js development server |
| API URL frontend | `http://localhost:3002` | `apps/web/.env.local`: `NEXT_PUBLIC_API_URL` |
| Fallback API URL frontend | `http://localhost:3001` | `apps/web/src/lib/api.ts` |

В `main.ts` backend использует `PORT` и `WEB_URL` из окружения. Если `PORT`
отсутствует, используется fallback `3001`.

Порт `3001`, занятый Dolphin Anty, не использовался и его процесс не
останавливался.

## Результаты позитивных сценариев

Все запросы выполнялись к `http://localhost:3002`.

| Сценарий | HTTP | Фактический результат |
| --- | --- | --- |
| `GET /catalog` | 200 | До теста возвращался пустой массив `[]`. |
| `POST /catalog` SERVICE | 201 | Создана SERVICE с `price=1500`, длительностью `60`, буферами `10` и `15`, `FIXED_PREPAYMENT=500`. |
| `POST /catalog` PRODUCT | 201 | Создан PRODUCT с `unit=PIECE`, `price=700`, `isBookable=false`. |
| `GET /catalog/:id` | 200 | Возвращена созданная SERVICE со всеми заданными полями. |
| `PATCH /catalog/:id` | 200 | Изменены title и category SERVICE; остальные доменные поля сохранены. |
| `DELETE /catalog/:id` | 200 | SERVICE архивирована: `isActive=false`. |
| `GET /catalog/:id` после архивирования | 200 | Архивированная SERVICE доступна и содержит `isActive=false`. |

Все созданные во время проверки успешные позиции были архивированы после
сценария, чтобы не оставлять активные тестовые данные.

## PRODUCT: нормализация не применимых полей

Запрос `POST /catalog` для PRODUCT содержал:

```json
{
  "type": "PRODUCT",
  "unit": "SET",
  "isBookable": true,
  "durationMinutes": 45,
  "bufferBeforeMinutes": 5,
  "bufferAfterMinutes": 10
}
```

Ответ: `201 Created`.

Сохранённый результат:

```json
{
  "type": "PRODUCT",
  "unit": "SET",
  "isBookable": false,
  "durationMinutes": null,
  "bufferBeforeMinutes": 0,
  "bufferAfterMinutes": 0,
  "paymentPolicy": null,
  "prepaymentValue": null
}
```

Следовательно, PRODUCT не может стать доступным для записи, а
service-only-поля нормализуются и не сохраняются.

## Результаты негативных сценариев

| Запрос | HTTP | Фактический ответ |
| --- | --- | --- |
| PRODUCT без `unit` | 400 | `{"message":"unit is required for PRODUCT","error":"Bad Request","statusCode":400}` |
| SERVICE с `unit` | 400 | `{"message":"unit is only allowed for PRODUCT","error":"Bad Request","statusCode":400}` |
| FIXED_PREPAYMENT без `prepaymentValue` | 400 | `{"message":"prepaymentValue is required for fixed or percent prepayment","error":"Bad Request","statusCode":400}` |
| PERCENT_PREPAYMENT без `prepaymentValue` | 400 | `{"message":"prepaymentValue is required for fixed or percent prepayment","error":"Bad Request","statusCode":400}` |
| NO_PREPAYMENT с `prepaymentValue` | 400 | `{"message":"prepaymentValue is only allowed for fixed or percent prepayment","error":"Bad Request","statusCode":400}` |
| FULL_PREPAYMENT с `prepaymentValue` | 400 | `{"message":"prepaymentValue is only allowed for fixed or percent prepayment","error":"Bad Request","statusCode":400}` |

## Проверка frontend

| Проверка | Результат |
| --- | --- |
| Next.js запущен с `apps/web/.env.local` | Успешно; Next.js указал `.env.local` в списке environments. |
| `GET http://localhost:3000/catalog` | `200 OK`; страница содержит заголовок «Товары и услуги». |
| CORS preflight `http://localhost:3000` → `http://localhost:3002/catalog` | `204 No Content`; `Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Credentials: true`. |
| Создание, редактирование и архивирование через браузер | Не выполнено: в терминальном окружении нет браузерного automation-инструмента. |

API-клиент использует единый адрес:

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
```

Поэтому Catalog, Payment Links, Transactions, Receipts и другие вызовы через
`apps/web/src/lib/api.ts` обращаются к `http://localhost:3002` в текущем
локальном frontend-окружении.

## Итоговый вердикт

Backend Catalog API прошёл полный позитивный CRUD-сценарий и все заявленные
негативные сценарии. Production-сборка frontend и API-тесты также проходят.

Catalog MVP можно считать завершённым для текущего этапа: API, конфигурация
frontend и серверная интеграция проверены. Остаётся только необязательная
ручная визуальная проверка формы `/catalog` в браузере.
