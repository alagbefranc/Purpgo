# reverse-brand run log — 127.0.0.1:40491

Unofficial analysis. Not affiliated with or endorsed by the brand owner. Trademarks belong to their owners.

- Source: http://127.0.0.1:40491/
- Captured: 2026-10-20T18:02:49.981Z (playwright-headless, Playwright default Chromium)
- Images mode: none

## Timing per phase

| Phase | Time | Note |
|---|---|---|
| Capture | 12.4 s | 5 pages + 390px home pass |
| Analyse | 0.0 s | 397 visible elements, 2 assumptions |
| Tokens | 0.0 s | 149 tokens |
| Images | 0.0 s | mode none; 0 images |
| Guide | 0.0 s | light 128 KB · hero 128 KB |
| Slides | 2.2 s | 12 PNGs |
| Video | 226.1 s | 2676 frames, 44.6 s, 10853 KB |
| Verify | 11.8 s | 30/30 checks passed |
| **Total** | **252.6 s** | |

## Pages

| Page | Link score | Visible elements | Doc height |
|---|---|---|---|
| http://127.0.0.1:40491/ | home | 93 of 97 | 3775px |
| http://127.0.0.1:40491/personal/ | 12 | 76 of 80 | 2197px |
| http://127.0.0.1:40491/business/ | 12 | 76 of 80 | 2197px |
| http://127.0.0.1:40491/pricing/ | 12 | 76 of 80 | 2167px |
| http://127.0.0.1:40491/company/ | 12 | 76 of 80 | 2167px |
| http://127.0.0.1:40491/ @390×844 | mobile pass | 87 of 97 | 5629px |

Elements: 417 walked, 397 visible, 5 excluded as cookie/consent UI. Buttons 9, cards 27, media 15, headings 34 (after dedupe).

Dedupe (keys or items identical on every page, counted once): textColors 2, bgColors 1, borderColors 1, fills 1, radii 1, breakpoints 3, backdrop 1, pairs 2, spacing.padding 2, spacing.margin 4, spacing.gap 1, textStyles 4, buttons 4, cards 4, media 16, headings 28, paragraphs 20, grids 4.

Link candidates (top 10):

- 12 · http://127.0.0.1:40491/personal/ ("Personal")
- 12 · http://127.0.0.1:40491/business/ ("Business")
- 12 · http://127.0.0.1:40491/pricing/ ("Pricing")
- 12 · http://127.0.0.1:40491/company/ ("Company")

## Sizes

| File | Size |
|---|---|
| brand-guide.html | 128 KB |
| brand-guide-hero.html | 128 KB |
| tokens.css | 6 KB |
| tokens.json | 33 KB |
| snapshot.json | 83 KB |
| prompts.json | 5 KB |
| video/127.0.0.1-40491-presentation-1920x1080-60fps.mp4 | 10853 KB (2676 frames, 44.6 s @ 60 fps) |
| slides/ | 12 PNGs |

## Images and cost

No images generated (mode none). Image cost: $0.00. Every image slot uses a CSS gradient built from the tokens.

## LLM token usage

reverse-brand makes no LLM calls; analysis is deterministic. The agent session that wrote and ran it is billed separately and its token count is not visible to the tool.

## Assumptions

- Viewports: 1440×900 for every page; 390×844 for the home page only.
- Browser: Playwright default Chromium, launched with --disable-gpu.
- Page picks: same-origin links scored (+5 in header/nav, +4 product/pricing/business/company-type paths, +2 one-segment paths); legal, help, login, careers and locale duplicates skipped; one page per top-level path.
- Counts identical on every page are treated as header/footer chrome and counted once.
- Cookie/consent UI excluded by id/class pattern and by dialog text.
- Type roles: heading sizes clustered within 12%; largest cluster is "display" only if ≥ 40px and ≥ 1.15× the next; mobile sizes matched by identical heading text at 390px.
- Colour: text weighted by characters, backgrounds by exclusive painted area (each layer minus painted children); action = most common filled button.
- Fonts: font files and logos are never copied; specimens render with a local copy when installed.
- Type: h4 not found as its own size cluster; interpolated at 20px.
- Type: some roles had no matching text at 390px; mobile size scaled by the median matched ratio (or ×0.7).

## Verify

30/30 checks passed.

- ✓ tokens.json parses — 17 groups
- ✓ tokens.css defines custom properties — 149 properties
- ✓ snapshot.json exists
- ✓ prompts.json exists
- ✓ slides: 8 Instagram + 4 X — 12 PNGs
- ✓ brand-guide.html: size ≤ 150 KB — 128 KB
- ✓ brand-guide.html: opens offline with zero network requests — 0 requests
- ✓ brand-guide.html: no script errors — none
- ✓ brand-guide.html: required sections exist — 12 sections
- ✓ brand-guide.html: "Unofficial analysis" on cover, top bar and footer — cover true, top bar true, footer true
- ✓ brand-guide.html: disclaimer present
- ✓ brand-guide.html: embedded token JSON parses
- ✓ brand-guide.html: five quotes (≤ 15 words, with source links) — 5 quotes, words 3/3/3/4/4, 5 links
- ✓ brand-guide.html: three rules — 3
- ✓ brand-guide.html: rebuild button and cards equal token values — 19 properties matched
- ✓ brand-guide.html: AI label on every image — 0 image elements
- ✓ brand-guide.html: light edition embeds no images — 0
- ✓ brand-guide.html: no horizontal scroll at 390px — scrollWidth 390; overflowing: div.img-bg, div.img-bg, span., span., span.
- ✓ brand-guide-hero.html: size ≤ 4 MB — 128 KB
- ✓ brand-guide-hero.html: opens offline with zero network requests — 0 requests
- ✓ brand-guide-hero.html: no script errors — none
- ✓ brand-guide-hero.html: required sections exist — 12 sections
- ✓ brand-guide-hero.html: "Unofficial analysis" on cover, top bar and footer — cover true, top bar true, footer true
- ✓ brand-guide-hero.html: disclaimer present
- ✓ brand-guide-hero.html: embedded token JSON parses
- ✓ brand-guide-hero.html: five quotes (≤ 15 words, with source links) — 5 quotes, words 3/3/3/4/4, 5 links
- ✓ brand-guide-hero.html: three rules — 3
- ✓ brand-guide-hero.html: rebuild button and cards equal token values — 19 properties matched
- ✓ brand-guide-hero.html: AI label on every image — 0 image elements
- ✓ brand-guide-hero.html: no horizontal scroll at 390px — scrollWidth 390; overflowing: div.img-bg, div.img-bg, span., span., span.

Screenshots: 28 in screenshots/.
