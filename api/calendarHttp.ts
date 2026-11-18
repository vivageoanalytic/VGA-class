import { createHash, timingSafeEqual } from "node:crypto";
import {
  createPublicScheduleHandler,
  createRateLimiter,
} from "./publicSchedule.js";
import { securityHeaders } from "./securityHeaders.js";
import type { createAppsScriptCalendarService } from "./appsScriptCalendar.js";

type CalendarSource = ReturnType<typeof createAppsScriptCalendarService>;
const validId =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function calendarJson(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/** Fetch/Streams adapter for the same public API and Apps Script JSON used by the Node server. */
export function createCalendarHttpHandler(
  source: CalendarSource,
  env: Record<string, string | undefined>,
  options: {
    flush?: () => void;
    changes?: Set<string>;
    now?: () => number;
  } = {},
) {
  const schedules = createPublicScheduleHandler(source, { now: options.now });
  const notifications = createRateLimiter(120, 60_000, options.now);
  const changes = options.changes ?? new Set<string>();
  const secret = env.CALENDAR_WEBHOOK_SECRET ?? "";
  const configured = secret.length >= 32 && secret.length <= 512;
  const expected = createHash("sha256").update(secret).digest();
  let connections = 0;

  return async (request: Request): Promise<Response> => {
    if (request.url.length > 4096)
      return calendarJson(414, { error: "Alamat permintaan terlalu panjang." });
    const path = new URL(request.url).pathname;
    const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (path === "/api/public-schedule") {
      const response = await schedules(request, address);
      options.flush?.();
      for (const [name, value] of Object.entries(securityHeaders))
        response.headers.set(name, value);
      return response;
    }
    if (path === "/api/schedule-updates") {
      if (request.method !== "GET")
        return calendarJson(
          405,
          { error: "Metode tidak diizinkan." },
          { Allow: "GET" },
        );
      if (env.CALENDAR_CACHE_MODE !== "changes" || !configured)
        return new Response(null, {
          status: 204,
          headers: { ...securityHeaders, "Cache-Control": "no-store" },
        });
      if (connections >= 100)
        return calendarJson(503, { error: "Koneksi pembaruan sedang penuh." });
      connections++;
      const encoder = new TextEncoder();
      let cleanup = () => {};
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false;
          let unsubscribe = () => {};
          const close = () => {
            if (closed) return;
            closed = true;
            connections--;
            unsubscribe();
            clearInterval(heartbeat);
            request.signal.removeEventListener("abort", close);
            try {
              controller.close();
            } catch {
              /* already canceled */
            }
          };
          const send = (message: string) => {
            if (closed) return;
            if ((controller.desiredSize ?? 0) < 0) {
              close();
              return;
            }
            try {
              controller.enqueue(encoder.encode(message));
            } catch {
              close();
            }
          };
          const heartbeat = setInterval(() => send(": heartbeat\n\n"), 25_000);
          cleanup = close;
          unsubscribe = source.subscribe((revision) =>
            send(`event: revision\ndata: ${JSON.stringify({ revision })}\n\n`),
          );
          send(
            `event: revision\ndata: ${JSON.stringify({ revision: source.getRevision() })}\n\n`,
          );
          request.signal.addEventListener("abort", close, { once: true });
          if (request.signal.aborted) close();
        },
        cancel() {
          cleanup();
        },
      });
      return new Response(body, {
        headers: {
          ...securityHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }
    if (path !== "/api/calendar-changed")
      return calendarJson(404, { error: "Endpoint tidak ditemukan." });
    if (request.method !== "POST")
      return calendarJson(
        405,
        { error: "Metode tidak diizinkan." },
        { Allow: "POST" },
      );
    if (!configured)
      return calendarJson(503, {
        error: "Notifikasi kalender belum dikonfigurasi.",
      });
    if (!notifications(address))
      return calendarJson(429, { error: "Terlalu banyak notifikasi." });
    const authorization = request.headers.get("Authorization") ?? "";
    const candidate = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";
    if (
      !candidate ||
      candidate.length > 512 ||
      !timingSafeEqual(
        expected,
        createHash("sha256").update(candidate).digest(),
      )
    )
      return calendarJson(401, { error: "Notifikasi tidak diizinkan." });
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers.get("Content-Type") ?? "",
      )
    )
      return calendarJson(415, { error: "Body JSON diperlukan." });
    if (Number(request.headers.get("Content-Length")) > 4096)
      return calendarJson(413, { error: "Notifikasi terlalu besar." });
    let value: unknown;
    const reader = request.body?.getReader();
    if (!reader) return calendarJson(400, { error: "Notifikasi tidak valid." });
    try {
      const decoder = new TextDecoder();
      let size = 0,
        content = "";
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 4096)
          return calendarJson(413, { error: "Notifikasi terlalu besar." });
        content += decoder.decode(part.value, { stream: true });
      }
      value = JSON.parse(content + decoder.decode());
    } catch {
      return calendarJson(400, { error: "Notifikasi tidak valid." });
    } finally {
      try {
        await reader.cancel();
      } catch {
        /* request already closed */
      }
    }
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>).changeId !== "string" ||
      !validId.test((value as { changeId: string }).changeId) ||
      Object.keys(value).some((key) => key !== "changeId")
    )
      return calendarJson(400, { error: "Notifikasi tidak valid." });
    const changeId = (value as { changeId: string }).changeId;
    if (!changes.has(changeId)) {
      source.invalidate();
      changes.add(changeId);
      if (changes.size > 512) changes.delete(changes.values().next().value!);
      try {
        options.flush?.();
      } catch {
        changes.delete(changeId);
        return calendarJson(503, { error: "Notifikasi belum dapat disimpan." });
      }
    }
    return calendarJson(202, { success: true });
  };
}
