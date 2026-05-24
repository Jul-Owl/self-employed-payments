"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchDashboard } from "@/lib/api";

type DashboardTransaction = {
  id: string;
  title: string;
  client: string;
  grossAmount: number;
  taxAmount: number;
  platformFeeAmount: number;
  netAmount: number;
  date: string;
  receipt?: {
    id: string;
    status: string;
  } | null;
};

type DashboardData = {
  balance: {
    available: number;
    taxReserve: number;
    platformFeeReserve: number;
    processing: number;
  };
  summary: {
    totalAmount: number;
    totalTax: number;
    totalPlatformFee: number;
    available: number;
    pendingReceipts: number;
    failedReceipts: number;
  };
  recentTransactions: DashboardTransaction[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const dashboard = await fetchDashboard();
        setData(dashboard);
      } catch {
        setError("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const statusText = useMemo(() => {
    if (!data) return "";

    if (data.summary.failedReceipts > 0) {
      return `${data.summary.failedReceipts} чек требует внимания`;
    }

    if (data.summary.pendingReceipts > 0) {
      return `${data.summary.pendingReceipts} чек в обработке`;
    }

    return "Всё в порядке. Последние платежи обработаны.";
  }, [data]);

  if (loading) {
    return (
      <main>
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">Загружаем dashboard...</p>
        </section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main>
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-rose-600">{error}</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <div className="flex flex-col">
        <header className="mb-6">
          <p className="text-sm text-slate-500">Self-Employed Payments</p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Главная
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Деньги пришли, налог и комиссия зарезервированы, остаток готов к
            выводу.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Доступно к выводу</p>

          <p className="mt-2 text-4xl font-semibold">
            {data.balance.available} ₽
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Налог в резерве</p>

              <p className="mt-1 text-lg font-medium">
                {data.balance.taxReserve} ₽
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Комиссия сервиса</p>

              <p className="mt-1 text-lg font-medium">
                {data.balance.platformFeeReserve} ₽
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">В обработке</p>

              <p className="mt-1 text-lg font-medium">
                {data.balance.processing} ₽
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/payments/new"
            className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white"
          >
            Принять оплату
          </Link>

          <button className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-900 ring-1 ring-slate-200">
            Вывести деньги
          </button>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Статус</p>

              <p className="mt-1 text-sm text-slate-600">{statusText}</p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              API
            </span>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Последние операции</h2>

            <Link href="/transactions" className="text-sm text-slate-500">
              Все
            </Link>
          </div>

          <div className="space-y-3">
            {data.recentTransactions.length === 0 && (
              <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-sm text-slate-600">
                  Операций пока нет. Создай ссылку и сымитируй оплату.
                </p>
              </article>
            )}

            {data.recentTransactions.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.client} • {item.date}
                    </p>
                  </div>

                  <p className="text-sm font-semibold">
                    + {item.grossAmount} ₽
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    налог {item.taxAmount} ₽
                  </span>

                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    комиссия {item.platformFeeAmount} ₽
                  </span>

                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    к выводу {item.netAmount} ₽
                  </span>

                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    чек {item.receipt?.status ?? "нет"}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-700">
                    Денежные проводки
                  </p>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Клиент оплатил
                      </span>

                      <span className="font-medium text-slate-900">
                        + {item.grossAmount} ₽
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Налоговый резерв
                      </span>

                      <span className="font-medium text-slate-900">
                        - {item.taxAmount} ₽
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Комиссия сервиса
                      </span>

                      <span className="font-medium text-slate-900">
                        - {item.platformFeeAmount} ₽
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-200 pt-2">
                      <span className="font-medium text-slate-700">
                        К выводу
                      </span>

                      <span className="font-semibold text-slate-900">
                        + {item.netAmount} ₽
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}