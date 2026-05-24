"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPaymentLinks } from "@/lib/api";
import type { PaymentItem } from "@/lib/mock-data";

type ApiPaymentItem = {
  id: string;
  title: string;
  amount: number;
  payerType: string;
  status: string;
};

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data: ApiPaymentItem[] = await fetchPaymentLinks();

        const mapped: PaymentItem[] = data.map((item) => ({
          id: item.id,
          title: item.title,
          amount: item.amount,
          type: item.payerType,
          status: item.status,
        }));

        setItems(mapped);
      } catch (err) {
        setError("Не удалось загрузить ссылки");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main>
      <div className="w-full">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Платежи</p>
            <h1 className="mt-2 text-2xl font-semibold">Ссылки на оплату</h1>
            <p className="mt-2 text-sm text-slate-600">
              Создавай ссылки и отправляй клиентам.
            </p>
          </div>

          <Link
            href="/payments/new"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Создать
          </Link>
        </header>

        {loading && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Загружаем ссылки...</p>
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-rose-600">{error}</p>
          </section>
        )}

        {!loading && !error && (
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
                      {item.amount} ₽ • {item.type}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {item.status}
                  </span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white">
                    Копировать ссылку
                  </button>

                  <Link
                    href={`/payments/${item.id}`}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Подробнее
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}