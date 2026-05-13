import { describe, expect, it } from "vitest";
import { rewriteProductLinks } from "../src/transforms/links.ts";

describe("rewriteProductLinks", () => {
  it("rewrites known product links and flags collection links", () => {
    const html =
      '<a href="/sample-shop/herbal-soap">Herbal</a> <a href="/sample-shop?tag=soap">Tag</a> <a href="https://external.example.com/x">External</a>';
    const { html: rewritten, stats } = rewriteProductLinks(html, {
      baseUrl: "https://shop.example.com",
      productPage: "sample-shop",
      handles: new Set(["herbal-soap"]),
    });

    expect(rewritten).toContain('href="https://shop.example.com/products/herbal-soap"');
    expect(rewritten).toContain('href="/sample-shop?tag=soap"');
    expect(rewritten).toContain('href="https://external.example.com/x"');
    expect(stats.rewritten).toBe(1);
    expect(stats.flagged).toBe(1);
    expect(stats.unchanged).toBe(1);
  });
});
