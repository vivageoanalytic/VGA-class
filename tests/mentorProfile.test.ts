// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { mentors, type Mentor } from "../src/content/mentors";
import { getPublicCvUrl } from "../src/utils/mentorProfile";
import MentorProfileDialog from "../src/components/mentors/MentorProfileDialog.vue";

const approved: Mentor = {
  ...mentors[0]!,
  demo: false,
  publicationApproved: true,
  cvPublicationApproved: true,
  cvUrl: "https://example.com/cv.pdf",
  fullName: "Nama pengujian",
  education: [
    { institution: "Institusi pengujian", program: "Program pengujian" },
  ],
  competencies: ["Kalkulus 1"],
  experience: "Pengalaman pengujian",
};
const global = { stubs: { RouterLink: { template: "<a><slot /></a>" } } };

describe("CV hanya tautan yang diizinkan dan disetujui", () => {
  it("Demo atau izin CV belum ada tidak menerbitkan link", () => {
    expect(getPublicCvUrl({ ...approved, demo: true })).toBeNull();
    expect(
      getPublicCvUrl({ ...approved, publicationApproved: false }),
    ).toBeNull();
    expect(
      getPublicCvUrl({ ...approved, cvPublicationApproved: false }),
    ).toBeNull();
    expect(getPublicCvUrl({ ...approved, cvUrl: null })).toBeNull();
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "//evil.example/cv.pdf",
    "/cv/../../private.pdf",
    "/other/test.pdf",
    "http://example.com/cv.pdf",
    "https://user:password@example.com/cv.pdf",
  ])("Menolak URL berbahaya: %s", (cvUrl) =>
    expect(getPublicCvUrl({ ...approved, cvUrl })).toBeNull(),
  );
  it("Mengizinkan HTTPS dan PDF lokal yang aman", () => {
    expect(getPublicCvUrl(approved)).toBe("https://example.com/cv.pdf");
    expect(getPublicCvUrl({ ...approved, cvUrl: "/cv/mentor-01.pdf" })).toBe(
      "/cv/mentor-01.pdf",
    );
  });
});

describe("Biodata mentor, izin publikasi dan escaping", () => {
  it("Menampilkan biodata lengkap dan CV resmi yang disetujui", () => {
    const wrapper = mount(MentorProfileDialog, {
      props: { mentor: approved },
      global,
    });
    for (const text of [
      "Nama pengujian",
      "Institusi pengujian",
      "Program pengujian",
      "Pengalaman pengujian",
    ])
      expect(wrapper.text()).toContain(text);
    const cv = wrapper.find('a[href="https://example.com/cv.pdf"]');
    expect(cv.attributes("rel")).toBe("noopener noreferrer");
    expect(cv.attributes("target")).toBe("_blank");
    expect(wrapper.text()).not.toContain("Pendekatan belajar");
    expect(wrapper.text()).not.toContain("Bahasa pengantar");
    wrapper.unmount();
  });
  it("Profil demo tidak mengarang atau menampilkan metadata yang belum disetujui", () => {
    const wrapper = mount(MentorProfileDialog, {
      props: {
        mentor: { ...approved, demo: true, publicationApproved: false },
      },
      global,
    });
    expect(wrapper.text()).not.toContain("Institusi pengujian");
    expect(wrapper.text()).toContain("CV belum tersedia");
    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false);
    wrapper.unmount();
  });
  it("HTML dalam profil tetap teks, tanpa eksekusi atau markup injeksi", () => {
    const payload = '<img src=x onerror="alert(1)">';
    const wrapper = mount(MentorProfileDialog, {
      props: {
        mentor: {
          ...approved,
          fullName: payload,
          experience: "<script>alert(1)</script>",
        },
      },
      global,
    });
    expect(wrapper.find("h2").text()).toBe(payload);
    expect(wrapper.find("h2 img").exists()).toBe(false);
    expect(wrapper.find("script").exists()).toBe(false);
    wrapper.unmount();
  });
});
