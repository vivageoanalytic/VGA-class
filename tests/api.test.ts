import { describe, expect, it, vi } from "vitest";
import {
  createCalendarService,
  readCalendarConfig,
  sanitizeGoogleEvent,
  type CalendarConfig,
} from "../api/googleCalendar";
import {
  createPublicScheduleHandler,
  createRateLimiter,
} from "../api/publicSchedule";
import { atWIB } from "../src/utils/dateTime";

const week = "2026-11-09";
const now = Date.parse("2026-11-14T12:00:00+07:00");
const config: CalendarConfig = {
  clientId: "test-client",
  clientSecret: "test-secret",
  refreshToken: "test-refresh",
  calendars: {
    "mentor-1": "private-calendar-1",
    "mentor-2": "private-calendar-2",
  },
};
const raw = {
  id: "private-event-id",
  status: "confirmed",
  summary: "NAMA MURID 08123456789",
  description: "student@example.test",
  location: "Alamat privat",
  attendees: [{ email: "private@example.test" }],
  hangoutLink: "https://meet.google.com/private",
  start: { dateTime: "2026-11-09T09:00:00+07:00" },
  end: { dateTime: "2026-11-09T11:00:00+07:00" },
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const oauth = () =>
  json({
    access_token: "private-access-token",
    expires_in: 3600,
    scope: "https://www.googleapis.com/auth/calendar.events.readonly",
  });
const eventList = (items: unknown[] = [], nextPageToken?: string) =>
  json({
    kind: "calendar#events",
    items,
    ...(nextPageToken ? { nextPageToken } : {}),
  });

describe("Sanitasi event Google", () => {
  it("Tidak pernah mengeluarkan data sensitif atau judul mentah", () => {
    const safe = sanitizeGoogleEvent(raw, "mentor-1", week);
    expect(Object.keys(safe!).sort()).toEqual(
      [
        "availabilityStatus",
        "end",
        "mentorDisplayName",
        "mentorId",
        "publicLabel",
        "start",
      ].sort(),
    );
    expect(safe?.publicLabel).toBe("Sedang tidak tersedia");
    expect(JSON.stringify(safe)).not.toMatch(
      /private|MURID|081234|example|Alamat|meet\.google/,
    );
  });
  it("Metadata harus disetujui dan masuk whitelist", () => {
    expect(
      sanitizeGoogleEvent(
        {
          ...raw,
          extendedProperties: {
            shared: {
              vgaPublic: "true",
              vgaKind: "session",
              vgaCourse: "kalkulus-2",
              vgaMode: "online",
            },
          },
        },
        "mentor-1",
        week,
      ),
    ).toMatchObject({
      publicLabel: "Sesi",
      course: "Kalkulus 2",
      mode: "Online",
    });
    expect(
      sanitizeGoogleEvent(
        {
          ...raw,
          extendedProperties: {
            shared: {
              vgaPublic: "true",
              vgaKind: "session",
              vgaCourse: "student@example.test",
              vgaMode: "Alamat privat",
            },
          },
        },
        "mentor-1",
        week,
      ),
    ).not.toHaveProperty("course");
    expect(
      sanitizeGoogleEvent(
        { ...raw, extendedProperties: { shared: { vgaCourse: "kalkulus-2" } } },
        "mentor-1",
        week,
      ),
    ).not.toHaveProperty("course");
  });
  it("Canceled dan transparent tidak memblokir", () => {
    expect(
      sanitizeGoogleEvent({ ...raw, status: "cancelled" }, "mentor-1", week),
    ).toBeNull();
    expect(
      sanitizeGoogleEvent(
        { ...raw, transparency: "transparent" },
        "mentor-1",
        week,
      ),
    ).toBeNull();
  });
  it("Event all-day memakai batas WIB eksklusif", () => {
    expect(
      sanitizeGoogleEvent(
        { ...raw, start: { date: "2026-11-09" }, end: { date: "2026-11-10" } },
        "mentor-1",
        week,
      ),
    ).toMatchObject({ start: atWIB(week), end: atWIB("2026-11-10") });
  });
  it("Menjaga waktu asli lintas batas 07.00–21.00", () => {
    expect(
      sanitizeGoogleEvent(
        {
          ...raw,
          start: { dateTime: "2026-11-09T06:30:00+07:00" },
          end: { dateTime: "2026-11-09T08:00:00+07:00" },
        },
        "mentor-1",
        week,
      )?.start,
    ).toBe("2026-11-08T23:30:00.000Z");
  });
  it("Menolak timestamp rusak agar event busy tidak diam-diam hilang", () => {
    expect(() =>
      sanitizeGoogleEvent({ ...raw, start: {} }, "mentor-1", week),
    ).toThrow();
    expect(() =>
      sanitizeGoogleEvent(
        { ...raw, end: { dateTime: raw.start.dateTime } },
        "mentor-1",
        week,
      ),
    ).toThrow();
    expect(() =>
      sanitizeGoogleEvent(
        { ...raw, start: { date: "2026-02-30" } },
        "mentor-1",
        week,
      ),
    ).toThrow();
    expect(() =>
      sanitizeGoogleEvent(
        { ...raw, start: { dateTime: "2026-11-09T09:00:00" } },
        "mentor-1",
        week,
      ),
    ).toThrow();
  });
  it("Akhir tepat Senin 00.00 dan mulai Senin berikutnya tidak masuk minggu", () => {
    expect(
      sanitizeGoogleEvent(
        {
          ...raw,
          start: { dateTime: atWIB("2026-11-08") },
          end: { dateTime: atWIB(week) },
        },
        "mentor-1",
        week,
      ),
    ).toBeNull();
    expect(
      sanitizeGoogleEvent(
        {
          ...raw,
          start: { dateTime: atWIB("2026-11-16") },
          end: { dateTime: atWIB("2026-11-17") },
        },
        "mentor-1",
        week,
      ),
    ).toBeNull();
  });
});

describe("Agregasi read-only, cache dan kegagalan per mentor", () => {
  it("Tanpa secrets tidak memanggil Google dan tidak menganggap free", async () => {
    const fetcher = vi.fn();
    const result = await createCalendarService(readCalendarConfig({}), {
      fetcher,
    }).getSchedule(week);
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.mentors).toHaveLength(5);
    expect(result.mentors.every((m) => m.syncStatus === "unconfigured")).toBe(
      true,
    );
  });
  it("Menolak mapping kalender duplikat dan config invalid", () => {
    expect(
      readCalendarConfig({ GOOGLE_MENTOR_CALENDARS: "{broken" }).calendars,
    ).toEqual({});
    expect(
      readCalendarConfig({
        GOOGLE_MENTOR_CALENDARS: JSON.stringify({
          "mentor-1": "same",
          "mentor-2": "same",
        }),
      }).calendars,
    ).toEqual({});
  });
  it("Meminta recurring instances dan semua halaman, menghapus canceled/duplicate, mengizinkan overlap", async () => {
    const second = {
      ...raw,
      id: "other-private-id",
      start: { dateTime: "2026-11-09T10:00:00+07:00" },
      end: { dateTime: "2026-11-09T11:30:00+07:00" },
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(oauth())
      .mockResolvedValueOnce(eventList([raw], "next"))
      .mockResolvedValueOnce(
        eventList([raw, second, { id: "cancelled", status: "cancelled" }]),
      );
    const result = await createCalendarService(config, {
      fetcher,
      now: () => now,
    }).getSchedule(week, "mentor-1");
    expect(result.events).toHaveLength(2);
    expect(result.mentors[0]?.syncStatus).toBe("success");
    expect(String(fetcher.mock.calls[1]![0])).toContain("singleEvents=true");
    expect(String(fetcher.mock.calls[1]![0])).toContain(
      "timeZone=Asia%2FJakarta",
    );
    expect(String(fetcher.mock.calls[2]![0])).toContain("pageToken=next");
    expect(fetcher.mock.calls[1]![1]?.method).toBeUndefined(); // GET, never an events mutation.
    expect(JSON.stringify(result)).not.toMatch(
      /private|MURID|test-secret|test-refresh/,
    );
  });
  it("Kalender kosong tervalidasi benar-benar sukses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(oauth())
      .mockResolvedValueOnce(json({ kind: "calendar#events" }));
    const result = await createCalendarService(config, {
      fetcher,
      now: () => now,
    }).getSchedule(week, "mentor-1");
    expect(result.events).toEqual([]);
    expect(result.mentors[0]?.syncStatus).toBe("success");
  });
  it("Mentor gagal tidak merusak mentor sukses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      if (String(url).includes("oauth2")) return oauth();
      return String(url).includes("private-calendar-1")
        ? eventList([raw])
        : json({ error: "private provider error" }, 403);
    });
    const result = await createCalendarService(config, {
      fetcher,
      now: () => now,
    }).getSchedule(week);
    expect(result.mentors.map((m) => m.syncStatus)).toEqual([
      "success",
      "error",
      "unconfigured",
      "unconfigured",
      "unconfigured",
    ]);
    expect(result.events).toHaveLength(1);
    expect(
      fetcher.mock.calls.filter(([url]) => String(url).includes("oauth2")),
    ).toHaveLength(1);
  });
  it("Cache 5 menit, lalu gagal refresh menghasilkan stale bukan success", async () => {
    let time = now;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(oauth())
      .mockResolvedValueOnce(eventList([raw]))
      .mockResolvedValueOnce(json({}, 500));
    const service = createCalendarService(config, { fetcher, now: () => time });
    const first = await service.getSchedule(week, "mentor-1");
    await service.getSchedule(week, "mentor-1");
    expect(fetcher).toHaveBeenCalledTimes(2);
    time += 300_000;
    const stale = await service.getSchedule(week, "mentor-1");
    expect(stale.events).toEqual(first.events);
    expect(stale.mentors[0]).toMatchObject({
      syncStatus: "stale",
      updatedAt: new Date(now).toISOString(),
    });
  });
  it("Request bersamaan berbagi fetch yang sama", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (url) =>
        String(url).includes("oauth2") ? oauth() : eventList([raw]),
      );
    const service = createCalendarService(config, { fetcher, now: () => now });
    await Promise.all([
      service.getSchedule(week, "mentor-1"),
      service.getSchedule(week, "mentor-1"),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    "revoked",
    "timeout",
    "malformed",
    "writable-scope",
    "bad-event",
    "pagination-loop",
  ])(
    "%s tidak dipublikasikan sebagai kalender kosong sukses",
    async (cause) => {
      const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => {
        if (cause === "timeout")
          throw new DOMException("Secret private error", "TimeoutError");
        if (String(url).includes("oauth2")) {
          if (cause === "revoked")
            return json(
              { error: "invalid_grant", error_description: "secret" },
              400,
            );
          if (cause === "writable-scope")
            return json({
              access_token: "secret",
              expires_in: 3600,
              scope: "https://www.googleapis.com/auth/calendar.events",
            });
          return oauth();
        }
        if (cause === "malformed") return json({});
        if (cause === "bad-event") return eventList([{ ...raw, start: {} }]);
        return eventList([raw], "same-next-page");
      });
      const result = await createCalendarService(config, {
        fetcher,
        now: () => now,
      }).getSchedule(week, "mentor-1");
      expect(result.mentors[0]?.syncStatus).toBe("error");
      expect(result.events).toEqual([]);
      expect(JSON.stringify(result)).not.toMatch(
        /secret|private|invalid_grant/,
      );
    },
  );
});

