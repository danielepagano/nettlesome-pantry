import { emptyProductRow, PRODUCT_COLUMNS, type ProductRow } from "../shopify/templates.ts";
import { mergeLinkStats, rewriteProductLinks, type LinkRewriteEntry, type LinkRewriteStats } from "./links.ts";

const POUNDS_TO_GRAMS = 453.6;
const DEFAULT_VENDOR = "Nettlesome Pantry";
const PRODUCT_TYPE_FIELD = "Product Type [Non Editable]";

export type ProductTransformOptions = {
  storefrontBaseUrl?: string;
};

export type ProductLinkReviewItem = {
  productHandle: string;
  productTitle: string;
  action: "rewritten" | "flagged";
  originalHref: string;
  resultHref?: string;
  reason?: string;
};

export type ProductTransformResult = {
  headers: string[];
  rows: ProductRow[];
  warnings: string[];
  skippedNonPhysical: number;
  productCount: number;
  variantCount: number;
  linkStats: LinkRewriteStats;
  linkReview: ProductLinkReviewItem[];
};

type ParentContext = {
  handle: string;
  title: string;
  body: string;
  type: string;
  tags: string;
  published: string;
  images: string[];
};

export function transformProducts(
  rows: Record<string, string>[],
  options: ProductTransformOptions = {},
): ProductTransformResult {
  const warnings: string[] = [];
  const output: ProductRow[] = [];
  let skippedNonPhysical = 0;
  let productCount = 0;
  let variantCount = 0;
  const linkStatsList: LinkRewriteStats[] = [];
  const linkReview: ProductLinkReviewItem[] = [];

  const includedRows = collectPhysicalRows(rows, warnings, () => {
    skippedNonPhysical += 1;
  });

  const handles = new Set(
    includedRows
      .map((row) => normalizeHandle(row["Product URL"] ?? ""))
      .filter((handle) => handle.length > 0),
  );

  let parent: ParentContext | null = null;
  let imagesEmittedForParent = false;

  for (const row of includedRows) {
    const productUrl = (row["Product URL"] ?? "").trim();
    const title = (row["Title"] ?? "").trim();
    const isParent = productUrl.length > 0 || title.length > 0;

    if (isParent) {
      const handle = normalizeHandle(productUrl);
      if (!handle) {
        warnings.push("Skipped product row with missing Product URL handle.");
        continue;
      }

      let body = row["Description"] ?? "";
      const productPage = (row["Product Page"] ?? "").trim();
      if (options.storefrontBaseUrl?.trim()) {
        if (!productPage) {
          warnings.push(
            `Product "${title || handle}" is missing Product Page; description links were not rewritten.`,
          );
        } else {
          const rewritten = rewriteProductLinks(body, {
            baseUrl: options.storefrontBaseUrl.trim(),
            productPage,
            handles,
          });
          body = rewritten.html;
          linkStatsList.push(rewritten.stats);
          for (const entry of rewritten.entries) {
            if (entry.action === "unchanged") {
              continue;
            }
            linkReview.push({
              productHandle: handle,
              productTitle: title,
              action: entry.action,
              originalHref: entry.originalHref,
              resultHref: entry.resultHref,
              reason: entry.reason,
            });
          }
        }
      }

      parent = {
        handle,
        title,
        body,
        type: row["Categories"] ?? "",
        tags: row["Tags"] ?? "",
        published: mapPublished(row["Visible"] ?? ""),
        images: splitImageUrls(row["Hosted Image URLs"] ?? ""),
      };
      imagesEmittedForParent = false;
      productCount += 1;
    }

    if (!parent) {
      warnings.push("Skipped variant row before any parent product was found.");
      continue;
    }

    const variantRow = buildVariantRow(row, parent, warnings, !imagesEmittedForParent);
    variantCount += 1;

    if (!imagesEmittedForParent) {
      const imageUrls = parent.images;
      variantRow["Image Src"] = imageUrls[0] ?? "";
      if (imageUrls[0]) {
        variantRow["Image Position"] = "1";
      }
      output.push(variantRow);

      for (let index = 1; index < imageUrls.length; index += 1) {
        const imageRow = emptyProductRow();
        imageRow.Handle = parent.handle;
        imageRow["Image Src"] = imageUrls[index] ?? "";
        imageRow["Image Position"] = String(index + 1);
        output.push(imageRow);
      }

      imagesEmittedForParent = true;
      continue;
    }

    output.push(variantRow);
  }

  return {
    headers: [...PRODUCT_COLUMNS],
    rows: output,
    warnings,
    skippedNonPhysical,
    productCount,
    variantCount,
    linkStats: mergeLinkStats(linkStatsList),
    linkReview,
  };
}

