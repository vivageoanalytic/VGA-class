import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createAppsScriptCalendarService } from "../api/appsScriptCalendar";
import { createCalendarHttpHandler } from "../api/calendarHttp";
import { handlePagesCalendar } from "../api/cloudflarePages";
import { atWIB } from "../src/utils/dateTime";

const secret = "TEST_ONLY_WEBHOOK_SECRET_0123456789";
const week = "2026-11-16";
const now = () => Date.parse("2026-11-18T00:00:00+07:00");
function setup() {
  const source = createAppsScriptCalendarService(
    {
      url: "https://script.google.com/macros/s/HTTP_TEST/exec",
      secret: "TEST_ONLY_API_SECRET",
      cacheMode: "changes",
    },
    {
      now,
      fetcher: vi.fn().mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              timezone: "Asia/Jakarta",
              count: 1,
              warnings: [],
              schedules: [
                {
                  mentor: "Mentor dari JSON",
                  title: "Judul privat",
                  start: atWIB(week, 540),
                  end: atWIB(week, 600),
                  allDay: false,
                },
              ],
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
      ),
    },
  );
  const flush = vi.fn();
  return {
    source,
    flush,
    handler: createCalendarHttpHandler(
      source,
      { CALENDAR_CACHE_MODE: "changes", CALENDAR_WEBHOOK_SECRET: secret },
      { now, flush },
    ),
  };
}
const notice = (body: unknown, token = secret) =>
  new Request("https://example.test/api/calendar-changed", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("HTTP Cloudflare untuk kalender", () => {
  it("GET mengeluarkan JSON tersanitasi, header keamanan dan status WIB", async () => {
    const { handler, flush } = setup();
    const response = await handler(
      new Request(`https://example.test/api/public-schedule?weekStart=${week}`),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "connect-src 'self'",
    );
    const body = await response.text();
    expect(body).toContain("Mentor dari JSON");
    expect(body).not.toContain("Judul privat");
    expect(body).not.toContain("TEST_ONLY_API_SECRET");
    expect(flush).toHaveBeenCalledOnce();
  });
  it("Notifikasi terautentikasi dideduplikasi dan disimpan sebelum respons sukses", async () => {
    const { handler, source, flush } = setup();
    const before = source.getRevision();
    const changeId = randomUUID();
    expect((await handler(notice({ changeId }))).status).toBe(202);
    const after = source.getRevision();
    expect(after).not.toBe(before);
    expect((await handler(notice({ changeId }))).status).toBe(202);
    expect(source.getRevision()).toBe(after);
    expect(flush).toHaveBeenCalledOnce();
  });
  it("Token salah, body rusak, field tambahan dan payload besar ditolak", async () => {
    const { handler, source } = setup();
    const before = source.getRevision();
    expect(
      (await handler(notice({ changeId: randomUUID() }, "WRONG"))).status,
    ).toBe(401);
    expect((await handler(notice({ changeId: "invalid" }))).status).toBe(400);
    expect(
      (await handler(notice({ changeId: randomUUID(), events: [] }))).status,
    ).toBe(400);
    expect((await handler(notice({ changeId: "a".repeat(5000) }))).status).toBe(
      413,
    );
    expect(source.getRevision()).toBe(before);
  });
  it("Kegagalan penyimpanan callback menghasilkan retry, bukan sukses semu", async () => {
    const { handler, flush } = setup();
    flush.mockImplementationOnce(() => {
      throw new Error("storage unavailable");
    });
    const changeId = randomUUID();
    expect((await handler(notice({ changeId }))).status).toBe(503);
    expect((await handler(notice({ changeId }))).status).toBe(202);
  });
  it("Endpoint dan method lain ditolak; SSE tidak aktif pada mode ttl", async () => {
    const { handler, source } = setup();
    expect(
      (await handler(new Request("https://example.test/api/calendar-changed")))
        .status,
    ).toBe(405);
    expect(
      (await handler(new Request("https://example.test/api/unknown"))).status,
    ).toBe(404);
    const ttl = createCalendarHttpHandler(source, {
      CALENDAR_CACHE_MODE: "ttl",
      CALENDAR_WEBHOOK_SECRET: secret,
    });
    expect(
      (await ttl(new Request("https://example.test/api/schedule-updates")))
        .status,
    ).toBe(204);
  });
});

describe("Penghubung Cloudflare Pages", () => {
  it("Semua lokasi dan endpoint memakai identitas cache bersama yang sama", async () => {
    const idFromName = vi.fn().mockReturnValue("same-id");
    const fetcher = vi
      .fn()
      .mockImplementation(async () => new Response('{"success":true}'));
    const get = vi.fn().mockReturnValue({ fetch: fetcher });
    await handlePagesCalendar(
      new Request(`https://example.test/api/public-schedule?weekStart=${week}`),
      { idFromName, get },
    );
    await handlePagesCalendar(notice({ changeId: randomUUID() }), {
      idFromName,
      get,
    });
    expect(idFromName.mock.calls).toEqual([
      ["vga-calendar-v1"],
      ["vga-calendar-v1"],
    ]);
    expect(get.mock.calls).toEqual([["same-id"], ["same-id"]]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("Binding belum dipasang memberi error aman; tidak ada fallback ke demo", async () => {
    const response = await handlePagesCalendar(
      new Request(`https://example.test/api/public-schedule?weekStart=${week}`),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(await response.text()).not.toContain('"demo":true');
  });
  it("Route/method tak valid tidak menghubungi backend dan error provider tidak bocor", async () => {
    const idFromName = vi.fn();
    const get = vi.fn().mockReturnValue({
      fetch: () => {
        throw new Error("PRIVATE_PROVIDER_ERROR");
      },
    });
    expect(
      (
        await handlePagesCalendar(
          new Request("https://example.test/api/nope"),
          { idFromName, get },
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handlePagesCalendar(
          new Request("https://example.test/api/calendar-changed"),
          { idFromName, get },
        )
      ).status,
    ).toBe(405);
    expect(get).not.toHaveBeenCalled();
    const response = await handlePagesCalendar(
      new Request(`https://example.test/api/public-schedule?weekStart=${week}`),
      { idFromName, get },
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("PRIVATE_PROVIDER_ERROR");
  });
});
