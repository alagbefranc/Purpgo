#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { capture, launch, ChallengeError } = require('../lib/capture');
const { buildSnippet } = require('../lib/snippet');
const { analyse } = require('../lib/analyse');
const { buildTokens, toCss, toJson } = require('../lib/tokens');
const { buildPrompts, generateApi, importManual, loadImages } = require('../lib/images');
const guide = require('../lib/guide');
const { renderSlides } = require('../lib/slides');
const { renderVideo } = require('../lib/video');
const { verify } = require('../verify');
const { writeRunLog } = require('../lib/runlog');
const pkg = require('../package.json');

const USAGE = `reverse-brand ${pkg.version} — turn a public brand website into an unofficial, measured brand guide.

Usage
  reverse-brand <url> [options]
  reverse-brand --snapshot snapshot.json [options]

Options
  --images none|api|manual   Image mode (default none: gradient fallbacks are the design)
  --provider <name>          With --images api: openai | gemini | fal | replicate (key read from .env)
  --import                   With --images manual: build the manifest from images/<slot>.png|jpg|webp
  --headed                   Visible browser; if a bot check appears, you complete it, then capture continues
  --snapshot <file>          Skip capture; analyse a snapshot.json (e.g. from the DevTools snippet)
  --out <dir>                Output root (default ./out); files go to <out>/<host>/
  --name <brand>             Brand name for titles (default from the host name)
  --max-pages <n>            Home + up to n-1 key pages (default 5, minimum 4)
  --stills                   Render one still per video scene and skip the MP4
  --no-video                 Skip the video
  --no-verify                Skip verify.js and the review screenshots
`;

function args(argv) {
  const o = { images: 'none', out: 'out', maxPages: 5, video: true, verify: true };
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    if (a === '--images') o.images = val();
    else if (a === '--provider') o.provider = val();
    else if (a === '--import') o.import = true;
    else if (a === '--headed') o.headed = true;
    else if (a === '--snapshot') o.snapshot = val();
    else if (a === '--out') o.out = val();
    else if (a === '--name') o.name = val();
    else if (a === '--max-pages') o.maxPages = Math.max(4, +val());
    else if (a === '--stills') o.stills = true;
    else if (a === '--no-video') o.video = false;
    else if (a === '--no-verify') o.verify = false;
    else if (a === '-h' || a === '--help') o.help = true;
    else rest.push(a);
  }
  o.url = rest[0];
  return o;
}

