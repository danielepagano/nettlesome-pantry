import { CUSTOMER_COLUMNS, emptyCustomerRow, type CustomerRow } from "../shopify/templates.ts";

export type CustomerTransformOptions = {
  defaultCountryCode?: string;
};

export type CustomerTransformResult = {
  headers: string[];
  rows: CustomerRow[];
  warnings: string[];
  skippedMissingEmail: number;
  importedCount: number;
  withoutName: number;
  withoutAddress: number;
};

export function transformCustomers(
  rows: Record<string, string>[],
  options: CustomerTransformOptions = {},
): CustomerTransformResult {
  const warnings: string[] = [];
  const output: CustomerRow[] = [];
  let skippedMissingEmail = 0;
  let withoutName = 0;
  let withoutAddress = 0;
  const defaultCountry = (options.defaultCountryCode ?? "US").trim().toUpperCase();

  for (const row of rows) {
    const email = (row["Email"] ?? "").trim();
    if (!email) {
      skippedMissingEmail += 1;
      warnings.push("Skipped contact row with missing email.");
      continue;
    }

    const customer = emptyCustomerRow();
    customer["First Name"] = row["First Name"] ?? "";
    customer["Last Name"] = row["Last Name"] ?? "";
    customer.Email = email;
    customer["Accepts Email Marketing"] = mapMarketing(row["Accepts Marketing"] ?? "");
    customer["Default Address Address1"] = row["Shipping Address 1"] ?? "";
    customer["Default Address Address2"] = row["Shipping Address 2"] ?? "";
    customer["Default Address City"] = row["Shipping City"] ?? "";
    customer["Default Address Province Code"] = row["Shipping Province/State"] ?? "";
    customer["Default Address Zip"] = row["Shipping Zip"] ?? "";
    customer["Default Address Phone"] = row["Shipping Phone Number"] ?? "";
    customer.Tags = row["Tags"] ?? "";

    const country = (row["Shipping Country"] ?? "").trim();
    customer["Default Address Country Code"] = country || defaultCountry;

    if (!customer["First Name"].trim() && !customer["Last Name"].trim()) {
      withoutName += 1;
    }

    const hasAddress = [
      customer["Default Address Address1"],
      customer["Default Address City"],
      customer["Default Address Zip"],
    ].some((value) => value.trim().length > 0);

    if (!hasAddress) {
      withoutAddress += 1;
    } else if (!customer["Default Address Province Code"].trim()) {
      warnings.push(`Contact ${email} has a partial address but is missing province/state code.`);
    }

    output.push(customer);
  }

  return {
    headers: [...CUSTOMER_COLUMNS],
    rows: output,
    warnings,
    skippedMissingEmail,
    importedCount: output.length,
    withoutName,
    withoutAddress,
  };
}

function mapMarketing(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "yes") {
    return "yes";
  }
  if (normalized === "false" || normalized === "no") {
    return "no";
  }
  return "no";
}
