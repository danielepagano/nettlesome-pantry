# Nettlesome Pantry shop tools

Browser-based helpers for moving Nettlesome Pantry from Squarespace to Shopify. The converter runs entirely in the browser: Squarespace CSVs stay on the computer and are not uploaded to GitHub or any server.

## For KC at cutover

1. In Squarespace, export the latest **Products** CSV and **Contacts** CSV (`Contacts` → Export all contacts).
2. Open the converter:
   - GitHub Pages: `https://danielepagano.github.io/nettlesome-pantry/`
   - Local preview: from the repo run `npm run preview`, then open `http://localhost:4173` in the browser. Do not open `site/index.html` directly from Finder; the browser blocks the app script on `file://` pages.
3. Upload each Squarespace file, review the summary and warnings, and download:
   - `shopify-products.csv`
   - `shopify-customers.csv`
4. In Shopify admin:
   - [Products → Import](https://admin.shopify.com/products) — leave “publish to all sales channels” off on the first pass if you want to review before going live.
   - [Customers → Import](https://admin.shopify.com/customers)
5. Spot-check prices, inventory, variants, images, and a few customer addresses before launch.
6. Recreate the **gift card** manually in Shopify. It is not imported from Squarespace. See [Adding or updating gift card products](https://help.shopify.com/en/manual/products/gift-card-products/add-update-gift-card-products) and [Creating and selling gift cards](https://help.shopify.com/en/manual/products/gift-card-products/faq).
7. Rebuild bundle-style products such as the **Three Pack** in Shopify so customers can pick soaps with real inventory links instead of relying on the old Squarespace “list your choices at checkout” flow. See [Product bundles](https://help.shopify.com/en/manual/products/bundles) and [Adding variants](https://help.shopify.com/en/manual/products/variants/add-variants) for pick-your-own sets.
8. For sales, set compare-at and sale prices in Shopify. The converter imports the regular `Price` from Squarespace when `On Sale` is `No`, even if an old `Sale Price` column is still present in the export. See [Setting sale prices for products](https://help.shopify.com/en/manual/products/details/product-pricing/sale-pricing) and [Discounts](https://help.shopify.com/en/manual/discounts).
9. Complete the non-CSV migration work from Shopify’s [Squarespace migration guide](https://help.shopify.com/en/manual/migrating-to-shopify/migrating-from-squarespace): theme, shipping, taxes, payments, test order, domain, and URL redirects.

### GitHub Pages setup

In the GitHub repo settings, choose **Pages → Deploy from a branch**, branch `main`, folder **`/docs`**. GitHub only offers the repo root or `/docs` as publish folders, not `/site`. After you merge, run `npm run build` and commit the updated `docs/` folder so Pages serves the converter instead of the root README. The first deploy can take a minute or two to appear.

### Privacy

Do not commit real Squarespace exports, paste them into GitHub issues, or email them around. Local exports belong in the gitignored `test-data/` folder only.

## For developers

```bash
npm install
npm test
npm run build
npm run preview
npm run smoke
```

- `npm run preview` serves `site/` at `http://localhost:4173` so the browser can load the bundled app.

- `npm test` runs unit tests against anonymized fixtures in `tests/fixtures/` and against gitignored `test-data/` when that folder is present locally.
- `npm run build` bundles the browser app into `site/` and copies the published static files into `docs/` for GitHub Pages.
- `npm run smoke` writes converted CSVs to `test-data/shopify-output/` for manual Shopify import preview.

### Manual Shopify smoke test

After `npm run smoke`, upload the generated files from `test-data/shopify-output/` to a dev or trial Shopify store import preview. Confirm variant rows, image rows, hidden products, and `Unlimited` stock handling before cutover.

### Scope

- Products: `PHYSICAL` rows only.
- Customers: Squarespace contacts export with US-centric addresses.
- Not included: orders, reviews, theme content, billing addresses, or ongoing sync.
