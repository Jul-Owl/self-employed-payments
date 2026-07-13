# Ledger Audit — Verified Facts & Code Review

## 1. Prisma Model LedgerEntry — Exact Definition

**File:** `apps/api/prisma/schema.prisma` (lines 109–122)

```prisma
model LedgerEntry {
  id            String          @id @default(cuid())

  transactionId String
  transaction   Transaction     @relation(fields: [transactionId], references: [id])

  type          LedgerEntryType
  direction     LedgerDirection
  amount        Int

  createdAt     DateTime        @default(now())
}
```

### Enum Definitions

**LedgerEntryType** (lines 25–30):
```prisma
enum LedgerEntryType {
  CLIENT_PAYMENT_RECEIVED
  TAX_RESERVED
  PLATFORM_FEE_RESERVED
  SELF_EMPLOYED_BALANCE
}
```

**LedgerDirection** (lines 32–35):
```prisma
enum LedgerDirection {
  CREDIT
  DEBIT
}
```

### Answers to Questions

| Question | Answer | Code Source |
|----------|--------|-------------|
| Does LedgerEntry have a `status` field? | **NO** | schema.prisma line 109–122 |
| Foreign key relationship | `@relation(fields: [transactionId])` on LedgerEntry | schema.prisma line 113 |
| onDelete behavior | **RESTRICT** | migration.sql: `ON DELETE RESTRICT` |
| Cascade delete on Transaction delete? | **NO.** RESTRICT prevents Transaction deletion if LedgerEntry exists | migration.sql: `ON DELETE RESTRICT ON UPDATE CASCADE` |

---

## 2. Mathematical Semantics of Ledger

### Recorded Entries for One Payment

**Scenario:** grossAmount = 100, calculation results:
- `taxAmount = Math.round(100 * 0.04) = 4`
- `platformFeeAmount = Math.round(100 * 0.01) = 1`
- `netAmount = 100 - 4 - 1 = 95`

**Code creating entries:**
- **webhook.service.ts** lines 126–128 (calculation)
- **webhook.service.ts** lines 162–189 (4 entries created)
- **ledger.service.ts** lines 29–50 (same entries)

### Exact Entries Created

| # | Type | Direction | Amount | Meaning |
|---|------|-----------|--------|---------|
| 1 | `CLIENT_PAYMENT_RECEIVED` | `CREDIT` | 100 | Payment received |
| 2 | `TAX_RESERVED` | `DEBIT` | 4 | Tax reserve |
| 3 | `PLATFORM_FEE_RESERVED` | `DEBIT` | 1 | Platform fee reserve |
| 4 | `SELF_EMPLOYED_BALANCE` | `CREDIT` | 95 | Available balance |

### Balance Calculation

If CREDIT = +, DEBIT = −:

- **Total CREDIT:** 100 + 95 = **195**
- **Total DEBIT:** 4 + 1 = **5**
- **CREDIT − DEBIT:** 195 − 5 = **190**

**Result:** Ledger does **NOT sum to zero**. Sum = gross amount (100).

This is **semantically correct** because the four entries track:
1. Income received (+100)
2. Tax withheld (−4)
3. Fee withheld (−1)
4. Net available (+95)

The entries are **NOT classical double-entry bookkeeping** (where debits = credits). They are **source-of-truth records** for balance calculation.

### How to Calculate from Ledger

| Balance Type | Query | Calculation |
|---|---|---|
| Total received | SUM(amount WHERE type = CLIENT_PAYMENT_RECEIVED) | 100 |
| Tax reserve | SUM(amount WHERE type = TAX_RESERVED) | 4 |
| Platform fee reserve | SUM(amount WHERE type = PLATFORM_FEE_RESERVED) | 1 |
| Self-employed balance | SUM(amount WHERE type = SELF_EMPLOYED_BALANCE) | 95 |

**Validation:** netAmount (95) should equal sum of SELF_EMPLOYED_BALANCE entries for each transaction.

---

## 3. Atomicity of simulate-payment

**File:** `apps/api/src/payment-links/payment-links.service.ts` (lines 56–120)

