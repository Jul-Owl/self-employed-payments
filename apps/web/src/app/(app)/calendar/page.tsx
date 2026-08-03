"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CalendarDateOverride,
  CalendarDateOverridePayload,
  CalendarDateOverrideType,
  CalendarDayResolution,
  createCalendarDateOverride,
  DayOfWeek,
  deleteCalendarDateOverride,
  fetchCalendarDateOverrides,
  fetchWeeklyWorkingHours,
  resolveCalendarDay,
  updateCalendarDateOverride,
  upsertWeeklyWorkingHours,
  WeeklyWorkingHours,
} from "@/lib/api";

type WeekdayForm = {
  isWorking: boolean;
  startTime: string;
  endTime: string;
};

type OverrideForm = {
  date: string;
  type: CalendarDateOverrideType;
  startTime: string;
  endTime: string;
  reason: string;
};

const weekdays: Array<{ value: DayOfWeek; label: string }> = [
  { value: "MONDAY", label: "Понедельник" },
  { value: "TUESDAY", label: "Вторник" },
  { value: "WEDNESDAY", label: "Среда" },
  { value: "THURSDAY", label: "Четверг" },
  { value: "FRIDAY", label: "Пятница" },
  { value: "SATURDAY", label: "Суббота" },
  { value: "SUNDAY", label: "Воскресенье" },
];

const initialOverrideForm: OverrideForm = {
  date: "",
  type: "CLOSED",
  startTime: "09:00",
  endTime: "18:00",
  reason: "",
};

function createDefaultWeek(): Record<DayOfWeek, WeekdayForm> {
  return Object.fromEntries(
    weekdays.map(({ value }) => [
      value,
      { isWorking: false, startTime: "09:00", endTime: "18:00" },
    ]),
  ) as Record<DayOfWeek, WeekdayForm>;
}

function minutesToTime(minutes: number | null) {
  if (minutes === null) {
    return "";
  }

  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("already exists")) {
    return "Для этой даты уже есть исключение.";
  }
  if (message.includes("startMinutes must be less")) {
    return "Время окончания должно быть позже времени начала.";
  }
  if (message.includes("startMinutes and endMinutes are required")) {
    return "Для открытого дня укажите время начала и окончания.";
  }
  if (message.includes("date must")) {
    return "Укажите корректную дату.";
  }

  return "Не удалось сохранить изменения календаря.";
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTime(minutes: number | null) {
  return minutes === null ? "—" : minutesToTime(minutes);
}

