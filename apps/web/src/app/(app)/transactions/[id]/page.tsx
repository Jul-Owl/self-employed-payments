"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchTransactionById } from "@/lib/api";

type TransactionDetails = {
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

export default function TransactionDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const [item, setItem] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchTransactionById(id);
        setItem(data);
      } catch {
        setError("Не удалось загрузить операцию");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <main>
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-600">Загружаем операцию...</p>
        </section>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main>
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold">Операция не найдена</h1>
          <p className="mt-2 text-sm text-slate-600">
            Возможно, операция была удалена или ещё не создана.
          </p>
          <Link
            href="/transactions"
            className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
          >
            Назад к операциям
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="mb-6">
        <p className="text-sm text-slate-500">Операции</p>
        <h1 className="mt-2 text-2xl font-semibold">Детали операции</h1>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-500">Назначение</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {item.title}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Поступило</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {item.grossAmount} ₽
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Налог</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {item.taxAmount} ₽
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Комиссия сервиса</p>
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

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Клиент</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {item.client}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Дата</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {item.date}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Статус</p>
            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {item.status}
            </span>
          </div>
        </div>

        <Link
          href="/transactions"
          className="mt-6 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-900"
        >
          Назад к списку
        </Link>
      </section>
    </main>
  );
}