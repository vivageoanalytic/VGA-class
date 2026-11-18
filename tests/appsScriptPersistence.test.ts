import { describe, expect, it, vi } from "vitest";
import {
  createAppsScriptCalendarService,
  type AppsScriptState,
} from "../api/appsScriptCalendar";
import { getFreeIntervals } from "../src/utils/intervals";
import { atWIB } from "../src/utils/dateTime";

const week = "2026-11-16";
const now = () => Date.parse("2026-11-18T00:00:00+07:00");
const config = {
  url: "https://script.google.com/macros/s/PERSIST_TEST/exec",
  secret: "TEST_ONLY_SECRET",
  cacheMode: "changes" as const,
};
const event = {
  mentor: "Mentor dari kalender",
  title: "Judul privat",
  start: atWIB(week, 540),
  end: atWIB(week, 600),
  allDay: false,
  description: "Deskripsi privat",
};
const response = (schedules: unknown[]) =>
  new Response(
    JSON.stringify({
      success: true,
      timezone: "Asia/Jakarta",
      count: schedules.length,
      schedules,
      warnings: [],
    }),
    { headers: { "Content-Type": "application/json" } },
  );

describe("Cache kalender yang dipulihkan setelah restart", () => {
  it("Memakai ulang cache tanpa Google dan tanpa mengubah waktu pembaruan", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([event]));
    const first = createAppsScriptCalendarService(config, { fetcher, now });
    const data = await first.getSchedule(week);
    const saved = JSON.stringify(first.exportState());
    expect(saved).not.toContain(config.secret);
    expect(saved).not.toContain(event.title);
    expect(saved).not.toContain(event.description);
    const second = createAppsScriptCalendarService(config, {
      fetcher,
      now: () => now() + 3_600_000,
      initialState: JSON.parse(saved),
    });
    expect(await second.getSchedule(week)).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.getStateVersion()).toBe(0);
  });
  it("Invalidasi tetap berlaku setelah restart; sesi yang dihapus menjadi waktu bebas", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response([event]))
      .mockResolvedValueOnce(response([]));
    const first = createAppsScriptCalendarService(config, { fetcher, now });
    await first.getSchedule(week);
    first.invalidate();
    const second = createAppsScriptCalendarService(config, {
      fetcher,
      now,
      initialState: structuredClone(first.exportState()),
    });
    const result = await second.getSchedule(week);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.events).toEqual([]);
    expect(result.mentors[0]?.mentorDisplayName).toBe(event.mentor);
    expect(
      getFreeIntervals(result.events, week, result.mentors[0], now()),
    ).toEqual([{ start: 420, end: 1260 }]);
  });
  it("Kegagalan setelah restart mempertahankan blok sibuk dengan status stale", async () => {
    const first = createAppsScriptCalendarService(config, {
      now,
      fetcher: vi.fn().mockResolvedValue(response([event])),
    });
    const initial = await first.getSchedule(week);
    first.invalidate();
    const second = createAppsScriptCalendarService(config, {
      now,
      initialState: structuredClone(first.exportState()),
      fetcher: vi.fn().mockRejectedValue(new Error("private upstream error")),
    });
    const stale = await second.getSchedule(week);
    expect(stale.syncStatus).toBe("stale");
    expect(stale.events).toEqual(initial.events);
    expect(
      getFreeIntervals(stale.events, week, stale.mentors[0], now()),
    ).toBeNull();
  });
  it("Format state yang tidak dikenal diabaikan", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([]));
    const service = createAppsScriptCalendarService(config, {
      now,
      fetcher,
      initialState: { version: 999 } as unknown as AppsScriptState,
    });
    expect((await service.getSchedule(week)).syncStatus).toBe("success");
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
