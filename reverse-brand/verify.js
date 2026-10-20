#!/usr/bin/env node
'use strict';
// verify.js <out/host> — checks the guide against the spec, then screenshots every section for review.
const fs = require('fs');
const path = require('path');

const REQUIRED = ['Overview', 'Contents', 'Token rebuild test', 'Typography', 'Fonts', 'Colour', 'Layout and spacing', 'Components', 'Imagery', 'Voice and tone', 'Design tokens', 'Method'];
const LIGHT_MAX = 150 * 1024, HERO_MAX = 4 * 1024 * 1024;

async function checkEdition(browser, file, { hero, tokens }) {
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name: `${path.basename(file)}: ${name}`, ok: !!ok, detail });
  const size = fs.statSync(file).size;
  add(`size ≤ ${hero ? '4 MB' : '150 KB'}`, size <= (hero ? HERO_MAX : LIGHT_MAX), `${Math.round(size / 1024)} KB`);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, offline: true });
  const page = await ctx.newPage();
  const url = 'file://' + path.resolve(file);
  const requests = [];
  page.on('request', (r) => { if (r.url() !== url && !r.url().startsWith('data:')) requests.push(r.url()); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  add('opens offline with zero network requests', requests.length === 0, requests.length ? requests.slice(0, 3).join(', ') : '0 requests');
  add('no script errors', errors.length === 0, errors.slice(0, 2).join('; ') || 'none');

  const r = await page.evaluate((REQ) => {
    const heads = [...document.querySelectorAll('h1,h2')].map((h) => h.textContent.trim());
    const missing = REQ.filter((t) => !heads.includes(t) && !document.querySelector(`[aria-label="${t}"]`));
    const has = (sel) => { const el = document.querySelector(sel); return !!el && /Unofficial analysis/.test(el.textContent); };
    let jsonOk = false; try { JSON.parse(document.getElementById('tok-json').textContent); jsonOk = true; } catch (e) { /* bad */ }
    return {
      missing, cover: has('#cover'), topbar: has('.topbar'), footer: has('footer'),
      disclaimer: /Not affiliated with or endorsed by .+\. Trademarks belong to their owners\./.test(document.body.textContent),
      jsonOk, quotes: document.querySelectorAll('.quotes blockquote').length, rules: document.querySelectorAll('.rules .rule').length,
      quoteWords: [...document.querySelectorAll('.quotes blockquote p')].map((p) => p.textContent.replace(/[“”]/g, '').trim().split(/\s+/).length),
      quoteLinks: [...document.querySelectorAll('.quotes blockquote a[href^="http"]')].length,
    };
  }, REQUIRED);
  add('required sections exist', r.missing.length === 0, r.missing.length ? `missing: ${r.missing.join(', ')}` : `${REQUIRED.length} sections`);
  add('"Unofficial analysis" on cover, top bar and footer', r.cover && r.topbar && r.footer, `cover ${r.cover}, top bar ${r.topbar}, footer ${r.footer}`);
  add('disclaimer present', r.disclaimer);
  add('embedded token JSON parses', r.jsonOk);
  add('five quotes (≤ 15 words, with source links)', r.quotes === 5 && r.quoteWords.every((w) => w <= 15) && r.quoteLinks === 5, `${r.quotes} quotes, words ${r.quoteWords.join('/')}, ${r.quoteLinks} links`);
  add('three rules', r.rules === 3, `${r.rules}`);

  // rebuilt components: computed style must equal the token values
  const rb = await page.evaluate((tok) => {
    const out = [];
    const toRgb = (hex) => { const h = hex.replace('#', ''); const n = (i) => parseInt(h.slice(i, i + 2), 16); const a = h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1; return a === 1 ? `rgb(${n(0)}, ${n(2)}, ${n(4)})` : `rgba(${n(0)}, ${n(2)}, ${n(4)}, ${a})`; };
    const norm = (v) => String(v).replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`);
    const val = (pathStr) => { const [g, ...rest] = pathStr.split('-'); const t = tok[g] && tok[g][rest.join('-')]; return t ? t.$value : undefined; };
    const cmp = (el, prop, cssProp, tokenPath, kind) => {
      const got = getComputedStyle(el)[cssProp];
      let want = val(tokenPath);
      if (want === undefined) return out.push({ prop, ok: false, got, want: 'missing token ' + tokenPath });
      if (kind === 'color') want = toRgb(want);
      if (kind === 'radius' && want === '9999px') { const h = el.getBoundingClientRect().height; const ok = parseFloat(got) >= h / 2; return out.push({ el: el.className, prop, ok, got, want }); }
      if (kind === 'weight') want = String(want);
      out.push({ el: el.className.split(' ')[0], prop, ok: norm(got) === norm(want), got, want });
    };
    const btn = document.querySelector('.rb-button');
    const p = btn.dataset.tokenPrefix;
    cmp(btn, 'background', 'backgroundColor', `${p}-bg`, 'color');
    cmp(btn, 'color', 'color', `${p}-fg`, 'color');
    cmp(btn, 'radius', 'borderTopLeftRadius', `${p}-radius`, 'radius');
    cmp(btn, 'height', 'height', `${p}-height`);
    cmp(btn, 'padding-x', 'paddingLeft', `${p}-pad-x`);
    cmp(btn, 'font-size', 'fontSize', `${p}-font-size`);
    cmp(btn, 'font-weight', 'fontWeight', `${p}-weight`, 'weight');
    document.querySelectorAll('.rb-card[data-token-prefix="card"]').forEach((c) => {
      cmp(c, 'background', 'backgroundColor', 'card-bg', 'color');
      cmp(c, 'radius', 'borderTopLeftRadius', 'card-radius');
      cmp(c, 'padding-x', 'paddingLeft', 'card-pad-x');
      cmp(c, 'padding-y', 'paddingTop', 'card-pad-y');
    });
    return out;
  }, tokens);
  const bad = rb.filter((x) => !x.ok);
  add('rebuild button and cards equal token values', rb.length >= 11 && !bad.length, bad.length ? bad.map((b) => `${b.prop}: ${b.got} ≠ ${b.want}`).join('; ') : `${rb.length} properties matched`);

  // AI label on every embedded image
  const ai = await page.evaluate(() => {
    const all = [...document.querySelectorAll('body *')].filter((el) => /url\("?data:image/.test(getComputedStyle(el).backgroundImage));
    const unlabeled = all.filter((el) => { const scope = el.parentElement; return !/AI-generated image/.test(el.textContent) && !(scope && [...scope.children].some((c) => c !== el && /AI-generated image/.test(c.textContent) && c.children.length === 0)); });
    return { total: all.length, unlabeled: unlabeled.map((e) => e.className).slice(0, 5) };
  });
  add('AI label on every image', ai.unlabeled.length === 0, `${ai.total} image elements${ai.unlabeled.length ? `; unlabeled: ${ai.unlabeled.join(', ')}` : ''}`);
  if (!hero) add('light edition embeds no images', ai.total === 0, `${ai.total}`);
  await ctx.close();

  // no horizontal scroll at 390px
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, offline: true });
  const mp = await m.newPage();
  await mp.goto(url, { waitUntil: 'load' });
  const sw = await mp.evaluate(() => { document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); return { sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, wide: [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('pre,.tscroll,.code')).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`) }; });
  add('no horizontal scroll at 390px', sw.sw <= 390 && sw.bw <= 390, `scrollWidth ${sw.sw}${sw.wide.length ? `; overflowing: ${sw.wide.join(', ')}` : ''}`);
  await m.close();
  return checks;
}

