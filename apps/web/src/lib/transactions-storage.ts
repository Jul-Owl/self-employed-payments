export type TransactionItem = {
  id: string;
  title: string;
  client: string;
  amount: number;
  tax: number;
  date: string;
};

const STORAGE_KEY = "se-transactions";

export function getStoredTransactions(): TransactionItem[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as TransactionItem[];
  } catch {
    return [];
  }
}

export function saveTransaction(item: TransactionItem) {
  if (typeof window === "undefined") return;

  const current = getStoredTransactions();
  const updated = [item, ...current];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}