function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function localIcsDateTime(date: string, minutes: number) {
  return `${date.replaceAll("-", "")}T${String(Math.floor(minutes / 60)).padStart(2, "0")}${String(minutes % 60).padStart(2, "0")}00`;
}

export function bookingIcs(input: { date: string; startMinutes: number; endMinutes: number; titles: string[] }) {
  const title = input.titles.join(" + ") || "Запись";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//self-made//booking//RU", "BEGIN:VEVENT", `DTSTART:${localIcsDateTime(input.date, input.startMinutes)}`, `DTEND:${localIcsDateTime(input.date, input.endMinutes)}`, `SUMMARY:${escapeIcs(title)}`, "DESCRIPTION:Онлайн-запись self-made", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
}

export function downloadBookingIcs(input: { date: string; startMinutes: number; endMinutes: number; titles: string[] }) {
  const blob = new Blob([bookingIcs(input)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `booking-${input.date}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}