async function screenshots(browser, outDir) {
  const dir = path.join(outDir, 'screenshots');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const shots = [];
  const editions = [['brand-guide.html', 'light']];
  const manifestFile = path.join(outDir, 'images', 'manifest.json');
  if (fs.existsSync(manifestFile) && Object.values(JSON.parse(fs.readFileSync(manifestFile, 'utf8'))).some((m) => m.status === 'done')) editions.push(['brand-guide-hero.html', 'hero']);
  for (const [file, ed] of editions) {
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto('file://' + path.join(outDir, file), { waitUntil: 'load' });
      await page.evaluate(() => { document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in')); });
      const ids = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((s, i) => { if (!s.id) s.id = `sec-${i}`; return s.id; }));
      for (const [i, id] of ids.entries()) {
        const el = page.locator(`#${id}`);
        await page.evaluate((cover) => { document.querySelector('.topbar').style.visibility = cover ? '' : 'hidden'; }, id === 'cover');
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(120);
        const f = path.join(dir, `${ed}-${w}-${String(i + 1).padStart(2, '0')}-${id}.png`);
        await el.screenshot({ path: f, animations: 'disabled' });
        shots.push(f);
      }
      await ctx.close();
    }
  }
  return shots;
}

async function verify(outDir, { log = console.log } = {}) {
  const { launch } = require('./lib/capture');
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
  let tokens = null;
  try { tokens = JSON.parse(fs.readFileSync(path.join(outDir, 'tokens.json'), 'utf8')); add('tokens.json parses', true, `${Object.keys(tokens).length - 2} groups`); } catch (e) { add('tokens.json parses', false, e.message); }
  const css = fs.readFileSync(path.join(outDir, 'tokens.css'), 'utf8');
  add('tokens.css defines custom properties', (css.match(/--[\w-]+:/g) || []).length > 50, `${(css.match(/--[\w-]+:/g) || []).length} properties`);
  for (const f of ['snapshot.json', 'prompts.json', 'run-log.md'].filter((x) => x !== 'run-log.md')) add(`${f} exists`, fs.existsSync(path.join(outDir, f)));
  const slides = fs.existsSync(path.join(outDir, 'slides')) ? fs.readdirSync(path.join(outDir, 'slides')).filter((f) => f.endsWith('.png')) : [];
  add('slides: 8 Instagram + 4 X', slides.filter((f) => f.startsWith('ig-')).length === 8 && slides.filter((f) => f.startsWith('x-')).length === 4, `${slides.length} PNGs`);
  const browser = await launch();
  let shots = [];
  try {
    checks.push(...await checkEdition(browser, path.join(outDir, 'brand-guide.html'), { hero: false, tokens }));
    checks.push(...await checkEdition(browser, path.join(outDir, 'brand-guide-hero.html'), { hero: true, tokens }));
    shots = await screenshots(browser, outDir);
  } finally { await browser.close(); }
  const passed = checks.filter((c) => c.ok).length;
  for (const c of checks) log(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  log(`  ${passed}/${checks.length} passed · ${shots.length} screenshots`);
  return { checks, passed, failed: checks.length - passed, screenshots: shots };
}

module.exports = { verify };
if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: node verify.js out/<host>'); process.exit(1); }
  verify(path.resolve(dir)).then((r) => process.exit(r.failed ? 1 : 0), (e) => { console.error(e); process.exit(1); });
}