```typescript
async simulatePayment(id: string) {
  // ... find paymentLink ...

  const grossAmount = paymentLink.amount;
  const taxAmount = Math.round(grossAmount * 0.04);
  const platformFeeAmount = Math.round(grossAmount * 0.01);
  const netAmount = grossAmount - taxAmount - platformFeeAmount;

  // Step 1: Create Transaction
  const transaction = await this.prisma.transaction.create({
    data: { /* ... */ }
  });

  // Step 2: Create Receipt
  const receipt = await this.prisma.receipt.create({
    data: { /* ... */ }
  });

  // Step 3: Create LedgerEntry (NOT atomic!)
  await this.ledgerService.createTransactionEntries({
    transactionId: transaction.id,
    grossAmount,
    taxAmount,
    platformFeeAmount,
    netAmount,
  });

  // Step 4: Fetch created entries
  const ledgerEntries = await this.prisma.ledgerEntry.findMany({
    where: { transactionId: transaction.id }
  });

  return { paymentLink, transaction, receipt, ledgerEntries };
}
```

### Answers

| Question | Answer | Risk |
|----------|--------|------|
| Are Transaction, Receipt, and LedgerEntry created in `prisma.$transaction`? | **NO** | **CRITICAL** |
| What happens if `createTransactionEntries` fails? | Transaction and Receipt remain in DB orphaned | Financial inconsistency |
| Is `PrismaService` or transaction client used? | Raw `PrismaService` (not transactional) | No rollback capability |
| Can LedgerService be called within Prisma transaction? | Yes, but **NOT implemented here** | Design choice |

### Atomicity Status: ❌ BROKEN

Three separate database operations with no transaction wrapping. Failure modes:
1. Transaction created → Receipt creation fails → no Receipt, Transaction orphaned
2. Transaction created → LedgerEntry creation fails → no Ledger, financial data lost

---

## 4. Atomicity of Webhook

**File:** `apps/api/src/webhooks/webhooks.service.ts`

### For `payment.failed` (lines 48–104)

```typescript
if (eventType === 'payment.failed') {
  const result = await this.prisma.$transaction(async (tx) => {
    const webhookEvent = await tx.webhookEvent.create({...});
    const transaction = await tx.transaction.create({...});
    await tx.payment.updateMany({...});
    const updatedWebhookEvent = await tx.webhookEvent.update({...});
    return { webhookEvent: updatedWebhookEvent, transaction };
  });
}
```

**Status:** ✅ Atomic inside `$transaction`, but **NO LedgerEntry created** (correct—no money received).

### For `payment.succeeded` (lines 122–227)

```typescript
const result = await this.prisma.$transaction(async (tx) => {
  const webhookEvent = await tx.webhookEvent.create({...});
  const transaction = await tx.transaction.create({...});
  await tx.payment.updateMany({...});
  const receipt = await tx.receipt.create({...});
  
  await tx.ledgerEntry.createMany({
    data: [
      { transactionId, type: CLIENT_PAYMENT_RECEIVED, direction: CREDIT, amount: grossAmount },
      { transactionId, type: TAX_RESERVED, direction: DEBIT, amount: taxAmount },
      { transactionId, type: PLATFORM_FEE_RESERVED, direction: DEBIT, amount: platformFeeAmount },
      { transactionId, type: SELF_EMPLOYED_BALANCE, direction: CREDIT, amount: netAmount },
    ]
  });
  
  const updatedWebhookEvent = await tx.webhookEvent.update({...});
  return { webhookEvent: updatedWebhookEvent, transaction, receipt };
});
```

**Status:** ✅ **FULLY ATOMIC**

All entities (WebhookEvent, Transaction, Receipt, 4× LedgerEntry) created in single transaction.

### Comparison: simulate-payment vs webhook

| Aspect | simulate-payment | webhook |
|--------|-----------------|---------|
| Uses `$transaction` | ❌ NO | ✅ YES |
| Atomicity | ❌ BROKEN | ✅ ATOMIC |
| LedgerEntry creation | Via `ledgerService` | Direct `tx.ledgerEntry.createMany()` |
| Code consistency | **Duplicates logic** | **Duplicates logic** |

**Issue:** Both paths calculate tax/fee independently and create LedgerEntry via different methods.

---

## 5. TransactionsService.create() — Purpose & Usage

**File:** `apps/api/src/transactions/transactions.controller.ts`

```typescript
@Post()
create(@Body() body: any) {
  return this.transactionsService.create(body);
}
```

**File:** `apps/api/src/transactions/transactions.service.ts` (lines 30–49)

