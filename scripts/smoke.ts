import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { convertSquarespaceCsv } from "../src/convert.ts";

const root = join(import.meta.dirname, "..");
const productsPath = join(root, "test-data", "products_May-13_04-29-49PM.csv");
const contactsPath = join(root, "test-data", "profiles.csv");
const outputDir = join(root, "test-data", "shopify-output");

mkdirSync(outputDir, { recursive: true });

function run(inputPath: string, options: Record<string, string> = {}): void {
  const text = readFileSync(inputPath, "utf8");
  const result = convertSquarespaceCsv(text, options);
  const outputPath = join(outputDir, result.outputFileName);
  writeFileSync(outputPath, result.csv, "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(result.stats);
  console.log(`Warnings: ${result.warnings.length}`);
}

run(productsPath, { storefrontBaseUrl: "https://example.myshopify.com" });
run(contactsPath, { defaultCountryCode: "US" });
