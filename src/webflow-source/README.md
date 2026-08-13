# Preserved Spalk source

The HTML documents in `original-pages/` are an unchanged snapshot of the
[`ghiffarr/Spalk-v0`](https://github.com/ghiffarr/Spalk-v0) Webflow export at
commit `4e871d2`.

Astro renders organized copies in `src/content/pages/`; it does not render these
monolithic source documents directly. Run `npm run organize:webflow` only when
the editable directory does not exist. Passing `-- --force` knowingly replaces
all section-level edits from this preserved snapshot.

The CSV and JSON export data is retained in `data/`. Original images, Rive
documents, styles, and scripts live in `public/assets/webflow/`.
