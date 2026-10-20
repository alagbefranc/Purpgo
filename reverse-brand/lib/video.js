'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { baseCss, brandName, grounds, buttonFor, esc } = require('./guide');
const C = require('./color');

const FPS = 60, W = 1920, H = 1080;
const SCENE = 4.6, XFADE = 0.6; // seconds; 11 scenes → 11×4.6 − 10×0.6 = 44.6 s

function videoHtml(a, T, images, { name, tokensCss }) {
  const brand = brandName(a, name);
  const g = grounds(a);
  const R = Object.fromEntries(a.colour.roles.map((r) => [r.role, r]));
  const B = a.components.buttons;
  const btnD = buttonFor(a, g.darkHex);
  const tf = (hex) => (C.contrast(hex, '#ffffff') >= C.contrast(hex, '#111111') ? '#ffffff' : '#111111');
  const ai = (slot) => (images[slot] ? '<span class="credit">AI-generated image</span>' : '');
  const photo = (slot, style = 'position:absolute;inset:0') => `<div class="img img-${slot} kb" style="${style}"></div>`;
  const roles = a.type.roles;
  const variants = Object.entries(B).filter(([, v]) => v);
  const L = a.layout;
  const scenes = [
    ['intro', 'ground-dark', `${photo('hero')}<div class="shade"></div>${ai('hero')}<div class="in" style="align-content:end;padding-bottom:150px"><h1 class="st" style="font:var(--type-display-weight) 150px/0.95 var(--font-display);letter-spacing:var(--type-display-tracking);margin:0;color:var(--color-text-inverse)">${esc(brand)}<br>brand guidelines</h1><p class="st" style="font-size:34px;color:var(--color-text-inverse);opacity:.88;margin:0">Measured from ${a.pages.length} pages of ${esc(a.host)}</p></div>`],
    ['overview', 'ground-light', `<div class="in" style="align-content:center;justify-items:center;text-align:center"><p class="st eb">Overview</p><div style="display:grid;grid-template-columns:repeat(4,400px);gap:36px">${[[a.type.families.length, 'typefaces'], [a.colour.palette.length, 'colours'], [`${L.base}px`, 'spacing base'], [a.components.variantCount, 'button variants']].map(([n, l]) => `<div class="st tile"><div class="big">${n}</div><div style="font-size:28px;opacity:.7">${l}</div></div>`).join('')}</div></div>`],
    ['typography', 'ground-dark', `${photo('horizon')}${ai('horizon')}<div class="in" style="align-content:center"><div class="glass" style="padding:56px;display:grid;gap:22px;width:1300px;color:var(--color-text-inverse)"><p class="st eb" style="margin:0">Typography</p>${['display', 'h1', 'h3', 'body'].map((k) => `<div class="st" style="font-family:var(--type-${k}-family);font-weight:${roles[k].weight};font-size:${Math.min(roles[k].size * 1.25, 140)}px;line-height:${roles[k].lineHeight};letter-spacing:${roles[k].tracking}em">${k === 'body' ? `Body ${roles[k].size}px / ${roles[k].lineHeight} / ${roles[k].weight}` : `${k} ${roles[k].size}px`}</div>`).join('')}</div></div>`],
    ['fonts', 'ground-light', `<div class="in" style="grid-template-columns:1fr 1fr;align-items:center"><div class="st" style="font:var(--type-display-weight) 520px/0.85 var(--font-display);letter-spacing:-.04em">Aa</div><div style="display:grid;gap:20px">${a.type.families.slice(0, 3).map((f) => `<div class="st"><div style="font-size:56px;font-weight:700">${esc(f.family)}</div><div style="font-size:26px;opacity:.7">${Math.round(f.share * 100)}% of characters · weights ${f.weights.map((w) => w.weight).join(', ')}</div></div>`).join('')}<p class="st" style="font-size:24px;opacity:.7;margin:0">Scale ratio ${a.type.ratio} · ${esc(a.type.interval.name)}</p></div></div>`],
    ['colour', 'ground-dark', `<div class="in" style="align-content:center;gap:28px"><p class="st eb">Colour</p><div style="display:flex;height:150px;border-radius:var(--card-radius);overflow:hidden">${a.colour.bar.map((b) => `<span class="grow" style="flex:${Math.max(b.share, 0.004)};background:${b.hex}"></span>`).join('')}</div><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px">${['background', 'surface-inverse', 'text', 'action', 'accent', 'border'].map((k) => `<div class="st sw" style="background:var(--color-${k});color:${tf(R[k].hex)}"><b>${k}</b><span>${R[k].hex}</span></div>`).join('')}</div><div class="grow" style="height:70px;border-radius:var(--card-radius);background:var(--gradient-brand)"></div></div>`],
    ['layout', 'ground-light', `<div class="in" style="align-content:center;gap:36px"><p class="st eb">Layout and spacing</p><div style="display:grid;grid-template-columns:repeat(${Math.min(L.columns, 24)},1fr);gap:${Math.min(L.gutter, 32)}px;height:260px">${Array.from({ length: Math.min(L.columns, 24) }, () => '<span class="col" style="background:color-mix(in oklab, var(--color-accent) 30%, transparent);border-radius:6px"></span>').join('')}</div><div style="display:flex;gap:56px;font-size:34px">${[[`${L.base}px`, 'base'], [L.columns, 'columns'], [`${L.gutter}px`, 'gutter'], [`${L.container}px`, 'container']].map(([n, l]) => `<div class="st"><b style="font-size:72px;display:block">${n}</b>${l}</div>`).join('')}</div></div>`],
    ['components', 'ground-dark', `<div class="in" style="grid-template-columns:1.1fr .9fr;align-items:center;gap:56px"><div style="display:grid;gap:22px"><p class="st eb">Components</p>${variants.map(([k, v]) => `<div class="st" style="display:flex;align-items:center;gap:24px;padding:26px;border-radius:var(--card-radius);background:${v.ground || g.lightHex}"><span class="btn-${k}" style="transform:scale(1.35);transform-origin:left center;margin-right:40px">${esc((v.labels || [])[0] || 'Button')}</span><span style="font-size:24px;color:${tf(v.ground || g.lightHex)}">${k} · ${v.pill ? 'pill' : v.radius + 'px'}</span></div>`).join('')}</div><div style="position:relative;height:720px;border-radius:var(--card-radius);overflow:hidden">${photo('glass')}${ai('glass')}</div></div>`],
    ['imagery', 'ground-light', `<div class="in" style="grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:20px;padding-top:150px">${['hero', 'street', 'sky', 'detail', 'object', 'grid'].map((s) => `<div class="st" style="position:relative;border-radius:var(--card-radius);overflow:hidden">${photo(s)}${ai(s)}</div>`).join('')}</div><p class="st eb" style="position:absolute;left:120px;top:70px;margin:0">Imagery · ${a.imagery.count} media · ${Math.round(a.imagery.fullBleedShare * 100)}% full-bleed</p>`],
    ['voice', 'ground-dark', `<div class="in" style="grid-template-columns:.8fr 1.2fr;gap:64px;align-items:center"><div style="position:relative;height:780px;border-radius:var(--card-radius);overflow:hidden">${photo('street')}${ai('street')}</div><div style="display:grid;gap:30px"><p class="st eb">Voice and tone</p><p class="st" style="font:var(--type-h1-weight) 64px/1.1 var(--font-display);margin:0">“${esc((a.voice.quotes[0] || { text: '' }).text)}”</p>${a.voice.rules.map((r, i) => `<div class="st" style="font-size:30px;display:flex;gap:18px"><b style="color:var(--color-accent)">${i + 1}</b>${esc(r.title)}</div>`).join('')}</div></div>`],
    ['tokens', 'ground-dark', `<div class="in" style="align-content:center;gap:28px"><p class="st eb">Design tokens · ${Object.keys(T).length}</p><pre class="st" style="margin:0;padding:40px;border-radius:var(--card-radius);background:color-mix(in oklab, var(--g-fg) 8%, var(--g-bg));font:500 30px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap">${Object.entries(T).filter(([k]) => /^(color-(background|text|action|accent)|type-display-size|space-base|radius-pill|card-radius|ease-brand)$/.test(k)).map(([k, t]) => `--${k}: ${esc(t.css)};`).join('\n')}</pre></div>`],
    ['outro', 'ground-dark', `${photo('sky')}<div class="shade"></div>${ai('sky')}<div class="in" style="align-content:end;padding-bottom:170px"><p class="st" style="font:var(--type-h1-weight) 96px/1 var(--font-display);margin:0;color:var(--color-text-inverse)">Measured, tokenised, rebuilt.</p><p class="st" style="font-size:30px;margin:0;color:var(--color-text-inverse);opacity:.85">Unofficial analysis. Not affiliated with or endorsed by ${esc(brand)}. Trademarks belong to their owners.</p><div class="st"><span class="btn-${btnD}" style="transform:scale(1.3);transform-origin:left center">${esc(a.host)}</span></div></div>`],
  ];
  const css = `
html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}
*{animation-play-state:paused !important}
.scene{position:absolute;inset:0;overflow:hidden;opacity:0;will-change:opacity,transform,filter}
.in{position:absolute;inset:0;padding:110px 120px;display:grid;gap:24px}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,color-mix(in oklab, var(--color-surface-inverse) 80%, transparent))}
.eb{font:600 26px/1 var(--font-sans);letter-spacing:.04em;text-transform:uppercase;opacity:.7;margin:0}
.tile{padding:36px;border-radius:var(--card-radius);background:color-mix(in oklab, var(--g-fg) 6%, var(--g-bg));display:grid;gap:10px}
.big{font:var(--type-display-weight) 150px/1 var(--font-display);letter-spacing:var(--type-display-tracking)}
.sw{height:220px;border-radius:calc(var(--card-radius) * .66);padding:20px;display:flex;flex-direction:column;justify-content:flex-end;font-size:24px;gap:4px;border:1px solid color-mix(in oklab, var(--g-fg) 32%, transparent)}
.credit{position:absolute;right:28px;bottom:28px;z-index:6;font:600 20px/1 var(--font-sans);padding:10px 16px;border-radius:9999px;background:color-mix(in oklab, var(--color-surface-inverse) 72%, transparent);color:var(--color-text-inverse)}
.badge{position:fixed;top:36px;right:40px;z-index:20;font-size:20px;padding:12px 18px;color:var(--color-text-inverse);background:color-mix(in oklab, var(--color-surface-inverse) 60%, transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
`;
  const ease = a.motion.easing && /cubic-bezier/.test(a.motion.easing) ? a.motion.easing : 'cubic-bezier(0.16, 1, 0.3, 1)';
  const js = `
window.__timeline = (function(){
  var S=${SCENE}*1000, X=${XFADE}*1000, EASE=${JSON.stringify(ease)};
  var scenes=[].slice.call(document.querySelectorAll('.scene')), marks=[];
  scenes.forEach(function(sc,i){
    var t0=i*(S-X); marks.push(t0+S/2);
    sc.animate([{opacity:0,transform:'scale(1.035)',filter:'blur(10px)'},{opacity:1,transform:'scale(1)',filter:'blur(0px)'}],{duration:i?X:1,delay:t0,fill:'both',easing:'ease-out'});
    if(i<scenes.length-1) sc.animate([{opacity:1,transform:'scale(1)',filter:'blur(0px)'},{opacity:0,transform:'scale(0.985)',filter:'blur(8px)'}],{duration:X,delay:t0+S-X,fill:'forwards',easing:'ease-in'});
    sc.querySelectorAll('.kb').forEach(function(k){k.animate([{transform:'scale(1.14) translate(1%,1%)'},{transform:'scale(1.0) translate(0,0)'}],{duration:S,delay:t0,fill:'both',easing:'linear'})});
    sc.querySelectorAll('.st').forEach(function(el,k){el.animate([{opacity:0,transform:'translateY(36px)'},{opacity:1,transform:'none'}],{duration:900,delay:t0+250+k*90,fill:'both',easing:EASE})});
    sc.querySelectorAll('.grow').forEach(function(el,k){el.style.transformOrigin='left center';el.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:1000,delay:t0+300+k*70,fill:'both',easing:EASE})});
    sc.querySelectorAll('.col').forEach(function(el,k){el.style.transformOrigin='bottom center';el.animate([{transform:'scaleY(0)'},{transform:'scaleY(1)'}],{duration:800,delay:t0+250+k*45,fill:'both',easing:EASE})});
  });
  document.getAnimations().forEach(function(a){a.pause()});
  var total=(scenes.length-1)*(S-X)+S;
  return { total: total, marks: marks, seek: function(ms){ document.getAnimations().forEach(function(a){a.pause();a.currentTime=ms}); } };
})();`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${tokensCss}${baseCss(a, images)}${css}</style></head><body>
${scenes.map(([n, cls, body]) => `<section class="scene ${cls}" data-scene="${n}">${body}</section>`).join('\n')}
<span class="unofficial badge">Unofficial analysis</span>
<script>${js}</script></body></html>`;
}

async function renderVideo(browser, a, T, images, outDir, { name, tokensCss, stillsOnly = false, log = console.log }) {
  const dir = path.join(outDir, 'video');
  fs.mkdirSync(path.join(dir, 'stills'), { recursive: true });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(videoHtml(a, T, images, { name, tokensCss }), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const { total, marks } = await page.evaluate(() => ({ total: window.__timeline.total, marks: window.__timeline.marks }));
  const cdp = await page.context().newCDPSession(page);
  const shot = async (format) => Buffer.from((await cdp.send('Page.captureScreenshot', { format, quality: format === 'jpeg' ? 95 : undefined, optimizeForSpeed: true, captureBeyondViewport: false })).data, 'base64');

  const stills = [];
  for (let i = 0; i < marks.length; i++) {
    await page.evaluate((ms) => window.__timeline.seek(ms), marks[i]);
    const f = path.join(dir, 'stills', `scene-${String(i + 1).padStart(2, '0')}.png`);
    fs.writeFileSync(f, await shot('png'));
    stills.push(f);
  }
  if (stillsOnly) { await page.close(); return { stills }; }

  const host = a.host.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '-');
  const file = path.join(dir, `${host}-presentation-1920x1080-60fps.mp4`);
  const frames = Math.round((total / 1000) * FPS);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const t0 = Date.now();
  for (let f = 0; f < frames; f++) {
    await page.evaluate((ms) => window.__timeline.seek(ms), (f * 1000) / FPS);
    const buf = await shot('jpeg');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 600 === 0) log(`  frame ${f}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  ff.stdin.end();
  await done;
  await page.close();
  return { file, frames, seconds: total / 1000, stills, renderMs: Date.now() - t0 };
}

module.exports = { renderVideo, FPS, W, H };
