const number = (import.meta.env.VITE_WHATSAPP_NUMBER ?? "").trim();
const validNumber = /^62\d{8,13}$/.test(number);
const siteUrl = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, "");
const demo =
  import.meta.env.VITE_SCHEDULE_DEMO === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_SCHEDULE_DEMO !== "false");

export const brand = {
  name: "VGA Class",
  tagline: "Pahami konsep. Taklukkan kalkulus.",
  whatsappNumber: validNumber ? number : "",
  whatsappUrl: validNumber
    ? `https://wa.me/${number}?text=${encodeURIComponent("Halo VGA Class, saya ingin bertanya tentang les Kalkulus.")}`
    : null,
  siteUrl,
  demo,
  indexable:
    /^https:\/\/[^/<>"\s]+$/.test(siteUrl) &&
    !demo &&
    import.meta.env.VITE_SCHEDULE_DEMO === "false" &&
    import.meta.env.VITE_SITE_INDEXABLE === "true",
};

export const navigation = [
  { to: "/", label: "Home" },
  { to: "/programs", label: "Programs & Pricing" },
  { to: "/mentors", label: "Mentors" },
  { to: "/schedule", label: "Schedule" },
  { to: "/gallery", label: "Gallery" },
];
