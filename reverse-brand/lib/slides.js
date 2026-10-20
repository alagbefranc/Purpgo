'use strict';
const fs = require('fs');
const path = require('path');
const { baseCss, brandName, grounds, buttonFor, esc } = require('./guide');

function slideCss(w, h) {
  return `
html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
.slide{position:relative;width:${w}px;height:${h}px;overflow:hidden;display:flex;flex-direction:column}
.pad{padding:64px}
.badge{position:absolute;z-index:5;top:40px;left:48px}
.credit{position:absolute;z-index:5;font:600 16px/1 var(--font-sans);padding:9px 14px;border-radius:9999px;background:color-mix(in oklab, var(--color-surface-inverse) 72%, transparent);color:var(--color-text-inverse)}
.foot{position:absolute;left:48px;right:48px;bottom:36px;display:flex;justify-content:space-between;font:500 17px/1.3 var(--font-sans);opacity:.75;gap:24px;z-index:4}
.ttl{font-family:var(--font-display);font-weight:var(--type-display-weight);letter-spacing:var(--type-display-tracking);line-height:var(--type-display-leading);margin:0}
.h{font-family:var(--font-display);font-weight:var(--type-h1-weight);letter-spacing:var(--type-h1-tracking);line-height:var(--type-h1-leading);margin:0}
.p{font-size:28px;line-height:1.4;margin:0}
.mono{font:500 20px/1.45 ui-monospace, Menlo, Consolas, monospace}
.unofficial{font-size:18px;padding:10px 16px;background:color-mix(in oklab, var(--g-bg) 70%, transparent)}
.sw{border-radius:calc(var(--card-radius) * .66);display:flex;flex-direction:column;justify-content:flex-end;padding:18px;font:600 20px/1.3 var(--font-sans)}
`;
}

