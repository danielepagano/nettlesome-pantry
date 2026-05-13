export const PRODUCT_COLUMNS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "Variant SKU",
  "Variant Grams",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Price",
  "Variant Compare At Price",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Variant Barcode",
  "Image Src",
  "Image Position",
  "Image Alt Text",
  "Gift Card",
  "SEO Title",
  "SEO Description",
  "Google Shopping / Google Product Category",
  "Google Shopping / Gender",
  "Google Shopping / Age Group",
  "Google Shopping / MPN",
  "Google Shopping / Condition",
  "Google Shopping / Custom Product",
  "Variant Image",
  "Variant Weight Unit",
  "Variant Tax Code",
  "Cost per item",
  "Included / United States",
  "Price / United States",
  "Compare At Price / United States",
  "Included / International",
  "Price / International",
  "Compare At Price / International",
  "Status",
] as const;

export const CUSTOMER_COLUMNS = [
  "First Name",
  "Last Name",
  "Email",
  "Accepts Email Marketing",
  "Default Address Company",
  "Default Address Address1",
  "Default Address Address2",
  "Default Address City",
  "Default Address Province Code",
  "Default Address Country Code",
  "Default Address Zip",
  "Default Address Phone",
  "Phone",
  "Accepts SMS Marketing",
  "Tags",
  "Note",
  "Tax Exempt",
] as const;

export type ProductRow = Record<(typeof PRODUCT_COLUMNS)[number], string>;
export type CustomerRow = Record<(typeof CUSTOMER_COLUMNS)[number], string>;

export function emptyProductRow(): ProductRow {
  return Object.fromEntries(PRODUCT_COLUMNS.map((column) => [column, ""])) as ProductRow;
}

export function emptyCustomerRow(): CustomerRow {
  return Object.fromEntries(CUSTOMER_COLUMNS.map((column) => [column, ""])) as CustomerRow;
}
