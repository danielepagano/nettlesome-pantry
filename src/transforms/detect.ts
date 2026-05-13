export type ExportKind = "products" | "customers" | "unknown";

export function detectExportKind(headers: string[]): ExportKind {
  const headerSet = new Set(headers);
  if (headerSet.has("Product URL") && headerSet.has("Hosted Image URLs")) {
    return "products";
  }
  if (headerSet.has("Email") && headerSet.has("Accepts Marketing") && !headerSet.has("Product URL")) {
    return "customers";
  }
  return "unknown";
}
