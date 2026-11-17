// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppsScriptCalendarService } from "../api/appsScriptCalendar";
import {
  clearScheduleCache,
  fetchPublicSchedule,
  scheduleCacheExpiresAt,
  subscribeScheduleChanges,
} from "../src/services/publicSchedule";
import { atWIB, FRESH_MS } from "../src/utils/dateTime";
import type { PublicSchedule } from "../src/types/schedule";

vi.mock("../src/content/brand", () => ({ brand: { demo: false } }));
const week = "2026-11-16";
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
async function packet(
  mode: "ttl" | "changes" = "ttl",
): Promise<PublicSchedule> {
  return createAppsScriptCalendarService(
    {
      url: "https://script.google.com/macros/s/TEST/exec",
      secret: "TEST_ONLY_SECRET",
      cacheMode: mode,
    },
    {
      fetcher: vi.fn().mockResolvedValue(
        json({
          success: true,
          timezone: "Asia/Jakarta",
          count: 1,
          warnings: [],
          schedules: [
            {
              mentor: "Nama dari API",
              title: "Sesi belajar",
              start: atWIB(week, 540),
              end: atWIB(week, 600),
              allDay: false,
            },
          ],
        }),
      ),
    },
  ).getSchedule(week);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-17T00:00:00+07:00"));
  clearScheduleCache();
  sessionStorage.clear();
});
afterEach(() => {
  clearScheduleCache();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Cache jadwal browser", () => {
  it("Pindah halaman dan request bersamaan hanya mengambil API sekali", async () => {
    const data = await packet();
    const fetcher = vi.fn().mockResolvedValue(json(data));
    vi.stubGlobal("fetch", fetcher);
    await Promise.all([fetchPublicSchedule(week), fetchPublicSchedule(week)]);
    await fetchPublicSchedule(week);
    await fetchPublicSchedule(week);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]![0])).toContain("/api/public-schedule");
    expect(
      JSON.stringify(
        [...Array(sessionStorage.length)].map((_, index) =>
          sessionStorage.getItem(sessionStorage.key(index)!),
        ),
      ),
    ).not.toContain("TEST_ONLY_SECRET");
  });
  it("Membaca snapshot sessionStorage setelah halaman dibuka kembali", async () => {
    const data = await packet();
    const fetcher = vi.fn().mockResolvedValue(json(data));
    vi.stubGlobal("fetch", fetcher);
    await fetchPublicSchedule(week);
    const saved = sessionStorage.getItem("vga-schedule-v2:" + week)!;
    clearScheduleCache();
    sessionStorage.setItem("vga-schedule-v2:" + week, saved);
    expect(await fetchPublicSchedule(week)).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("Cache kedaluwarsa atau tombol refresh boleh membaca backend lagi", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => json(await packet()));
    vi.stubGlobal("fetch", fetcher);
    await fetchPublicSchedule(week);
    await fetchPublicSchedule(week, { refresh: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(FRESH_MS + 1);
    await fetchPublicSchedule(week);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("Kegagalan sumber dicoba kembali dalam semenit meskipun lease cache masih panjang atau sudah lewat", async () => {
    const data = await packet("changes");
    for (const lease of [Date.now() + 6 * 60 * 60_000, Date.now() - 60_000]) {
      const stale: PublicSchedule = {
        ...data,
        syncStatus: "stale",
        validUntil: new Date(lease).toISOString(),
        mentors: data.mentors.map((mentor) => ({
          ...mentor,
          syncStatus: "stale",
        })),
      };
      expect(scheduleCacheExpiresAt(stale)).toBe(Date.now() + 60_000);
    }
  });
  it("Membatalkan satu pemakai tidak membatalkan request bersama", async () => {
    const data = await packet();
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const controller = new AbortController();
    const first = fetchPublicSchedule(week, { signal: controller.signal });
    const rejected = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    const second = fetchPublicSchedule(week);
    controller.abort();
    await rejected;
    finish(json(data));
    expect(await second).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("Cache rusak tidak menghalangi pembacaan API", async () => {
    sessionStorage.setItem("vga-schedule-v2:" + week, "{broken");
    const data = await packet();
    const fetcher = vi.fn().mockResolvedValue(json(data));
    vi.stubGlobal("fetch", fetcher);
    expect(await fetchPublicSchedule(week)).toEqual(data);
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it("Notifikasi versi baru menghapus cache sebelum pembacaan berikutnya", async () => {
    const connections: FakeEvents[] = [];
    class FakeEvents {
      listener?: EventListener;
      onerror: (() => void) | null = null;
      constructor(public url: string) {
        connections.push(this);
      }
      addEventListener(_name: string, listener: EventListener) {
        this.listener = listener;
      }
      close() {}
      emit(revision: string) {
        this.listener?.(
          new MessageEvent("revision", { data: JSON.stringify({ revision }) }),
        );
      }
    }
    vi.stubGlobal("EventSource", FakeEvents);
    const first = await packet("changes"),
      second = await packet("changes");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json(first))
      .mockResolvedValueOnce(json(second));
    vi.stubGlobal("fetch", fetcher);
    const listener = vi.fn(),
      stop = subscribeScheduleChanges(listener);
    await fetchPublicSchedule(week);
    connections[0]!.emit(second.revision!);
    await vi.advanceTimersByTimeAsync(200);
    expect(listener).toHaveBeenCalledOnce();
    expect((await fetchPublicSchedule(week)).revision).toBe(second.revision);
    expect(fetcher).toHaveBeenCalledTimes(2);
    stop();
  });
});