export default function CalendarPage() {
  const [week, setWeek] = useState<Record<DayOfWeek, WeekdayForm>>(
    createDefaultWeek,
  );
  const [overrides, setOverrides] = useState<CalendarDateOverride[]>([]);
  const [overrideForm, setOverrideForm] =
    useState<OverrideForm>(initialOverrideForm);
  const [editingOverrideId, setEditingOverrideId] = useState<string | null>(
    null,
  );
  const [resolutionDate, setResolutionDate] = useState("");
  const [resolution, setResolution] = useState<CalendarDayResolution | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [savingDay, setSavingDay] = useState<DayOfWeek | null>(null);
  const [savingOverride, setSavingOverride] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [resolutionError, setResolutionError] = useState("");

  async function loadCalendar() {
    try {
      setLoading(true);
      setError("");
      const [weeklyWorkingHours, dateOverrides] = await Promise.all([
        fetchWeeklyWorkingHours(),
        fetchCalendarDateOverrides(),
      ]);

      setWeek(toWeekForm(weeklyWorkingHours));
      setOverrides(dateOverrides);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCalendar();
  }, []);

  async function saveWeekday(dayOfWeek: DayOfWeek) {
    const form = week[dayOfWeek];
    const startMinutes = timeToMinutes(form.startTime);
    const endMinutes = timeToMinutes(form.endTime);

    if (
      form.isWorking &&
      (startMinutes === null ||
        endMinutes === null ||
        startMinutes >= endMinutes)
    ) {
      setError("Для рабочего дня укажите корректное время начала и окончания.");
      return;
    }

    try {
      setSavingDay(dayOfWeek);
      setError("");
      await upsertWeeklyWorkingHours(
        dayOfWeek,
        form.isWorking
          ? {
              isWorking: true,
              startMinutes: startMinutes!,
              endMinutes: endMinutes!,
            }
          : { isWorking: false },
      );
      await loadCalendar();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSavingDay(null);
    }
  }

  function resetOverrideForm() {
    setOverrideForm(initialOverrideForm);
    setEditingOverrideId(null);
  }

  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startMinutes = timeToMinutes(overrideForm.startTime);
    const endMinutes = timeToMinutes(overrideForm.endTime);

    if (!overrideForm.date) {
      setError("Укажите дату исключения.");
      return;
    }
    if (
      overrideForm.type === "OPEN" &&
      (startMinutes === null ||
        endMinutes === null ||
        startMinutes >= endMinutes)
    ) {
      setError("Для открытого дня укажите корректное время начала и окончания.");
      return;
    }

    const payload: CalendarDateOverridePayload = {
      date: overrideForm.date,
      type: overrideForm.type,
      reason: overrideForm.reason || null,
      ...(overrideForm.type === "OPEN"
        ? { startMinutes: startMinutes!, endMinutes: endMinutes! }
        : {}),
    };

    try {
      setSavingOverride(true);
      setError("");
      if (editingOverrideId) {
        await updateCalendarDateOverride(editingOverrideId, payload);
      } else {
        await createCalendarDateOverride(payload);
      }
      resetOverrideForm();
      await loadCalendar();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSavingOverride(false);
    }
  }

  function editOverride(override: CalendarDateOverride) {
    setEditingOverrideId(override.id);
    setOverrideForm({
      date: override.date,
      type: override.type,
      startTime: minutesToTime(override.startMinutes) || "09:00",
      endTime: minutesToTime(override.endMinutes) || "18:00",
      reason: override.reason ?? "",
    });
  }

  async function removeOverride(override: CalendarDateOverride) {
    if (!window.confirm(`Удалить исключение на ${formatDate(override.date)}?`)) {
      return;
    }

    try {
      setError("");
      await deleteCalendarDateOverride(override.id);
      if (editingOverrideId === override.id) {
        resetOverrideForm();
      }
      await loadCalendar();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  async function checkDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolutionDate) {
      setResolutionError("Укажите дату.");
      return;
    }

    try {
      setResolving(true);
      setResolutionError("");
      setResolution(await resolveCalendarDay(resolutionDate));
    } catch (requestError) {
      setResolution(null);
      setResolutionError(errorMessage(requestError));
    } finally {
      setResolving(false);
    }
  }

  return (
    <main>
      <header className="mb-6">
        <p className="text-sm text-slate-500">Календарь</p>
        <h1 className="mt-2 text-2xl font-semibold">Рабочее время</h1>
        <p className="mt-2 text-sm text-slate-600">
          Настройте рабочую неделю и исключения для отдельных дат.
        </p>
      </header>

      {error && (
        <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">Рабочая неделя</h2>
        {loading ? (
          <CardText text="Загружаем рабочий график..." />
        ) : (
          <div className="space-y-3">
            {weekdays.map(({ value, label }) => {
              const form = week[value];
              return (
                <article
                  key={value}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{label}</h3>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.isWorking}
                        onChange={(event) =>
                          setWeek((current) => ({
                            ...current,
                            [value]: {
                              ...current[value],
                              isWorking: event.target.checked,
                            },
                          }))
                        }
                      />
                      Рабочий день
                    </label>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <TimeInput
                      label="Начало"
                      value={form.startTime}
                      disabled={!form.isWorking}
                      onChange={(startTime) =>
                        setWeek((current) => ({
                          ...current,
                          [value]: { ...current[value], startTime },
                        }))
                      }
                    />
                    <TimeInput
                      label="Окончание"
                      value={form.endTime}
                      disabled={!form.isWorking}
                      onChange={(endTime) =>
                        setWeek((current) => ({
                          ...current,
                          [value]: { ...current[value], endTime },
                        }))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingDay === value}
                    onClick={() => saveWeekday(value)}
                    className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                  >
                    {savingDay === value ? "Сохраняем..." : "Сохранить"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Исключения</h2>
        <form
          onSubmit={saveOverride}
          className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              {editingOverrideId ? "Редактирование исключения" : "Новое исключение"}
            </h3>
            {editingOverrideId && (
              <button
                type="button"
                onClick={resetOverrideForm}
                className="text-sm text-slate-500"
              >
                Отменить
              </button>
            )}
          </div>

          <Field label="Дата">
            <input
              required
              type="date"
              value={overrideForm.date}
              onChange={(event) =>
                setOverrideForm((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              className="input"
            />
          </Field>
          <Field label="Статус">
            <select
              value={overrideForm.type}
              onChange={(event) =>
                setOverrideForm((current) => ({
                  ...current,
                  type: event.target.value as CalendarDateOverrideType,
                }))
              }
              className="input"
            >
              <option value="CLOSED">Закрыто</option>
              <option value="OPEN">Открыто</option>
            </select>
          </Field>
          {overrideForm.type === "OPEN" && (
            <div className="grid grid-cols-2 gap-3">
              <TimeInput
                label="Начало"
                value={overrideForm.startTime}
                onChange={(startTime) =>
                  setOverrideForm((current) => ({ ...current, startTime }))
                }
              />
              <TimeInput
                label="Окончание"
                value={overrideForm.endTime}
                onChange={(endTime) =>
                  setOverrideForm((current) => ({ ...current, endTime }))
                }
              />
            </div>
          )}
          <Field label="Комментарий">
            <input
              value={overrideForm.reason}
              onChange={(event) =>
                setOverrideForm((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              className="input"
              placeholder="Необязательно"
            />
          </Field>
          <button
            type="submit"
            disabled={savingOverride}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {savingOverride
              ? "Сохраняем..."
              : editingOverrideId
                ? "Сохранить изменения"
                : "Добавить исключение"}
          </button>
        </form>

        {!loading && overrides.length === 0 && (
          <div className="mt-3">
            <CardText text="Исключений пока нет." />
          </div>
        )}
        <div className="mt-3 space-y-3">
          {overrides.map((override) => (
            <article
              key={override.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{formatDate(override.date)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {override.type === "OPEN" ? "Открыто" : "Закрыто"}
                    {override.type === "OPEN" &&
                      ` · ${formatTime(override.startMinutes)}–${formatTime(override.endMinutes)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => editOverride(override)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOverride(override)}
                    className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
                  >
                    Удалить
                  </button>
                </div>
              </div>
              {override.reason && (
                <p className="mt-3 text-sm text-slate-600">{override.reason}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">Проверка даты</h2>
        <form
          onSubmit={checkDate}
          className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
        >
          <input
            required
            type="date"
            value={resolutionDate}
            onChange={(event) => setResolutionDate(event.target.value)}
            className="input"
          />
          <button
            type="submit"
            disabled={resolving}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
          >
            {resolving ? "Проверяем..." : "Проверить"}
          </button>
          {resolutionError && (
            <p className="text-sm text-rose-600">{resolutionError}</p>
          )}
          {resolution && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <p>{resolution.isWorking ? "Рабочий день" : "Нерабочий день"}</p>
              <p className="mt-1">
                Время: {formatTime(resolution.startMinutes)}–{formatTime(resolution.endMinutes)}
              </p>
              <p className="mt-1">
                Источник: {resolution.resolvedBy}
              </p>
              <p className="mt-1">Правило: {resolution.resolvedRule}</p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}

function toWeekForm(
  weeklyWorkingHours: WeeklyWorkingHours[],
): Record<DayOfWeek, WeekdayForm> {
  const week = createDefaultWeek();

  for (const record of weeklyWorkingHours) {
    week[record.dayOfWeek] = {
      isWorking: record.isWorking,
      startTime: minutesToTime(record.startMinutes) || "09:00",
      endTime: minutesToTime(record.endMinutes) || "18:00",
    };
  }

  return week;
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

function TimeInput({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        required={!disabled}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="input disabled:bg-slate-100 disabled:text-slate-400"
      />
    </Field>
  );
}

function CardText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-600">{text}</p>
    </div>
  );
}