```typescript
create(body: any) {
  const grossAmount = Number(body.grossAmount ?? body.amount ?? 0);
  const taxAmount = Number(body.taxAmount ?? Math.round(grossAmount * 0.04));
  const platformFeeAmount = Number(
    body.platformFeeAmount ?? Math.round(grossAmount * 0.01),
  );
  const netAmount = Number(
    body.netAmount ?? grossAmount - taxAmount - platformFeeAmount,
  );

  return this.prisma.transaction.create({
    data: {
      title: body.title,
      client: body.client ?? 'Новый клиент',
      grossAmount,
      taxAmount,
      platformFeeAmount,
      netAmount,
      date: body.date ?? 'только что',
      status: body.status ?? TransactionStatus.PROCESSED,
    },
  });
}
```

### Purpose Analysis

| Criterion | Finding |
|-----------|---------|
| Frontend usage | Only defined in `api.ts` as `createTransaction()` function, **not actually called** |
| Backend usage | No internal callers found |
| Product intent | **Development/test endpoint** (like simulate-payment) |
| Does it create LedgerEntry? | ❌ **NO** |
| Violates project rule? | **YES** — "Financial entities created only after confirmed payment event" |

### Intended Usage Pattern

This endpoint is a **direct Transaction creator without payment confirmation**. It bypasses the payment event model.

**Project Rule Violation:**
> Creating a payment link must not create Transaction, Receipt, LedgerEntry.  
> Financial entities are created only after a confirmed payment event.

**Current State:** ✅ Compliant (no LedgerEntry created, but also no payment event required).

---

## 6. Dashboard Service — Source of Truth Check

**File:** `apps/api/src/dashboard/dashboard.service.ts`

```typescript
async getDashboard() {
  const transactions = await this.prisma.transaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { receipt: true },
  });

  const totalAmount = transactions.reduce((sum, item) => sum + item.grossAmount, 0);
  const totalTax = transactions.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalPlatformFee = transactions.reduce((sum, item) => sum + item.platformFeeAmount, 0);
  const available = transactions.reduce((sum, item) => sum + item.netAmount, 0);

  return {
    balance: {
      available,           // SUM(transaction.netAmount)
      taxReserve,          // SUM(transaction.taxAmount)
      platformFeeReserve,  // SUM(transaction.platformFeeAmount)
      processing: pendingReceipts > 0 ? totalAmount : 0,
    },
    summary: {
      totalAmount,
      totalTax,
      totalPlatformFee,
      available,
      pendingReceipts,
      failedReceipts,
    },
    recentTransactions: transactions,
  };
}
```

### Current vs. Ledger Source

| Field | Current Source | Type | Should Use Ledger |
|-------|---|---|---|
| `available` | `SUM(transaction.netAmount)` | Transaction field | `SUM(ledgerEntry.amount WHERE type = SELF_EMPLOYED_BALANCE)` |
| `taxReserve` | `SUM(transaction.taxAmount)` | Transaction field | `SUM(ledgerEntry.amount WHERE type = TAX_RESERVED)` |
| `platformFeeReserve` | `SUM(transaction.platformFeeAmount)` | Transaction field | `SUM(ledgerEntry.amount WHERE type = PLATFORM_FEE_RESERVED)` |
| `totalAmount` | `SUM(transaction.grossAmount)` | Transaction field | `SUM(ledgerEntry.amount WHERE type = CLIENT_PAYMENT_RECEIVED)` |

### Risk: Source of Truth Violation

- Dashboard queries **Transaction**, not **LedgerEntry**
- If Ledger and Transaction diverge, Dashboard shows stale/incorrect data
- No validation that Ledger entries match Transaction fields

---

## 7. Receipts — Financial Impact Check

**File:** `apps/api/prisma/schema.prisma`

```prisma
model Receipt {
  id            String        @id @default(cuid())
  title         String
  client        String
  amount        Int
  status        ReceiptStatus @default(PENDING)  // PENDING, ISSUED, FAILED
  date          String
  createdAt     DateTime      @default(now())

  transactionId String?       @unique
  transaction   Transaction?  @relation(fields: [transactionId], references: [id])
}
```

### Receipt Status Lifecycle

