export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type CatalogItemType = "SERVICE" | "PRODUCT";
export type CatalogItemUnit = "PIECE" | "HOUR" | "MINUTE" | "DAY" | "SET";
export type CatalogItemPaymentPolicy =
  | "NO_PREPAYMENT"
  | "FIXED_PREPAYMENT"
  | "PERCENT_PREPAYMENT"
  | "FULL_PREPAYMENT";

export type CatalogItem = {
  id: string;
  title: string;
  description: string | null;
  type: CatalogItemType;
  isActive: boolean;
  isBookable: boolean;
  price: number | null;
  durationMinutes: number | null;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  unit: CatalogItemUnit | null;
  paymentPolicy: CatalogItemPaymentPolicy | null;
  prepaymentValue: number | null;
  category: string | null;
};

export type CatalogItemPayload = Omit<CatalogItem, "id">;

async function catalogRequest<T>(path: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;

    throw new Error(message || "Не удалось выполнить операцию с каталогом");
  }

  return response.json() as Promise<T>;
}

export function fetchCatalogItems() {
  return catalogRequest<CatalogItem[]>("/catalog", {
    cache: "no-store",
  });
}

export function createCatalogItem(payload: CatalogItemPayload) {
  return catalogRequest<CatalogItem>("/catalog", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCatalogItem(id: string, payload: Partial<CatalogItemPayload>) {
  return catalogRequest<CatalogItem>(`/catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function archiveCatalogItem(id: string) {
  return catalogRequest<CatalogItem>(`/catalog/${id}`, {
    method: "DELETE",
  });
}

export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type WeeklyWorkingHours = {
  id: string;
  dayOfWeek: DayOfWeek;
  isWorking: boolean;
  startMinutes: number | null;
  endMinutes: number | null;
};

export type CalendarDateOverrideType = "CLOSED" | "OPEN";

export type CalendarDateOverride = {
  id: string;
  date: string;
  type: CalendarDateOverrideType;
  startMinutes: number | null;
  endMinutes: number | null;
  reason: string | null;
};

export type CalendarDayResolution = {
  date: string;
  isWorking: boolean;
  startMinutes: number | null;
  endMinutes: number | null;
  resolvedBy: "OVERRIDE" | "OFFICIAL_CALENDAR" | "WEEKLY_SCHEDULE";
  resolvedRule:
    | "OPEN"
    | "CLOSED"
    | "HOLIDAY"
    | "WORKING_DAY"
    | "WEEKLY_WORKING"
    | "WEEKLY_CLOSED";
};

export type WeeklyWorkingHoursPayload = {
  isWorking: boolean;
  startMinutes?: number;
  endMinutes?: number;
};

export type CalendarDateOverridePayload = {
  date: string;
  type: CalendarDateOverrideType;
  startMinutes?: number;
  endMinutes?: number;
  reason?: string | null;
};

export function fetchWeeklyWorkingHours() {
  return catalogRequest<WeeklyWorkingHours[]>("/calendar/weekly", {
    cache: "no-store",
  });
}

export function upsertWeeklyWorkingHours(
  dayOfWeek: DayOfWeek,
  payload: WeeklyWorkingHoursPayload,
) {
  return catalogRequest<WeeklyWorkingHours>(`/calendar/weekly/${dayOfWeek}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchCalendarDateOverrides() {
  return catalogRequest<CalendarDateOverride[]>("/calendar/overrides", {
    cache: "no-store",
  });
}

export function createCalendarDateOverride(
  payload: CalendarDateOverridePayload,
) {
  return catalogRequest<CalendarDateOverride>("/calendar/overrides", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCalendarDateOverride(
  id: string,
  payload: Partial<CalendarDateOverridePayload>,
) {
  return catalogRequest<CalendarDateOverride>(`/calendar/overrides/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCalendarDateOverride(id: string) {
  return catalogRequest<CalendarDateOverride>(`/calendar/overrides/${id}`, {
    method: "DELETE",
  });
}

export function resolveCalendarDay(date: string) {
  return catalogRequest<CalendarDayResolution>(`/calendar/day/${date}`, {
    cache: "no-store",
  });
}

export async function fetchPaymentLinks() {
  const response = await fetch(`${API_BASE_URL}/payment-links`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить платежные ссылки");
  }

  return response.json();
}

export async function createPaymentLink(payload: {
  title: string;
  amount: number;
  payerType: string;
}) {
  const response = await fetch(`${API_BASE_URL}/payment-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось создать платежную ссылку");
  }

  return response.json();
}
export async function fetchTransactions() {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить операции");
  }

  return response.json();
}

export async function createTransaction(payload: {
  title: string;
  client: string;
  amount: number;
  tax: number;
  date: string;
}) {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось создать операцию");
  }

  return response.json();
}
export async function fetchReceipts() {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить чеки");
  }

  return response.json();
}

export async function createReceipt(payload: {
  title: string;
  client: string;
  amount: number;
  status: "ISSUED" | "PENDING" | "FAILED";
  date: string;
}) {
  const response = await fetch(`${API_BASE_URL}/receipts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Не удалось создать чек");
  }

  return response.json();
}
export async function fetchPaymentLinkById(id: string) {
  const response = await fetch(`${API_BASE_URL}/payment-links/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить ссылку");
  }

  return response.json();
}
export async function fetchTransactionById(id: string) {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить операцию");
  }

  return response.json();
}
export async function fetchReceiptById(id: string) {
  const response = await fetch(`${API_BASE_URL}/receipts/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить чек");
  }

  return response.json();
}
export async function simulatePayment(paymentLinkId: string) {
  const response = await fetch(
    `${API_BASE_URL}/payment-links/${paymentLinkId}/simulate-payment`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error("Не удалось сымитировать оплату");
  }

  return response.json();
}
export async function fetchDashboard() {
  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить dashboard");
  }

  return response.json();
}