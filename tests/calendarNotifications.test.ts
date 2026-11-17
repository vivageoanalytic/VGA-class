import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createCalendarNotifications } from "../api/calendarNotifications";

const secret = "TEST_ONLY_WEBHOOK_SECRET_0123456789";
const env = { CALENDAR_WEBHOOK_SECRET: secret, CALENDAR_CACHE_MODE: "changes" };
function request(
  path: string,
  options: {
    method?: string;
    authorization?: string;
    body?: unknown;
    raw?: string;
  } = {},
) {
  const raw =
    options.raw ?? JSON.stringify(options.body ?? { changeId: randomUUID() });
  const req = Readable.from([Buffer.from(raw)]) as IncomingMessage;
  Object.assign(req, {
    url: path,
    method: options.method ?? "POST",
    headers: {
      authorization: options.authorization ?? "Bearer " + secret,
      "content-type": "application/json",
    },
    socket: { remoteAddress: "127.0.0.1" },
  });
  return req;
}
function response() {
  const events = new EventEmitter();
  const chunks: string[] = [],
    headers: Record<string, string> = {};
  const result = { status: 0, body: "", headers };
  const res = Object.assign(events, {
    destroyed: false,
    writeHead(status: number, values: Record<string, string>) {
      result.status = status;
      Object.assign(headers, values);
    },
    write(chunk: string) {
      chunks.push(chunk);
      result.body = chunks.join("");
    },
    end(chunk = "") {
      chunks.push(chunk);
      result.body = chunks.join("");
    },
    flushHeaders() {},
  }) as unknown as ServerResponse;
  return { res, result };
}

describe("Notifikasi perubahan kalender", () => {
  it("Token benar membatalkan cache sekali; pengiriman ulang tetap idempotent", async () => {
    const source = { invalidate: vi.fn(() => randomUUID()) };
    const handler = createCalendarNotifications(source, env);
    const changeId = randomUUID();
    for (let index = 0; index < 2; index++) {
      const { res, result } = response();
      expect(
        await handler(
          request("/api/calendar-changed", { body: { changeId } }),
          res,
        ),
      ).toBe(true);
      expect(result.status).toBe(202);
      expect(JSON.parse(result.body)).toEqual({ success: true });
      expect(result.body).not.toContain(secret);
    }
    expect(source.invalidate).toHaveBeenCalledOnce();
  });
  it("Token salah tidak membatalkan cache", async () => {
    const source = { invalidate: vi.fn() };
    const { res, result } = response();
    await createCalendarNotifications(source, env)(
      request("/api/calendar-changed", { authorization: "Bearer wrong" }),
      res,
    );
    expect(result.status).toBe(401);
    expect(source.invalidate).not.toHaveBeenCalled();
  });
  it.each([
    [{ body: { changeId: "invalid" } }, 400],
    [{ body: { changeId: randomUUID(), calendarId: "private-calendar" } }, 400],
    [{ raw: "{broken" }, 400],
    [{ raw: "x".repeat(4097) }, 413],
    [{ method: "GET" }, 405],
  ] as const)(
    "Menolak notifikasi yang tidak sesuai: %j",
    async (options, status) => {
      const source = { invalidate: vi.fn() };
      const { res, result } = response();
      await createCalendarNotifications(source, env)(
        request("/api/calendar-changed", options),
        res,
      );
      expect(result.status).toBe(status);
      expect(source.invalidate).not.toHaveBeenCalled();
    },
  );
  it("Belum dikonfigurasi tidak mengaktifkan webhook", async () => {
    const { res, result } = response();
    await createCalendarNotifications({ invalidate: vi.fn() }, {})(
      request("/api/calendar-changed"),
      res,
    );
    expect(result.status).toBe(503);
  });
  it("SSE mengirim revisi dan membersihkan langganan saat ditutup", async () => {
    const listeners = new Set<(revision: string) => void>();
    const initial = randomUUID(),
      next = randomUUID();
    const source = {
      getRevision: () => initial,
      subscribe: (listener: (revision: string) => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    const { res, result } = response();
    await createCalendarNotifications(source, env)(
      request("/api/schedule-updates", { method: "GET" }),
      res,
    );
    expect(result.status).toBe(200);
    expect(result.headers["Content-Type"]).toBe("text/event-stream");
    expect(result.body).toContain(initial);
    for (const listener of listeners) listener(next);
    expect(result.body).toContain(next);
    expect(result.body).not.toContain(secret);
    res.emit("close");
    expect(listeners.size).toBe(0);
  });
  it("Mode TTL tidak membuka koneksi perubahan", async () => {
    const { res, result } = response();
    await createCalendarNotifications({}, {})(
      request("/api/schedule-updates", { method: "GET" }),
      res,
    );
    expect(result.status).toBe(204);
  });
});
