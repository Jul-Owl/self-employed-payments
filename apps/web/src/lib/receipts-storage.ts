export type ReceiptItem = {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: "ISSUED" | "PENDING" | "FAILED";
  date: string;
};

const STORAGE_KEY = "se-receipts";

export function getStoredReceipts(): ReceiptItem[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ReceiptItem[];
  } catch {
    return [];
  }
}

export function saveReceipt(item: ReceiptItem) {
  if (typeof window === "undefined") return;

  const current = getStoredReceipts();
  const updated = [item, ...current];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}