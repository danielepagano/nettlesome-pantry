import { parseCsv, stringifyCsv } from "./csv/io.ts";
import { detectExportKind, type ExportKind } from "./transforms/detect.ts";
import { transformCustomers } from "./transforms/customers.ts";
import { transformProducts } from "./transforms/products.ts";

export type ConversionDetailLinkItem = {
  productTitle: string;
  productHandle: string;
  originalHref: string;
  resultHref?: string;
  reason?: string;
};

export type ConversionDetailSection = {
  title: string;
  intro?: string;
  items: string[];
  linkItems?: ConversionDetailLinkItem[];
};

export type ConversionSummary = {
  kind: ExportKind;
  outputFileName: string;
  csv: string;
  warnings: string[];
  stats: Record<string, number | string>;
  details: ConversionDetailSection[];
  notes: string[];
};

export function convertSquarespaceCsv(
  text: string,
  options: {
    kind?: ExportKind;
    defaultCountryCode?: string;
    storefrontBaseUrl?: string;
  } = {},
): ConversionSummary {
  const parsed = parseCsv(text);
  const kind = options.kind && options.kind !== "unknown" ? options.kind : detectExportKind(parsed.headers);

  if (kind === "products") {
    const result = transformProducts(parsed.rows, {
      storefrontBaseUrl: options.storefrontBaseUrl,
    });

    const rewritten = result.linkReview.filter((item) => item.action === "rewritten");
    const flagged = result.linkReview.filter((item) => item.action === "flagged");

    return {
      kind,
      outputFileName: "shopify-products.csv",
      csv: stringifyCsv(result.headers, result.rows),
      warnings: result.warnings,
      stats: {
        products: result.productCount,
        variants: result.variantCount,
        skippedNonPhysical: result.skippedNonPhysical,
        linksRewritten: result.linkStats.rewritten,
        linksUnchanged: result.linkStats.unchanged,
        linksFlagged: result.linkStats.flagged,
      },
      details: [
        {
          title: "Links rewritten",
          intro: "These product links were updated to Shopify product URLs.",
          items: [],
          linkItems: rewritten.map((item) => ({
            productTitle: item.productTitle,
            productHandle: item.productHandle,
            originalHref: item.originalHref,
            resultHref: item.resultHref,
          })),
        },
        {
          title: "Links flagged for review",
          intro: "These links were left unchanged on purpose. Fix them in Shopify after import if needed.",
          items: [],
          linkItems: flagged.map((item) => ({
            productTitle: item.productTitle,
            productHandle: item.productHandle,
            originalHref: item.originalHref,
            reason: item.reason,
          })),
        },
      ],
      notes: [
        "Unchanged links are usually external sites, email links, or links that did not need rewriting.",
        "Replace the storefront URL with your real Shopify domain before you rely on rewritten links.",
      ],
    };
  }

  if (kind === "customers") {
    const result = transformCustomers(parsed.rows, {
      defaultCountryCode: options.defaultCountryCode,
    });

    return {
      kind,
      outputFileName: "shopify-customers.csv",
      csv: stringifyCsv(result.headers, result.rows),
      warnings: result.warnings,
      stats: {
        imported: result.importedCount,
        skippedMissingEmail: result.skippedMissingEmail,
        withoutAddress: result.withoutAddress,
        withoutName: result.withoutName,
      },
      details: [],
      notes: [
        `${result.withoutAddress} contact(s) have no shipping address. That is normal for newsletter signups and marketing contacts who never placed an order.`,
        `${result.withoutName} contact(s) have no first or last name. Shopify can still import them with email only.`,
        "Only rows missing an email are skipped.",
      ],
    };
  }

  throw new Error("Could not detect whether this file is a Squarespace products or contacts export.");
}
