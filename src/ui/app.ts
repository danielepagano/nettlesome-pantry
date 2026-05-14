import { convertSquarespaceCsv, type ConversionDetailLinkItem, type ConversionSummary } from "../convert.ts";
import type { ExportKind } from "../transforms/detect.ts";

const DEFAULT_STOREFRONT_URL = "https://my-store.myshopify.com";

type UiElements = {
  form: HTMLFormElement;
  fileInput: HTMLInputElement;
  kindSelect: HTMLSelectElement;
  countryInput: HTMLInputElement;
  storefrontInput: HTMLInputElement;
  convertButton: HTMLButtonElement;
  summary: HTMLElement;
  warnings: HTMLUListElement;
  downloadButton: HTMLAnchorElement;
};

export function initApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="panel">
      <header>      
        <h1>Squarespace to Shopify CSV</h1>
        <h3 class="top-nav"><a class="text-link" href="./guide.html">Read the migration guide</a></h3>
        <p class="lede">Upload a Squarespace export. Conversion runs in your browser and your file is not uploaded anywhere.</p>
      </header>
      <form id="convert-form">
        <label class="field">
          <span>Squarespace CSV</span>
          <input id="csv-file" type="file" accept=".csv,text/csv" required />
        </label>
        <label class="field">
          <span>Export type</span>
          <select id="export-kind">
            <option value="auto">Detect automatically</option>
            <option value="products">Products</option>
            <option value="customers">Contacts</option>
          </select>
        </label>
        <label class="field">
          <span>Default country for contacts</span>
          <input id="default-country" type="text" value="US" maxlength="2" />
        </label>
        <label class="field">
          <span>Shopify storefront URL</span>
          <input id="storefront-url" type="url" value="${DEFAULT_STOREFRONT_URL}" />
        </label>
        <p class="hint">Used for product description links. Replace <code>my-store</code> with your real Shopify store subdomain or custom domain.</p>
        <button id="convert-button" type="submit">Convert</button>
      </form>
      <section id="summary" hidden></section>
      <section id="warnings-section" hidden>
        <h3>Warnings</h3>
        <ul id="warnings"></ul>
      </section>
      <a id="download-link" hidden>Download Shopify CSV</a>
    </main>
  `;

  const elements: UiElements = {
    form: root.querySelector("#convert-form") as HTMLFormElement,
    fileInput: root.querySelector("#csv-file") as HTMLInputElement,
    kindSelect: root.querySelector("#export-kind") as HTMLSelectElement,
    countryInput: root.querySelector("#default-country") as HTMLInputElement,
    storefrontInput: root.querySelector("#storefront-url") as HTMLInputElement,
    convertButton: root.querySelector("#convert-button") as HTMLButtonElement,
    summary: root.querySelector("#summary") as HTMLElement,
    warnings: root.querySelector("#warnings") as HTMLUListElement,
    downloadButton: root.querySelector("#download-link") as HTMLAnchorElement,
  };

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleConvert(elements);
  });
}

async function handleConvert(elements: UiElements): Promise<void> {
  const file = elements.fileInput.files?.[0];
  if (!file) {
    return;
  }

  elements.convertButton.disabled = true;
  elements.summary.hidden = true;
  elements.downloadButton.hidden = true;
  elements.warnings.replaceChildren();
  const warningsSection = elements.warnings.closest("#warnings-section") as HTMLElement;
  warningsSection.hidden = true;

  try {
    const text = await file.text();
    const selectedKind = elements.kindSelect.value as ExportKind | "auto";
    const result = convertSquarespaceCsv(text, {
      kind: selectedKind === "auto" ? undefined : selectedKind,
      defaultCountryCode: elements.countryInput.value,
      storefrontBaseUrl: elements.storefrontInput.value,
    });

    renderSummary(elements.summary, result);
    renderWarnings(elements.warnings, warningsSection, result.warnings);
    prepareDownload(elements.downloadButton, result);
  } catch (error) {
    warningsSection.hidden = false;
    const item = document.createElement("li");
    item.textContent = error instanceof Error ? error.message : "Conversion failed.";
    elements.warnings.append(item);
  } finally {
    elements.convertButton.disabled = false;
  }
}

function renderSummary(container: HTMLElement, result: ConversionSummary): void {
  const statLines = Object.entries(result.stats).map(
    ([key, value]) => `<li><strong>${labelForStat(key)}:</strong> ${value}</li>`,
  );

  const noteLines = result.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");

  const detailSections = result.details
    .filter((section) => section.items.length > 0 || (section.linkItems?.length ?? 0) > 0)
    .map((section) => {
      const intro = section.intro ? `<p class="detail-intro">${escapeHtml(section.intro)}</p>` : "";
      const body = section.linkItems?.length
        ? renderLinkItems(section.linkItems)
        : `<ul>${section.items
            .slice(0, 25)
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}${
            section.items.length > 25
              ? `<li>${section.items.length - 25} more not shown.</li>`
              : ""
          }</ul>`;
      return `
        <section class="detail-block">
          <h3>${escapeHtml(section.title)}</h3>
          ${intro}
          ${body}
        </section>
      `;
    })
    .join("");

  const emptyDetails =
    result.kind === "products" &&
    result.details.every((section) => section.items.length === 0 && (section.linkItems?.length ?? 0) === 0)
      ? `<p class="detail-intro">No description links were rewritten or flagged. External links and links left unchanged are not listed here.</p>`
      : "";

  container.innerHTML = `
    <h2>Ready to import</h2>
    <p>Detected <strong>${result.kind}</strong> export. Download <code>${result.outputFileName}</code> and import it in Shopify admin.</p>
    <ul class="summary-stats">${statLines.join("")}</ul>
    ${noteLines ? `<section class="detail-block"><h3>Notes</h3><ul>${noteLines}</ul></section>` : ""}
    ${detailSections}
    ${emptyDetails}
  `;
  container.hidden = false;
}

function renderLinkItems(linkItems: ConversionDetailLinkItem[]): string {
  const visible = linkItems.slice(0, 25);
  const lines = visible
    .map((item) => {
      const label = `${escapeHtml(item.productTitle)} (<code>${escapeHtml(item.productHandle)}</code>):`;
      const original = `<pre class="link-url">${escapeHtml(item.originalHref)}</pre>`;
      if (item.resultHref) {
        const target = `<pre class="link-url">${escapeHtml(item.resultHref)}</pre>`;
        return `<li class="link-item"><span class="link-label">${label}</span> ${original} <span class="link-arrow">-&gt;</span> ${target}</li>`;
      }
      const reason = item.reason ? `<span class="link-note">${escapeHtml(item.reason)}</span>` : "";
      return `<li class="link-item"><span class="link-label">${label}</span> ${original} ${reason}</li>`;
    })
    .join("");
  const overflow =
    linkItems.length > 25 ? `<li class="link-item">${linkItems.length - 25} more not shown.</li>` : "";
  return `<ul class="link-list">${lines}${overflow}</ul>`;
}

function renderWarnings(
  container: HTMLUListElement,
  section: HTMLElement,
  warnings: string[],
): void {
  const unique = [...new Set(warnings)];
  if (unique.length === 0) {
    section.hidden = true;
    return;
  }

  for (const warning of unique.slice(0, 50)) {
    const item = document.createElement("li");
    item.textContent = warning;
    container.append(item);
  }
  if (unique.length > 50) {
    const item = document.createElement("li");
    item.textContent = `${unique.length - 50} more warnings not shown.`;
    container.append(item);
  }
  section.hidden = false;
}

function prepareDownload(link: HTMLAnchorElement, result: ConversionSummary): void {
  const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = result.outputFileName;
  link.textContent = `Download ${result.outputFileName}`;
  link.hidden = false;
}

function labelForStat(key: string): string {
  const labels: Record<string, string> = {
    products: "Products",
    variants: "Variants",
    skippedNonPhysical: "Skipped non-physical rows",
    linksRewritten: "Links rewritten",
    linksUnchanged: "Links unchanged",
    linksFlagged: "Links flagged for review",
    sourceContacts: "Contacts in Squarespace export",
    imported: "Customers ready to import",
    skippedMissingEmail: "Skipped rows without email",
    skippedMissingName: "Skipped rows without first or last name",
    withoutAddress: "Contacts without shipping address",
  };
  return labels[key] ?? key;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
