"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  archiveCatalogItem,
  CatalogItem,
  CatalogItemPaymentPolicy,
  CatalogItemPayload,
  CatalogItemType,
  CatalogItemUnit,
  createCatalogItem,
  fetchCatalogItems,
  updateCatalogItem,
} from "@/lib/api";

type FormState = {
  title: string;
  description: string;
  type: CatalogItemType;
  price: string;
  category: string;
  isActive: boolean;
  isBookable: boolean;
  durationMinutes: string;
  bufferBeforeMinutes: string;
  bufferAfterMinutes: string;
  unit: CatalogItemUnit;
  paymentPolicy: "" | CatalogItemPaymentPolicy;
  prepaymentValue: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  type: "SERVICE",
  price: "",
  category: "",
  isActive: true,
  isBookable: true,
  durationMinutes: "",
  bufferBeforeMinutes: "0",
  bufferAfterMinutes: "0",
  unit: "PIECE",
  paymentPolicy: "",
  prepaymentValue: "",
};

function toOptionalNumber(value: string) {
  return value === "" ? null : Number(value);
}

function formatPrice(price: number | null) {
  return price === null ? "Цена не указана" : `${price} ₽`;
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCatalog() {
    try {
      setLoading(true);
      setError("");
      setItems(await fetchCatalogItems());
    } catch {
      setError("Не удалось загрузить каталог");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function startEditing(item: CatalogItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description ?? "",
      type: item.type,
      price: item.price?.toString() ?? "",
      category: item.category ?? "",
      isActive: item.isActive,
      isBookable: item.isBookable,
      durationMinutes: item.durationMinutes?.toString() ?? "",
      bufferBeforeMinutes: item.bufferBeforeMinutes.toString(),
      bufferAfterMinutes: item.bufferAfterMinutes.toString(),
      unit: item.unit ?? "PIECE",
      paymentPolicy: item.paymentPolicy ?? "",
      prepaymentValue: item.prepaymentValue?.toString() ?? "",
    });
  }

  async function saveCatalogItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const paymentPolicy =
      form.type === "SERVICE" && form.paymentPolicy !== ""
        ? form.paymentPolicy
        : null;

    const payload: CatalogItemPayload = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      isActive: form.isActive,
      isBookable: form.type === "SERVICE" ? form.isBookable : false,
      price: toOptionalNumber(form.price),
      durationMinutes:
        form.type === "SERVICE"
          ? toOptionalNumber(form.durationMinutes)
          : null,
      bufferBeforeMinutes:
        form.type === "SERVICE" ? Number(form.bufferBeforeMinutes || 0) : 0,
      bufferAfterMinutes:
        form.type === "SERVICE" ? Number(form.bufferAfterMinutes || 0) : 0,
      unit: form.type === "PRODUCT" ? form.unit : null,
      paymentPolicy,
      prepaymentValue:
        paymentPolicy === "FIXED_PREPAYMENT" ||
        paymentPolicy === "PERCENT_PREPAYMENT"
          ? toOptionalNumber(form.prepaymentValue)
          : null,
      category: form.category || null,
    };

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await updateCatalogItem(editingId, payload);
      } else {
        await createCatalogItem(payload);
      }

      resetForm();
      await loadCatalog();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось сохранить позицию каталога",
      );
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem(item: CatalogItem) {
    if (!window.confirm(`Архивировать «${item.title}»?`)) {
      return;
    }

    try {
      setError("");
      await archiveCatalogItem(item.id);
      await loadCatalog();
    } catch {
      setError("Не удалось архивировать позицию");
    }
  }

  const needsPrepaymentValue =
    form.paymentPolicy === "FIXED_PREPAYMENT" ||
    form.paymentPolicy === "PERCENT_PREPAYMENT";

  return (
    <main>
      <header className="mb-6">
        <p className="text-sm text-slate-500">Каталог</p>
        <h1 className="mt-2 text-2xl font-semibold">Товары и услуги</h1>
        <p className="mt-2 text-sm text-slate-600">
          Создавайте позиции для будущих продаж и записей.
        </p>
      </header>

      <form
        onSubmit={saveCatalogItem}
        className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">
            {editingId ? "Редактирование позиции" : "Новая позиция"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-slate-500"
            >
              Отменить
            </button>
          )}
        </div>

        <Field label="Название">
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            className="input"
            placeholder="Например, Консультация"
          />
        </Field>

        <Field label="Тип">
          <select
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as CatalogItemType,
                paymentPolicy: "",
                prepaymentValue: "",
              }))
            }
            className="input"
          >
            <option value="SERVICE">Услуга</option>
            <option value="PRODUCT">Товар</option>
          </select>
        </Field>

        <Field label="Описание">
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="input min-h-20"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Цена, ₽">
            <input
              type="number"
              min="0"
              value={form.price}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
              className="input"
            />
          </Field>
          <Field label="Категория">
            <input
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className="input"
            />
          </Field>
        </div>

        {form.type === "PRODUCT" ? (
          <Field label="Единица измерения">
            <select
              value={form.unit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  unit: event.target.value as CatalogItemUnit,
                }))
              }
              className="input"
            >
              <option value="PIECE">Штука</option>
              <option value="HOUR">Час</option>
              <option value="MINUTE">Минута</option>
              <option value="DAY">День</option>
              <option value="SET">Набор</option>
            </select>
          </Field>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Длительность, мин.">
                <input
                  type="number"
                  min="0"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Буфер до, мин.">
                <input
                  type="number"
                  min="0"
                  value={form.bufferBeforeMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bufferBeforeMinutes: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>
              <Field label="Буфер после, мин.">
                <input
                  type="number"
                  min="0"
                  value={form.bufferAfterMinutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bufferAfterMinutes: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isBookable}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isBookable: event.target.checked,
                  }))
                }
              />
              Доступна для онлайн-записи
            </label>

            <Field label="Предоплата">
              <select
                value={form.paymentPolicy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paymentPolicy: event.target.value as
                      | ""
                      | CatalogItemPaymentPolicy,
                    prepaymentValue: "",
                  }))
                }
                className="input"
              >
                <option value="">Без предоплаты</option>
                <option value="FIXED_PREPAYMENT">Фиксированная сумма</option>
                <option value="PERCENT_PREPAYMENT">Процент</option>
                <option value="FULL_PREPAYMENT">Полная оплата</option>
              </select>
            </Field>

            {needsPrepaymentValue && (
              <Field
                label={
                  form.paymentPolicy === "PERCENT_PREPAYMENT"
                    ? "Размер предоплаты, %"
                    : "Размер предоплаты, ₽"
                }
              >
                <input
                  required
                  type="number"
                  min="0"
                  value={form.prepaymentValue}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      prepaymentValue: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                isActive: event.target.checked,
              }))
            }
          />
          Позиция активна
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving
            ? "Сохраняем..."
            : editingId
              ? "Сохранить изменения"
              : "Создать позицию"}
        </button>
      </form>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold">Позиции каталога</h2>

        {loading && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Загружаем каталог...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">
              В каталоге пока нет позиций.
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-3">
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
                      {item.type === "SERVICE" ? "Услуга" : "Товар"} •{" "}
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      item.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.isActive ? "Активна" : "В архиве"}
                  </span>
                </div>

                {item.description && (
                  <p className="mt-3 text-sm text-slate-600">
                    {item.description}
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Редактировать
                  </button>
                  {item.isActive && (
                    <button
                      type="button"
                      onClick={() => archiveItem(item)}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                    >
                      Архивировать
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}
