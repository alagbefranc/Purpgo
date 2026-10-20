# reverse-brand

Turns a public brand website into an **unofficial**, art-directed brand guide. Every value in it is measured from computed styles, turned into tokens, and used to rebuild the samples, so the guide also shows that the tokens work.

```
reverse-brand https://example.com            # IMAGES=none (default)
reverse-brand https://example.com --images manual            # prints prompts
reverse-brand https://example.com --images manual --import   # uses images/<slot>.png
reverse-brand https://example.com --images api --provider fal   # key in .env
reverse-brand --snapshot snapshot.json       # from the DevTools snippet
node verify.js out/<host>                    # re-run the checks
```

Requires Node ≥ 20, ffmpeg (with libx264 and libwebp) and Chrome or Playwright's Chromium (`CHROME_PATH` overrides).

## What it does

| Phase | Output |
|---|---|
| Capture: Playwright, `--disable-gpu`. Home + 3–5 scored pages at 1440×900, home again at 390×844 | `snapshot.json` |
| Analyse: dedupe chrome, type roles and clamp(), colour roles with OKLCH and contrast, spacing base, grid, radii, components, imagery, voice | `analysis.json` |
| Tokens: CSS custom properties + W3C design-tokens JSON | `tokens.css`, `tokens.json` |
| Images: none / api / manual | `prompts.json`, `images/` |
| Guide: two editions | `brand-guide.html` (≤ 150 KB, no images), `brand-guide-hero.html` (WebP embedded once each) |
| Social | `slides/` 8 × 1080×1350, 4 × 1600×900 |
| Video: 11 scenes, frame-accurate, 60 fps | `video/<host>-presentation-1920x1080-60fps.mp4`, `video/stills/` |
| Verify + review screenshots | `screenshots/`, `run-log.md` |

## Rules it keeps

- "Unofficial analysis" on the cover, top bar, footer, every slide and the video, plus "Not affiliated with or endorsed by …".
- It never copies logos, font files or the brand's images. Logos become dashed placeholders at their measured size and colour.
- It never bypasses bot checks. When it detects a challenge it stops (exit 2) and offers `--headed`, where you complete the check, or the DevTools snippet written to `out/<host>/devtools-snippet.js`. If the site can't be reached at all it exits 3 with the same snippet route.
- AI images are generated from text prompts only and are labelled "AI-generated image" everywhere they appear.

## Images = api

`lib/images.js` has adapters for `openai`, `gemini`, `fal` and `replicate`. Keys are read from `.env` (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `FAL_KEY`, `REPLICATE_API_TOKEN`) and never logged. Queue-based providers save the job id to `images/jobs.json` before polling, so a re-run resumes a paid job. Downloads stream to disk. None of these providers exposes a balance endpoint the tool can call, so it estimates the cost first and refuses to start if `IMAGE_BUDGET_USD` would be exceeded. `IMAGE_COST_USD` overrides the built-in list-price estimate. The adapters have not been run against live APIs yet.

## Test

`npm run test:fixture` serves a fictional bank site from `test/fixture-site/` on localhost and runs the whole pipeline. `examples/lumen-fixture/` holds the output of that run.
