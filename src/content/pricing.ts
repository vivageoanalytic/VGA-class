export type CourseId = "kalkulus-1" | "kalkulus-2";
export type StudyMode = "offline" | "online";
export type Duration = 90 | 120;
export type PackageId = "single" | "routine" | "practice";

export const pricing = {
  hourlyRates: { "kalkulus-1": 50_000, "kalkulus-2": 60_000 },
  onlinePercent: 85,
  groupDiscounts: [0, 20, 25, 35, 45, 50, 60],
  routineSessions: 8,
  routinePercent: 90,
  practiceHours: 8,
  nonITSPercent: 110,
  capacities: {
    single: { offline: 6, online: 7 },
    routine: { offline: 5, online: 7 },
    practice: { offline: 5, online: 0 },
  },
} as const;

export const packages = [
  {
    id: "single",
    name: "Paket Satuan",
    unit: "per mahasiswa / per sesi",
    detail: "90 atau 120 menit · online / offline",
    notes: [
      "Materi atau latihan sesuai kebutuhanmu.",
      "Jumlah pertemuan fleksibel.",
      "Konsultasi sampai 24 jam setelah sesi.",
      "Akses file latihan dan pembahasan.",
    ],
  },
  {
    id: "routine",
    name: "Paket Rutin",
    unit: "per mahasiswa / paket 8 sesi",
    detail: "8 × 90 atau 120 menit · online / offline",
    notes: [
      "Penjelasan materi dan latihan soal.",
      "Konsultasi di luar jam pertemuan.",
      "File latihan dan pembahasan.",
      "Try out persiapan ujian, ajukan minimal H−3.",
      "Waktu disepakati bersama.",
    ],
  },
  {
    id: "practice",
    name: "Latihan Soal Mandiri",
    unit: "per mahasiswa / paket 4 sesi",
    detail: "4 × 120 menit · khusus offline",
    notes: [
      "Pendampingan dan pengarahan pengerjaan soal.",
      "Koreksi kesalahan konsep.",
      "Empat sesi offline, masing-masing 120 menit.",
      "Untuk 1–5 mahasiswa, waktu disepakati bersama.",
    ],
  },
] as const;
