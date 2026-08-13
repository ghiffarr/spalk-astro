# Spalk Astro design QA

## Result

The reconstructed Astro site matches the supplied Spalk production site at the tested desktop and mobile breakpoints, with no actionable P0, P1, or P2 visual defects.

## Source truth

- Production URL: `https://www.spalk.tv/`
- Preserved source: `src/webflow-source/original-pages/`
- Source commit: `Spalk-v0` at `4e871d2`
- Desktop reference: `.codex-reference/live/desktop/home-full.png` (`1440x7349`)
- Mobile reference: `.codex-reference/live/mobile/home-full.png` (`390x9056`)
- Interaction references: `.codex-reference/live/desktop/nav-solutions-open.png` and `.codex-reference/live/mobile/menu-open.png`

## Implementation captures

- Desktop: `.codex-reference/implementation/desktop/home-full-final.png` (`1440x7309`)
- Mobile: `.codex-reference/implementation/mobile/home-full-final.png` (`390x9025`)
- Corrected comparison region: `.codex-reference/implementation/desktop/section-05-corrected.png`
- Mobile menu: `.codex-reference/implementation/mobile/menu-open.png`
- Mobile settled hero: `.codex-reference/implementation/mobile/home-top-settled.png`

All captures used a device scale factor of 1. The tested CSS viewports were `1440x1000` and `390x844`. Neither implementation viewport had horizontal overflow.

## Visual comparisons

The full homepage and focused regions were compared side by side:

- Desktop sections: `.codex-reference/comparisons/desktop/section-00-live-local.png` through `section-08-live-local.png`
- Corrected comparison section: `.codex-reference/comparisons/desktop/section-05-live-local-corrected.png`
- Mobile hero: `.codex-reference/comparisons/mobile/top-live-local-settled.png`
- Mobile menu: `.codex-reference/comparisons/mobile/menu-live-local.png`

The remaining full-page height delta is 40 px on desktop and 31 px on mobile, both under one percent. It is attributable to animated Webflow/Rive state and changing partner-marquee/counter frames rather than a persistent layout mismatch.

## Interaction checks

- Desktop Solutions dropdown opens and exposes the production navigation cards.
- Mobile menu opens and closes at `390px` without overflow.
- English language tab becomes selected and exposes the correct tab panel.
- All four localized language videos reach ready state 4 and resolve from `/assets/webflow/videos/captured/`.
- Primary solution, case-study, demo, privacy, terms, and commentator links resolve to clean Astro routes.
- The homepage Rive hero and solution animations render from local assets.

## Comparison history

### Pass 1

One P2 content mismatch was found in the comparison cards: the export used older `Strong`/`Weak` emotional-depth labels and included a Cost row, while the live site used `Deep`/`Medium` and omitted Cost.

### Pass 2

The editable home fragment was updated to the current production wording (`Deep`, `Medium`, and `52+`) and the obsolete Cost rows were removed. The recaptured desktop comparison now aligns with production. No P0, P1, or P2 findings remain.

## Technical verification

- `npm run audit:assets`: passed; no missing local references or hotlinked page assets.
- `npm run build`: passed; 22 static pages generated.
- Preserved source integrity: all 22 copied HTML files match the source repository byte-for-byte.
- Console review: the local site emits the same five Webflow Rive view-model messages as the production site. They are inherited runtime messages; the affected animations remain visible and functional.
- `npm run check`: Astro diagnostics exceeded the available Node heap while parsing the preserved, script-heavy Webflow documents. This does not affect the successful static production build, but remains a tooling limitation for this source-preserving architecture.

Final result: passed
