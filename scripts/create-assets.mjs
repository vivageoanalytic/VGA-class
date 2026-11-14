// Original, code-drawn mathematical illustrations. No reference assets or human photos.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
await mkdir(resolve(root, "public/licenses"), { recursive: true });
for (const font of ["barlow-condensed", "dm-sans"]) {
  await writeFile(
    resolve(root, "public/licenses", `${font}-OFL.txt`),
    await readFile(resolve(root, "node_modules/@fontsource", font, "LICENSE")),
  );
}
const colors = {
  brand: "#640000",
  paper: "#f0eee5",
  accent: "#dce790",
  grid: "#d6d2c5",
  ink: "#292824",
};
const c = colors;
for (const path of ["banners", "mentors", "gallery"])
  await mkdir(resolve(root, "public", path), { recursive: true });

function graph(variant, mobile) {
  const w = mobile ? 900 : 1800,
    h = mobile ? 1200 : 830;
  const transform = mobile
    ? "translate(10 530) scale(.83)"
    : "translate(885 58)";
  const paths = Array.from({ length: 19 }, (_, i) => {
    const y = 150 + i * 16;
    return `<path d="M100 ${y + 150} C230 ${y + 240}, 290 ${y - 120}, 430 ${y - 125} S620 ${y + 150}, 760 ${y - 100}" fill="none" stroke="${i % 4 === 0 ? c.brand : "#a36d68"}" stroke-width="${i % 4 === 0 ? 1.8 : 0.8}" opacity="${0.8 - i * 0.018}"/>`;
  }).join("");
  const verticals = Array.from(
    { length: 15 },
    (_, i) =>
      `<path d="M${100 + i * 47} ${300 - Math.sin(i / 2) * 120} l-20 280" stroke="${c.brand}" opacity=".15" fill="none"/>`,
  ).join("");
  const curve =
    variant === 1
      ? `<g transform="translate(0 15)">${paths}${verticals}</g>`
      : `<path d="M110 450 C230 460 240 130 370 190 S520 550 720 230" fill="none" stroke="${c.brand}" stroke-width="4"/><path d="M110 450 C230 460 240 130 370 190 S520 550 720 230 L720 520 H110Z" fill="${c.brand}" opacity=".1"/><g stroke="${c.brand}" stroke-width="1.2" opacity=".5">${Array.from({ length: 25 }, (_, i) => `<path d="M${130 + i * 23} 520 V${430 - Math.sin(i / 4) * 120}"/>`).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="${c.grid}" stroke-width=".7"/></pattern><radialGradient id="glow"><stop stop-color="${c.accent}" stop-opacity=".7"/><stop offset="1" stop-color="${c.paper}" stop-opacity="0"/></radialGradient><linearGradient id="fade"><stop stop-color="${c.paper}"/><stop offset=".7" stop-color="${c.paper}" stop-opacity="0"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="${c.paper}"/><rect width="${w}" height="${h}" fill="url(#grid)" opacity=".65"/>
  <rect width="${mobile ? 900 : 990}" height="${mobile ? 600 : h}" fill="${c.paper}" opacity=".92"/>
  <g transform="${transform}"><circle cx="460" cy="330" r="330" fill="url(#glow)"/><circle cx="430" cy="330" r="285" fill="none" stroke="${c.grid}" stroke-dasharray="4 8"/>
  <path d="M80 520H790M165 600V80" stroke="${c.ink}" stroke-width="1.2" opacity=".6"/><path d="M780 514l10 6-10 6M159 90l6-10 6 10" fill="none" stroke="${c.ink}"/>
  <g fill="${c.brand}" font-family="Georgia,serif" font-style="italic"><text x="790" y="550" font-size="24">x</text><text x="130" y="90" font-size="24">y</text><text x="500" y="100" font-size="38">${variant === 1 ? "f′(x)" : "∫ f(x) dx"}</text><text x="50" y="620" font-size="25" opacity=".5">${variant === 1 ? "lim Δx → 0" : "a ≤ x ≤ b"}</text></g>
  ${curve}<circle cx="435" cy="210" r="7" fill="${c.brand}"/><circle cx="435" cy="210" r="15" fill="none" stroke="${c.brand}" opacity=".25"/>
  <g transform="translate(540 505) rotate(-8)"><rect width="210" height="92" rx="3" fill="${c.paper}" stroke="${c.brand}" stroke-width="1"/><text x="18" y="31" fill="${c.brand}" font-family="sans-serif" font-size="10" letter-spacing="2">ONE CONCEPT AT A TIME.</text><text x="20" y="69" fill="${c.brand}" font-family="Georgia,serif" font-size="24">${variant === 1 ? "Δy / Δx → f′(x)" : "∫ = understand more"}</text></g>
  </g></svg>`;
}

