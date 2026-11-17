import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createViteScheduleMiddleware } from "../api/viteSchedule";
import { atWIB } from "../src/utils/dateTime";

const week = "2026-11-09",
  time = Date.parse("2026-11-14T12:00:00+07:00");
type Result = {
  status: number;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
  next?: boolean;
};
function invoke(
  middleware: ReturnType<typeof createViteScheduleMiddleware>,
  url: string,
  method = "GET",
): Promise<Result> {
  return new Promise((resolve) => {
    const headers: Record<string, string> = {};
    let status = 200;
    const response = {
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      writeHead(code: number, values: Record<string, string>) {
        status = code;
        for (const [name, value] of Object.entries(values ?? {}))
          headers[name.toLowerCase()] = value;
      },
      end(body: string) {
        resolve({ status, headers, body: body ? JSON.parse(body) : undefined });
      },
    } as unknown as ServerResponse;
    middleware(
      {
        url,
        method,
        socket: { remoteAddress: "127.0.0.1" },
      } as IncomingMessage,
      response,
      () => resolve({ status, headers, next: true }),
    );
  });
}

describe("API di Vite tanpa proxy/backend terpisah", () => {
  it("Melanjutkan request halaman/aset ke Vite", async () => {
    const fetcher = vi.fn();
    const middleware = createViteScheduleMiddleware({}, { fetcher });
    expect((await invoke(middleware, "/schedule")).next).toBe(true);
    expect((await invoke(middleware, "/src/main.ts")).next).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("Menggunakan Apps Script dan mengembalikan JSON di origin Vite", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          timezone: "Asia/Jakarta",
          count: 1,
          warnings: [],
          schedules: [
            {
              mentor: "Nama kalender dari API",
              title: "Sesi belajar",
              start: atWIB(week, 540),
              end: atWIB(week, 600),
              allDay: false,
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
    const middleware = createViteScheduleMiddleware(
      {
        GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/TEST/exec",
        API_SECRET: "TEST_ONLY_SECRET",
      },
      { fetcher, now: () => time },
    );
    const result = await invoke(
      middleware,
      `/api/public-schedule?weekStart=${week}&mentorId=all`,
    );
    expect(result.status).toBe(200);
    expect(result.body?.syncStatus).toBe("success");
    expect(result.body?.events).toHaveLength(1);
    expect(result.headers["cache-control"]).toBe("no-store");
    expect(result.headers["x-content-type-options"]).toBe("nosniff");
    expect(JSON.stringify(result)).not.toContain("TEST_ONLY_SECRET");
  });
  it.each([
    ["/api/unknown", "GET", 404],
    [`/api/public-schedule?weekStart=${week}`, "POST", 405],
    ["/api/public-schedule?weekStart=invalid", "GET", 400],
    ["/api/" + "x".repeat(2100), "GET", 414],
  ])("Validering tetap aktif untuk %s %s", async (url, method, expected) => {
    const fetcher = vi.fn();
    const result = await invoke(
      createViteScheduleMiddleware({}, { fetcher, now: () => time }),
      url,
      method,
    );
    expect(result.status).toBe(expected);
    expect(result.headers["content-type"]).toContain("application/json");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
