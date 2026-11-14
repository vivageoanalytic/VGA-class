export const TIME_ZONE = "Asia/Jakarta";
export const DAY_MS = 86_400_000;
export const FRESH_MS = 300_000;
export const OPEN_MINUTE = 7 * 60;
export const CLOSE_MINUTE = 21 * 60;

export function localDate(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (!Number.isFinite(date.getTime()))
    throw new RangeError("Tanggal tidak valid");
  return new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addDays(date: string, count: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + count * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function startOfWeek(date = localDate()): string {
  if (!validDate(date)) throw new RangeError("Tanggal tidak valid");
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function atWIB(day: string, minute = 0): string {
  const base = new Date(`${day}T00:00:00+07:00`).getTime();
  return new Date(base + minute * 60_000).toISOString();
}

export function formatDay(
  day: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    ...options,
  }).format(new Date(`${day}T12:00:00+07:00`));
}

export function formatWeek(start: string): string {
  return `${formatDay(start, { day: "numeric", month: "short" })} – ${formatDay(addDays(start, 6), { day: "numeric", month: "short", year: "numeric" })}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function minuteLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}.${String(minute % 60).padStart(2, "0")}`;
}

export function formatUpdated(iso: string): string {
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso)) + " WIB"
  );
}
