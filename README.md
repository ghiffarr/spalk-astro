# Spalk Astro

Faithful Astro reconstruction of [spalk.tv](https://www.spalk.tv/), based on
the asset-complete [`ghiffarr/Spalk-v0`](https://github.com/ghiffarr/Spalk-v0)
Webflow export and verified against the production site.

The project follows the same preservation and editing structure as Max Space
Astro: untouched source documents, numbered editable page fragments, a shared
renderer, clean Astro routes, and local production assets.

## Portfolio overview

Website reconstruction completed as part of my web development work at **Dorxata**. The focus is migrating an existing Webflow site into Astro while preserving its design, content, assets, and responsive behavior.

### My contribution

I worked on the website rebuild and migration workflow: organizing the imported source, adapting it for Astro, reviewing responsive layouts and interactions, and resolving issues during QA. This is an AI-assisted development workflow. The original website design and brand assets belong to their respective owners; my contribution is the reconstruction and implementation work.

### Technologies

Astro · HTML · CSS · JavaScript · Node.js

**Requirements:** Node.js 22.12.0 or later and npm.

### Verification evidence

See [design-qa.md](design-qa.md) for the repository's recorded desktop/mobile comparisons, interaction checks, build results, and limitations. Those records describe the earlier rebuild verification; they are not a new test run.

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

---

[More projects and my profile](https://github.com/ghiffarr)
