"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Booking, fetchBookings } from "@/lib/api";

const labels = { CONFIRMED: "Подтверждена", COMPLETED: "Завершена", CANCELLED: "Отменена" };
const iso = (date: Date) => date.toISOString().slice(0, 10);
const time = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export default function BookingsPage() {
  const today = iso(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [month, setMonth] = useState(() => new Date(`${today}T00:00:00`));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const monthBounds = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    return { start: iso(start), end: iso(end) };
  }, [month]);

  async function load() {
    try { setLoading(true); setError(""); setBookings(await fetchBookings({ dateFrom: monthBounds.start, dateTo: monthBounds.end })); }
    catch { setError("Не удалось загрузить записи."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [monthBounds.start, monthBounds.end]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => index < offset ? null : new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
  }, [month]);
  const selectedBookings = bookings.filter((booking) => booking.bookingDate === selectedDate);

  return <main>
    <header className="mb-5 flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">Календарь</p><h1 className="mt-1 text-2xl font-semibold">Записи</h1></div><Link href="/bookings/new" className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white">+ Новая запись</Link></header>
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between"><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</button><h2 className="font-semibold">{month.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</h2><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</button></div>
      <button onClick={() => { setSelectedDate(today); setMonth(new Date(`${today}T00:00:00`)); }} className="mb-3 text-sm font-medium underline">Сегодня</button>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="mt-2 grid grid-cols-7 gap-1">{days.map((day, index) => day ? <button key={iso(day)} onClick={() => setSelectedDate(iso(day))} className={`relative aspect-square rounded-lg text-sm ${selectedDate === iso(day) ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>{day.getDate()}{bookings.some((booking) => booking.bookingDate === iso(day) && booking.status !== "CANCELLED") && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${selectedDate === iso(day) ? "bg-white" : "bg-slate-900"}`} />}</button> : <span key={index} />)}</div>
    </section>
    <section className="mt-4 space-y-3"><h2 className="text-base font-semibold">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</h2>
      {loading && <p className="rounded-2xl bg-white p-4 text-sm text-slate-600">Загружаем записи…</p>}
      {error && <div className="rounded-2xl bg-white p-4"><p className="text-sm text-rose-600">{error}</p><button onClick={load} className="mt-2 text-sm underline">Повторить</button></div>}
      {!loading && !error && selectedBookings.length === 0 && <div className="rounded-2xl bg-white p-4"><p className="text-sm text-slate-600">На этот день записей нет.</p><Link href="/bookings/new" className="mt-3 inline-block text-sm underline">Создать запись</Link></div>}
      {selectedBookings.map((booking) => <Link key={booking.id} href={`/bookings/${booking.id}`} className={`block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${booking.status === "CANCELLED" ? "opacity-60" : ""}`}><div className="flex justify-between"><b>{time(booking.startMinutes)}</b><span className="text-xs">{labels[booking.status]}</span></div><p className="mt-2 font-medium">{booking.customerName}</p><p className="text-sm text-slate-600">{booking.items.map((item) => item.title).join(" + ")}</p><p className="mt-2 text-sm font-medium">{booking.totalAmount} ₽</p></Link>)}
    </section>
  </main>;
}
