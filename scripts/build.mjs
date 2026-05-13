import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "site");

await mkdir(siteDir, { recursive: true });

await build({
  entryPoints: [join(root, "src", "ui", "main.ts")],
  bundle: true,
  format: "esm",
  outfile: join(siteDir, "app.js"),
  platform: "browser",
  target: "es2022",
  sourcemap: true,
});

console.log("Built site/app.js");
