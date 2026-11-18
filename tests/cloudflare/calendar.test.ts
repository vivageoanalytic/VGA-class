import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Miniflare,
  Response as WorkerResponse,
  convertV4MiniflareOptions,
} from "miniflare";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  atWIB,
  startOfWeek,
  localDate,
  addDays,
} from "../../src/utils/dateTime";
import { getFreeIntervals } from "../../src/utils/intervals";
import type { PublicSchedule } from "../../src/types/schedule";

const week = startOfWeek(localDate());
const secret = "TEST_ONLY_WEBHOOK_SECRET_0123456789";
const objectName = "vga-calendar-v1";
const workerName = "test-calendar-worker";
let mf: Miniflare;
let calls: number;
let fail: boolean;
let schedules: Array<{
  mentor: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
}>;

beforeEach(() => {
  calls = 0;
  fail = false;
  schedules = [
    {
      mentor: "Mentor uji A",
      title: "Judul privat",
      start: atWIB(week, 540),
      end: atWIB(week, 600),
      allDay: false,
    },
    {
      mentor: "Mentor uji B",
      title: "Judul privat",
      start: atWIB(addDays(week, -2), 540),
      end: atWIB(addDays(week, -2), 600),
      allDay: false,
    },
  ];
  mf = new Miniflare(
    convertV4MiniflareOptions({
      name: workerName,
      modules: true,
      scriptPath: resolve(".npm-cache/cloudflare-worker/calendar-worker.js"),
      compatibilityDate: "2026-11-18",
      compatibilityFlags: ["nodejs_compat"],
      cf: false,
      bindings: {
        GOOGLE_APPS_SCRIPT_URL:
          "https://script.google.com/macros/s/RUNTIME_TEST/exec",
        API_SECRET: "TEST_ONLY_API_SECRET",
        CALENDAR_WEBHOOK_SECRET: secret,
        CALENDAR_CACHE_MODE: "changes",
      },
      durableObjects: {
        CALENDAR_COORDINATOR: {
          className: "CalendarCoordinator",
          useSQLite: true,
        },
      },
      outboundService: async (request) => {
        expect(new URL(request.url).hostname).toBe("script.google.com");
        const input = (await request.json()) as {
          token: string;
          start: string;
          end: string;
        };
        expect(input.token).toBe("TEST_ONLY_API_SECRET");
        expect(
          (Date.parse(input.end) - Date.parse(input.start)) / 86_400_000,
        ).toBe(31);
        calls++;
        return new WorkerResponse(
          JSON.stringify(
            fail
              ? { success: false }
              : {
                  success: true,
                  timezone: "Asia/Jakarta",
                  count: schedules.length,
                  schedules,
                  warnings: [],
                },
          ),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    }),
  );
});
afterEach(async () => {
  await mf?.dispose();
});

async function stub() {
  const namespace = await mf.getDurableObjectNamespace("CALENDAR_COORDINATOR");
  return namespace.get(namespace.idFromName(objectName));
}
async function load(): Promise<PublicSchedule> {
  const response = await (
    await stub()
  ).fetch(
    `https://vga-class.pages.dev/api/public-schedule?weekStart=${week}&mentorId=all`,
  );
  expect(response.status).toBe(200);
  return (await response.json()) as PublicSchedule;
}
async function notify(changeId = randomUUID(), token = secret) {
  return (await stub()).fetch(
    "https://vga-class.pages.dev/api/calendar-changed",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ changeId }),
    },
  );
}
async function evict() {
  await mf.unsafeEvictDurableObject(workerName, "CalendarCoordinator", {
    name: objectName,
  });
}

describe("Runtime Cloudflare dengan SQLite Durable Object", () => {
  it("Pengunjung bersamaan berbagi satu panggilan Apps Script dan mentor tanpa sesi tetap tersedia", async () => {
    const [first, second] = await Promise.all([load(), load()]);
    expect(first).toEqual(second);
    expect(calls).toBe(1);
    expect(first.mentors.map((m) => m.mentorDisplayName)).toEqual([
      "Mentor uji A",
      "Mentor uji B",
    ]);
    expect(first.events).toHaveLength(1);
    expect(getFreeIntervals(first.events, week, first.mentors[1])).toEqual([
      { start: 420, end: 1260 },
    ]);
    expect(JSON.stringify(first)).not.toContain("Judul privat");
  });
  it("Cache dan daftar mentor bertahan setelah isolate diganti tanpa pembacaan Google ulang", async () => {
    const before = await load();
    await evict();
    expect(await load()).toEqual(before);
    expect(calls).toBe(1);
  });
  it("Penghapusan sesi membatalkan cache dan deduplikasi bertahan setelah eviction", async () => {
    await load();
    schedules = [];
    const changeId = randomUUID();
    expect((await notify(changeId)).status).toBe(202);
    const deleted = await load();
    expect(deleted.events).toEqual([]);
    expect(deleted.mentors).toHaveLength(2);
    expect(calls).toBe(2);
    await evict();
    expect((await notify(changeId)).status).toBe(202);
    expect((await load()).revision).toBe(deleted.revision);
    expect(calls).toBe(2);
  });
  it("Invalidasi sebelum eviction tetap memaksa pengambilan data terbaru", async () => {
    const before = await load();
    await notify();
    await evict();
    schedules[0] = {
      ...schedules[0]!,
      start: atWIB(week, 660),
      end: atWIB(week, 720),
    };
    const after = await load();
    expect(after.revision).not.toBe(before.revision);
    expect(after.events[0]?.start).toBe(atWIB(week, 660));
    expect(calls).toBe(2);
  });
  it("Kegagalan sumber tetap stale dan tidak menjadikan kalender kosong tersedia", async () => {
    const before = await load();
    await notify();
    fail = true;
    const stale = await load();
    expect(stale.syncStatus).toBe("stale");
    expect(stale.events).toEqual(before.events);
    expect(getFreeIntervals(stale.events, week, stale.mentors[0])).toBeNull();
  });
  it("SSE memberi tahu revisi baru tanpa membacakan kalender pada setiap notifikasi", async () => {
    const before = await load();
    const response = await (
      await stub()
    ).fetch("https://vga-class.pages.dev/api/schedule-updates");
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    const reader = response.body!.getReader();
    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        before.revision,
      );
      await notify();
      const next = new TextDecoder().decode((await reader.read()).value);
      expect(next).toContain("event: revision");
      expect(next).not.toContain(before.revision);
      expect(calls).toBe(1);
    } finally {
      await reader.cancel();
    }
  });
  it("Secret salah ditolak; Worker tidak mempunyai endpoint publik langsung", async () => {
    const before = await load();
    expect((await notify(randomUUID(), "WRONG")).status).toBe(401);
    expect((await load()).revision).toBe(before.revision);
    expect(
      (await mf.dispatchFetch("https://example.test/api/public-schedule"))
        .status,
    ).toBe(404);
    expect(calls).toBe(1);
  });
});
