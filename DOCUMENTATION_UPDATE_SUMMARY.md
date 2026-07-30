# Обновление документации проекта
## Переход с "Service" на "CatalogItem"

**Дата:** 13.07.2026, 17:16–17:20  
**Статус:** ✅ Выполнено  
**Автор:** Copilot CLI

---

## 📋 Выполненные задачи

### ✅ 1. Создание новой документации

#### `docs/architecture/CATALOG_ARCHITECTURE.md` — ✨ СОЗДАН

Основной архитектурный документ каталога товаров и услуг самозанятого.

**Содержит 21 раздел:**

1. ✅ Назначение CatalogItem
2. ✅ CatalogItem vs. конкретная продажа
3. ✅ Типы: SERVICE и PRODUCT
4. ✅ Полный состав полей (18 полей)
5. ✅ Правила для SERVICE
6. ✅ Правила для PRODUCT
7. ✅ Правила цены
8. ✅ Правила длительности
9. ✅ bufferBeforeMinutes (подготовка до визита)
10. ✅ bufferAfterMinutes (перерыв после визита)
11. ✅ Правила онлайн-записи
12. ✅ Правила предоплаты (4 режима)
13. ✅ Единицы измерения (SERVICE, PIECE, HOUR, MINUTE, DAY, SET)
14. ✅ Snapshot-модель
15. ✅ PaymentLinkItem (будущее)
16. ✅ BookingItem (будущее)
17. ✅ Независимость от Ledger
18. ✅ Независимость от монетизации платформы
19. ✅ Архивация через isActive
20. ✅ Ограничения текущего MVP
21. ✅ Открытые вопросы (5 пунктов)

**Размер:** 15.4 KB | **Строк:** ~500

---

### ✅ 2. Обновление существующей документации

Во всех документах заменён архитектурный термин "Service" на "CatalogItem", где речь идёт о доменной сущности каталога.

#### 2.1 `AGENTS.md`

**Изменение:**  
- "Universal Service model" → "Catalog model"
- "Service entity" → "CatalogItem entity"
- Добавлены две типа: SERVICE и PRODUCT
- Ссылка на новую архитектуру в `docs/architecture/CATALOG_ARCHITECTURE.md`

**Статус:** ✅ Обновлён

---

#### 2.2 `PROJECT_BRIEF.md`

**Изменение:**  
- Раздел "Универсальная модель"
- "Service" → "CatalogItem"
- Добавлена ссылка: `docs/architecture/CATALOG_ARCHITECTURE.md`

**Статус:** ✅ Обновлён

---

#### 2.3 `PROJECT_STATE.md`

**Изменение:**  
- Раздел "Следующий технический этап"
- "универсальная модель Service" → "архитектура CatalogItem"
- Добавлена ссылка на новую архитектуру

**Статус:** ✅ Обновлён

---

#### 2.4 `ROADMAP.md`

**Изменение:**  
- **Этап 4 переименован:** "Универсальная модель услуг" → "Catalog (CatalogItem)"
- Полностью переписана архитектура этапа
- Добавлены две типа позиций: SERVICE и PRODUCT
- Перечислены все 13 обязательных и опциональных полей
- Зафиксированы ключевые архитектурные решения:
  - CatalogItem ≠ конкретная продажа
  - CatalogItem не знает о монетизации
  - CatalogItem не знает о Ledger
  - Архивация через isActive
  - Буферы используются только календарем

**Статус:** ✅ Обновлён

---

#### 2.5 `DEVELOPER_GUIDE.md`

**Изменение:**  
- Раздел "Общий процесс разработки"
- Добавлена ссылка на `docs/architecture/CATALOG_ARCHITECTURE.md` в список предварительного чтения
- Уточнено: "(если работа связана с каталогом услуг/товаров)"

**Статус:** ✅ Обновлён

---

#### 2.6 `docs/architecture/LEGAL_AND_COMPLIANCE.md`

**Изменение:**  
- Добавлена ссылка на `CATALOG_ARCHITECTURE.md`
- Уточнены архитектурные решения:
  - `durationMinutes` = плановая длительность
  - `bufferBeforeMinutes` и `bufferAfterMinutes` используются только для календаря
  - Буферы **не являются** юридически значимым рабочим временем
  - Фактическое рабочее время будет храниться отдельно на уровне Booking

**Статус:** ✅ Обновлён

---

### ✅ 3. Удаление устаревших документов

#### ❌ `docs/architecture/SERVICE_ARCHITECTURE.md` — УДАЛЁН

