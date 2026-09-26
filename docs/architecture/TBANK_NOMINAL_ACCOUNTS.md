# T-Bank Nominal Accounts — confirmed integration constraints

**Status:** CONFIRMED EXTERNAL BEHAVIOUR / NOT IMPLEMENTED.

This document records the official T-Bank response about Nominal Accounts and
is the source of truth for this integration. It does not describe implemented
API code, database models, or a production-ready integration.

## Scope and terminology

The Nominal Accounts API is a future bank integration behind an adapter or
integration module. Its technical settlement mechanisms do not replace the
platform's monetization domain: the base models remain Commission (`PERCENT`)
and Subscription; Hybrid is their combination.

The internal `Receipt` entity is a platform record of a receipt lifecycle. It
is not proof that a real NPD/FNS ("Мой налог") receipt has been registered or
issued.

## Confirmed nominal-account payment flow

There are no nominal-account webhooks or callbacks. Incoming customer money
must be processed by polling the Nominal Accounts API list of unidentified
incoming transactions. When the intended transaction is found, the backend
explicitly identifies it for the required payer through the corresponding
identify operation.

The intended conceptual flow is:

```text
beneficiary and requisites
→ deal and stage
→ customer transfers money to nominal account
→ application polling finds an unidentified incoming transaction
→ application identifies it for the payer
→ confirmed business payment / Transaction and Ledger processing
→ conditions for payout
→ stage completion and payout to the recipient
```

Polling interval, worker/scheduler design, reconciliation boundaries, and
operational retry policy are deliberately open implementation questions.

## Webhooks

T-Bank confirmed that Nominal Accounts provide no webhooks for:

- incoming or identified payments;
- deal or stage status changes;
- successful or failed recipient payouts.

`WebhookEvent` and any existing generic payment webhook endpoint must not be
used to model Nominal Accounts events. They may remain relevant to a different
payment provider/product where callbacks are actually supported.

## Idempotency and retries

For critical Nominal Accounts POST operations, the application generates the
idempotency key. A timeout or network-failure retry for one business operation
must reuse exactly the same key; a new business operation receives a new key.

The concrete storage model, key format, operation list, and retry worker are
not designed or implemented yet.

## Commission settlement

T-Bank recommends a `Lite_contact` beneficiary with the platform settlement
account attached. Two confirmed technical variants exist:

1. transfer the platform commission to the platform settlement account inside
   each deal;
2. accumulate the commission on the `Lite_contact` virtual account and make a
   periodic transfer.

The intended first MVP implementation is variant 1: settle each deal's
percentage commission immediately to the platform settlement account. This is
a settlement choice only; it does not change Commission, Subscription, or
Hybrid product rules. Subscription revenue remains a separate money flow and
is not mixed with customer money in the nominal account.

## Self-employed payout

The confirmed payout approach remains the existing deal/stage model:
beneficiary, requisites, deal, stage, deponent/recipient, deal confirmation,
incoming-money identification, stage completion, and payout. No separate
special nominal-account payout mechanism is assumed for self-employed
recipients.

## P0: NPD/FNS receipts are a separate external dependency

T-Bank confirmed that Nominal Accounts do not register self-employed receipts,
and the product "Выплаты самозанятым" does not work together with Nominal
Accounts. Therefore production cannot rely on this unsupported chain:

```text
nominal payout → NPD income registration → FNS receipt creation
```

NPD/FNS registration is a separate P0 external integration track. The future
provider/API, legal basis, and technical integration are open dependencies and
must not be selected or implemented by implication.

The required conceptual production sequence is:

```text
payment confirmed
→ payout conditions satisfied
→ register NPD income through a separate compliant integration
→ obtain and persist a real FNS receipt identifier / URL / relevant data
→ send or provide the real receipt to the customer
→ only then mark the external receipt flow as successfully issued
```

The real-money production pilot is blocked until this path is resolved.

## Sandbox limitation

The Nominal Accounts sandbox does not persist data and returns standard or
mock-like responses. It is suitable for request shape, authentication, method
invocation, and exposed schema/status handling. It is not a realistic,
persistent end-to-end simulation of money movement, deal lifecycle, incoming
transaction persistence, or payout lifecycle.

## API documentation

T-Bank directs integrators to the Nominal Accounts API method documentation.
No separate downloadable OpenAPI or Swagger artefact is assumed unless
verified and added to this repository later.
