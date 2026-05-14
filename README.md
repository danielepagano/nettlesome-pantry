# Nettlesome Pantry shop tools

Developer repo for a browser-based Squarespace → Shopify CSV converter.

**Shope onwer-facing instructions:** use the published GitHub Pages site, not this README. The converter is at the site root; the cutover guide is at `guide.html` on the same site (for example `https://danielepagano.github.io/nettlesome-pantry/guide.html`).

## Development

```bash
npm install
npm test
npm run build
npm run preview
npm run smoke
```

- `npm run build` bundles `src/` into `docs/` for GitHub Pages.
- `npm run preview` serves `docs/` at `http://localhost:4173`.
- `npm run smoke` writes converted CSVs to `test-data/shopify-output/` when local Squarespace exports are present.
- `npm test` uses anonymized fixtures in `tests/fixtures/` and optional gitignored `test-data/`.

## GitHub Pages

In repo settings, choose **Pages → Deploy from a branch**, branch `main`, folder **`/docs`**. After UI or guide changes, run `npm run build` and commit `docs/`.

## Scope

- Products: `PHYSICAL` rows only.
- Customers: Squarespace contacts export with US-centric addresses.
- Not included: orders, reviews, theme content, billing addresses, or ongoing sync.
