import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/csv/io.ts";
import { detectExportKind } from "../src/transforms/detect.ts";
import { transformCustomers } from "../src/transforms/customers.ts";
import { transformProducts } from "../src/transforms/products.ts";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const repoRoot = join(fixturesDir, "..", "..");
const localProducts = join(repoRoot, "test-data", "products_May-13_04-29-49PM.csv");
const localContacts = join(repoRoot, "test-data", "profiles.csv");

function loadFixture(name: string): { headers: string[]; rows: Record<string, string>[] } {
  const text = readFileSync(join(fixturesDir, name), "utf8");
  return parseCsv(text);
}

describe("detectExportKind", () => {
  it("detects products and contacts exports", () => {
    expect(detectExportKind(loadFixture("squarespace-products.csv").headers)).toBe("products");
    expect(detectExportKind(loadFixture("squarespace-contacts.csv").headers)).toBe("customers");
  });
});

describe("transformProducts", () => {
  it("maps physical products, variants, images, and skips gift cards", () => {
    const result = transformProducts(loadFixture("squarespace-products.csv").rows, {
      storefrontBaseUrl: "https://shop.example.com",
    });

    expect(result.skippedNonPhysical).toBe(1);
    expect(result.productCount).toBe(4);
    expect(result.variantCount).toBe(5);

    const citrus = result.rows.find((row) => row.Handle === "citrus-soap" && row.Title);
    expect(citrus?.["Variant Price"]).toBe("14.00");
    expect(citrus?.["Variant Compare At Price"]).toBe("");
    expect(citrus?.["Variant Grams"]).toBe("141");
    expect(citrus?.Published).toBe("true");
    expect(citrus?.Vendor).toBe("Nettlesome Pantry");
    expect(citrus?.["Body (HTML)"]).toContain("https://shop.example.com/products/herbal-soap");
    expect(citrus?.["Body (HTML)"]).toContain("/sample-shop?tag=soap");
    expect(result.linkStats.rewritten).toBeGreaterThan(0);
    expect(result.linkStats.flagged).toBeGreaterThan(0);

    const hidden = result.rows.find((row) => row.Handle === "herbal-soap" && row.Title);
    expect(hidden?.Published).toBe("false");
    expect(hidden?.Status).toBe("draft");

    const bulkVariants = result.rows.filter((row) => row.Handle === "bulk-loaf" && row["Variant SKU"]);
    expect(bulkVariants).toHaveLength(2);
    expect(bulkVariants[1]?.Title).toBe("");

    const extraImages = result.rows.filter((row) => row.Handle === "citrus-soap" && row["Image Src"]);
    expect(extraImages.length).toBeGreaterThan(1);

    const threePack = result.rows.find((row) => row.Handle === "three-pack" && row.Title);
    expect(threePack?.["Variant Inventory Qty"]).toBe("");
    expect(threePack?.["Variant Inventory Policy"]).toBe("continue");
  });

  it("warns when Product Page is missing during link rewrite", () => {
    const rows = loadFixture("squarespace-products.csv").rows;
    rows[0]!["Product Page"] = "";
    const result = transformProducts(rows, {
      storefrontBaseUrl: "https://shop.example.com",
    });
    expect(result.warnings.some((warning) => warning.includes("missing Product Page"))).toBe(true);
    expect(result.linkStats.rewritten).toBe(0);
  });

  it("maps on-sale pricing when On Sale is Yes", () => {
    const rows = loadFixture("squarespace-products.csv").rows;
    rows[0]!["On Sale"] = "Yes";
    const result = transformProducts(rows);
    const citrus = result.rows.find((row) => row.Handle === "citrus-soap" && row.Title);
    expect(citrus?.["Variant Price"]).toBe("8.00");
    expect(citrus?.["Variant Compare At Price"]).toBe("14.00");
  });
});

describe("transformCustomers", () => {
  it("maps contacts and warns on sparse rows", () => {
    const result = transformCustomers(loadFixture("squarespace-contacts.csv").rows, {
      defaultCountryCode: "US",
    });

    expect(result.importedCount).toBe(3);
    expect(result.skippedMissingEmail).toBe(1);

    const subscriber = result.rows.find((row) => row.Email === "subscriber@example.com");
    expect(subscriber?.["Accepts Email Marketing"]).toBe("yes");
    expect(subscriber?.["Default Address Country Code"]).toBe("US");

    const buyer = result.rows.find((row) => row.Email === "buyer@example.com");
    expect(buyer?.["Default Address Province Code"]).toBe("UT");
    expect(buyer?.["Accepts Email Marketing"]).toBe("no");

    expect(result.withoutAddress).toBe(2);
    expect(result.withoutName).toBe(1);
    expect(result.warnings.some((warning) => warning.includes("no shipping address"))).toBe(false);
  });
});

describe("local test-data smoke", () => {
  it("converts the full local exports when present", () => {
    let productsText: string;
    let contactsText: string;
    try {
      productsText = readFileSync(localProducts, "utf8");
      contactsText = readFileSync(localContacts, "utf8");
    } catch {
      return;
    }

    const products = transformProducts(parseCsv(productsText).rows);
    const customers = transformCustomers(parseCsv(contactsText).rows);

    expect(products.productCount).toBeGreaterThan(30);
    expect(products.variantCount).toBeGreaterThan(products.productCount);
    expect(customers.importedCount).toBeGreaterThan(90);
  });
});
