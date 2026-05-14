import { CUSTOMER_COLUMNS, emptyCustomerRow, type CustomerRow } from "../shopify/templates.ts";

export type CustomerTransformOptions = {
  defaultCountryCode?: string;
};

export type CustomerTransformResult = {
  headers: string[];
  rows: CustomerRow[];
  warnings: string[];
  skippedMissingEmail: number;
  skippedMissingName: number;
  importedCount: number;
  withoutAddress: number;
};

export function transformCustomers(
  rows: Record<string, string>[],
  options: CustomerTransformOptions = {},
): CustomerTransformResult {
  const warnings: string[] = [];
  const output: CustomerRow[] = [];
  let skippedMissingEmail = 0;
  let skippedMissingName = 0;
  let withoutAddress = 0;
  const defaultCountry = (options.defaultCountryCode ?? "US").trim().toUpperCase();

  for (const row of rows) {
    const normalized = normalizeContactRow(row);
    const email = contactValue(normalized, "Email");
    if (!email) {
      skippedMissingEmail += 1;
      warnings.push("Skipped contact row with missing email.");
      continue;
    }

    const { firstName, lastName } = contactName(normalized);
    if (!firstName || !lastName) {
      skippedMissingName += 1;
      warnings.push("Skipped contact row missing required first or last name.");
      continue;
    }

    const customer = emptyCustomerRow();
    customer["First Name"] = firstName;
    customer["Last Name"] = lastName;
    customer.Email = email;
    customer["Accepts Email Marketing"] = mapMarketing(contactValue(normalized, "Accepts Marketing"));
    customer["Default Address Address1"] = contactValue(normalized, "Shipping Address 1");
    customer["Default Address Address2"] = contactValue(normalized, "Shipping Address 2");
    customer["Default Address City"] = contactValue(normalized, "Shipping City");
    customer["Default Address Province Code"] = contactValue(normalized, "Shipping Province/State");
    customer["Default Address Zip"] = contactValue(normalized, "Shipping Zip");
    customer["Default Address Phone"] = contactValue(normalized, "Shipping Phone Number");
    customer.Tags = contactValue(normalized, "Tags");
    customer["Accepts SMS Marketing"] = "no";
    customer["Tax Exempt"] = "no";

    const country = contactValue(normalized, "Shipping Country");
    customer["Default Address Country Code"] = country || defaultCountry;

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
    skippedMissingName,
    importedCount: output.length,
    withoutAddress,
  };
}

function normalizeContactRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.replace(/^\uFEFF/, "").trim().toLowerCase()] = (value ?? "").trim();
  }
  return normalized;
}

function contactValue(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias.toLowerCase()];
    if (value) {
      return value;
    }
  }
  return "";
}

function contactName(row: Record<string, string>): { firstName: string; lastName: string } {
  let firstName = contactValue(row, "First Name");
  let lastName = contactValue(row, "Last Name");

  if (!firstName || !lastName) {
    const shippingName = contactValue(row, "Shipping Name", "Billing Name");
    if (shippingName) {
      const parts = shippingName.split(/\s+/).filter(Boolean);
      if (!firstName && parts.length > 0) {
        firstName = parts[0]!;
      }
      if (!lastName && parts.length > 1) {
        lastName = parts.slice(1).join(" ");
      }
    }
  }

  return { firstName, lastName };
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
