import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(
  new URL(
    "../integrations/google-apps-script/CalendarNotifications.gs",
    import.meta.url,
  ),
  "utf8",
);
const secret = "TEST_ONLY_NOTIFICATION_SECRET_123456";
function harness() {
  const values = new Map<string, string>([
    ["VGA_WEBHOOK_URL", "https://example.test/api/calendar-changed"],
    ["VGA_WEBHOOK_SECRET", secret],
  ]);
  const triggers: {
    getHandlerFunction(): string;
    getTriggerSourceId(): string;
  }[] = [];
  const fetcher = vi.fn<
    () => { getResponseCode(): number; getContentText(): string }
  >(() => ({
    getResponseCode: () => 202,
    getContentText: () => '{"success":true}',
  }));
  const context = createContext({
    CONFIG: { CALENDAR_IDS: ["private-1", "private-2"] },
    console: { log: vi.fn(), warn: vi.fn() },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) => values.get(key) ?? null,
        setProperty: (key: string, value: string) => values.set(key, value),
        deleteProperty: (key: string) => values.delete(key),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Utilities: { getUuid: randomUUID },
    UrlFetchApp: { fetch: fetcher },
    ScriptApp: {
      getProjectTriggers: () => triggers,
      newTrigger: (handler: string) => {
        let id = "";
        const builder = {
          forUserCalendar(value: string) {
            id = value;
            return builder;
          },
          onEventUpdated() {
            return builder;
          },
          timeBased() {
            return builder;
          },
          everyMinutes() {
            return builder;
          },
          create() {
            triggers.push({
              getHandlerFunction: () => handler,
              getTriggerSourceId: () => id,
            });
          },
        };
        return builder;
      },
    },
  });
  runInContext(source, context);
  return {
    values,
    triggers,
    fetcher,
    run: (code: string) => runInContext(code, context),
  };
}

describe("Trigger tambahan Apps Script", () => {
  it("Memasang satu trigger per kalender dan satu retry, tanpa duplikat", () => {
    const script = harness();
    expect(script.run("installVgaCalendarNotifications()")).toMatchObject({
      calendarTriggersAdded: 2,
      testDelivered: true,
    });
    expect(script.run("installVgaCalendarNotifications()")).toMatchObject({
      calendarTriggersAdded: 0,
      testDelivered: true,
    });
    expect(script.triggers).toHaveLength(3);
  });
  it("Notifikasi hanya mengirim changeId dan bearer; tidak mengirim detail acara", () => {
    const script = harness();
    expect(script.run("onVgaCalendarChanged()")).toBe(true);
    const [url, options] = script.fetcher.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(url).toBe("https://example.test/api/calendar-changed");
    expect(Object.keys(JSON.parse(options.payload as string))).toEqual([
      "changeId",
    ]);
    expect(options.headers).toEqual({ Authorization: "Bearer " + secret });
    expect(options.followRedirects).toBe(false);
    expect(script.values.has("VGA_PENDING_CHANGE")).toBe(false);
  });
  it("Tidak membuat request saat tidak ada perubahan; kegagalan dicoba kembali", () => {
    const script = harness();
    expect(script.run("retryVgaCalendarNotification()")).toBe(true);
    expect(script.fetcher).not.toHaveBeenCalled();
    script.fetcher.mockReturnValueOnce({
      getResponseCode: () => 503,
      getContentText: () => "failed",
    });
    expect(script.run("onVgaCalendarChanged()")).toBe(false);
    expect(script.values.has("VGA_PENDING_CHANGE")).toBe(true);
    expect(script.run("retryVgaCalendarNotification()")).toBe(true);
    expect(script.values.has("VGA_PENDING_CHANGE")).toBe(false);
  });
  it("URL callback localhost tidak mengirim token", () => {
    const script = harness();
    script.values.set(
      "VGA_WEBHOOK_URL",
      "http://localhost:5173/api/calendar-changed",
    );
    expect(script.run("onVgaCalendarChanged()")).toBe(false);
    expect(script.fetcher).not.toHaveBeenCalled();
  });
});