function slides(a, T, images, { name, tokensCss } = {}) {
  const brand = brandName(a, name);
  const g = grounds(a);
  const R = Object.fromEntries(a.colour.roles.map((r) => [r.role, r]));
  const tf = (hex) => (require('./color').contrast(hex, '#ffffff') >= require('./color').contrast(hex, '#111111') ? '#ffffff' : '#111111');
  const B = a.components.buttons;
  const btnL = buttonFor(a, g.lightHex), btnD = buttonFor(a, g.darkHex);
  const disc = `Unofficial analysis · Not affiliated with or endorsed by ${esc(brand)} · Trademarks belong to their owners`;
  const photo = (slot, style) => `<div class="img img-${slot}" style="${style}">${images[slot] ? '<span class="credit" style="right:20px;bottom:20px">AI-generated image</span>' : ''}</div>`;
  const badge = '<span class="unofficial badge">Unofficial analysis</span>';
  const roles = a.type.roles;
  const variants = Object.entries(B).filter(([, v]) => v);

  const ig = [
    ['cover', 'ground-dark', `${photo('hero', 'height:640px;flex:none')}${badge}
      <div class="pad" style="display:grid;gap:28px"><h1 class="ttl" style="font-size:104px">${esc(brand)}<br>brand guidelines</h1>
      <p class="p muted">Measured from ${a.pages.length} pages of ${esc(a.host)}: ${a.type.families.length} typeface${a.type.families.length > 1 ? 's' : ''}, ${a.colour.roles.length} colour roles, ${a.layout.base}px spacing base.</p>
      <div><span class="btn-${btnD}">Swipe for the tokens</span></div></div>`],
    ['typography', 'ground-light', `${badge}<div class="pad" style="padding-top:120px;display:grid;gap:22px">
      <p class="p muted">Typography</p><div style="font:var(--type-display-weight) 260px/0.9 var(--font-display);letter-spacing:-.04em">Aa</div>
      <p class="h" style="font-size:44px">${esc(a.type.families.map((f) => f.family).join(' · '))}</p>
      ${['display', 'h1', 'h2', 'h3', 'lead', 'body'].map((k) => `<div style="display:flex;justify-content:space-between;border-top:1px solid color-mix(in oklab, var(--g-fg) 18%, transparent);padding-top:14px;font-size:24px"><b>${k}</b><span>${roles[k].mobile}→${roles[k].size}px · ${roles[k].weight} · ${roles[k].lineHeight}</span></div>`).join('')}
      <p class="p muted" style="font-size:22px">Scale ratio ${a.type.ratio} (${esc(a.type.interval.name)})</p></div>`],
    ['colour', 'ground-dark', `${badge}<div class="pad" style="padding-top:120px;display:grid;gap:18px;grid-template-columns:1fr 1fr;align-content:start">
      <p class="h" style="font-size:64px;grid-column:span 2">Colour</p>
      ${['background', 'surface-inverse', 'text', 'action', 'accent', 'border'].map((k) => `<div class="sw" style="height:250px;background:var(--color-${k});color:${tf(R[k].hex)};border:1px solid color-mix(in oklab, var(--g-fg) 32%, transparent)"><span>${k}</span><span style="font-weight:500">${R[k].hex} · ${R[k].contrast ? R[k].contrast + ':1' : Math.round(R[k].share * 100) + '%'}</span></div>`).join('')}
      <div style="grid-column:span 2;height:90px;border-radius:var(--card-radius);background:var(--gradient-brand)"></div></div>`],
    ['layout', 'ground-light', `${badge}<div class="pad" style="padding-top:120px;display:grid;gap:26px">
      <p class="h" style="font-size:64px">Layout and spacing</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${[[`${a.layout.base}px`, 'base unit'], [a.layout.columns, 'columns'], [`${a.layout.gutter}px`, 'gutter'], [`${a.layout.container}px`, 'container']].map(([n, l]) => `<div style="padding:24px;border-radius:var(--card-radius);background:color-mix(in oklab, var(--g-fg) 6%, var(--g-bg))"><div class="h" style="font-size:72px">${n}</div><div class="p muted">${l}</div></div>`).join('')}</div>
      <div style="display:grid;gap:10px">${a.layout.scale.slice(0, 8).map((v, i) => `<div style="display:flex;gap:16px;align-items:center;font-size:20px"><span style="width:150px">--space-${i + 1}</span><i style="display:block;height:22px;width:calc(var(--space-${i + 1}) * 4);max-width:700px;background:var(--color-accent);border-radius:4px"></i><span>${v}px</span></div>`).join('')}</div></div>`],
    ['components', 'ground-dark', `${badge}<div class="pad" style="padding-top:120px;display:grid;gap:24px">
      <p class="h" style="font-size:64px">Components</p>
      ${variants.map(([k, v]) => `<div style="display:flex;align-items:center;gap:24px;padding:22px;border-radius:var(--card-radius);background:${v.ground || g.lightHex}"><span class="btn-${k}">${esc((v.labels || [])[0] || 'Button')}</span><span style="font-size:20px;color:${tf(v.ground || g.lightHex)}">${k} · ${v.pill ? 'pill' : v.radius + 'px'} · ${v.height}px</span></div>`).join('')}
      <div class="rb-card" style="background:var(--card-bg);border-radius:var(--card-radius);padding:var(--card-pad-y) var(--card-pad-x);box-shadow:var(--card-shadow);color:var(--color-text);display:grid;gap:10px"><b style="font-size:28px">Card</b><span style="font-size:20px">radius ${esc(T['card-radius'].css)} · padding ${esc(T['card-pad-y'].css)} / ${esc(T['card-pad-x'].css)}</span></div></div>`],
    ['voice', 'ground-light', `${photo('street', 'height:470px;flex:none')}${badge}<div class="pad" style="display:grid;gap:22px">
      <p class="h" style="font-size:48px">“${esc((a.voice.quotes[0] || { text: '' }).text)}”</p>
      <p style="font-size:18px;margin:0" class="muted">${esc(((a.voice.quotes[0] || {}).source || '').replace(/^https?:\/\//, ''))}</p>
      ${a.voice.rules.map((r, i) => `<div style="display:flex;gap:18px;font-size:25px;align-items:baseline"><b style="color:var(--color-accent);font-size:34px">${i + 1}</b><span>${esc(r.title)}</span></div>`).join('')}</div>`],
    ['tokens', 'ground-dark', `${badge}<div class="pad" style="padding-top:120px;display:grid;gap:22px">
      <p class="h" style="font-size:64px">Design tokens</p><p class="p muted">${Object.keys(T).length} tokens · CSS custom properties and W3C JSON, OKLCH next to hex.</p>
      <pre class="mono" style="margin:0;padding:28px;border-radius:var(--card-radius);background:color-mix(in oklab, var(--g-fg) 8%, var(--g-bg));white-space:pre-wrap">${Object.entries(T).filter(([k]) => /^(color-(background|text|action|accent)|type-(display|body)-size|space-base|radius-pill|card-radius|ease-brand)$/.test(k)).map(([k, t]) => `--${k}: ${esc(t.css)};`).join('\n')}</pre></div>`],
    ['outro', 'ground-dark', `${photo('sky', 'position:absolute;inset:0')}<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,color-mix(in oklab, var(--color-surface-inverse) 85%, transparent))"></div>${badge}
      <div class="pad" style="position:relative;z-index:2;margin-top:auto;display:grid;gap:22px;padding-bottom:140px;color:var(--color-text-inverse)">
      <p class="h" style="font-size:72px">Measured, tokenised, rebuilt.</p><p class="p" style="opacity:.85">Full guide, tokens.css and tokens.json in the repo. ${disc}.</p></div>`],
  ];
  const x = [
    ['cover', 'ground-dark', `<div style="display:grid;grid-template-columns:1fr 1fr;height:100%">${photo('hero', 'height:100%')}<div class="pad" style="display:grid;gap:24px;align-content:center;padding-top:110px">
      <h1 class="ttl" style="font-size:84px">${esc(brand)} brand guidelines</h1><p class="p muted">An unofficial, measured reading of ${esc(a.host)}.</p><div><span class="btn-${btnD}">Read the guide</span></div></div></div>${badge}`],
    ['colour', 'ground-dark', `${badge}<div class="pad" style="padding-top:110px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px;align-content:start;height:100%">
      <p class="h" style="font-size:56px;grid-column:span 4">Colour roles</p>${['background', 'surface', 'surface-inverse', 'text', 'action', 'action-alt', 'accent', 'border'].map((k) => `<div class="sw" style="height:230px;background:var(--color-${k});color:${tf(R[k].hex)};border:1px solid color-mix(in oklab, var(--g-fg) 32%, transparent)"><span>${k}</span><span style="font-weight:500">${R[k].hex}</span></div>`).join('')}</div>`],
    ['type', 'ground-light', `${badge}<div class="pad" style="padding-top:110px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;height:100%">
      <div style="font:var(--type-display-weight) 300px/0.85 var(--font-display);letter-spacing:-.04em">Aa</div>
      <div style="display:grid;gap:14px"><p class="h" style="font-size:52px">${esc(a.type.families[0] ? a.type.families[0].family : 'Type')}</p>${['display', 'h1', 'h2', 'h3', 'body'].map((k) => `<div style="display:flex;justify-content:space-between;font-size:24px;border-top:1px solid color-mix(in oklab, var(--g-fg) 18%, transparent);padding-top:10px"><b>${k}</b><span>${roles[k].size}px · ${roles[k].weight}</span></div>`).join('')}</div></div>`],
    ['components', 'ground-light', `<div style="display:grid;grid-template-columns:1fr 1fr;height:100%"><div class="pad" style="display:grid;gap:22px;align-content:center;padding-top:110px">
      <p class="h" style="font-size:56px">Components, rebuilt from tokens</p>${variants.slice(0, 4).map(([k, v]) => `<div style="display:flex;gap:18px;align-items:center;padding:14px;border-radius:var(--card-radius);background:${v.ground || g.lightHex}"><span class="btn-${k}">${esc((v.labels || [])[0] || 'Button')}</span><span style="font-size:18px;color:${tf(v.ground || g.lightHex)}">${k}</span></div>`).join('')}</div>${photo('glass', 'height:100%')}</div>${badge}`],
  ];
  const wrap = (w, h, cls, body, foot = '') => `<!doctype html><html><head><meta charset="utf-8"><style>${tokensCss}${baseCss(a, images)}${slideCss(w, h)}</style></head><body><div class="slide ${cls}">${body}<div class="foot" style="${foot}"><span>${disc}</span><span>${esc(a.host)}</span></div></div></body></html>`;
  return {
    instagram: ig.map(([n, cls, body], i) => ({ file: `ig-${String(i + 1).padStart(2, '0')}-${n}.png`, w: 1080, h: 1350, html: wrap(1080, 1350, cls, body), photo: /img-(hero|street|sky)/.test(body) })),
    x: x.map(([n, cls, body], i) => ({ file: `x-${i + 1}-${n}.png`, w: 1600, h: 900, html: wrap(1600, 900, cls, body, { cover: 'left:848px', components: 'right:848px' }[n] || ''), photo: /img-(hero|glass)/.test(body) })),
  };
}

async function renderSlides(browser, a, T, images, outDir, opts) {
  const set = slides(a, T, images, opts);
  const dir = path.join(outDir, 'slides');
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const s of [...set.instagram, ...set.x]) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 });
    await page.setContent(s.html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(dir, s.file) });
    await page.close();
    files.push(s.file);
  }
  return files;
}

module.exports = { renderSlides };
