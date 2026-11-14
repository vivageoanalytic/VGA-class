import { describe, expect, it } from "vitest";
import {
  startOfWeek,
  localDate,
  atWIB,
  validDate,
  addDays,
} from "../src/utils/dateTime";
import {
  canProposeSession,
  getFreeIntervals,
  layoutDayEvents,
} from "../src/utils/intervals";
import type { PublicEvent, MentorSync } from "../src/types/schedule";

const day = "2026-11-09";
const now = Date.parse("2026-11-09T08:00:00+07:00");
const sync: MentorSync = {
  mentorId: "mentor-1",
  syncStatus: "success",
  updatedAt: new Date(now).toISOString(),
};
function event(start: number, end: number, mentorId = "mentor-1"): PublicEvent {
  return {
    mentorId,
    mentorDisplayName: "Mentor Demo",
    start: atWIB(day, start),
    end: atWIB(day, end),
    publicLabel: "Sesi",
    availabilityStatus: "busy",
  };
}

describe("Tanggal WIB dan lintas batas", () => {
  it("Menggunakan WIB saat UTC masih tanggal sebelumnya", () =>
    expect(localDate("2026-12-31T18:00:00Z")).toBe("2027-01-01"));
  it("Senin lintas tahun dan bulan", () => {
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
  it("Menolak rollover dan tanggal palsu", () => {
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2026-13-01")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
  });
});

describe("Ketersediaan bergantung pada sumber valid", () => {
  it("Kalender kosong sukses menyediakan 07.00–21.00", () =>
    expect(getFreeIntervals([], day, sync, now)).toEqual([
      { start: 420, end: 1260 },
    ]));
  it("Gagal, tidak terhubung, stale, timestamp masa depan atau kadaluarsa tidak berarti bebas", () => {
    for (const status of ["error", "unconfigured", "stale"] as const)
      expect(
        getFreeIntervals([], day, { ...sync, syncStatus: status }, now),
      ).toBeNull();
    expect(getFreeIntervals([], day, undefined, now)).toBeNull();
    expect(getFreeIntervals([], day, sync, now + 300_000)).toBeNull();
    expect(getFreeIntervals([], day, sync, now - 1)).toBeNull();
  });
  it("Menggabungkan busy, memotong batas jam, akhir eksklusif", () => {
    const free = getFreeIntervals(
      [event(390, 480), event(540, 660), event(600, 720), event(1200, 1320)],
      day,
      sync,
      now,
    );
    expect(free).toEqual([
      { start: 480, end: 540 },
      { start: 720, end: 1200 },
    ]);
    expect(canProposeSession(free, 720, 120)).toBe(true);
  });
  it("Hanya kalender mentor terpilih yang mengurangi ketersediaan", () => {
    expect(
      getFreeIntervals([event(420, 1260, "mentor-2")], day, sync, now),
    ).toEqual([{ start: 420, end: 1260 }]);
  });
  it("Sesi tidak melampaui 21.00 dan tidak di luar operasional", () => {
    const free = [{ start: 420, end: 1260 }];
    expect(canProposeSession(free, 1170, 90)).toBe(true);
    expect(canProposeSession(free, 1171, 90)).toBe(false);
    expect(canProposeSession(free, 1140, 120)).toBe(true);
    expect(canProposeSession(free, 1141, 120)).toBe(false);
    expect(canProposeSession(free, 419, 90)).toBe(false);
    expect(canProposeSession(null, 420, 90)).toBe(false);
  });
});

describe("Layout kalender", () => {
  it("90/120 menit proporsional, overlap paralel, tanpa mengubah event asli", () => {
    const events = [
      event(390, 480),
      event(540, 630),
      event(570, 690, "mentor-2"),
      event(630, 750),
      event(1200, 1320),
    ];
    const layout = layoutDayEvents(events, day);
    expect(layout[0]).toMatchObject({ start: 420, end: 480 });
    expect(layout[1]!.end - layout[1]!.start).toBe(90);
    expect(layout[2]!.end - layout[2]!.start).toBe(120);
    expect(layout[1]!.columns).toBe(2);
    expect(layout[1]!.column).not.toBe(layout[2]!.column);
    expect(layout.at(-1)!.end).toBe(1260);
    expect(events[0]!.start).toBe(atWIB(day, 390));
  });
  it("Event yang berakhir tepat waktu mulai berikutnya berbagi kolom", () => {
    const layout = layoutDayEvents([event(540, 660), event(660, 780)], day);
    expect(layout.map((e) => e.columns)).toEqual([1, 1]);
  });
  it("Event lintas hari memblokir masing-masing hari", () => {
    const crossDay = { ...event(1200, 1260), end: atWIB(addDays(day, 1), 480) };
    expect(layoutDayEvents([crossDay], addDays(day, 1))[0]).toMatchObject({
      start: 420,
      end: 480,
    });
  });
});
