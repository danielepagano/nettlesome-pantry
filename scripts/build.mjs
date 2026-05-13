import { build } from "esbuild";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = join(root, "site");
const docsDir = join(root, "docs");

await mkdir(siteDir, { recursive: true });
await mkdir(docsDir, { recursive: true });

await build({
  entryPoints: [join(root, "src", "ui", "main.ts")],
  bundle: true,
  format: "esm",
  outfile: join(siteDir, "app.js"),
  platform: "browser",
  target: "es2022",
  sourcemap: true,
});

for (const fileName of ["index.html", "guide.html", "styles.css", "app.js", "app.js.map"]) {
  await copyFile(join(siteDir, fileName), join(docsDir, fileName));
}

await writeFile(join(docsDir, ".nojekyll"), "");

console.log("Built site/ and docs/ for GitHub Pages");
