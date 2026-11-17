const number = (import.meta.env.VITE_WHATSAPP_NUMBER ?? "6285142296149").trim();
const validNumber = /^62\d{8,13}$/.test(number);
const siteUrl = safeSiteOrigin(import.meta.env.VITE_SITE_URL);
const demo =
  import.meta.env.VITE_SCHEDULE_DEMO === "true" ||
  (import.meta.env.DEV && import.meta.env.VITE_SCHEDULE_DEMO !== "false");

export const brand = {
  name: "VGA Class",
  logo: {
    src: "/logo/vga-class-web.webp",
    fallback: "/logo/vga-class-web.png",
    width: 320,
    height: 265,
    alt: "Logo VGA Class",
  },
  tagline: "Pahami konsep. Taklukkan kalkulus.",
  whatsappNumber: validNumber ? number : "",
  whatsappDisplay: validNumber
    ? `0${number.slice(2)}`.replace(/^(\d{4})(\d{4})(\d+)$/, "$1 $2 $3")
    : "",
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
import { safeSiteOrigin } from "../utils/urls";