**Причина удаления:**  
Файл стал устаревшим. Его содержание полностью переработано и расширено в новом документе `CATALOG_ARCHITECTURE.md`.

**Что было в старом файле:**
- Базовое назначение Service
- Основной принцип (типовые условия)
- Список обязательных и необязательных полей
- Правила цены

**Что добавлено в новый файл:**
- Полная архитектура с двумя типами (SERVICE и PRODUCT)
- Подробные правила для каждого типа
- Snapshot-модель
- PaymentLinkItem и BookingItem
- Единицы измерения
- Буферы с формулами расчёта
- Независимость от Ledger и монетизации
- Открытые вопросы

**Размер удалённого файла:** 2.5 KB

**Статус:** ✅ Удалён

---

## 🔑 Зафиксированные архитектурные решения

### 1. CatalogItem как центральная сущность каталога

```
CatalogItem
├─ Не является фактом продажи
├─ Хранит типовые условия товара/услуги
├─ Изменения не влияют на старые платёжные ссылки и записи
└─ Использует snapshot-модель для фиксации параметров
```

### 2. Два типа позиций в каталоге

#### SERVICE (услуга)

- Участвует в календаре и онлайн-записи
- Имеет обязательное поле `title`
- Имеет опциональные поля:
  - `durationMinutes` — плановая длительность
  - `bufferBeforeMinutes` — подготовка до визита (по умолчанию 0)
  - `bufferAfterMinutes` — перерыв после визита (по умолчанию 0)
  - `isBookable` — может ли быть забронирована (по умолчанию true)
  - `paymentPolicy` — правила предоплаты
  - `prepaymentValue` — размер предоплаты

#### PRODUCT (товар)

- Не участвует в календаре и онлайн-записи
- Имеет обязательные поля: `title`, `unit`
- Имеет опциональные поля: `description`, `price`
- Не имеет времени и буферов

### 3. Буферы не являются длительностью услуги

```
bufferBeforeMinutes
└─ Подготовка до визита (переодевание, подготовка инструментов)
   ├─ Используется только календарем
   ├─ Не считается длительностью услуги
   └─ По умолчанию 0 минут

durationMinutes
└─ Плановая длительность оказания услуги

bufferAfterMinutes
└─ Перерыв после визита (дезинфекция, переезд)
   ├─ Используется только календарем
   ├─ Не считается длительностью услуги
   └─ По умолчанию 0 минут
```

**Формула расчёта занятого времени в календаре:**

```
Start = bookingTime - bufferBefore
Duration = bufferBefore + durationMinutes + bufferAfter
End = bookingTime + durationMinutes + bufferAfter
```

**Правило для множественных услуг в одном визите:**

```
bufferBefore = max(bufferBefore из всех услуг)
bufferAfter = max(bufferAfter из всех услуг)
```

### 4. Независимость от монетизации платформы

CatalogItem ничего не знает о:

- **PERCENT** — процентная комиссия
- **SUBSCRIPTION** — фиксированный ежемесячный тариф
- **HYBRID** — комбинация процента и подписки

**Как это работает:**

1. CatalogItem задаёт только цену товара/услуги
2. На этапе **Monetization** модель монетизации назначается **пользователю**, а не товару
3. При создании платёжной ссылки система применяет тариф пользователя
4. Система рассчитывает налог и комиссию независимо

**Результат:**  
Изменение модели монетизации не требует изменения структуры CatalogItem.

### 5. Независимость от Ledger

CatalogItem полностью независима от финансового учёта:

- Не знает о LedgerEntry
- Не знает о налогах
- Не знает о резервировании
- Не знает о комиссии платформы

При создании Transaction финансовые расчёты выполняются отдельно, и Ledger получает готовый результат.

### 6. Snapshot-модель для фиксации параметров

При создании платёжной ссылки или бронирования параметры CatalogItem **копируются в snapshot**:

```
PaymentLinkItem.titleSnapshot       — название на момент создания
PaymentLinkItem.unitPrice           — цена на момент создания
PaymentLinkItem.durationMinutesSnapshot  — длительность (для SERVICE)

BookingItem.titleSnapshot           — название на момент бронирования
BookingItem.durationMinutesSnapshot — длительность (для SERVICE)
BookingItem.bufferBeforeMinutesSnapshot  — буфер до (для SERVICE)
BookingItem.bufferAfterMinutesSnapshot   — буфер после (для SERVICE)
```

