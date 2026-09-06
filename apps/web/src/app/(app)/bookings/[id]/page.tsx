"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ApiRequestError,
  Availability,
  Booking,
  cancelBooking,
  completeBooking,
  fetchBooking,
  fetchRescheduleAvailability,
  rescheduleBooking,
} from "@/lib/api";

const labels = { CONFIRMED: "Подтверждена", COMPLETED: "Завершена", CANCELLED: "Отменена" };
const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export default function BookingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { setLoading(true); setError(""); setBooking(await fetchBooking(id)); }
    catch { setError("Запись не найдена или недоступна."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [id]);

  async function loadRescheduleAvailability(date: string) {
    if (!date) return;
    try { setSlot(null); setError(""); setAvailability(await fetchRescheduleAvailability(id, date)); }
    catch { setAvailability(null); setError("Не удалось получить свободное время."); }
  }
  async function transition(action: "cancel" | "complete") {
    if (!booking || !window.confirm(`${action === "cancel" ? "Отменить" : "Завершить"} запись клиента ${booking.customerName}?`)) return;
    try {
      setSaving(true);
      setBooking(action === "cancel" ? await cancelBooking(id) : await completeBooking(id));
    } catch { setError("Не удалось изменить статус записи."); } finally { setSaving(false); }
  }
  async function submitReschedule() {
    if (!rescheduleDate || slot === null) return;
    try {
      setSaving(true); setError("");
      setBooking(await rescheduleBooking(id, rescheduleDate, slot));
      setAvailability(null); setSlot(null);
    } catch (requestError) {
      if (requestError instanceof ApiRequestError && requestError.status === 409) {
        setSlot(null); setError("Это время уже занято. Выберите другое свободное время.");
        await loadRescheduleAvailability(rescheduleDate);
      } else setError("Не удалось перенести запись.");
    } finally { setSaving(false); }
  }

  if (loading) return <main><p className="text-sm text-slate-600">Загружаем запись…</p></main>;
  if (!booking) return <main><p className="text-sm text-rose-600">{error || "Запись не найдена."}</p></main>;

  return <main className="space-y-4">
    <header><p className="text-sm text-slate-500">Записи</p><h1 className="mt-1 text-2xl font-semibold">Запись {time(booking.startMinutes)}</h1><p className="mt-1 text-sm text-slate-600">{booking.bookingDate} · {labels[booking.status]}</p></header>
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold">Клиент</h2><p className="mt-2">{booking.customerName}</p>
      {booking.customerPhone && <a href={`tel:${booking.customerPhone}`} className="mt-1 block text-sm text-slate-700 underline">{booking.customerPhone}</a>}
      {booking.customerEmail && <a href={`mailto:${booking.customerEmail}`} className="mt-1 block text-sm text-slate-700 underline">{booking.customerEmail}</a>}
    </section>
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><h2 className="font-semibold">Услуги</h2>{booking.items.map((item) => <div key={item.id} className="mt-3 flex justify-between text-sm"><span>{item.title} × {item.quantity}</span><span>{item.lineTotalAmount} ₽</span></div>)}<p className="mt-4 border-t pt-3 font-semibold">Итого: {booking.totalAmount} ₽</p>{booking.comment && <p className="mt-3 text-sm text-slate-600">Комментарий: {booking.comment}</p>}</section>
    {booking.status === "CONFIRMED" && <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"><h2 className="font-semibold">Перенести запись</h2><input type="date" value={rescheduleDate} onChange={(event) => { setRescheduleDate(event.target.value); void loadRescheduleAvailability(event.target.value); }} className="input mt-3" />{availability && <div className="mt-3 grid grid-cols-3 gap-2">{availability.slots.map((item) => <button key={item.startMinutes} type="button" onClick={() => setSlot(item.startMinutes)} className={`rounded-xl px-2 py-2 text-sm ${slot === item.startMinutes ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{time(item.startMinutes)}</button>)}</div>}<button type="button" disabled={slot === null || saving} onClick={submitReschedule} className="mt-3 w-full rounded-xl bg-slate-900 px-3 py-3 text-sm font-medium text-white disabled:opacity-50">Подтвердить перенос</button></section>}
    {booking.status === "CONFIRMED" && <div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={() => void transition("cancel")} className="rounded-xl bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700">Отменить</button><button disabled={saving} onClick={() => void transition("complete")} className="rounded-xl bg-slate-900 px-3 py-3 text-sm font-medium text-white">Завершить</button></div>}
    {error && <p className="text-sm text-rose-600">{error}</p>}
    <button onClick={() => router.push("/bookings")} className="text-sm underline">Назад к записям</button>
  </main>;
}
