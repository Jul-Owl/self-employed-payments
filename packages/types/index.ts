export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export type BeneficiaryStatus =
  | "NOT_CREATED"
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export type PaymentLinkStatus = "ACTIVE" | "ARCHIVED";

export type IncomingPaymentStatus =
  | "RECEIVED"
  | "MATCHED"
  | "PROCESSING"
  | "PROCESSED"
  | "REQUIRES_REVIEW"
  | "REFUNDED";

export type ReceiptStatus = "PENDING" | "ISSUED" | "FAILED" | "CANCELLED";

export type PayoutStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";