import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getSingleSessionPrice,
  getRoutinePrice,
  getPracticePrice,
  getNonITSPrice,
  roundTo5000HalfUp,
} from "../src/utils/pricing";
import type { CourseId, Duration, StudyMode } from "../src/content/pricing";

const prd = readFileSync(new URL("../PRD.md", import.meta.url), "utf8");
const columns: [StudyMode, Duration][] = [
  ["offline", 90],
  ["offline", 120],
  ["online", 90],
  ["online", 120],
];
const toNumber = (cell: string) =>
  cell.includes("—") ? null : Number(cell.replace(/[^0-9]/g, ""));

describe("Seluruh golden table dari PRD (122 sel termasuk unavailable)", () => {
  for (const [course, title] of [
    ["kalkulus-1", "Kalkulus 1"],
    ["kalkulus-2", "Kalkulus 2"],
  ] as const) {
    for (const [name, engine] of [
      ["Satuan", getSingleSessionPrice],
      ["Rutin", getRoutinePrice],
    ] as const) {
      const block = prd
        .split(`#### ${title} — Paket ${name}`)[1]!
        .split("####")[0]!;
      const rows = block
        .split("\n")
        .filter((line) => /^\| [1-7] \|/.test(line));
      it(`${title} ${name} memiliki tujuh baris acuan`, () =>
        expect(rows).toHaveLength(7));
      rows.forEach((line, index) => {
        const cells = line.split("|").slice(2, 6).map(toNumber);
        columns.forEach(([mode, duration], column) => {
          it(`${course}, ${name}, ${index + 1} orang, ${mode}, ${duration} menit`, () => {
            expect(engine(course, mode, duration, index + 1)).toBe(
              cells[column],
            );
          });
        });
      });
    }
  }
  const practice = prd
    .split("#### Paket Latihan Soal Mandiri")[1]!
    .split("**Catatan")[0]!
    .split("\n")
    .filter((line) => /^\| [1-5] \|/.test(line));
  it("Latihan memiliki lima baris acuan", () =>
    expect(practice).toHaveLength(5));
  practice.forEach((line, index) => {
    const cells = line.split("|").slice(2, 4).map(toNumber);
    (["kalkulus-1", "kalkulus-2"] as CourseId[]).forEach((course, column) => {
      it(`Latihan ${course}, ${index + 1} orang`, () =>
        expect(getPracticePrice(course, index + 1)).toBe(cells[column]));
    });
  });
});

describe("Pembulatan dan kombinasi invalid", () => {
  it("Non-ITS Rp75.000 menjadi Rp85.000", () =>
    expect(getNonITSPrice(75_000)).toBe(85_000));
  it("Titik tengah selalu half-up termasuk rasio pecahan", () => {
    expect(roundTo5000HalfUp(82_500)).toBe(85_000);
    expect(roundTo5000HalfUp(164_999, 2)).toBe(80_000);
    expect(roundTo5000HalfUp(165_000, 2)).toBe(85_000);
  });
  it("Menolak parameter jumlah dan durasi yang tidak didukung", () => {
    for (const count of [0, -1, 1.5, 8, NaN, Infinity]) {
      expect(
        getSingleSessionPrice("kalkulus-1", "online", 120, count),
      ).toBeNull();
      expect(getRoutinePrice("kalkulus-2", "offline", 90, count)).toBeNull();
      expect(getPracticePrice("kalkulus-1", count)).toBeNull();
    }
    expect(getPracticePrice("kalkulus-1", 6)).toBeNull();
    expect(
      getSingleSessionPrice("kalkulus-1", "offline", 60 as Duration, 1),
    ).toBeNull();
  });
  it("Tidak menerima rasio harga invalid", () => {
    expect(() => roundTo5000HalfUp(-1)).toThrow();
    expect(() => roundTo5000HalfUp(100, 0)).toThrow();
  });
});
