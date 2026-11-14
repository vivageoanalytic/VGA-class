export interface GalleryItem {
  id: string;
  image: string;
  alt: string;
  caption: string;
  category: string;
  demo: boolean;
  publicationApproved: boolean;
}
export const gallery: GalleryItem[] = [
  {
    id: "notes",
    image: "/gallery/demo-1.svg",
    alt: "Ilustrasi demo buku catatan dan kurva, bukan foto kegiatan VGA Class",
    caption: "Ruang untuk bertanya.",
    category: "Proses belajar",
    demo: true,
    publicationApproved: false,
  },
  {
    id: "online",
    image: "/gallery/demo-2.svg",
    alt: "Ilustrasi demo laptop dengan grafik matematika, bukan dokumentasi kelas",
    caption: "Konsep terhubung, di mana pun.",
    category: "Belajar online",
    demo: true,
    publicationApproved: false,
  },
  {
    id: "concept",
    image: "/gallery/demo-3.svg",
    alt: "Ilustrasi demo integral pada bidang koordinat, bukan dokumentasi resmi",
    caption: "Dari rumus ke pemahaman.",
    category: "Proses belajar",
    demo: true,
    publicationApproved: false,
  },
];
export const visibleGallery = gallery.filter(
  (item) => item.demo || item.publicationApproved,
);
