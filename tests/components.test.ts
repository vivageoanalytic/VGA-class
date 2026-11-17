// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ProgramPricing from "../src/components/pricing/ProgramPricing.vue";
import { validateSchedule } from "../src/services/publicSchedule";

describe("Interaksi tabel harga", () => {
  it("Pilihan rutin mengganti harga dan satuan, latihan tidak memiliki 90 menit", async () => {
    const wrapper = mount(ProgramPricing, {
      props: { courseId: "kalkulus-2" },
    });
    expect(wrapper.text()).toContain("Rp120.000");
    expect(wrapper.find(".package-picker-heading").text()).toContain(
      "Pilih paket belajar",
    );
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0]!.text()).toContain("Sedang ditampilkan");
    expect(tabs[1]!.text()).toContain("Lihat rincian");
    await tabs[1]!.trigger("click");
    expect(tabs[1]!.attributes("aria-selected")).toBe("true");
    expect(tabs[1]!.text()).toContain("Sedang ditampilkan");
    expect(tabs[0]!.text()).toContain("Lihat rincian");
    expect(wrapper.find("table").text()).toContain("Rp865.000");
    expect(wrapper.find('[role="tabpanel"]').text()).toContain("paket 8 sesi");
    await tabs[2]!.trigger("click");
    expect(wrapper.findAll("tbody tr")).toHaveLength(5);
    expect(wrapper.find("table").text()).not.toContain("90 menit");
    expect(wrapper.find("table").text()).toContain("Rp480.000");
    const contact = wrapper.find('a[href*="wa.me"]');
    expect(contact.attributes("href")).toMatch(
      /^https:\/\/wa\.me\/6285142296149\?/,
    );
    expect(contact.attributes("rel")).toBe("noopener noreferrer");
    wrapper.unmount();
  });
  it("Navigasi tab dengan keyboard mendukung arrow dan Home/End", async () => {
    const wrapper = mount(ProgramPricing, {
      props: { courseId: "kalkulus-1" },
    });
    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[0]!.trigger("keydown", { key: "ArrowRight" });
    expect(tabs[1]!.attributes("aria-selected")).toBe("true");
    await tabs[1]!.trigger("keydown", { key: "End" });
    expect(tabs[2]!.attributes("aria-selected")).toBe("true");
    await tabs[2]!.trigger("keydown", { key: "Home" });
    expect(tabs[0]!.attributes("aria-selected")).toBe("true");
    wrapper.unmount();
  });
});

describe("Validasi response publik", () => {
  const valid = {
    weekStart: "2026-11-09",
    timeZone: "Asia/Jakarta",
    demo: false,
    events: [],
    mentors: [
      {
        mentorId: "mentor-1",
        syncStatus: "success",
        updatedAt: "2026-11-14T05:00:00Z",
      },
    ],
  };
  it("Menolak status success tanpa timestamp dan minggu yang salah", () => {
    expect(() =>
      validateSchedule(
        { ...valid, mentors: [{ ...valid.mentors[0], updatedAt: null }] },
        valid.weekStart,
      ),
    ).toThrow();
    expect(() => validateSchedule(valid, "2026-11-16")).toThrow();
  });
  it("Tidak mengubah field tidak valid menjadi data live/demo", () => {
    expect(() =>
      validateSchedule({ ...valid, demo: true }, valid.weekStart),
    ).toThrow();
    expect(() =>
      validateSchedule(
        { ...valid, events: [{ mentorId: "mentor-1", start: "invalid" }] },
        valid.weekStart,
      ),
    ).toThrow();
  });
});
