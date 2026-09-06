"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ApiRequestError,
  Availability,
  Booking,
  createBooking,
  createPublicBooking,
  fetchAvailability,
  fetchBookableServices,
  fetchPublicAvailability,
  fetchPublicBookableServices,
  PublicBookableService,
} from "@/lib/api";

function formatPrice(value: number) {
  return `${value} ₽`;
}

function formatTime(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const remainder = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${remainder}`;
}

function prepaymentLabel(service: PublicBookableService) {
  if (
    service.paymentPolicy === "FIXED_PREPAYMENT" &&
    service.prepaymentValue !== null
  ) {
    return `Предоплата ${formatPrice(service.prepaymentValue)}`;
  }

  if (
    service.paymentPolicy === "PERCENT_PREPAYMENT" &&
    service.prepaymentValue !== null
  ) {
    return `Предоплата ${service.prepaymentValue}%`;
  }

  if (service.paymentPolicy === "FULL_PREPAYMENT") {
    return "Предоплата: полная стоимость";
  }

  return null;
}

export default function BookingForm({
  owner = false,
  slug,
}: {
  owner?: boolean;
  slug?: string;
}) {
  const router = useRouter();
  const [services, setServices] = useState<PublicBookableService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [selectedStartMinutes, setSelectedStartMinutes] = useState<number | null>(
    null,
  );
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [availabilityError, setAvailabilityError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;

    async function loadServices() {
      try {
        setCatalogLoading(true);
        setCatalogError("");
        const loadedServices = owner
          ? await fetchBookableServices()
          : await fetchPublicBookableServices(slug!);

        if (active) {
          setServices(loadedServices);
        }
      } catch {
        if (active) {
          setCatalogError("Не удалось загрузить доступные услуги.");
        }
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      active = false;
    };
  }, [owner, slug]);

  async function loadAvailability() {
    if (!date || selectedServiceIds.length === 0) {
      setAvailability(null);
      return;
    }

    try {
      setAvailabilityLoading(true);
      setAvailabilityError("");
      setAvailability(
        owner
          ? await fetchAvailability(date, selectedServiceIds)
          : await fetchPublicAvailability(slug!, date, selectedServiceIds),
      );
    } catch {
      setAvailability(null);
      setAvailabilityError("Не удалось получить свободное время. Попробуйте ещё раз.");
    } finally {
      setAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    setSelectedStartMinutes(null);
    void loadAvailability();
  }, [date, selectedServiceIds]);

  function toggleService(id: string) {
    setSelectedServiceIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedStartMinutes === null) {
      setBookingError("Выберите время записи.");
      return;
    }

    if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim())) {
      setBookingError("Укажите имя и телефон или email.");
      return;
    }

    try {
      setSubmitting(true);
      setBookingError("");
      const bookingPayload = {
        bookingDate: date,
        startMinutes: selectedStartMinutes,
        items: selectedServiceIds.map((catalogItemId) => ({
          catalogItemId,
          quantity: 1,
        })),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        comment: comment.trim() || undefined,
      };
      const createdBooking = owner
        ? await createBooking(bookingPayload)
        : await createPublicBooking(slug!, bookingPayload);
      if (owner) {
        router.push(`/bookings/${createdBooking.id}`);
        return;
      }
      setBooking(createdBooking);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        setSelectedStartMinutes(null);
        setBookingError(
          "Это время только что заняли. Выберите другое свободное время.",
        );
        await loadAvailability();
      } else {
        setBookingError(
          error instanceof Error
            ? error.message
            : "Не удалось подтвердить запись.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedServices = selectedServiceIds
    .map((id) => services.find((service) => service.id === id))
    .filter((service): service is PublicBookableService => Boolean(service));
  const presentationTotal = selectedServices.reduce(
    (total, service) => total + (service.price ?? 0),
    0,
  );

  if (booking) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8">
        <section className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-emerald-700">{owner ? "Запись создана" : "Запись подтверждена"}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Ждём вас {booking.bookingDate} в {formatTime(booking.startMinutes)}
          </h1>
          <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4">
            {booking.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="text-slate-600">{item.title}</span>
                <span className="font-medium text-slate-900">
                  {formatPrice(item.lineTotalAmount)}
                </span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-3 text-sm font-semibold text-slate-900">
              Итого: {formatPrice(booking.totalAmount)}
            </div>
            <p className="text-sm text-slate-600">Клиент: {booking.customerName}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6">
          <p className="text-sm text-slate-500">{owner ? "Записи" : "Онлайн-запись"}</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {owner ? "Новая запись" : "Выберите удобное время"}
          </h1>
        </header>

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">1. Выберите услуги</h2>
          {catalogLoading && <p className="text-sm text-slate-600">Загружаем услуги…</p>}
          {catalogError && <p className="text-sm text-rose-600">{catalogError}</p>}
          {!catalogLoading && !catalogError && services.length === 0 && (
            <p className="text-sm text-slate-600">Сейчас нет доступных услуг.</p>
          )}
          {services.map((service) => {
            const selectedIndex = selectedServiceIds.indexOf(service.id);

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => toggleService(service.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedIndex >= 0
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-slate-900">{service.title}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formatPrice(service.price ?? 0)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {service.durationMinutes} мин.
                  {selectedIndex >= 0 && ` · Выбрана №${selectedIndex + 1}`}
                </p>
                {service.description && (
                  <p className="mt-1 text-sm text-slate-600">{service.description}</p>
                )}
                {prepaymentLabel(service) && (
                  <p className="mt-2 text-xs text-slate-500">
                    {prepaymentLabel(service)}
                  </p>
                )}
              </button>
            );
          })}
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <h2 className="font-semibold text-slate-900">{owner ? "2. Дата" : "2. Выберите дату"}</h2>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="input mt-3"
          />
        </section>

        {selectedServiceIds.length > 0 && date && (
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">{owner ? "3. Свободное время" : "3. Выберите время"}</h2>
            {availabilityLoading && (
              <p className="mt-3 text-sm text-slate-600">Ищем свободное время…</p>
            )}
            {availabilityError && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-rose-600">{availabilityError}</p>
                <button type="button" onClick={loadAvailability} className="text-sm font-medium text-slate-900 underline">
                  Повторить
                </button>
              </div>
            )}
            {!availabilityLoading && !availabilityError && availability?.slots.length === 0 && (
              <p className="mt-3 text-sm text-slate-600">
                На эту дату свободного времени нет. Выберите другую дату.
              </p>
            )}
            {!availabilityLoading && availability && availability.slots.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {availability.slots.map((slot) => (
                  <button
                    key={slot.startMinutes}
                    type="button"
                    onClick={() => setSelectedStartMinutes(slot.startMinutes)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium ${
                      selectedStartMinutes === slot.startMinutes
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {formatTime(slot.startMinutes)}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedStartMinutes !== null && (
          <form onSubmit={submitBooking} className="mt-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">{owner ? "4. Клиент" : "4. Ваши данные"}</h2>
            <input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={owner ? "Имя клиента" : "Ваше имя"} className="input" />
            <input type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Телефон" className="input" />
            <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="Email" className="input" />
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Комментарий (необязательно)" className="input min-h-20" />

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <h2 className="font-semibold text-slate-900">5. Подтверждение</h2>
              <p className="mt-1 text-slate-600">
                {date}, {formatTime(selectedStartMinutes)}
              </p>
              {selectedServices.map((service) => (
                <p key={service.id} className="mt-1 text-slate-600">
                  {service.title} — {formatPrice(service.price ?? 0)}
                </p>
              ))}
              <p className="mt-2 font-semibold text-slate-900">
                Итого: {formatPrice(presentationTotal)}
              </p>
            </div>

            {bookingError && <p className="text-sm text-rose-600">{bookingError}</p>}
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {submitting ? (owner ? "Создаём…" : "Подтверждаем…") : owner ? "Создать запись" : "Подтвердить запись"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
