"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchTransactions } from "@/lib/api";

type TransactionItem = {
  id: string;
  title: string;
  client: string;
  grossAmount: number;
  taxAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  date: string;
  status: string;
};

export default function TransactionsPage() {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchTransactions();
        setItems(data);
      } catch {
        setError("Не удалось загрузить операции");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const summary = useMemo(() => {
    const totalAmount = items.reduce((sum, item) => sum + item.grossAmount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalPlatformFee = items.reduce(
      (sum, item) => sum + item.platformFeeAmount,
      0,
    );
    const available = items.reduce((sum, item) => sum + item.netAmount, 0);

    return { totalAmount, totalTax, totalPlatformFee, available };
  }, [items]);

  return (
    <main>
      <div className="w-full">
        <header className="mb-6">
          <p className="text-sm text-slate-500">Операции</p>
          <h1 className="mt-2 text-2xl font-semibold">Движение денег</h1>
          <p className="mt-2 text-sm text-slate-600">
            Здесь видно, какие оплаты пришли и что произошло с налогом.
          </p>
        </header>

        {loading && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Загружаем операции...</p>
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

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Поступило</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {summary.totalAmount} ₽
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Налог</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {summary.totalTax} ₽
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Комиссия</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {summary.totalPlatformFee} ₽
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">К выводу</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {summary.available} ₽
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              {items.map((item) => (
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

                    <p className="text-sm font-semibold text-slate-900">
                      + {item.grossAmount} ₽
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Налог</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {item.taxAmount} ₽
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Комиссия</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {item.platformFeeAmount} ₽
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">К выводу</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {item.netAmount} ₽
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {item.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      налог зарезервирован
                    </span>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={`/transactions/${item.id}`}
                      className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      Подробнее
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}