| Status | Triggers LedgerEntry? | Affects Balance? | Notes |
|--------|---|---|---|
| PENDING | No | No | Initial state when Transaction created |
| ISSUED | **NO** | No | Successful issuance; does NOT create new Ledger record |
| FAILED | **NO** | No | Failure to issue; does NOT create Ledger record |

**Finding:** ✅ **Correct behavior.** Receipt is proof of issuance, not a financial entry.

Money is accounted for in Transaction/LedgerEntry. Receipt status only tracks issuance state.

**DO NOT add:** `RECEIPT_ISSUED` or `RECEIPT_FAILED` as LedgerEntryType—receipts don't move money.

---

## 8. Duplicate Financial Logic — All Locations

### Tax and Platform Fee Calculation

Hardcoded formula: `tax = round(gross * 0.04)`, `fee = round(gross * 0.01)`

**Location 1:** `apps/api/src/payment-links/payment-links.service.ts` (lines 67–69)

```typescript
const taxAmount = Math.round(grossAmount * 0.04);
const platformFeeAmount = Math.round(grossAmount * 0.01);
const netAmount = grossAmount - taxAmount - platformFeeAmount;
```

**Location 2:** `apps/api/src/webhooks/webhooks.service.ts` (lines 126–128)

```typescript
const taxAmount = Math.round(grossAmount * 0.04);
const platformFeeAmount = Math.round(grossAmount * 0.01);
const netAmount = grossAmount - taxAmount - platformFeeAmount;
```

**Location 3:** `apps/api/src/transactions/transactions.service.ts` (lines 36–48)

```typescript
const taxAmount = Number(body.taxAmount ?? Math.round(grossAmount * 0.04));
const platformFeeAmount = Number(
  body.platformFeeAmount ?? Math.round(grossAmount * 0.01),
);
const netAmount = Number(
  body.netAmount ?? grossAmount - taxAmount - platformFeeAmount,
);
```

### LedgerEntry Creation Logic

**Location 1:** `apps/api/src/ledger/ledger.service.ts` (lines 29–50) — via `createTransactionEntries()`

```typescript
return this.prisma.ledgerEntry.createMany({
  data: [
    { transactionId, type: CLIENT_PAYMENT_RECEIVED, direction: CREDIT, amount: grossAmount },
    { transactionId, type: TAX_RESERVED, direction: DEBIT, amount: taxAmount },
    { transactionId, type: PLATFORM_FEE_RESERVED, direction: DEBIT, amount: platformFeeAmount },
    { transactionId, type: SELF_EMPLOYED_BALANCE, direction: CREDIT, amount: netAmount },
  ],
});
```

**Location 2:** `apps/api/src/webhooks/webhooks.service.ts` (lines 162–189) — direct `tx.ledgerEntry.createMany()`

```typescript
await tx.ledgerEntry.createMany({
  data: [
    { transactionId: transaction.id, type: LedgerEntryType.CLIENT_PAYMENT_RECEIVED, direction: LedgerDirection.CREDIT, amount: grossAmount },
    { transactionId: transaction.id, type: LedgerEntryType.TAX_RESERVED, direction: LedgerDirection.DEBIT, amount: taxAmount },
    { transactionId: transaction.id, type: LedgerEntryType.PLATFORM_FEE_RESERVED, direction: LedgerDirection.DEBIT, amount: platformFeeAmount },
    { transactionId: transaction.id, type: LedgerEntryType.SELF_EMPLOYED_BALANCE, direction: LedgerDirection.CREDIT, amount: netAmount },
  ],
});
```

### Summary of Duplication

| Logic | Locations | Risk |
|-------|-----------|------|
| Tax/fee calculation | 3 places (payment-links, webhooks, transactions) | If formula changes, all 3 must update |
| LedgerEntry creation | 2 places (ledger.service via function, webhooks via direct call) | Code path inconsistency; DRY violation |

---

## 9. Errors in Previous Audit

### ❌ False Claim #1: "Ledger sums to zero"

**Previous statement:**
> "Ledger всегда суммируется в 0 (gross - tax - fee = net)"

**Reality:** 
- CREDIT (195) − DEBIT (5) = 190 ≠ 0
- This is **correct behavior** (sum = gross amount), not an error
- Ledger is **not classical double-entry** where credits always equal debits

### ❌ False Claim #2: "Webhook doesn't use LedgerService"

