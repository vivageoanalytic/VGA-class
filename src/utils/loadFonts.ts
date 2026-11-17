/** Optional licensed webfonts. No third-party binaries are downloaded or copied by this project. */
export async function installLicensedFonts(): Promise<void> {
  const files = import.meta.glob<string>("../assets/fonts/licensed/*.woff2", {
    eager: true,
    query: "?url",
    import: "default",
  });
  const definitions = [
    ["OriginSuperCondensed-Regular.woff2", "Origin Super Condensed", "400"],
    ["OriginSuperCondensed-Bold.woff2", "Origin Super Condensed", "700"],
    ["AstoriaRoman.woff2", "Astoria", "400"],
    ["AstoriaMedium.woff2", "Astoria", "500"],
  ];
  await Promise.all(
    definitions.map(async ([filename, family, weight]) => {
      const entry = Object.entries(files).find(([path]) =>
        path.endsWith(`/${filename}`),
      );
      if (!entry) return;
      try {
        const face = new FontFace(
          family!,
          `url(${JSON.stringify(entry[1])}) format("woff2")`,
          { weight, display: "swap" },
        );
        document.fonts.add(await face.load());
      } catch {
        /* Approved fallback remains usable if a supplied font file is invalid. */
      }
    }),
  );
}
