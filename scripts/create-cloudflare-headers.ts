import { writeFile } from "node:fs/promises";
import { securityHeaders } from "../api/securityHeaders.ts";

await writeFile(
  "dist/_headers",
  "/*\n" +
    Object.entries(securityHeaders)
      .map(([name, value]) => `  ${name}: ${value}`)
      .join("\n") +
    "\n",
);
