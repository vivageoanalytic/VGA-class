import { describe, expect, it, vi } from "vitest";
import { setupCalendar } from "../scripts/setup-cloudflare-calendar";

const env = {
  GOOGLE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/SETUP_TEST/exec",
  API_SECRET: "TEST_ONLY_API_SECRET",
  CALENDAR_WEBHOOK_SECRET: "TEST_ONLY_WEBHOOK_SECRET_0123456789",
};
describe("Penyiapan Cloudflare yang dijalankan pemilik", () => {
  it("Memasang Worker terlebih dahulu; secret hanya lewat stdin, bukan argumen shell", () => {
    const run = vi.fn();
    setupCalendar(env, run);
    expect(run.mock.calls[0]![0].slice(0, 2)).toEqual(["deploy", "--config"]);
    expect(run.mock.calls[1]![0].slice(0, 3)).toEqual([
      "secret",
      "bulk",
      "--config",
    ]);
    expect(JSON.parse(run.mock.calls[1]![1])).toEqual(env);
    expect(JSON.stringify(run.mock.calls.map((call) => call[0]))).not.toContain(
      env.API_SECRET,
    );
    expect(JSON.stringify(run.mock.calls.map((call) => call[0]))).not.toContain(
      env.CALENDAR_WEBHOOK_SECRET,
    );
  });
  it("Konfigurasi kosong atau tujuan selain Google ditolak sebelum operasi Cloudflare", () => {
    const run = vi.fn();
    expect(() => setupCalendar({}, run)).toThrow("API_SECRET");
    expect(() =>
      setupCalendar(
        { ...env, GOOGLE_APPS_SCRIPT_URL: "https://example.test/exec" },
        run,
      ),
    ).toThrow("URL deployment HTTPS Google");
    expect(() =>
      setupCalendar({ ...env, CALENDAR_WEBHOOK_SECRET: "short" }, run),
    ).toThrow("32 sampai 512");
    expect(run).not.toHaveBeenCalled();
  });
});
