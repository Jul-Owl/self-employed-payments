"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchReceipts } from "@/lib/api";
import type { ReceiptItem } from "@/lib/mock-data";
import Link from "next/link";

const statusMap: Record<string, { label: string; className: string }> = {
  ISSUED: {
    label: "Чек создан",
    className: "bg-emerald-50 text-emerald-700",
  },
  PENDING: {
    label: "Создаётся",
    className: "bg-amber-50 text-amber-700",
  },
  FAILED: {
    label: "Ошибка",
    className: "bg-rose-50 text-rose-700",
  },
};

export default function ReceiptsPage() {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchReceipts();
        setItems(data);
      } catch (err) {
        setError("Не удалось загрузить чеки");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const summary = useMemo(() => {
    const issued = items.filter((item) => item.status === "ISSUED").length;
    const pending = items.filter((item) => item.status === "PENDING").length;
    const failed = items.filter((item) => item.status === "FAILED").length;

    return { issued, pending, failed };
  }, [items]);

  return (
    <main>
      <div className="w-full">
        <header className="mb-6">
          <p className="text-sm text-slate-500">Чеки</p>
          <h1 className="mt-2 text-2xl font-semibold">Чеки и статусы</h1>
          <p className="mt-2 text-sm text-slate-600">
            Проверяй, какие чеки уже созданы и где нужно внимание.
          </p>
        </header>

        {loading && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Загружаем чеки...</p>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-rose-600">{error}</p>
          </section>
        )}

        {!loading && !error && (
          <>
            <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-900">Сводка</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Создано</p>
                  <p className="mt-1 text-lg font-semibold">{summary.issued}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">В работе</p>
                  <p className="mt-1 text-lg font-semibold">{summary.pending}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Ошибка</p>
                  <p className="mt-1 text-lg font-semibold">{summary.failed}</p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {items.map((item) => {
                const status = statusMap[item.status];

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.client} • {item.date}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-slate-500">Сумма</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.amount} ₽
                      </p>
                    </div>

                    {item.status === "FAILED" && (
                      <button className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                        Повторить выпуск чека
                      </button>
                    )}
                    <div className="mt-4">
  <Link
    href={`/receipts/${item.id}`}
    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
  >
    Подробнее
  </Link>
</div>
                  </article>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}