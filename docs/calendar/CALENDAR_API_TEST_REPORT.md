# Calendar API: отчёт об интеграционной проверке

Дата: 3 августа 2026

## Среда

Проверка выполнялась против временно запущенного NestJS backend:

```text
http://localhost:3002
```

Prisma migration `20260803162110_add_calendar_mvp` применена к локальной базе.
Значение `DATABASE_URL` не выводится в этом отчёте.

## Проверенные сценарии

| Сценарий | HTTP | Фактический результат |
| --- | --- | --- |
| PUT Monday, рабочий день 09:00–18:00 | 200 | WeeklyWorkingHours сохранён с `startMinutes=540`, `endMinutes=1080`. |
| PUT Sunday, выходной с переданными часами | 200 | Часы очищены: `startMinutes=null`, `endMinutes=null`. |
| Повторный PUT Monday | 200 | Запись обновлена, не создана вторая; GET weekly вернул одну запись Monday. |
| GET Monday без специальных правил | 200 | `WEEKLY_SCHEDULE`, `WEEKLY_WORKING`, рабочий интервал 540–1080. |
| HOLIDAY для рабочего Monday | 200 | `OFFICIAL_CALENDAR`, `HOLIDAY`, дата закрыта. |
| Дубликат OfficialCalendarDay на дату | 409 | `An official calendar day already exists for this date`. |
| OPEN override поверх HOLIDAY | 200 | `OVERRIDE`, `OPEN`, рабочий интервал 720–900. |
| Дубликат CalendarDateOverride на дату | 409 | `A calendar date override already exists for this date`. |
| PATCH OPEN override в CLOSED | 200 | Часы очищены; `OVERRIDE`, `CLOSED`, дата закрыта. |
| DELETE override | 200 | Разрешение вернулось к HOLIDAY. |
| PATCH HOLIDAY в WORKING_DAY | 200 | Применён недельный Monday: `OFFICIAL_CALENDAR`, `WORKING_DAY`, интервал 540–1080. |
| WORKING_DAY для недельного Sunday-выходного | 200 | Дата осталась закрыта: `OFFICIAL_CALENDAR`, `WORKING_DAY`, `isWorking=false`. |
| DELETE official rules | 200 | Monday снова разрешается недельным графиком. |
| GET с датой `2026-8-10` | 400 | `date must use the YYYY-MM-DD format`. |

Временные OfficialCalendarDay и CalendarDateOverride удалены после проверки.
WeeklyWorkingHours для Monday и Sunday сохранены как локальная конфигурация
проверочного графика.

## Unit-тесты

`pnpm --filter api test` завершился успешно:

```text
3 test suites passed
24 tests passed
```

Unit-тесты покрывают интервалы, очистку часов и правила приоритета.
Уникальность dayOfWeek и даты подтверждена фактическими HTTP-запросами к
PostgreSQL, а не имитацией Prisma-ошибки.

## Границы Calendar MVP

Реализована только доступность рабочего времени по правилам:

```text
CalendarDateOverride
>
OfficialCalendarDay
>
WeeklyWorkingHours
```

Booking, слоты, поиск времени, CatalogItem relations, буферы, timezone и
compliance-модель не реализованы.
