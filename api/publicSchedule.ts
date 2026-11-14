import { activeMentors } from "../src/content/mentors.js";
import {
  addDays,
  localDate,
  startOfWeek,
  validDate,
} from "../src/utils/dateTime.js";
import { createCalendarService } from "./googleCalendar.js";

type Service = ReturnType<typeof createCalendarService>;

export function createRateLimiter(
  limit = 60,
  windowMs = 60_000,
  now = Date.now,
) {
  const clients = new Map<string, { count: number; reset: number }>();
  return (address: string): boolean => {
    const time = now();
    const entry = clients.get(address);
    if (entry && entry.reset > time) return ++entry.count <= limit;
    if (clients.size >= 5000) {
      for (const [key, value] of clients)
        if (value.reset <= time) clients.delete(key);
      if (clients.size >= 5000 && !entry) return false;
    }
    clients.set(address, { count: 1, reset: time + windowMs });
    return true;
  };
}

export function createPublicScheduleHandler(
  service: Service,
  options: { now?: () => number; limiter?: (ip: string) => boolean } = {},
) {
  const now = options.now ?? Date.now,
    limiter = options.limiter ?? createRateLimiter();
  return async (request: Request, address = "unknown"): Promise<Response> => {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    const error = (
      status: number,
      message: string,
      extra: Record<string, string> = {},
    ) =>
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...headers, ...extra },
      });
    if (request.method !== "GET")
      return error(405, "Metode tidak diizinkan.", { Allow: "GET" });
    if (!limiter(address))
      return error(
        429,
        "Terlalu banyak permintaan. Coba kembali sebentar lagi.",
        { "Retry-After": "60" },
      );
    const url = new URL(request.url);
    if (
      [...url.searchParams.keys()].some(
        (key) => !["weekStart", "mentorId"].includes(key),
      ) ||
      url.searchParams.getAll("weekStart").length !== 1 ||
      url.searchParams.getAll("mentorId").length > 1
    )
      return error(400, "Parameter jadwal tidak valid.");
    const input = url.searchParams.get("weekStart") || "",
      mentor = url.searchParams.get("mentorId") || "all";
    if (
      !validDate(input) ||
      (mentor !== "all" && !activeMentors.some((m) => m.id === mentor))
    )
      return error(400, "Tanggal atau mentor tidak valid.");
    const weekStart = startOfWeek(input),
      current = startOfWeek(localDate(new Date(now())));
    if (weekStart < addDays(current, -84) || weekStart > addDays(current, 84))
      return error(
        400,
        "Jadwal tersedia hingga 12 minggu sebelum atau sesudah minggu ini.",
      );
    try {
      return new Response(
        JSON.stringify(await service.getSchedule(weekStart, mentor)),
        { status: 200, headers },
      );
    } catch {
      return error(503, "Data belum dapat diperbarui. Status belum diketahui.");
    }
  };
}
