export type LinkRewriteStats = {
  rewritten: number;
  unchanged: number;
  flagged: number;
};

export type LinkRewriteEntry = {
  action: "rewritten" | "flagged" | "unchanged";
  originalHref: string;
  resultHref?: string;
  reason?: string;
};

export function rewriteProductLinks(
  html: string,
  options: {
    baseUrl: string;
    productPage: string;
    handles: Set<string>;
  },
): { html: string; stats: LinkRewriteStats; entries: LinkRewriteEntry[] } {
  const stats: LinkRewriteStats = { rewritten: 0, unchanged: 0, flagged: 0 };
  const entries: LinkRewriteEntry[] = [];
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const pagePrefix = options.productPage.replace(/^\/+|\/+$/g, "");

  const rewritten = html.replace(/href=(["'])(.*?)\1/gi, (match, quote: string, href: string) => {
    const result = rewriteHref(href, baseUrl, pagePrefix, options.handles);
    stats[result.kind] += 1;
    entries.push({
      action: result.kind,
      originalHref: href.trim(),
      resultHref: result.kind === "rewritten" ? result.href : undefined,
      reason: result.reason,
    });
    if (result.kind === "unchanged") {
      return match;
    }
    return `href=${quote}${result.href}${quote}`;
  });

  return { html: rewritten, stats, entries };
}

function rewriteHref(
  href: string,
  baseUrl: string,
  pagePrefix: string,
  handles: Set<string>,
): { href: string; kind: keyof LinkRewriteStats; reason?: string } {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("mailto:") || trimmed.startsWith("#")) {
    return { href: trimmed, kind: "unchanged" };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return rewritePath(url.pathname + url.search, baseUrl, pagePrefix, handles, trimmed);
    } catch {
      return { href: trimmed, kind: "unchanged" };
    }
  }

  return rewritePath(trimmed, baseUrl, pagePrefix, handles, trimmed);
}

function rewritePath(
  path: string,
  baseUrl: string,
  pagePrefix: string,
  handles: Set<string>,
  original: string,
): { href: string; kind: keyof LinkRewriteStats; reason?: string } {
  const [pathname, query = ""] = path.split("?");
  if (query) {
    return {
      href: original,
      kind: "flagged",
      reason: "Collection, tag, or filtered shop link. Update manually in Shopify after import.",
    };
  }

  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return { href: original, kind: "unchanged" };
  }

  let handle: string | undefined;
  if (segments.length === 1) {
    handle = segments[0];
  } else if (segments.length === 2 && segments[0] === pagePrefix) {
    handle = segments[1];
  } else {
    return { href: original, kind: "unchanged" };
  }

  if (!handle || !handles.has(handle)) {
    if (/^https?:\/\//i.test(original)) {
      return { href: original, kind: "unchanged" };
    }
    return {
      href: original,
      kind: "flagged",
      reason: "Product slug is not in this export, so it was not rewritten automatically.",
    };
  }

  return { href: `${baseUrl}/products/${handle}`, kind: "rewritten" };
}

export function mergeLinkStats(stats: LinkRewriteStats[]): LinkRewriteStats {
  return stats.reduce(
    (total, current) => ({
      rewritten: total.rewritten + current.rewritten,
      unchanged: total.unchanged + current.unchanged,
      flagged: total.flagged + current.flagged,
    }),
    { rewritten: 0, unchanged: 0, flagged: 0 },
  );
}

export function mergeLinkEntries(entries: LinkRewriteEntry[][]): LinkRewriteEntry[] {
  return entries.flat();
}
