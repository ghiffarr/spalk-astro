# Spalk Astro

Faithful Astro reconstruction of [spalk.tv](https://www.spalk.tv/), based on
the asset-complete [`ghiffarr/Spalk-v0`](https://github.com/ghiffarr/Spalk-v0)
Webflow export and verified against the production site.

The project follows the same preservation and editing structure as Max Space
Astro: untouched source documents, numbered editable page fragments, a shared
renderer, clean Astro routes, and local production assets.

## Project structure

```text
src/
├── components/webflow/
│   └── WebflowPage.astro          # shared fragment renderer
├── content/pages/
│   ├── home/                      # numbered homepage sections
│   ├── solutions/                 # nested route directories
│   └── ...
├── pages/                         # Astro route entry points
└── webflow-source/
    ├── data/                      # preserved CSV/JSON exports
    └── original-pages/            # preserved monolithic HTML snapshot

public/assets/webflow/
├── audio/
├── documents/                     # original Rive files
├── fonts/
├── images/
├── scripts/
├── styles/
└── videos/
```

Edit the numbered files in `src/content/pages/<route>/`. Their numeric prefixes
preserve document order. Shared rendering remains in
`src/components/webflow/WebflowPage.astro`.

## Development

```sh
npm install
npx astro dev --background
```

Manage the background server with:

```sh
npx astro dev status
npx astro dev logs
npx astro dev stop
```

## Verification

```sh
npm run audit:assets
npm run build
```

`npm run build` generates the static site. `npm run check` is available for
Astro diagnostics, but the preserved inline Webflow scripts make that diagnostic
pass unusually memory-intensive; the asset audit and production build are the
required compatibility checks for this source-preserving reconstruction.

## Rebuilding the editable source

```sh
npm run organize:webflow -- --force
npm run localize:webflow
```

The `--force` flag replaces every editable fragment with the preserved import,
so use it only when you intentionally want to discard section-level edits.
