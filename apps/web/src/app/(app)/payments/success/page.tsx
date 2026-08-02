"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen p-4" />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();

  const title = searchParams.get("title") ?? "Новая ссылка";
  const amount = searchParams.get("amount") ?? "0";
  const category = searchParams.get("category") ?? "Услуги";
  const payerType = searchParams.get("payerType") ?? "Физлицо";

  return (
   <main className="min-h-screen p-4">
  <div className="w-full">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Платежи</p>
          <h1 className="mt-2 text-2xl font-semibold">Ссылка создана</h1>
          <p className="mt-2 text-sm text-slate-600">
            Пока это локальный сценарий без backend, но flow уже рабочий.
          </p>

          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Назначение</span>
              <span className="text-sm font-medium text-slate-900">{title}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Сумма</span>
              <span className="text-sm font-medium text-slate-900">{amount} ₽</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Категория</span>
              <span className="text-sm font-medium text-slate-900">{category}</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-500">Плательщик</span>
              <span className="text-sm font-medium text-slate-900">{payerType}</span>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <button className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              Копировать ссылку
            </button>

            <Link
              href="/payments"
              className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-900"
            >
              Назад к платежам
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}