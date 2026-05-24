"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPaymentLink
} from "@/lib/api";
import { saveTransaction } from "@/lib/transactions-storage";
import { saveReceipt } from "@/lib/receipts-storage";

export default function NewPaymentLinkPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Консультация");
  const [payerType, setPayerType] = useState("Физлицо");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateLink() {
    try {
      setLoading(true);
      setError("");

      const numericAmount = Number(amount || 0);
      const tax = Math.round(numericAmount * 0.04);

      const created = await createPaymentLink({
        title: title || "Новая ссылка",
        amount: numericAmount,
        payerType,
      });

      const params = new URLSearchParams({
        id: created.id,
        title: created.title,
        amount: String(created.amount),
        category,
        payerType: created.payerType,
      });

      router.push(`/payments/success?${params.toString()}`);
    } catch (err) {
      setError("Не удалось создать ссылку");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="w-full">
        <header className="mb-6">
          <p className="text-sm text-slate-500">Платежи</p>
          <h1 className="mt-2 text-2xl font-semibold">Создать ссылку</h1>
          <p className="mt-2 text-sm text-slate-600">
            Создай ссылку на оплату для клиента.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateLink();
          }}
          className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Назначение
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например, Оплата консультации"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Сумма
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500"
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Категория
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option>Консультация</option>
              <option>Обучение</option>
              <option>Аренда</option>
              <option>Услуги</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Тип плательщика
            </label>
            <select
              value={payerType}
              onChange={(e) => setPayerType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-400"
            >
              <option>Физлицо</option>
              <option>Юрлицо / ИП</option>
            </select>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Создаём..." : "Создать ссылку"}
          </button>
        </form>
      </div>
    </main>
  );
}