function collectPhysicalRows(
  rows: Record<string, string>[],
  warnings: string[],
  onSkipNonPhysical: () => void,
): Record<string, string>[] {
  const included: Record<string, string>[] = [];
  let parentType: string | null = null;

  for (const row of rows) {
    const type = (row[PRODUCT_TYPE_FIELD] ?? "").trim();
    if (type) {
      if (type !== "PHYSICAL") {
        onSkipNonPhysical();
        parentType = null;
        continue;
      }
      parentType = type;
      included.push(row);
      continue;
    }

    if (parentType === "PHYSICAL") {
      included.push(row);
      continue;
    }

    if ((row["Product URL"] ?? "").trim() || (row["Title"] ?? "").trim()) {
      warnings.push("Skipped row with missing product type.");
      onSkipNonPhysical();
    }
  }

  return included;
}

function buildVariantRow(
  row: Record<string, string>,
  parent: ParentContext,
  warnings: string[],
  includeProductFields: boolean,
): ProductRow {
  const variant = emptyProductRow();
  variant.Handle = parent.handle;
  if (includeProductFields) {
    variant.Title = parent.title;
    variant["Body (HTML)"] = parent.body;
    variant.Vendor = DEFAULT_VENDOR;
    variant.Type = parent.type;
    variant.Tags = parent.tags;
    variant.Published = parent.published;
    variant.Status = parent.published === "true" ? "active" : "draft";
  }

  for (let index = 1; index <= 3; index += 1) {
    variant[`Option${index} Name` as keyof ProductRow] = row[`Option Name ${index}`] ?? "";
    variant[`Option${index} Value` as keyof ProductRow] = row[`Option Value ${index}`] ?? "";
  }

  variant["Variant SKU"] = row["SKU"] ?? "";
  variant["Variant Grams"] = poundsToGrams(row["Weight"] ?? "", warnings);
  variant["Variant Inventory Qty"] = mapInventoryQty(row["Stock"] ?? "", warnings);
  variant["Variant Inventory Policy"] = variant["Variant Inventory Qty"] ? "deny" : "continue";
  variant["Variant Requires Shipping"] = "true";
  variant["Variant Taxable"] = "true";
  variant["Variant Fulfillment Service"] = "manual";

  const pricing = mapPricing(row);
  variant["Variant Price"] = pricing.price;
  variant["Variant Compare At Price"] = pricing.compareAtPrice;

  return variant;
}

function mapPricing(row: Record<string, string>): { price: string; compareAtPrice: string } {
  const onSale = (row["On Sale"] ?? "").trim().toLowerCase() === "yes";
  const price = (row["Price"] ?? "").trim();
  const salePrice = (row["Sale Price"] ?? "").trim();

  if (onSale && salePrice) {
    return { price: salePrice, compareAtPrice: price };
  }

  return { price, compareAtPrice: "" };
}

function mapPublished(visible: string): string {
  return visible.trim().toLowerCase() === "yes" ? "true" : "false";
}

function mapInventoryQty(stock: string, warnings: string[]): string {
  const trimmed = stock.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.toLowerCase() === "unlimited") {
    return "";
  }
  const digitsOnly = trimmed.replace(/[^\d.-]/g, "");
  if (!digitsOnly) {
    warnings.push(`Could not parse stock value "${stock}"; leaving inventory blank.`);
    return "";
  }
  return digitsOnly;
}

function poundsToGrams(weight: string, warnings: string[]): string {
  const trimmed = weight.trim();
  if (!trimmed) {
    return "";
  }
  const pounds = Number.parseFloat(trimmed);
  if (Number.isNaN(pounds)) {
    warnings.push(`Could not parse weight "${weight}"; leaving grams blank.`);
    return "";
  }
  return String(Math.round(pounds * POUNDS_TO_GRAMS));
}

function splitImageUrls(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

function normalizeHandle(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
