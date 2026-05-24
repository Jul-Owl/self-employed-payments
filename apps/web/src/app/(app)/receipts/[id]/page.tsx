"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchReceiptById } from "@/lib/api";

type ReceiptDetails = {
  id: string;
  title: string;
  client: string;
  amount: number;
  status: "ISSUED" | "PENDING" | "FAILED";
  date: string;
};

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

export default function ReceiptDetailsPage() {
  const params = useParams();
  const id = String(params.id);

  const [item, setItem] = useState<ReceiptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchReceiptById(id);
        setItem(data);
      } catch {
        setError("Не удалось загрузить чек");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return (
      <main>
        <div className="w-full">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Загружаем чек...</p>
          </section>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main>
        <div className="w-full">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-semibold">Чек не найден</h1>
            <p className="mt-2 text-sm text-slate-600">
              Возможно, чек был удалён или ещё не создан.
            </p>
            <Link
              href="/receipts"
              className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Назад к чекам
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const status = statusMap[item.status];

  return (
    <main>
      <div className="w-full">
        <header className="mb-6">
          <p className="text-sm text-slate-500">Чеки</p>
          <h1 className="mt-2 text-2xl font-semibold">Детали чека</h1>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500">Назначение</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{item.title}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Клиент</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{item.client}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Сумма</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{item.amount} ₽</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Дата</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{item.date}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">Статус</p>
              <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>

            {item.status === "FAILED" && (
              <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                Повторить выпуск чека
              </button>
            )}
          </div>

          <Link
            href="/receipts"
            className="mt-6 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-900"
          >
            Назад к списку
          </Link>
        </section>
      </div>
    </main>
  );
}