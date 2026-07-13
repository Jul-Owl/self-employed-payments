## Purpose

This repository contains an MVP platform for self-employed professionals.

The product combines:

- payment links;
- payment processing;
- transaction accounting;
- tax reserve calculation;
- platform monetization;
- receipts;
- future booking and calendar functionality;
- future bank nominal account integration;
- future payouts and subscription billing.

The primary goal is to build a working MVP, not a perfect enterprise platform.

## Repository structure

```text
apps/
  web/        Next.js user-facing application
  api/        NestJS backend
  admin/      future administrative application

packages/
  sdk/
  types/

infra/
````

## Main stack

* TypeScript
* Next.js
* NestJS
* PostgreSQL
* Prisma ORM
* pnpm workspaces
* Turborepo

## Current project state

Implemented:

* payment link creation;
* payment link list and details;
* simulated payment flow;
* transactions;
* receipts;
* ledger entries (4 entry types per payment);
* PostgreSQL persistence;
* Prisma migrations;
* dashboard based on database data (calculates from LedgerEntry);
* relations between PaymentLink, Transaction, Receipt and LedgerEntry;
* enum statuses;
* tax calculation;
* platform percentage fee;
* net amount calculation;
* atomic payment processing (Transaction + Receipt + LedgerEntry within single Prisma transaction).

Current financial fields:

```text
grossAmount
taxAmount
platformFeeAmount
netAmount
```

Current test calculation:

```text
taxAmount = round(grossAmount * 0.04)
platformFeeAmount = round(grossAmount * 0.01)
netAmount = grossAmount - taxAmount - platformFeeAmount
```

Note: 1% platform fee is a temporary MVP test rule. The monetization model (PERCENT, SUBSCRIPTION, or HYBRID) will be implemented in the Monetization stage. During SUBSCRIPTION model, platformFeeAmount will be set to 0 for customer payments, with monthly fees passing through a separate money flow to the platform settlement account.

The current `simulate-payment` endpoint temporarily replaces the future bank webhook.

## Product principles

### Payment link creation is not a payment

Creating a payment link must not create:

* Transaction;
* Receipt;
* LedgerEntry.

Financial entities are created only after a confirmed payment event.

### Payment event flow

```text
PaymentLink
→ confirmed payment event
→ Transaction
→ Receipt
→ LedgerEntry records
```

### Money must be stored as integers

All money values are stored in the smallest practical currency unit used by the project.

Do not use floating-point values for money calculations.

### Separate money flows

There are two separate financial contours.

#### Customer money

```text
Customer
→ nominal bank account
→ tax reserve
→ transaction fee, when applicable
→ self-employed balance
```

#### Platform subscription revenue

```text
Self-employed user
→ platform settlement account
```

Subscription payments must not be mixed with customer payments or nominal-account balances.

## Monetization

The platform must support:

* `PERCENT`;
* `SUBSCRIPTION`;
* `HYBRID`.

### PERCENT

The platform receives a percentage of each customer payment.

The commission is separated from the customer payment through the nominal account.

### SUBSCRIPTION

The self-employed user pays a fixed monthly fee directly to the platform settlement account.

Customer payments still pass through the nominal account.

### HYBRID

The user pays both:

* a fixed monthly fee;
* a percentage of customer payments.

### Monetization assignment

The administration system must be able to apply monetization rules to:

* all users;
* a segment;
* a group;
* an individual user.

Priority:

```text
individual assignment
> segment or group assignment
> default global plan
```

Assignments must support start and end dates.

## Subscription billing

Monthly billing must be based on the end of the last paid period.

Example:

```text
paid period ends on 18 August
→ next charge becomes due on 18 August
```

Do not assume billing always happens on the first day of the calendar month.

Future entities may include:

* MonetizationPlan;
* ClientMonetizationAssignment;
* Subscription;
* SubscriptionInvoice;
* SubscriptionPayment;
* BillingAccount.

## Universal service model

The next major technical stage is the Universal Service model.

A shared `Service` entity must be introduced before building the booking calendar.

Important: Service does not contain the platform monetization model. Monetization model (ownerId, assignment priorities, platform rules) will be added in the Monetization stage.

Expected fields:

* id;
* ownerId;
* title;
* description;
* price;
* durationMinutes;
* category;
* isActive;
* isBookable;
* bufferBeforeMinutes;
* bufferAfterMinutes;
* paymentPolicy;
* prepaymentValue;
* createdAt;
* updatedAt.

Payment policies:

* `NO_PREPAYMENT`;
* `FIXED_PREPAYMENT`;
* `PERCENT_PREPAYMENT`;
* `FULL_PREPAYMENT`.

Payment links and bookings should eventually reference `Service`.

## Calendar and booking

The booking system must support:

* weekly working schedule;
* working hours;
* personal days off;
* vacations;
* public holidays;
* officially transferred public holidays;
* manual opening or closing of a specific date;
* booking links;
* service selection;
* slot selection;
* confirmation;
* cancellation;
* rescheduling;
* customer comments.

Availability priority:

```text
manual date override
> public holiday rule
> weekly schedule
```

A public holiday is a default closure, not an absolute prohibition. The user may manually open that date.

Prepayment is optional and configured per service.

## Entity statuses

### PaymentLinkStatus

* `ACTIVE`
* `ARCHIVED`

### TransactionStatus

* `RECEIVED`
* `PROCESSED`

### ReceiptStatus

* `PENDING`
* `ISSUED`
* `FAILED`

Future statuses must be introduced only when they represent a real product state.

Do not create technical statuses without clear user or operational meaning.

## Ledger

Status: Completed.

Ledger is the source of truth for financial balances.

Entry types (all 4 types created atomically per payment):

* CLIENT_PAYMENT_RECEIVED (CREDIT);
* TAX_RESERVED (DEBIT);
* PLATFORM_FEE_RESERVED (DEBIT);
* SELF_EMPLOYED_BALANCE (CREDIT);
* (future) payout reserved, payout completed, refund, correction.

Payment postings per transaction:

```text
CLIENT_PAYMENT_RECEIVED: +grossAmount (CREDIT)
TAX_RESERVED: -taxAmount (DEBIT)
PLATFORM_FEE_RESERVED: -platformFeeAmount (DEBIT)
SELF_EMPLOYED_BALANCE: +netAmount (CREDIT)
```

Atomicity: All four entries created within single Prisma transaction.

Dashboard now calculates financial balances by aggregating LedgerEntry amounts.

Important: Ledger does not determine monetization model. It receives ready-made platformFeeAmount from business logic. 
The choice between PERCENT, SUBSCRIPTION, and HYBRID will be implemented in the Monetization stage.

## Bank integration

The future banking integration is based on a nominal account.

The bank integration must include:

* beneficiary management;
* payment events;
* webhooks;
* payouts;
* idempotency;
* raw webhook event storage;
* external identifiers;
* authentication and certificates;
* reconciliation.

Bank-specific logic should be isolated behind an adapter or integration module.

Do not spread T-Bank-specific code throughout domain services.

The simulated payment endpoint must remain clearly marked as development-only.

## Receipts and tax flow

Future receipt lifecycle:

* `PENDING`;
* `ISSUED`;
* `FAILED`;
* `CANCELLED`.

Expected future fields:

* externalReceiptId;
* failureReason;
* issuedAt;
* cancelledAt;
* retryCount.

Receipt failures must not silently disappear.

## Payouts

Future payout statuses:

* `CREATED`;
* `PROCESSING`;
* `PAID`;
* `FAILED`.

A payout must be based on an available Ledger balance, not only on transaction totals.

## Backend rules

* Prefer small NestJS modules by domain.
* Business logic belongs in services, not controllers.
* Controllers should remain thin.
* Use DTOs and validation for input.
* Avoid `any` in new production code.
* Return meaningful HTTP errors.
* Use Prisma transactions for atomic financial operations.
* Never edit generated Prisma Client files.
* Never edit migration files after they have been applied, unless explicitly performing a controlled local recovery.
* Schema changes require a named Prisma migration.
* Generate Prisma Client after schema changes.
* Do not expose database credentials or bank secrets.

## Frontend rules

* The frontend must use backend APIs rather than localStorage for domain data.
* UI labels must use human-readable Russian text.
* Internal enum values may remain in English in the API.
* Every loading operation should have loading and error states.
* Do not duplicate financial calculations in the frontend when the backend already returns calculated values.
* Prefer reusable components when the same UI pattern appears several times.
* Keep current mobile-first layout until visual redesign begins.

## Development workflow

Before changing code:

1. Read:

   * `README.md`;
   * `PROJECT_STATE.md`;
   * `ROADMAP.md`;
   * this file.
2. Inspect the actual repository structure.
3. Check existing Prisma models and API endpoints.
4. Present a concise implementation plan.
5. Do not modify unrelated files.

After changing code:

1. Run relevant type checks.
2. Run Prisma generation if the schema changed.
3. Run migrations only when required.
4. Start or build the affected application.
5. Show a concise summary of changed files.
6. Show any unresolved risks or manual steps.
7. Do not commit automatically unless explicitly requested.

## Safety rules

Never commit:

* `.env`;
* database passwords;
* API keys;
* bank certificates;
* private keys;
* access tokens;
* production customer data.

Do not delete or reset the database without explicit confirmation.

Do not run destructive Git commands without explicit confirmation.

Do not change ports, package managers or core architecture without explaining why.

## Working with the product owner

The repository owner is a product manager, not a professional developer.

Instructions must therefore:

* be concrete;
* name exact files;
* explain the expected result;
* avoid assuming knowledge of terminal or TypeScript internals;
* prefer complete file replacements when a manual partial edit is error-prone;
* clearly distinguish terminal commands from file contents;
* stop and explain before destructive operations.

## Current roadmap priority

1. Universal Service model.
2. Calendar and online booking.
3. Monetization plans and assignments.
4. Subscription billing.
5. User and account layer.
6. Bank nominal account integration.
7. Receipts and tax integration.
8. Payouts.
9. Admin and operations.

````