describe("Kontrak API publik", () => {
  const service = createCalendarService(readCalendarConfig({}));
  function handler() {
    return createPublicScheduleHandler(service, { now: () => now });
  }
  const request = (query: string, method = "GET") =>
    new Request(`http://localhost/api/public-schedule?${query}`, { method });
  it("Normalisasi ke Senin WIB dan filter per mentor", async () => {
    const response = await handler()(
      request("weekStart=2026-11-14&mentorId=mentor-1"),
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.weekStart).toBe(week);
    expect(data.mentors).toHaveLength(1);
  });
  it.each([
    "weekStart=2026-02-30",
    "weekStart=2030-01-01",
    "weekStart=2026-11-09&mentorId=secret",
    "weekStart=2026-11-09&weekStart=2026-11-16",
    "weekStart=2026-11-09&token=secret",
    "weekStart=<script>",
    "",
  ])("Menolak parameter: %s", async (query) =>
    expect((await handler()(request(query))).status).toBe(400),
  );
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "Tidak menyediakan write: %s",
    async (method) => {
      const response = await handler()(request(`weekStart=${week}`, method));
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET");
    },
  );
  it("Rate limiting tidak memanggil provider ketika limit tercapai", async () => {
    const limited = createPublicScheduleHandler(service, {
      now: () => now,
      limiter: () => false,
    });
    const response = await limited(request(`weekStart=${week}`));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });
  it("Limiter reset setelah window berlalu", () => {
    let time = now;
    const limiter = createRateLimiter(2, 60_000, () => time);
    expect(limiter("a")).toBe(true);
    expect(limiter("a")).toBe(true);
    expect(limiter("a")).toBe(false);
    expect(limiter("b")).toBe(true);
    time += 60_000;
    expect(limiter("a")).toBe(true);
  });
});