for (const variant of [1, 2]) {
  for (const mobile of [false, true]) {
    const name = `calculus-${variant}-${mobile ? "mobile" : "desktop"}`;
    const source = graph(variant, mobile);
    await writeFile(resolve(root, "public/banners", `${name}.svg`), source);
    await sharp(Buffer.from(source))
      .png({ compressionLevel: 9 })
      .toFile(resolve(root, "public/banners", `${name}.png`));
    await sharp(Buffer.from(source))
      .webp({ quality: 84 })
      .toFile(resolve(root, "public/banners", `${name}.webp`));
  }
}
const mentor = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="700" viewBox="0 0 600 700"><defs><pattern id="g" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0V34" fill="none" stroke="${c.grid}" stroke-width=".7"/></pattern></defs><rect width="600" height="700" fill="${c.paper}"/><rect width="600" height="700" fill="url(#g)"/><path d="M0 600L600 150V700H0Z" fill="${c.grid}" opacity=".4"/><circle cx="300" cy="275" r="95" fill="${c.grid}"/><path d="M100 650V560a200 200 0 01400 0V650Z" fill="${c.grid}"/><circle cx="300" cy="330" r="230" fill="none" stroke="${c.brand}" opacity=".15"/><path d="M58 70h80M58 70v80M542 630h-80M542 630v-80" fill="none" stroke="${c.brand}" stroke-width="2"/><text x="48" y="655" fill="${c.brand}" font-family="sans-serif" font-size="12" letter-spacing="3">FOTO PLACEHOLDER · DEMO</text></svg>`;
await writeFile(resolve(root, "public/mentors/placeholder.svg"), mentor);
const drawings = [
  `<g transform="translate(100 95) rotate(-8 220 180)"><rect x="30" y="25" width="370" height="260" rx="8" fill="${c.paper}" stroke="${c.brand}" stroke-width="2"/><path d="M80 75h260M80 110h180M80 145h220M80 220H320M130 250V170" stroke="${c.brand}" opacity=".45"/><path d="M135 220Q220 120 305 220" fill="none" stroke="${c.brand}" stroke-width="3"/><text x="80" y="52" font-size="14" font-family="Georgia" fill="${c.brand}">f(x) = understand why.</text><path d="M435 35v250" stroke="${c.brand}" stroke-width="12" stroke-linecap="round"/><path d="M435 285l-6 18h12Z" fill="${c.brand}"/></g>`,
  `<g transform="translate(90 85)"><rect x="25" y="20" width="410" height="250" rx="8" fill="${c.paper}" stroke="${c.brand}" stroke-width="2"/><path d="M5 285h450l-25 20H30Z" fill="${c.brand}"/><path d="M65 230H390M110 60V250" stroke="${c.brand}" opacity=".5"/><path d="M110 210C170 250 200 50 275 115S340 210 390 100" fill="none" stroke="${c.brand}" stroke-width="3"/><circle cx="450" cy="315" r="35" fill="${c.accent}"/><text x="155" y="75" font-family="Georgia" font-style="italic" font-size="20" fill="${c.brand}">one step further.</text></g>`,
  `<g transform="translate(100 80)"><path d="M30 250H410M75 70V290" stroke="${c.brand}" opacity=".5"/><path d="M75 240C140 240 190 80 270 100S360 230 420 50" fill="none" stroke="${c.brand}" stroke-width="4"/><path d="M75 240C140 240 190 80 270 100S360 230 420 50V250H75Z" fill="${c.brand}" opacity=".1"/><text x="260" y="310" font-family="Georgia" font-size="40" fill="${c.brand}">∫ f(x) dx</text><circle cx="260" cy="105" r="7" fill="${c.brand}"/><text x="90" y="40" font-family="sans-serif" font-size="11" letter-spacing="3" fill="${c.brand}">CONNECT THE CONCEPTS.</text></g>`,
];
for (const [i, drawing] of drawings.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="460" viewBox="0 0 640 460"><rect width="640" height="460" fill="${i === 1 ? "#e7e9d9" : c.paper}"/><path d="M0 460L640 0V460Z" fill="${c.brand}" opacity=".035"/>${drawing}</svg>`;
  await writeFile(resolve(root, "public/gallery", `demo-${i + 1}.svg`), svg);
}
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="8" fill="${c.brand}"/><text x="14" y="47" font-family="Georgia" font-style="italic" font-size="52" fill="${c.accent}">v.</text></svg>`;
await writeFile(resolve(root, "public/favicon.svg"), favicon);
await sharp(Buffer.from(graph(1, false)))
  .resize(1200, 630, { fit: "cover" })
  .composite([
    {
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><text x="65" y="230" font-family="sans-serif" font-weight="bold" font-size="65" fill="${c.brand}">VGA CLASS</text><text x="65" y="300" font-family="sans-serif" font-size="28" fill="${c.brand}">Pahami konsep.</text><text x="65" y="345" font-family="sans-serif" font-size="28" fill="${c.brand}">Taklukkan kalkulus.</text><text x="65" y="480" font-family="sans-serif" font-size="17" fill="${c.brand}">KALKULUS 1 &amp; 2 · ONLINE / OFFLINE</text></svg>`,
      ),
    },
  ])
  .png()
  .toFile(resolve(root, "public/og.png"));
console.log(
  "Original demo assets created (SVG sources, PNG originals, WebP variants).",
);
