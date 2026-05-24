"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchPaymentLinkById, simulatePayment } from "@/lib/api";

type PaymentLinkDetails = {
  id: string;
  title: string;
  amount: number;
  payerType: string;
  status: string;
};

export default function PaymentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [item, setItem] = useState<PaymentLinkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulateError, setSimulateError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await fetchPaymentLinkById(id);
        setItem(data);
      } catch {
        setError("Не удалось загрузить ссылку");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleSimulatePayment() {
    try {
      setSimulateLoading(true);
      setSimulateError("");

      await simulatePayment(id);

      router.push("/transactions");
    } catch {
      setSimulateError("Не удалось сымитировать оплату");
    } finally {
      setSimulateLoading(false);
    }
  }

  if (loading) {
    return (
      <main>
        <div className="w-full">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Загружаем ссылку...</p>
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
            <p className="text-sm text-slate-500">Платежи</p>
            <h1 className="mt-2 text-2xl font-semibold">Ссылка не найдена</h1>
            <p className="mt-2 text-sm text-slate-600">
              Возможно, ссылка была удалена или ещё не создана.
            </p>

            <Link
              href="/payments"
              className="mt-4 inline-block rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
            >
              Вернуться к списку
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="w-full">
        <header className="mb-6">
          <p className="text-sm text-slate-500">Платежи</p>
          <h1 className="mt-2 text-2xl font-semibold">Детали ссылки</h1>
          <p className="mt-2 text-sm text-slate-600">
            Здесь можно проверить ссылку и сымитировать оплату до подключения банка.
          </p>
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
                <p className="text-xs text-slate-500">Сумма</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {item.amount} ₽
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Плательщик</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {item.payerType}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">Статус</p>
              <p className="mt-1 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {item.status}
              </p>
            </div>
          </div>

          {simulateError && (
            <p className="mt-4 text-sm text-rose-600">{simulateError}</p>
          )}

          <div className="mt-6 space-y-3">
            <button className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900">
              Копировать ссылку
            </button>

            <button
              type="button"
              onClick={handleSimulatePayment}
              disabled={simulateLoading}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {simulateLoading ? "Имитируем оплату..." : "Сымитировать оплату"}
            </button>

            <Link
              href="/payments"
              className="block w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-900"
            >
              Назад к списку
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}