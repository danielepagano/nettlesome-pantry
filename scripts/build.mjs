import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs");

await mkdir(docsDir, { recursive: true });

await build({
  entryPoints: [join(root, "src", "ui", "main.ts")],
  bundle: true,
  format: "esm",
  outfile: join(docsDir, "app.js"),
  platform: "browser",
  target: "es2022",
  sourcemap: true,
});

await writeFile(join(docsDir, ".nojekyll"), "");

console.log("Built docs/ for GitHub Pages");
