import type { PaymentItem } from "./mock-data";

const STORAGE_KEY = "se-payment-links";

export function getStoredPaymentLinks(): PaymentItem[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as PaymentItem[];
  } catch {
    return [];
  }
}

export function savePaymentLink(item: PaymentItem) {
  if (typeof window === "undefined") return;

  const current = getStoredPaymentLinks();
  const updated = [item, ...current];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}