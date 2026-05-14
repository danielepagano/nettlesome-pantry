import Papa from "papaparse";

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    const message = parsed.errors.map((error) => error.message).join("; ");
    throw new Error(`CSV parse error: ${message}`);
  }

  const headers = parsed.meta.fields ?? [];
  const rows = parsed.data.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.replace(/^\uFEFF/, "").trim();
      normalized[cleanKey] = value ?? "";
    }
    return normalized;
  });

  return { headers, rows };
}

export function stringifyCsv(headers: string[], rows: Record<string, string>[]): string {
  return Papa.unparse(
    {
      fields: headers,
      data: rows.map((row) => headers.map((header) => row[header] ?? "")),
    },
    { quotes: true },
  );
}
