import { describe, expect, it, vi } from "vitest";
import {
  createAppsScriptCalendarService,
  readAppsScriptConfig,
} from "../api/appsScriptCalendar";
import { createScheduleService } from "../api/scheduleService";
import { createPublicScheduleHandler } from "../api/publicSchedule";
import { validateSchedule } from "../src/services/publicSchedule";
import { getFreeIntervals } from "../src/utils/intervals";
import { addDays, atWIB, FRESH_MS } from "../src/utils/dateTime";

const week = "2026-11-09",
  time = Date.parse("2026-11-14T12:00:00+07:00");
const endpoint = "https://script.google.com/macros/s/TEST_DEPLOYMENT/exec";
const config = { url: endpoint, secret: "TEST_ONLY_API_SECRET" };
const session = {
  mentor: "VGA Tutor",
  title: "Sesi belajar",
  start: atWIB(week, 540),
  end: atWIB(week, 660),
  allDay: false,
};
const other = { ...session, mentor: "VGA Tutor Zaky" };
const payload = (
  schedules: unknown[] = [session, other],
  warnings: string[] = [],
) => ({
  success: true,
  timezone: "Asia/Jakarta",
  count: schedules.length,
  schedules,
  warnings,
});
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });

describe("JSON Apps Script milik pengguna", () => {
  it("Mode perubahan memakai cache lama tanpa panggilan Google baru, lalu invalidasi membaca perubahan", async () => {
    let current = time;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(payload([session])))
      .mockResolvedValueOnce(json(payload([])));
    const service = createAppsScriptCalendarService(
      { ...config, cacheMode: "changes" },
      { fetcher, now: () => current },
    );
    const listener = vi.fn(),
      stop = service.subscribe(listener);
    const first = await service.getSchedule(week);
    current += 60 * 60_000;
    const cached = await service.getSchedule(week);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cached.updatedAt).toBe(first.updatedAt);
    expect(
      getFreeIntervals(cached.events, week, cached.mentors[0], current),
    ).not.toBeNull();
    const revision = service.invalidate();
    const changed = await service.getSchedule(week);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(changed.revision).toBe(revision);
    expect(changed.events).toEqual([]);
    expect(
      getFreeIntervals(changed.events, week, changed.mentors[0], current),
    ).toEqual([{ start: 420, end: 1260 }]);
    expect(listener).toHaveBeenCalledOnce();
    stop();
  });
  it("Hasil request sebelum perubahan tidak menimpa cache baru", async () => {
    let finishOld!: (response: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishOld = resolve;
          }),
      )
      .mockResolvedValueOnce(
        json(payload([{ ...session, mentor: "Nama setelah perubahan" }])),
      );
    const service = createAppsScriptCalendarService(config, {
      fetcher,
      now: () => time,
    });
    const old = service.getSchedule(week);
    service.invalidate();
    const latest = await service.getSchedule(week);
    finishOld(
      json(payload([{ ...session, mentor: "Nama sebelum perubahan" }])),
    );
    const retried = await old;
    expect(retried.events).toEqual(latest.events);
    expect(retried.mentors.map((mentor) => mentor.mentorDisplayName)).toEqual([
      "Nama setelah perubahan",
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("Mentor tanpa sesi minggu ini tetap muncul dan tersedia setiap hari 07.00–21.00", async () => {
    const absentThisWeek = {
      ...session,
      mentor: "Nama API Tanpa Sesi Minggu Ini",
      start: atWIB(addDays(week, -5), 600),
      end: atWIB(addDays(week, -5), 720),
    };
    const service = createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValue(json(payload([session, other, absentThisWeek]))),
      now: () => time,
    });
    const result = await service.getSchedule(week);
    const mentor = result.mentors.find(
      (item) => item.mentorDisplayName === absentThisWeek.mentor,
    )!;
    expect(result.mentors).toHaveLength(3);
    expect(result.events).toHaveLength(2);
    for (let day = 0; day < 7; day++) {
      expect(
        getFreeIntervals(result.events, addDays(week, day), mentor, time),
      ).toEqual([{ start: 420, end: 1260 }]);
    }
    const filtered = await service.getSchedule(week, mentor.mentorId);
    expect(filtered.events).toEqual([]);
    expect(filtered.mentors).toHaveLength(1);
    expect(filtered.mentors[0]?.syncStatus).toBe("success");
  });
  it("Mentor yang sudah dikenali tetap tersedia ketika hanya mentor lain memiliki sesi", async () => {
    let current = time;
    const service = createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValueOnce(
          json(
            payload([
              { ...session, mentor: "Nama API A" },
              { ...session, mentor: "Nama API B" },
            ]),
          ),
        )
        .mockResolvedValueOnce(
          json(payload([{ ...session, mentor: "Nama API B" }])),
        ),
      now: () => current,
    });
    await service.getSchedule(week);
    current += FRESH_MS;
    const updated = await service.getSchedule(week);
    expect(updated.mentors.map((mentor) => mentor.mentorDisplayName)).toEqual([
      "Nama API A",
      "Nama API B",
    ]);
    expect(updated.events[0]!.mentorDisplayName).toBe("Nama API B");
    expect(
      getFreeIntervals(updated.events, week, updated.mentors[0], current),
    ).toEqual([{ start: 420, end: 1260 }]);
  });
  it("Menampilkan empat nama otomatis ketika empat nama dikirim API", async () => {
    const names = ["Nama API A", "Nama API B", "Nama API C", "Nama API D"];
    const result = await createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValue(
          json(payload(names.map((mentor) => ({ ...session, mentor })))),
        ),
      now: () => time,
    }).getSchedule(week);
    expect(result.mentors.map((mentor) => mentor.mentorDisplayName)).toEqual(
      names,
    );
    expect(validateSchedule(result, week).events).toHaveLength(4);
  });
  it("Menerima JSON persis tanpa version, mentorId, status mentor atau echo rentang", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json(payload()));
    const result = await createScheduleService(
      { GOOGLE_APPS_SCRIPT_URL: endpoint, API_SECRET: config.secret },
      { fetcher, now: () => time },
    ).getSchedule(week);
    expect(result.syncStatus).toBe("success");
    expect(result.events).toHaveLength(2);
    expect(result.mentors.map((mentor) => mentor.mentorDisplayName)).toEqual([
      "VGA Tutor",
      "VGA Tutor Zaky",
    ]);
    expect(validateSchedule(result, week)).toEqual(result);
    expect(result.events[0]!.mentorId).toMatch(/^calendar-[a-f0-9]{16}$/);
    expect(fetcher.mock.calls[0]![1]).toMatchObject({
      method: "POST",
      redirect: "manual",
    });
    expect(JSON.parse(String(fetcher.mock.calls[0]![1]?.body))).toEqual({
      token: config.secret,
      start: atWIB(addDays(week, -12)),
      end: atWIB(addDays(week, 19)),
    });
    expect(JSON.stringify(result)).not.toContain(config.secret);
  });
  it("ID mentor stabil saat urutan jadwal berubah dan filter API bekerja", async () => {
    const a = await createAppsScriptCalendarService(config, {
      fetcher: vi.fn().mockResolvedValue(json(payload())),
      now: () => time,
    }).getSchedule(week);
    const service = createAppsScriptCalendarService(config, {
      fetcher: vi.fn().mockResolvedValue(json(payload([other, session]))),
      now: () => time,
    });
    const b = await service.getSchedule(week);
    expect(
      a.events.find((event) => event.mentorDisplayName === session.mentor)!
        .mentorId,
    ).toBe(
      b.events.find((event) => event.mentorDisplayName === session.mentor)!
        .mentorId,
    );
    const id = a.events[0]!.mentorId;
    const response = await createPublicScheduleHandler(service, {
      now: () => time,
    })(
      new Request(
        `http://localhost/api/public-schedule?weekStart=${week}&mentorId=${id}`,
      ),
    );
    const filtered = await response.json();
    expect(response.status).toBe(200);
    expect(filtered.events).toHaveLength(1);
    expect(filtered.mentors).toHaveLength(1);
  });
  it("Tidak meneruskan judul mentah, lokasi, link Meet atau field tambahan", async () => {
    const result = await createAppsScriptCalendarService(config, {
      fetcher: vi.fn().mockResolvedValue(
        json(
          payload([
            {
              ...session,
              title: "PRIVATE_STUDENT",
              location: "PRIVATE_ADDRESS",
              hangoutLink: "PRIVATE_MEET",
              calendarId: "PRIVATE_ID",
            },
          ]),
        ),
      ),
      now: () => time,
    }).getSchedule(week);
    expect(result.events[0]!.publicLabel).toBe("Sesi");
    expect(JSON.stringify(result)).not.toContain("PRIVATE_");
  });
  it("Warnings tetap menampilkan sesi valid dan menahan klaim waktu kosong", async () => {
    const result = await createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValue(
          json(payload([session], ["PRIVATE_PROVIDER_ERROR"])),
        ),
      now: () => time,
    }).getSchedule(week);
    expect(result.events).toHaveLength(1);
    expect(result.syncStatus).toBe("success");
    expect(result.partial).toBe(true);
    expect(
      getFreeIntervals(result.events, week, result.mentors[0], time),
    ).toBeNull();
    expect(JSON.stringify(result)).not.toContain("PRIVATE_PROVIDER_ERROR");
  });
  it("Kalender kosong sukses diterima dan nama yang sudah dikenali tetap tersedia di minggu kosong", async () => {
    let current = time;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(payload()))
      .mockResolvedValueOnce(json(payload([])));
    const service = createAppsScriptCalendarService(config, {
      fetcher,
      now: () => current,
    });
    await service.getSchedule(week);
    current += FRESH_MS;
    const empty = await service.getSchedule(week);
    expect(empty.events).toEqual([]);
    expect(empty.mentors).toHaveLength(2);
    expect(
      empty.mentors.every((mentor) => mentor.syncStatus === "success"),
    ).toBe(true);
    expect(
      getFreeIntervals(empty.events, week, empty.mentors[0], current),
    ).toEqual([{ start: 420, end: 1260 }]);
    const firstEmpty = await createAppsScriptCalendarService(config, {
      fetcher: vi.fn().mockResolvedValue(json(payload([]))),
      now: () => time,
    }).getSchedule(week);
    expect(firstEmpty).toMatchObject({
      syncStatus: "success",
      events: [],
      mentors: [],
    });
    expect(validateSchedule(firstEmpty, week)).toEqual(firstEmpty);
  });
  it("Baris rusak menjadi partial; sesi lain tetap tampil", async () => {
    const result = await createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValue(
          json(payload([session, { ...other, start: "broken" }])),
        ),
      now: () => time,
    }).getSchedule(week);
    expect(result.events).toHaveLength(1);
    expect(result.partial).toBe(true);
    expect(
      result.mentors.every((mentor) => mentor.syncStatus === "stale"),
    ).toBe(true);
  });
  it("Menjaga all-day, menghapus duplikat dan mengabaikan interval di luar minggu", async () => {
    const allDay = {
      ...session,
      start: atWIB(week),
      end: atWIB("2026-11-10"),
      allDay: true,
    };
    const result = await createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValue(
          json(
            payload([
              session,
              session,
              allDay,
              { ...other, start: atWIB("2026-11-08"), end: atWIB(week) },
            ]),
          ),
        ),
      now: () => time,
    }).getSchedule(week);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]).toMatchObject({
      allDay: true,
      start: atWIB(week),
      end: atWIB("2026-11-10"),
    });
  });
  it("Menggabungkan permintaan dan memakai cache lima menit", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => json(payload()));
    const service = createAppsScriptCalendarService(config, {
      fetcher,
      now: () => time,
    });
    await Promise.all([service.getSchedule(week), service.getSchedule(week)]);
    await service.getSchedule(week);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("Gagal refresh mempertahankan jadwal bertanda stale dan timestamp asli", async () => {
    let current = time;
    const service = createAppsScriptCalendarService(config, {
      fetcher: vi
        .fn()
        .mockResolvedValueOnce(json(payload()))
        .mockRejectedValueOnce(new Error("PRIVATE_ERROR")),
      now: () => current,
    });
    const first = await service.getSchedule(week);
    current += FRESH_MS;
    const stale = await service.getSchedule(week);
    expect(stale.events).toEqual(first.events);
    expect(stale).toMatchObject({
      syncStatus: "stale",
      updatedAt: first.updatedAt,
    });
    expect(stale.mentors.every((mentor) => mentor.syncStatus === "stale")).toBe(
      true,
    );
  });
  it.each([
    {},
    { success: false, message: "Unauthorized" },
    { ...payload(), count: 99 },
    { ...payload(), timezone: "UTC" },
    { ...payload(), warnings: null },
    { ...payload(), schedules: null },
  ])("Respons tidak valid tetap error: %j", async (value) => {
    const result = await createAppsScriptCalendarService(config, {
      fetcher: vi.fn().mockResolvedValue(json(value)),
      now: () => time,
    }).getSchedule(week);
    expect(result.syncStatus).toBe("error");
    expect(result.events).toEqual([]);
  });
  it.each(["html", "invalid-json", "too-large", "timeout"])(
    "Menangani %s tanpa dianggap jadwal kosong",
    async (cause) => {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => {
        if (cause === "timeout") throw new Error("PRIVATE_TIMEOUT");
        return new Response(
          cause === "html"
            ? "Google login"
            : cause === "too-large"
              ? " ".repeat(1_048_577)
              : "{broken",
          {
            headers: {
              "Content-Type":
                cause === "html" ? "text/html" : "application/json",
            },
          },
        );
      });
      expect(
        (
          await createAppsScriptCalendarService(config, {
            fetcher,
          }).getSchedule(week)
        ).syncStatus,
      ).toBe("error");
    },
  );
  it("Redirect Google mengambil hasil tanpa mengirim ulang token", async () => {
    const destination =
      "https://script.googleusercontent.com/macros/echo?user_content_key=temporary";
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { Location: destination } }),
      )
      .mockResolvedValueOnce(json(payload()));
    const result = await createAppsScriptCalendarService(config, {
      fetcher,
    }).getSchedule(week);
    expect(result.events).toHaveLength(2);
    expect(fetcher.mock.calls[1]![1]).toMatchObject({ method: "GET" });
    expect(fetcher.mock.calls[1]![1]?.body).toBeUndefined();
    expect(JSON.stringify(fetcher.mock.calls[1])).not.toContain(config.secret);
  });
  it.each([
    "http://127.0.0.1/secret",
    "https://example.test/steal",
    "https://accounts.google.com/login",
  ])("Menolak redirect %s", async (destination) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { Location: destination } }),
      );
    expect(
      (
        await createAppsScriptCalendarService(config, { fetcher }).getSchedule(
          week,
        )
      ).syncStatus,
    ).toBe("error");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([307, 308])("Menolak redirect POST %s", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status,
        headers: {
          Location: "https://script.googleusercontent.com/macros/echo",
        },
      }),
    );
    expect(
      (
        await createAppsScriptCalendarService(config, { fetcher }).getSchedule(
          week,
        )
      ).syncStatus,
    ).toBe("error");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([
    "http://script.google.com/macros/s/ID/exec",
    "https://evil.test/exec",
    "https://script.google.com/macros/s/ID/exec?url=x",
    "https://script.google.com/macros/s/ID/dev",
  ])("Menolak URL konfigurasi %s", (url) => {
    expect(readAppsScriptConfig({ GOOGLE_APPS_SCRIPT_URL: url }).url).toBe("");
  });
  it("Tanpa token tidak memanggil provider atau beralih ke OAuth", async () => {
    const fetcher = vi.fn();
    const result = await createScheduleService(
      {
        GOOGLE_APPS_SCRIPT_URL: endpoint,
        GOOGLE_CLIENT_ID: "test",
        GOOGLE_CLIENT_SECRET: "test",
        GOOGLE_REFRESH_TOKEN: "test",
      },
      { fetcher },
    ).getSchedule(week);
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.syncStatus).toBe("unconfigured");
  });
});
