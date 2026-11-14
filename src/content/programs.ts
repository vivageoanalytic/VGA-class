import type { CourseId } from "./pricing";

export const programs: {
  id: CourseId;
  number: string;
  name: string;
  title: string;
  description: string;
  topics: string[];
  symbol: string;
}[] = [
  {
    id: "kalkulus-1",
    number: "01",
    name: "Kalkulus 1",
    title: "Fondasi kuat, langkah lebih jauh.",
    description:
      "Bangun pemahaman dari konsep dasar. Pelajari cara berpikir di balik rumus, lalu terapkan pada soal.",
    topics: ["Fungsi & limit", "Turunan", "Aplikasi turunan", "Integral dasar"],
    symbol: "ƒ′(x)",
  },
  {
    id: "kalkulus-2",
    number: "02",
    name: "Kalkulus 2",
    title: "Lanjutkan rasa ingin tahumu.",
    description:
      "Hubungkan konsep dan perdalam strategi penyelesaian. Materi dan latihan disesuaikan dengan kebutuhan belajarmu.",
    topics: [
      "Teknik integrasi",
      "Aplikasi integral",
      "Barisan & deret",
      "Koordinat polar",
    ],
    symbol: "∫ f(x)",
  },
];