async function main() {
  const o = args(process.argv.slice(2));
  if (o.help || (!o.url && !o.snapshot)) { process.stdout.write(USAGE); process.exit(o.help ? 0 : 1); }
  if (!['none', 'api', 'manual'].includes(o.images)) throw new Error('--images must be none, api or manual');
  const log = (...m) => console.log(...m);
  const phases = [];
  const phase = async (name, fn, note) => { const t0 = Date.now(); log(`\n▸ ${name}`); const r = await fn(); phases.push({ name, ms: Date.now() - t0, note: typeof note === 'function' ? note(r) : note }); return r; };

  // 1. capture
  let snapshot, outDir;
  if (o.snapshot) {
    snapshot = JSON.parse(fs.readFileSync(o.snapshot, 'utf8'));
    outDir = path.resolve(o.out, snapshot.meta.host);
    fs.mkdirSync(outDir, { recursive: true });
    phases.push({ name: 'Capture', ms: 0, note: `loaded ${path.basename(o.snapshot)} (${snapshot.meta.mode})` });
  } else {
    const url = /^https?:\/\//.test(o.url) ? o.url : `https://${o.url}`;
    outDir = path.resolve(o.out, new URL(url).host);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'devtools-snippet.js'), buildSnippet({ version: pkg.version }));
    try {
      snapshot = await phase('Capture', () => capture(url, { headed: o.headed, maxPages: o.maxPages, log }), (s) => `${s.pages.length} pages + 390px home pass`);
    } catch (e) {
      if (/net::ERR_|ECONNREFUSED|ENOTFOUND|Timeout/.test(e.message) && !(e instanceof ChallengeError)) {
        console.error(`\n✋ Could not load ${url}: ${e.message.split('\n')[0]}
This machine cannot reach the site (network policy, proxy or DNS). Capture from your own browser instead:
  open ${url}, DevTools → Console, paste ${path.join(outDir, 'devtools-snippet.js')}
  then: reverse-brand --snapshot snapshot.json\n`);
        process.exit(3);
      }
      if (!(e instanceof ChallengeError)) throw e;
      console.error(`\n✋ ${e.message}. Stopped — reverse-brand does not bypass bot checks or CAPTCHAs.\n
Two ways to continue:
  (a) reverse-brand ${o.url} --headed
      A visible browser opens; complete the check yourself, and capture continues.
  (b) Open ${o.url} in your own browser, complete any check, open DevTools → Console,
      paste ${path.join(outDir, 'devtools-snippet.js')}
      It runs the same extractor in same-origin iframes at 1440px and 390px and downloads snapshot.json.
      Then: reverse-brand --snapshot snapshot.json\n`);
      process.exit(2);
    }
    fs.writeFileSync(path.join(outDir, 'snapshot.json'), JSON.stringify(snapshot));
  }
  if (o.snapshot) fs.copyFileSync(o.snapshot, path.join(outDir, 'snapshot.json'));
  if (!fs.existsSync(path.join(outDir, 'devtools-snippet.js'))) fs.writeFileSync(path.join(outDir, 'devtools-snippet.js'), buildSnippet({ version: pkg.version }));

  // 2. analyse
  const a = await phase('Analyse', () => analyse(snapshot), (r) => `${r.counts.elementsVisible} visible elements, ${r.assumptions.length} assumptions`);
  fs.writeFileSync(path.join(outDir, 'analysis.json'), JSON.stringify(a, null, 2));

  // 3. tokens
  const { T, tokensCss, tokensJson } = await phase('Tokens', () => { const T = buildTokens(a); return { T, tokensCss: toCss(T, a), tokensJson: toJson(T, a) }; }, (r) => `${Object.keys(r.T).length} tokens`);
  fs.writeFileSync(path.join(outDir, 'tokens.css'), tokensCss);
  fs.writeFileSync(path.join(outDir, 'tokens.json'), tokensJson);

  // 4. images
  const prompts = buildPrompts(a, { mode: o.images, style: process.env.PHOTO_STYLE });
  fs.writeFileSync(path.join(outDir, 'prompts.json'), JSON.stringify(prompts, null, 2));
  fs.mkdirSync(path.join(outDir, 'images'), { recursive: true });
  const manifestFile = path.join(outDir, 'images', 'manifest.json');
  let manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
  await phase('Images', async () => {
    if (o.images === 'none') { log('  IMAGES=none — gradient fallbacks are the design.'); manifest = {}; }
    else if (o.images === 'api') { if (!o.provider) throw new Error('--images api needs --provider openai|gemini|fal|replicate'); manifest = await generateApi(prompts, outDir, { provider: o.provider, log }); }
    else if (o.import) manifest = importManual(prompts, outDir, { log });
    else {
      log(`  IMAGES=manual — generate these in any tool, save them as ${path.join(outDir, 'images')}/<slot>.png, then re-run with --import:\n`);
      for (const s of prompts.slots) log(`  [${s.slot}] ${s.aspectRatio}, ≥${s.resolution}px wide\n    ${s.prompt}\n`);
    }
  }, () => `mode ${o.images}${o.provider ? ` (${o.provider})` : ''}; ${Object.values(manifest).filter((m) => m.status === 'done').length} images`);
  const images = loadImages(outDir, manifest);

  // 5. guide (two editions)
  const runLog = { phases, mode: snapshot.meta.mode, browser: snapshot.meta.browser };
  const files = { tokensCss, tokensJson, prompts, manifest, runLog };
  await phase('Guide', () => {
    fs.writeFileSync(path.join(outDir, 'brand-guide.html'), guide.build(a, T, files, { edition: 'light', name: o.name }));
    fs.writeFileSync(path.join(outDir, 'brand-guide-hero.html'), guide.build(a, T, files, { edition: 'hero', images, name: o.name }));
  }, () => `light ${kb(path.join(outDir, 'brand-guide.html'))} KB · hero ${kb(path.join(outDir, 'brand-guide-hero.html'))} KB`);

  // 6–7. slides and video
  const browser = await launch();
  let video = null;
  try {
    await phase('Slides', () => renderSlides(browser, a, T, images, outDir, { name: o.name, tokensCss }), (f) => `${f.length} PNGs`);
    if (o.video || o.stills) {
      video = await phase(o.stills ? 'Video stills' : 'Video', () => renderVideo(browser, a, T, images, outDir, { name: o.name, tokensCss, stillsOnly: !!o.stills, log }),
        (v) => (v.file ? `${v.frames} frames, ${v.seconds.toFixed(1)} s, ${kb(v.file)} KB` : `${v.stills.length} stills`));
    }
  } finally { await browser.close(); }

  // 8. verify + review screenshots
  let report = null;
  if (o.verify) report = await phase('Verify', () => verify(outDir, { log }), (r) => `${r.passed}/${r.checks.length} checks passed`);

  // rebuild the guide once more so its Method section carries the final timings
  fs.writeFileSync(path.join(outDir, 'brand-guide.html'), guide.build(a, T, files, { edition: 'light', name: o.name }));
  fs.writeFileSync(path.join(outDir, 'brand-guide-hero.html'), guide.build(a, T, files, { edition: 'hero', images, name: o.name }));
  writeRunLog(outDir, { a, snapshot, phases, manifest, prompts, video, report, opts: o });
  log(`\n✓ ${outDir}`);
  if (report && report.failed) { log(`✗ ${report.failed} verify check(s) failed — see run-log.md`); process.exitCode = 1; }
}
const kb = (f) => Math.round(fs.statSync(f).size / 1024);

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