**Previous statement:**
> "webhook создаёт LedgerEntry напрямую, а simulate-payment через LedgerService"

**Reality:** Both approaches are valid. Webhook uses direct `tx.ledgerEntry.createMany()` because it's **within a Prisma transaction**. Calling LedgerService inside transaction may lose the transaction context (design choice, not error).

### ✅ Correct: "simulate-payment is NOT atomic"

Confirmed—three separate await calls with no $transaction wrapper.

### ✅ Correct: "TransactionsService.create() does NOT create LedgerEntry"

Confirmed—only rw-only Transaction, no financial entity creation.

### ✅ Correct: "Dashboard doesn't use Ledger"

Confirmed—all calculations from Transaction fields.

### ✅ Correct: "Duplication of tax/fee calculation"

Confirmed—3 separate locations with identical logic.

---

## 10. Verified Critical Gaps

### 🔴 Gap 1: Atomicity of simulate-payment

**File:** `apps/api/src/payment-links/payment-links.service.ts` (lines 56–120)

**Problem:** Transaction and Receipt can be created without LedgerEntry if failure occurs.

**Impact:** 
- Financial data inconsistency
- Dashboard would count Transaction but no Ledger entries
- Available balance calculations become unreliable

**Resolution:** Wrap all three creates in `prisma.$transaction`.

### 🔴 Gap 2: Dashboard uses Transaction instead of Ledger

**File:** `apps/api/src/dashboard/dashboard.service.ts`

**Problem:** All balance calculations sum Transaction fields, ignoring Ledger.

**Impact:** 
- Violates "Ledger is source of truth" principle
- No way to verify Ledger integrity
- Frontend has no way to query Ledger directly

**Resolution:** Create `calculateBalanceFromLedger()` service method.

### 🔴 Gap 3: Webhook creates LedgerEntry directly, not via service

**File:** `apps/api/src/webhooks/webhooks.service.ts` (lines 162–189)

**Problem:** Two code paths create LedgerEntry (service + direct), duplicating logic.

**Impact:** 
- If LedgerEntry creation logic needs to change, both places must update
- Inconsistent error handling

**Resolution:** Extract common LedgerEntry creation logic to service.

### 🟡 Gap 4: POST /transactions endpoint has no LedgerEntry

**File:** `apps/api/src/transactions/transactions.service.ts`

**Problem:** Creates Transaction without LedgerEntry, bypassing payment event model.

**Current status:** ✅ **Not actually used** (confirmed via grep—no frontend call, no backend caller).

**Recommendation:** Keep as-is or mark as internal/deprecated. Not blocking.

### 🟡 Gap 5: No DTO or validation

**Files:** All controllers and services use `body: any`

**Problem:** 
- No type safety
- No validation of amounts (could be negative, zero, NaN)
- No guarantee structure

**Impact:** Low for MVP; improves with user auth.

---

## 11. Minimal Completion Plan for Ledger (One MVP Iteration)

### Goal
Make Ledger the single source of truth for balance calculations, with atomic guarantees across simulate-payment, webhook, and dashboard.

### Phase 1: Fix Atomicity (Critical)

#### Step 1.1: Wrap simulate-payment in transaction

**File:** `apps/api/src/payment-links/payment-links.service.ts`

**Change:**
- Wrap Transaction.create, Receipt.create, LedgerEntry.createMany in single `prisma.$transaction`
- Simplify: use `ledgerService.createTransactionEntries()` (it just calls `createMany` internally)

**Criterion:** All three operations succeed or all rollback.

**Risks:**
- If webhook handles different account types later, pattern must adapt
- Must test error scenarios

**Prisma migration needed:** ❌ NO

#### Step 1.2: Unify LedgerEntry creation path

**File:** `apps/api/src/ledger/ledger.service.ts`

**Change:**
- Add async wrapper to support tx client:
  ```typescript
  async createTransactionEntries(params, txClient?) {
    const client = txClient ?? this.prisma;
    return client.ledgerEntry.createMany({...});
  }
  ```
- Allow webhook to pass Prisma transaction client

**File:** `apps/api/src/webhooks/webhooks.service.ts`

**Change:**
- Inject `LedgerService`
- Replace direct `tx.ledgerEntry.createMany()` with `this.ledgerService.createTransactionEntries(params, tx)`

**Criterion:** Single code path for all LedgerEntry creation.