**Зачем:**  
Если владелец позже изменит параметры CatalogItem, уже созданные документы останутся неизменными.

### 7. Будущая модель платёжных ссылок (PaymentLinkItem)

**Статус:** на текущем этапе не реализуется

**Структура (будущее):**

```
PaymentLink (одна ссылка)
└── PaymentLinkItem[] (несколько товаров/услуг)
    ├─ catalogItemId
    ├─ titleSnapshot
    ├─ quantity
    ├─ unit
    ├─ unitPrice
    ├─ amount (quantity × unitPrice)
    └─ durationMinutesSnapshot (для SERVICE)
```

**PaymentLink.amount** = сумма всех items

### 8. Будущая модель бронирования (BookingItem)

**Статус:** на этапе Calendar and Booking

**Структура (будущее):**

```
Booking (одна запись)
└── BookingItem[] (несколько услуг/товаров в один визит)
    ├─ catalogItemId
    ├─ titleSnapshot
    ├─ quantity
    ├─ unit
    ├─ unitPrice
    ├─ amount
    ├─ durationMinutesSnapshot (только для SERVICE)
    ├─ bufferBeforeMinutesSnapshot (только для SERVICE)
    └─ bufferAfterMinutesSnapshot (только для SERVICE)
```

**Правило для расчёта длительности:**

```
Только SERVICE items влияют на длительность визита:
  totalDuration = SUM(durationMinutes для всех SERVICE items)
  bufferBefore = MAX(bufferBefore для всех SERVICE items)
  bufferAfter = MAX(bufferAfter для всех SERVICE items)

PRODUCT items не влияют на длительность и календарь.
```

### 9. Единицы измерения (unit)

**Поддерживаемый минимальный набор:**

- **SERVICE** — услуга (по умолчанию для типа SERVICE)
- **PIECE** — штука
- **HOUR** — час
- **MINUTE** — минута
- **DAY** — день
- **SET** — набор/комплект

**Используется для:**

- Отображения в платёжной ссылке и чеке
- Интерпретации `quantity` в PaymentLinkItem и BookingItem
- Например: "3 PIECE" = "три штуки"; "2 HOUR" = "два часа"

### 10. Архивация через isActive

**Удаления CatalogItem не должно быть в MVP.**

**Вместо удаления используется флаг:**

```
isActive = false  →  позиция архивирована (не отображается в интерфейсе)
isActive = true   →  позиция активна (доступна для новых ссылок и записей)
```

**Преимущества:**

- Неактивная позиция не мешает старым Booking и PaymentLink
- Историческая информация сохраняется в snapshot
- Позицию можно переактивировать, установив `isActive = true`

### 11. Owner будет добавлена позже

**Текущее состояние:**  
`ownerId` отсутствует — система однопользовательская

**На этапе Users:**  
Каждый CatalogItem получит обязательного владельца (`ownerId`)

### 12. Правила предоплаты для SERVICE

Поддерживаются 4 режима:

#### NO_PREPAYMENT (по умолчанию)

Оплата полностью после услуги.

#### FIXED_PREPAYMENT

Фиксированная предоплата (сумма в поле `prepaymentValue`).

#### PERCENT_PREPAYMENT

Процент от итоговой суммы (размер % в поле `prepaymentValue`).

#### FULL_PREPAYMENT

100% оплата авансом перед бронированием.

---

## 📊 Статистика изменений

| Метрика | Значение |
|:-------:|:--------:|
| Новых документов | 1 |
| Изменённых документов | 6 |
| Удалённых документов | 1 |
| Строк в новой архитектуре | ~500 |
| Новых архитектурных решений | 12 |
| Открытых вопросов документировано | 5 |
| Перекрёстных ссылок добавлено | 6 |

---

## 📁 Полный список файлов

### ✨ Созданные файлы

```
docs/architecture/CATALOG_ARCHITECTURE.md     (15.4 KB, ~500 строк)
```

### 📝 Изменённые файлы

```
AGENTS.md                                      (обновлен)
PROJECT_BRIEF.md                               (обновлен)
PROJECT_STATE.md                               (обновлен)
ROADMAP.md                                     (обновлен, Этап 4 переписан)
DEVELOPER_GUIDE.md                             (обновлен, добавлена ссылка)
docs/architecture/LEGAL_AND_COMPLIANCE.md      (обновлен, добавлена ссылка)
```

### ❌ Удалённые файлы

```
docs/architecture/SERVICE_ARCHITECTURE.md      (2.5 KB, заменён CATALOG_ARCHITECTURE.md)
```

