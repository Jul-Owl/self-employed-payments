"use client";

import { useEffect, useState } from "react";
import { fetchLedgerEntries, LedgerEntry } from "@/lib/api";

const entryLabels: Record<string, string> = {
  CLIENT_PAYMENT_RECEIVED: "Платёж клиента",
  TAX_RESERVED: "Налоговый резерв",
  PLATFORM_FEE_RESERVED: "Комиссия сервиса",
  SELF_EMPLOYED_BALANCE: "Остаток самозанятого",
};

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setError("");
        setEntries(await fetchLedgerEntries());
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Не удалось загрузить проводки.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <main>
      <header className="mb-6">
        <p className="text-sm text-slate-500">Финансы</p>
        <h1 className="mt-2 text-2xl font-semibold">Проводки</h1>
        <p className="mt-2 text-sm text-slate-600">
          Журнал движения денег по вашим операциям.
        </p>
      </header>

      {loading && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">Загружаем проводки…</p>
        </section>
      )}

      {!loading && error && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      )}

      {!loading && !error && entries.length === 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">Проводок пока нет.</p>
        </section>
      )}

      {!loading && !error && entries.length > 0 && (
        <section className="space-y-3">
          {entries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {entryLabels[entry.type] ?? entry.type}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {entry.transaction.title} · {entry.transaction.client}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    entry.direction === "CREDIT"
                      ? "text-emerald-700"
                      : "text-slate-900"
                  }`}
                >
                  {entry.direction === "CREDIT" ? "+" : "-"} {entry.amount} ₽
                </p>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