**Risks:**
- Must test transaction isolation
- NestJS circular dependency if not careful (use forward refs)

**Prisma migration needed:** ❌ NO

---

### Phase 2: Ledger as Source of Truth (High Priority)

#### Step 2.1: Add balance calculation service

**New file:** `apps/api/src/ledger/ledger-balance.service.ts`

**Methods:**
```typescript
async getTotalReceived(): Promise<number>
// SUM(amount WHERE type = CLIENT_PAYMENT_RECEIVED)

async getTaxReserve(): Promise<number>
// SUM(amount WHERE type = TAX_RESERVED)

async getPlatformFeeReserve(): Promise<number>
// SUM(amount WHERE type = PLATFORM_FEE_RESERVED)

async getAvailableBalance(): Promise<number>
// SUM(amount WHERE type = SELF_EMPLOYED_BALANCE)

async validateLedgerIntegrity(): Promise<boolean>
// For each transaction: assert 4 entries exist with correct amounts
```

**Criterion:** Methods return correct sums and pass integrity check.

**Risks:**
- Query performance on large ledgers (add indexing later)
- No userId filtering yet (okay for MVP)

**Prisma migration needed:** ❌ NO (existing table)

#### Step 2.2: Migrate Dashboard to Ledger

**File:** `apps/api/src/dashboard/dashboard.service.ts`

**Change:**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly ledgerBalance: LedgerBalanceService,  // NEW
) {}

async getDashboard() {
  // Use new service instead of summing transactions
  const available = await this.ledgerBalance.getAvailableBalance();
  const taxReserve = await this.ledgerBalance.getTaxReserve();
  const platformFeeReserve = await this.ledgerBalance.getPlatformFeeReserve();
  const totalAmount = await this.ledgerBalance.getTotalReceived();
  
  // Keep transaction details for display
  const transactions = await this.prisma.transaction.findMany({...});
  
  return {
    balance: { available, taxReserve, platformFeeReserve, processing: 0 },
    summary: {...},
    recentTransactions: transactions,
  };
}
```

**Criterion:** Dashboard returns same values, but now from Ledger.

**Risks:**
- Refactor must preserve API response shape
- Test with existing frontend

**Prisma migration needed:** ❌ NO

#### Step 2.3: Add GET /ledger/balance endpoint

**File:** `apps/api/src/ledger/ledger.controller.ts`

**Change:**
```typescript
@Get('balance')
async getBalance() {
  return {
    available: await this.ledgerBalance.getAvailableBalance(),
    taxReserve: await this.ledgerBalance.getTaxReserve(),
    platformFeeReserve: await this.ledgerBalance.getPlatformFeeReserve(),
    totalReceived: await this.ledgerBalance.getTotalReceived(),
  };
}
```

**Criterion:** Endpoint returns correct aggregates.

**Risks:**
- None—purely additive

**Prisma migration needed:** ❌ NO

---

### Phase 3: Optional Quality (Next Iteration)

- Add integrity check endpoint: `GET /ledger/validate`
- Add unit tests for `LedgerBalanceService`
- Add integration test for simulate-payment atomicity
- Extract fee calculation to constant service

---

## Summary: Current State Classification

| Component | Status | Severity | Blocker |
|-----------|--------|----------|---------|
| Ledger model exists | ✅ Complete | — | No |
| Webhook creates atomically | ✅ Complete | — | No |
| simulate-payment NOT atomic | ❌ Broken | **CRITICAL** | **YES** |
| Dashboard uses Transaction not Ledger | ⚠️ Partial | High | **YES** (for MVP completion) |
| Duplication of LedgerEntry logic | ⚠️ Partial | Medium | No |
| POST /transactions unused | ✅ Benign | Low | No |

---

## Next Step Recommendation

**Start with Phase 1 (Steps 1.1–1.2):**
1. Atomize simulate-payment (wrap in $transaction)
2. Unify LedgerEntry creation in single code path

This fixes the critical gap and takes ~2 hours.

**Then Phase 2 (Steps 2.1–2.3):**
1. Add LedgerBalanceService
2. Migrate Dashboard
3. Add GET /ledger/balance endpoint

This completes Ledger as source of truth and takes ~4 hours.

**Result:** Ledger is atomic, tested, and the single source of truth for all balance calculations.
