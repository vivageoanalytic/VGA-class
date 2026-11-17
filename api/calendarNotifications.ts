import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRateLimiter } from "./publicSchedule.js";
import type { PublicSchedule } from "../src/types/schedule.js";

interface ChangeSource {
  getSchedule?: (
    weekStart: string,
    mentorId?: string,
  ) => Promise<PublicSchedule>;
  invalidate?: () => string;
  getRevision?: () => string;
  subscribe?: (listener: (revision: string) => void) => () => void;
}

/** Authenticated invalidation changes only the local cache, never Google Calendar events. */
export function createCalendarNotifications(
  source: ChangeSource,
  env: Record<string, string | undefined>,
) {
  const secret = env.CALENDAR_WEBHOOK_SECRET ?? "";
  const expected = createHash("sha256").update(secret).digest();
  const limited = createRateLimiter(120);
  const seen = new Set<string>();
  let connections = 0;
  const json = (
    res: ServerResponse,
    status: number,
    value: unknown,
    extra: Record<string, string> = {},
  ) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extra,
    });
    res.end(JSON.stringify(value));
  };
  return async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    if (path !== "/api/calendar-changed" && path !== "/api/schedule-updates")
      return false;
    if (path === "/api/schedule-updates") {
      if (req.method !== "GET") {
        json(res, 405, { error: "Metode tidak diizinkan." }, { Allow: "GET" });
        return true;
      }
      if (
        env.CALENDAR_CACHE_MODE !== "changes" ||
        !secret ||
        !source.subscribe ||
        !source.getRevision
      ) {
        res.writeHead(204, { "Cache-Control": "no-store" });
        res.end();
        return true;
      }
      if (connections >= 100) {
        json(res, 503, { error: "Koneksi pembaruan sedang penuh." });
        return true;
      }
      connections++;
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();
      const send = (revision: string) => {
        if (!res.destroyed)
          res.write(
            `event: revision\ndata: ${JSON.stringify({ revision })}\n\n`,
          );
      };
      send(source.getRevision());
      const unsubscribe = source.subscribe(send);
      const heartbeat = setInterval(() => {
        if (!res.destroyed) res.write(": heartbeat\n\n");
      }, 25_000);
      heartbeat.unref();
      let closed = false;
      const close = () => {
        if (!closed) {
          closed = true;
          connections--;
          clearInterval(heartbeat);
          unsubscribe();
        }
      };
      res.once("close", close);
      req.once("aborted", close);
      return true;
    }
    if (req.method !== "POST") {
      json(res, 405, { error: "Metode tidak diizinkan." }, { Allow: "POST" });
      return true;
    }
    if (!secret || !source.invalidate) {
      json(res, 503, { error: "Notifikasi kalender belum dikonfigurasi." });
      return true;
    }
    if (!limited(req.socket.remoteAddress ?? "unknown")) {
      json(res, 429, { error: "Terlalu banyak notifikasi." });
      return true;
    }
    const authorization = req.headers.authorization ?? "";
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
    ) {
      json(res, 401, { error: "Notifikasi tidak diizinkan." });
      return true;
    }
    if (
      !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")
    ) {
      json(res, 415, { error: "Body JSON diperlukan." });
      return true;
    }
    if (Number(req.headers["content-length"]) > 4096) {
      json(res, 413, { error: "Notifikasi terlalu besar." });
      return true;
    }
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const raw of req) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      length += chunk.length;
      if (length > 4096) {
        json(res, 413, { error: "Notifikasi terlalu besar." });
        return true;
      }
      chunks.push(chunk);
    }
    let value: unknown;
    try {
      value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      json(res, 400, { error: "Notifikasi tidak valid." });
      return true;
    }
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      typeof (value as Record<string, unknown>).changeId !== "string" ||
      !/^[a-f0-9-]{36}$/.test((value as { changeId: string }).changeId) ||
      Object.keys(value).some((key) => key !== "changeId")
    ) {
      json(res, 400, { error: "Notifikasi tidak valid." });
      return true;
    }
    const changeId = (value as { changeId: string }).changeId;
    if (!seen.has(changeId)) {
      source.invalidate();
      if (seen.size >= 512) seen.delete(seen.values().next().value!);
      seen.add(changeId);
    }
    json(res, 202, { success: true });
    return true;
  };
}