---

## 🔗 Перекрёстные ссылки (обновлены)

```
README.md
  ↓
  (статус без изменений, только на русском)

AGENTS.md
  ↓
  → docs/architecture/CATALOG_ARCHITECTURE.md

PROJECT_BRIEF.md
  ↓
  → docs/architecture/CATALOG_ARCHITECTURE.md

PROJECT_STATE.md
  ↓
  → docs/architecture/CATALOG_ARCHITECTURE.md

ROADMAP.md
  ↓
  → docs/architecture/CATALOG_ARCHITECTURE.md

DEVELOPER_GUIDE.md
  ↓
  → docs/architecture/CATALOG_ARCHITECTURE.md

docs/architecture/LEGAL_AND_COMPLIANCE.md
  ↓
  → docs/architecture/CATALOG_ARCHITECTURE.md

docs/architecture/CATALOG_ARCHITECTURE.md (новый)
  ↓
  → ROADMAP.md
  → PROJECT_STATE.md
  → AGENTS.md
  → docs/architecture/LEGAL_AND_COMPLIANCE.md
```

---

## 🚀 Готово к следующим шагам

### ✅ Выполнено

- ✅ Новый документ `CATALOG_ARCHITECTURE.md` создан и содержит полную архитектуру
- ✅ Все существующие документы обновлены и содержат правильные ссылки
- ✅ Устаревший документ `SERVICE_ARCHITECTURE.md` удалён
- ✅ Архитектурные решения зафиксированы
- ✅ Документация готова к использованию разработчиками

### ❌ Не выполнено (как указано в требованиях)

- ❌ Изменение кода проекта (не требовалось)
- ❌ Изменение Prisma schema (не требовалось)
- ❌ Создание миграций (не требовалось)
- ❌ Изменение frontend (не требовалось)
- ❌ Git commit/push (не требовалось)

---

## 📌 Примеры из новой архитектуры

### Пример SERVICE

```yaml
CatalogItem:
  id: service-consultation-001
  title: "Консультация по дизайну"
  type: SERVICE
  price: 50000  # в копейках (500 руб.)
  durationMinutes: 60
  bufferBeforeMinutes: 15
  bufferAfterMinutes: 15
  isBookable: true
  isActive: true
  paymentPolicy: NO_PREPAYMENT
  category: "Консультации"
  createdAt: 2026-07-13T12:00:00Z
  updatedAt: 2026-07-13T12:00:00Z
```

**При бронировании на 10:00:**

```
Календарь (заблокировано):
  9:45–10:00  — bufferBefore (подготовка)
  10:00–11:00 — durationMinutes (консультация)
  11:00–11:15 — bufferAfter (перерыв)
```

### Пример PRODUCT

```yaml
CatalogItem:
  id: product-digital-course-001
  title: "Цифровой курс по дизайну"
  type: PRODUCT
  price: 300000  # в копейках (3000 руб.)
  unit: PIECE
  isActive: true
  category: "Курсы"
  createdAt: 2026-07-13T12:00:00Z
  updatedAt: 2026-07-13T12:00:00Z
```

**Использование:**

- Не участвует в календаре
- Может быть куплен в любом количестве
- Может быть добавлен в платёжную ссылку вместе с услугами

---

## 📚 Связанная документация

Новая архитектура ссылается на:

- `ROADMAP.md` — Этап 4: Catalog (CatalogItem)
- `PROJECT_STATE.md` — текущее состояние проекта
- `PROJECT_BRIEF.md` — краткое описание проекта
- `AGENTS.md` — архитектурные решения
- `DEVELOPER_GUIDE.md` — руководство разработчика
- `docs/architecture/LEGAL_AND_COMPLIANCE.md` — юридические вопросы

---

## ✨ Заключение

Документация проекта приведена в соответствие с новой архитектурной концепцией **CatalogItem**:

1. ✅ Создан полный архитектурный документ `CATALOG_ARCHITECTURE.md`
2. ✅ Все существующие документы обновлены
3. ✅ Устаревший файл удалён
4. ✅ Архитектурные решения зафиксированы
5. ✅ Все ссылки актуальны и консистентны

Проект готов к реализации этапа **Catalog (CatalogItem)** согласно ROADMAP.

---

**Файл сохранён:** `DOCUMENTATION_UPDATE_SUMMARY.md`  
**Дата создания:** 13.07.2026  
**Статус:** ✅ ЗАВЕРШЕНО
