import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { createAppsScriptCalendarService } from "../api/appsScriptCalendar";
import { createPublicScheduleHandler } from "../api/publicSchedule";
import { validateSchedule } from "../src/services/publicSchedule";
import { addDays, atWIB, localDate, startOfWeek } from "../src/utils/dateTime";

const source = readFileSync(
  new URL("../integrations/google-apps-script/Code.gs", import.meta.url),
  "utf8",
);
const week = startOfWeek(localDate()),
  secret = "TEST_ONLY_API_SECRET";
function event(
  start = atWIB(week, 540),
  end = atWIB(week, 600),
  allDay = false,
) {
  return {
    getStartTime: () => new Date(start),
    getEndTime: () => new Date(end),
    isAllDayEvent: () => allDay,
    getTitle: vi.fn(() => {
      throw new Error("PRIVATE_TITLE must not be read");
    }),
    getDescription: vi.fn(() => {
      throw new Error("PRIVATE_DESCRIPTION must not be read");
    }),
  };
}
function harness(
  options: {
    events?: ReturnType<typeof event>[];
    failure?: boolean;
    savedSecret?: string;
  } = {},
) {
  const getEvents = vi.fn(() => options.events ?? []);
  const calendar = {
    getCalendarById: vi.fn((id: string) => {
      if (id === "private-2" && options.failure)
        throw new Error("PRIVATE_PROVIDER_ERROR");
      return {
        getName: () => (id === "private-1" ? "VGA Tutor" : "VGA Tutor Zaky"),
        getEvents,
      };
    }),
  };
  const context = createContext({
    Date,
    CalendarApp: calendar,
    console: { warn: vi.fn() },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: () => options.savedSecret ?? secret,
      }),
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text: string) => ({ setMimeType: () => text }),
    },
  });
  runInContext(source, context);
  runInContext('CONFIG.CALENDAR_IDS = ["private-1", "private-2"]', context);
  return {
    calendar,
    getEvents,
    post(
      body: unknown = {
        token: secret,
        start: atWIB(week),
        end: atWIB(addDays(week, 7)),
      },
    ) {
      context.request =
        body === null ? null : { postData: { contents: JSON.stringify(body) } };
      return JSON.parse(runInContext("doPost(request)", context));
    },
  };
}

describe("Script dengan kontrak JSON asli pengguna", () => {
  it("Menghasilkan hanya success/timezone/count/schedules/warnings", () => {
    const raw = event();
    const script = harness({ events: [raw] });
    const data = script.post();
    expect(Object.keys(data).sort()).toEqual([
      "count",
      "schedules",
      "success",
      "timezone",
      "warnings",
    ]);
    expect(Object.keys(data.schedules[0]).sort()).toEqual([
      "allDay",
      "end",
      "mentor",
      "start",
      "title",
    ]);
    expect(data).toMatchObject({
      success: true,
      timezone: "Asia/Jakarta",
      count: 2,
      warnings: [],
    });
    expect(data.schedules[0]).toMatchObject({
      mentor: "VGA Tutor",
      title: "Sesi belajar",
      allDay: false,
    });
    expect(raw.getTitle).not.toHaveBeenCalled();
    expect(raw.getDescription).not.toHaveBeenCalled();
    expect(JSON.stringify(data)).not.toMatch(/private-|PRIVATE_/);
  });
  it("JSON asli dapat diproses sampai API website dan validator browser", async () => {
    const script = harness({ events: [event()] });
    const service = createAppsScriptCalendarService(
      { url: "https://script.google.com/macros/s/TEST/exec", secret },
      {
        fetcher: vi.fn().mockImplementation(
          async () =>
            new Response(JSON.stringify(script.post()), {
              headers: { "Content-Type": "application/json" },
            }),
        ),
      },
    );
    const response = await createPublicScheduleHandler(service)(
      new Request(
        `http://localhost/api/public-schedule?weekStart=${week}&mentorId=all`,
      ),
    );
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.events).toHaveLength(2);
    expect(
      validateSchedule(data, week).events.map((item) => item.mentorDisplayName),
    ).toEqual(["VGA Tutor", "VGA Tutor Zaky"]);
  });
  it("Kalender gagal menjadi warning dan jadwal kalender lain tetap dikirim", () => {
    const script = harness({ events: [event()], failure: true });
    const data = script.post();
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
    expect(data.warnings).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain("PRIVATE_PROVIDER_ERROR");
  });
  it("Mempertahankan allDay dan urutan jadwal berdasarkan waktu", () => {
    const script = harness({
      events: [
        event(atWIB(week, 900), atWIB(week, 960)),
        event(atWIB(week), atWIB(addDays(week, 1)), true),
      ],
    });
    const data = script.post();
    expect(data.schedules[0]).toMatchObject({
      start: atWIB(week),
      end: atWIB(addDays(week, 1)),
      allDay: true,
    });
    expect(
      data.schedules.every(
        (item: { start: string }, index: number) =>
          index === 0 ||
          Date.parse(item.start) >= Date.parse(data.schedules[index - 1].start),
      ),
    ).toBe(true);
  });
  it.each([
    null,
    {},
    { token: "wrong", start: atWIB(week), end: atWIB(addDays(week, 7)) },
  ])("Body/token salah tidak membaca kalender: %j", (body) => {
    const script = harness();
    expect(script.post(body).success).toBe(false);
    expect(script.calendar.getCalendarById).not.toHaveBeenCalled();
  });
  it("Secret Google kosong menolak request", () => {
    const script = harness({ savedSecret: "" });
    expect(script.post().message).toBe("Unauthorized");
    expect(script.calendar.getCalendarById).not.toHaveBeenCalled();
  });
  it.each([
    { start: "invalid", end: atWIB(week) },
    { start: atWIB(week), end: atWIB(week) },
    { start: atWIB(week), end: atWIB(addDays(week, 32)) },
  ])("Menolak tanggal/rentang salah: %j", (range) => {
    const script = harness();
    expect(script.post({ ...range, token: secret }).success).toBe(false);
    expect(script.calendar.getCalendarById).not.toHaveBeenCalled();
  });
});
