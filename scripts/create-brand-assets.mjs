import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const source = await readFile(
  resolve(root, "public/logo/VGA_CLASS.svg"),
  "utf8",
);
// Use the editable vector monogram supplied in the user's SVG, not the 1 MB embedded image.
const defs = source.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
const monogram = source.match(/<g id="vga-monogram"[\s\S]*?<\/g>/)?.[0];
if (!defs || !monogram)
  throw new Error("Vector monogram not found in the supplied VGA logo.");
const tokens = await readFile(resolve(root, "src/styles/tokens.css"), "utf8");
const background = tokens.match(/--color-brand:\s*(#[a-fA-F0-9]{6})/)?.[1];
if (!background) throw new Error("Brand color token not found.");
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 1280"><title>VGA Class</title><rect width="1280" height="1280" rx="230" fill="${background}"/><svg x="54" y="290" width="1172" height="700" viewBox="30 210 1210 680">${defs}${monogram}</svg></svg>\n`;
await writeFile(resolve(root, "public/favicon.svg"), favicon);

const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map(async (size) => {
    const png = await sharp(Buffer.from(favicon))
      .resize(size, size)
      .png()
      .toBuffer();
    await writeFile(resolve(root, `public/favicon-${size}x${size}.png`), png);
    return png;
  }),
);
await sharp(Buffer.from(favicon))
  .resize(180, 180)
  .png()
  .toFile(resolve(root, "public/apple-touch-icon.png"));

// ICO directory with standard PNG-compressed 16/32/48 px entries, no new dependency.
const header = Buffer.alloc(6 + pngs.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
for (let i = 0; i < pngs.length; i++) {
  const entry = 6 + i * 16;
  header[entry] = sizes[i];
  header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(pngs[i].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += pngs[i].length;
}
await writeFile(
  resolve(root, "public/favicon.ico"),
  Buffer.concat([header, ...pngs]),
);

// Crop only the transparent outer margin; preserve the supplied gold finish and lettering.
const original = sharp(resolve(root, "public/logo/VGA Class.png"))
  .extract({ left: 24, top: 192, width: 1208, height: 1000 })
  .resize({ width: 320 });
await Promise.all([
  original
    .clone()
    .png({ compressionLevel: 9 })
    .toFile(resolve(root, "public/logo/vga-class-web.png")),
  original
    .clone()
    .webp({ quality: 92 })
    .toFile(resolve(root, "public/logo/vga-class-web.webp")),
]);
console.log(
  "VGA logo web variants and SVG/PNG/ICO/apple-touch favicons created from the supplied assets.",
);
