'use strict';
const C = require('./color');

const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pc = (n) => `${Math.round(n * 1000) / 10}%`;
const SLOTS = ['hero', 'horizon', 'object', 'street', 'sky', 'glass', 'grid', 'tokens', 'detail'];

function brandName(a, override) {
  if (override) return override;
  const label = a.host.replace(/^www\./, '').split('.')[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Which ground is dark is measured, not assumed.
function grounds(a) {
  const dark = a.colour.groundIsDark;
  return {
    light: { bg: dark ? 'var(--color-surface-inverse)' : 'var(--color-background)', fg: dark ? 'var(--color-text-inverse)' : 'var(--color-text)' },
    dark: { bg: dark ? 'var(--color-background)' : 'var(--color-surface-inverse)', fg: dark ? 'var(--color-text)' : 'var(--color-text-inverse)' },
    lightHex: a.colour.roles.find((r) => r.role === (dark ? 'surface-inverse' : 'background')).hex,
    darkHex: a.colour.roles.find((r) => r.role === (dark ? 'background' : 'surface-inverse')).hex,
  };
}

// Pick the measured filled variant that reads best on a ground.
function buttonFor(a, groundHex) {
  const v = a.components.buttons;
  const opts = ['primary', 'secondary'].filter((k) => v[k] && v[k].bg);
  let best = opts[0] || 'primary', bestC = -1;
  for (const k of opts) { const c = C.contrast(v[k].bg, groundHex); if (c > bestC + 0.5) { best = k; bestC = c; } }
  return best;
}

const FALLBACKS = {
  hero: 'radial-gradient(120% 90% at 80% 10%, color-mix(in oklab, var(--color-accent) 70%, transparent), transparent 60%), var(--gradient-brand)',
  horizon: 'linear-gradient(180deg, color-mix(in oklab, var(--color-accent) 30%, var(--color-background)) 0%, color-mix(in oklab, var(--color-accent) 55%, var(--color-surface-inverse)) 58%, var(--color-surface-inverse) 100%)',
  object: 'radial-gradient(55% 55% at 50% 45%, color-mix(in oklab, var(--color-accent) 65%, var(--color-background)) 0%, color-mix(in oklab, var(--color-accent) 25%, var(--color-surface-inverse)) 45%, var(--color-surface-inverse) 75%)',
  street: 'linear-gradient(135deg, color-mix(in oklab, var(--color-accent) 35%, var(--color-surface)) 0%, color-mix(in oklab, var(--color-surface-inverse) 75%, var(--color-accent)) 100%)',
  sky: 'linear-gradient(180deg, color-mix(in oklab, var(--color-accent) 30%, var(--color-background)) 0%, var(--color-background) 100%)',
  glass: 'radial-gradient(70% 60% at 70% 30%, color-mix(in oklab, var(--color-accent) 70%, var(--color-background)) 0%, transparent 70%), conic-gradient(from 210deg at 60% 40%, color-mix(in oklab, var(--color-accent) 35%, var(--color-surface-inverse)), color-mix(in oklab, var(--color-accent) 75%, var(--color-background)), color-mix(in oklab, var(--color-accent) 35%, var(--color-surface-inverse)))',
  grid: 'repeating-linear-gradient(90deg, color-mix(in oklab, var(--color-text) 10%, transparent) 0 1px, transparent 1px 48px), var(--color-surface)',
  tokens: 'linear-gradient(160deg, var(--color-surface-inverse) 20%, color-mix(in oklab, var(--color-accent) 50%, var(--color-surface-inverse)) 100%)',
  detail: 'radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--color-accent) 50%, var(--color-background)), var(--color-surface) 65%)',
};

// Shared by the guide, the slides and the video.
function baseCss(a, images = {}) {
  const g = grounds(a);
  const slotCss = SLOTS.map((s) => images[s]
    ? `.img-${s}{background:url(${images[s].dataUri}) center/cover no-repeat,${FALLBACKS[s]}}`
    : `.img-${s}{background:${FALLBACKS[s]}}`).join('\n');
  const btn = (n) => `.btn-${n}{display:inline-flex;align-items:center;justify-content:center;gap:.5em;box-sizing:border-box;height:var(--button-${n}-height);padding:var(--button-${n}-pad-y) var(--button-${n}-pad-x);border-radius:var(--button-${n}-radius);background:var(--button-${n}-bg);color:var(--button-${n}-fg);border:var(--button-${n}-border-width) solid var(--button-${n}-border-color);font:var(--button-${n}-weight) var(--button-${n}-font-size)/1 var(--font-sans);letter-spacing:var(--button-${n}-tracking);-webkit-backdrop-filter:var(--button-${n}-backdrop);backdrop-filter:var(--button-${n}-backdrop);text-decoration:none;white-space:nowrap;cursor:pointer;transition:transform var(--duration-brand) var(--ease-brand),opacity var(--duration-brand) var(--ease-brand)}
.btn-${n}:hover{transform:translateY(-1px);opacity:.92}.btn-${n}:active{transform:scale(.98)}`;
  const variants = Object.keys(a.components.buttons).filter((k) => a.components.buttons[k]);
  return `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:${g.light.bg};color:${g.light.fg};font:var(--type-body-weight) var(--type-body-size)/var(--type-body-leading) var(--font-sans);letter-spacing:var(--type-body-tracking);-webkit-font-smoothing:antialiased}
a{color:inherit}
.ground-light{background:${g.light.bg};color:${g.light.fg};--g-fg:${g.light.fg};--g-bg:${g.light.bg}}
.ground-surface{background:color-mix(in oklab, ${g.light.bg} 92%, ${g.light.fg});color:${g.light.fg};--g-fg:${g.light.fg};--g-bg:${g.light.bg}}
.ground-dark{background:${g.dark.bg};color:${g.dark.fg};--g-fg:${g.dark.fg};--g-bg:${g.dark.bg}}
.muted{color:color-mix(in oklab, var(--g-fg, currentColor) 62%, var(--g-bg, transparent))}
.t-display{font-family:var(--type-display-family);font-size:var(--type-display-size);line-height:var(--type-display-leading);font-weight:var(--type-display-weight);letter-spacing:var(--type-display-tracking);margin:0}
.t-h1{font-family:var(--type-h1-family);font-size:var(--type-h1-size);line-height:var(--type-h1-leading);font-weight:var(--type-h1-weight);letter-spacing:var(--type-h1-tracking);margin:0}
.t-h2{font-family:var(--type-h2-family);font-size:var(--type-h2-size);line-height:var(--type-h2-leading);font-weight:var(--type-h2-weight);letter-spacing:var(--type-h2-tracking);margin:0}
.t-h3{font-family:var(--type-h3-family);font-size:var(--type-h3-size);line-height:var(--type-h3-leading);font-weight:var(--type-h3-weight);letter-spacing:var(--type-h3-tracking);margin:0}
.t-h4{font-family:var(--type-h4-family);font-size:var(--type-h4-size);line-height:var(--type-h4-leading);font-weight:var(--type-h4-weight);letter-spacing:var(--type-h4-tracking);margin:0}
.t-lead{font-family:var(--type-lead-family);font-size:var(--type-lead-size);line-height:var(--type-lead-leading);font-weight:var(--type-lead-weight);letter-spacing:var(--type-lead-tracking);margin:0}
.t-body{font-size:var(--type-body-size);line-height:var(--type-body-leading);font-weight:var(--type-body-weight);margin:0}
.t-small{font-size:var(--type-small-size);line-height:var(--type-small-leading);font-weight:var(--type-small-weight);letter-spacing:var(--type-small-tracking);margin:0}
${variants.map(btn).join('\n')}
.img{position:relative;overflow:hidden;background-color:var(--color-surface-inverse)}
${slotCss}
.ai-tag{position:absolute;right:12px;bottom:12px;z-index:3;font:600 11px/1 var(--font-sans);letter-spacing:.02em;padding:6px 10px;border-radius:9999px;background:color-mix(in oklab, var(--color-surface-inverse) 70%, transparent);color:var(--color-text-inverse);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.unofficial{display:inline-flex;align-items:center;gap:6px;font:600 12px/1 var(--font-sans);letter-spacing:.02em;padding:7px 12px;border-radius:9999px;border:1px solid currentColor;white-space:nowrap}
.unofficial::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--color-accent)}
.glass{background:var(--card-glass-bg);-webkit-backdrop-filter:var(--card-glass-backdrop);backdrop-filter:var(--card-glass-backdrop);border-radius:var(--card-glass-radius);border:1px solid color-mix(in oklab, var(--color-text-inverse) 18%, transparent)}
`;
}

function guideCss(a) {
  return `
.wrap{width:min(100% - 32px, var(--container));margin-inline:auto}
@media (min-width:700px){.wrap{width:min(100% - 2 * var(--gutter), var(--container))}}
section{position:relative}
.page{padding:clamp(64px, 10vw, 128px) 0}
.eyebrow{font:600 var(--type-small-size)/1.2 var(--font-sans);letter-spacing:.04em;text-transform:uppercase;margin:0 0 16px;opacity:.7}
.sec-head{display:grid;gap:16px;margin-bottom:clamp(32px,5vw,64px);max-width:860px}
.sec-head.center{margin-inline:auto;text-align:center;justify-items:center}
/* top bar */
.topbar{position:fixed;inset:0 0 auto 0;z-index:50;height:var(--nav-height);display:flex;align-items:center;transition:background var(--duration-brand) var(--ease-brand),box-shadow var(--duration-brand) var(--ease-brand),color var(--duration-brand) var(--ease-brand);color:var(--color-text-inverse)}
.topbar .wrap{display:flex;align-items:center;gap:20px}
.topbar.scrolled{background:var(--nav-bg);-webkit-backdrop-filter:var(--nav-backdrop);backdrop-filter:var(--nav-backdrop);color:var(--nav-link-color);box-shadow:0 1px 0 color-mix(in oklab, var(--color-border) 80%, transparent)}
.topbar .name{font:700 15px/1 var(--font-sans);white-space:nowrap;text-decoration:none}
.topbar nav{display:flex;gap:18px;margin-left:auto;font-size:var(--nav-link-size);font-weight:var(--nav-link-weight)}
.topbar nav a{text-decoration:none;opacity:.85;white-space:nowrap}.topbar nav a:hover{opacity:1}
.topbar .btn-cta{margin-left:4px;height:36px;padding-block:0;font-size:14px}
@media (max-width:1100px){.topbar nav{display:none}.topbar .btn-cta{margin-left:auto}}
@media (max-width:480px){.topbar .name{display:none}}
/* cover */
.cover{min-height:max(100svh, 680px);display:flex;align-items:flex-end;color:var(--color-text-inverse)}
.cover::after,.scrim::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, color-mix(in oklab, var(--color-surface-inverse) 35%, transparent) 0%, transparent 30%, transparent 45%, color-mix(in oklab, var(--color-surface-inverse) 78%, transparent) 100%);z-index:1;pointer-events:none}
.cover .wrap{position:relative;z-index:2;padding:calc(var(--nav-height) + 48px) 0 40px;display:grid;gap:28px}
.cover-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:var(--gutter);align-items:end}
.cover h1{max-width:12ch}
.cover .lede{max-width:46ch;opacity:.92}
.token-card{padding:24px;display:grid;gap:10px;color:var(--color-text-inverse);max-width:360px;justify-self:end;width:100%}
.token-card .val{font:var(--type-h2-weight) var(--type-h2-size)/1 var(--font-display);letter-spacing:var(--type-h2-tracking)}
.token-card .chip{display:flex;align-items:center;gap:10px}
.token-card .sw{width:28px;height:28px;border-radius:50%;background:var(--color-accent);border:2px solid color-mix(in oklab, var(--color-text-inverse) 40%, transparent)}
.cover-foot{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;padding-top:24px;border-top:1px solid color-mix(in oklab, var(--color-text-inverse) 25%, transparent)}
@media (max-width:860px){.cover-grid{grid-template-columns:1fr}.token-card{justify-self:start}}
/* overview */
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--gutter)}
.stat{padding:clamp(20px,3vw,32px);border-radius:var(--card-radius);background:color-mix(in oklab, var(--g-fg) 5%, var(--g-bg));display:grid;gap:8px;align-content:start}
.stat .n{font:var(--type-display-weight) var(--type-h1-size)/1 var(--font-display);letter-spacing:var(--type-h1-tracking)}
@media (max-width:900px){.stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* contents cards: number top-left, arrow top-right, title bottom-left */
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--gutter)}
.pcard{position:relative;display:block;aspect-ratio:4/5;border-radius:var(--card-radius);overflow:hidden;text-decoration:none;color:var(--color-text-inverse);isolation:isolate}
.pcard .img{position:absolute;inset:0;transition:transform 1.6s var(--ease-brand)}
.pcard:hover .img,.pcard:focus-visible .img{transform:scale(1.06)}
.pcard::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, color-mix(in oklab, var(--color-surface-inverse) 30%, transparent), transparent 35%, transparent 50%, color-mix(in oklab, var(--color-surface-inverse) 75%, transparent));z-index:1}
.pcard .num,.pcard .arrow,.pcard .ttl{position:absolute;z-index:2}
.pcard .num{left:20px;top:18px;font:600 14px/1 var(--font-sans)}
.pcard .arrow{right:16px;top:14px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:color-mix(in oklab, var(--color-text-inverse) 18%, transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform var(--duration-brand) var(--ease-brand)}
.pcard:hover .arrow{transform:translate(2px,-2px)}
.pcard .ttl{left:20px;right:20px;bottom:18px}
.pcard .ai-tag{bottom:auto;top:58px;right:12px}
@media (max-width:1000px){.cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:480px){.pcard{aspect-ratio:4/3}}
/* token rebuild */
.rebuild{display:grid;grid-template-columns:1fr 1fr}
.rebuild > div{padding:clamp(28px,5vw,64px);display:grid;gap:24px;align-content:start}
.rb-cards{display:grid;grid-template-columns:1fr 1fr;gap:var(--gutter)}
.rb-card{background:var(--card-bg);border-radius:var(--card-radius);padding:var(--card-pad-y) var(--card-pad-x);box-shadow:var(--card-shadow);border:var(--card-border);-webkit-backdrop-filter:var(--card-backdrop);backdrop-filter:var(--card-backdrop);color:var(--color-text);display:grid;gap:12px;align-content:start;min-width:0}
.rb-card .media{aspect-ratio:4/3;border-radius:calc(var(--card-radius) * .66)}
.rb-card.glass{background:var(--card-glass-bg);color:var(--color-text-inverse);padding:var(--card-pad-y) var(--card-pad-x);border-radius:var(--card-glass-radius)}
@media (max-width:1000px){.rebuild{grid-template-columns:1fr}}
@media (max-width:560px){.rb-cards{grid-template-columns:1fr}}
.spec{font:500 12px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;opacity:.75;word-break:break-word}
/* chapter photo + glass specimen */
.chapter{min-height:max(92svh, 640px);display:grid;align-items:end;color:var(--color-text-inverse)}
.chapter > .wrap{position:relative;z-index:2;padding:calc(var(--nav-height) + 64px) 0 56px}
.specimen{padding:clamp(20px,3vw,36px);display:grid;gap:20px;max-width:980px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips button{height:36px;padding:0 16px;font-size:14px}
.chips button[aria-selected="true"]{outline:2px solid var(--color-text-inverse);outline-offset:2px}
.panel{display:grid;gap:12px;min-height:200px;align-content:start}
.panel[hidden]{display:none}
.panel .sample{overflow-wrap:anywhere}
/* fonts */
.fam-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:var(--gutter)}
.fam{border-radius:var(--card-radius);padding:clamp(24px,3vw,40px);background:color-mix(in oklab, var(--g-fg) 5%, var(--g-bg));display:grid;gap:16px}
.fam .aa{font-size:clamp(96px,14vw,200px);line-height:.9;letter-spacing:-.04em}
.bars{display:grid;gap:8px}
.bar{display:grid;grid-template-columns:72px 1fr 52px;gap:12px;align-items:center;font-size:var(--type-small-size)}
.bar i{display:block;height:8px;border-radius:9999px;background:var(--color-accent);min-width:2px}
.charset{font-size:clamp(22px,3vw,34px);line-height:1.35;overflow-wrap:anywhere;margin:0}
table{width:100%;border-collapse:collapse;font-size:var(--type-small-size)}
th,td{text-align:left;padding:10px 12px 10px 0;border-bottom:1px solid color-mix(in oklab, var(--g-fg) 14%, transparent);vertical-align:top}
th{font-weight:600}
.tscroll{overflow-x:auto;max-width:100%}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,4vw,64px);align-items:start}
@media (max-width:900px){.two{grid-template-columns:1fr}}
/* colour */
.colour-top{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:var(--gutter);align-items:stretch}
.colour-top .img{border-radius:var(--card-radius);min-height:420px}
.palette-bar{display:flex;height:120px;border-radius:var(--card-radius);overflow:hidden}
.palette-bar span{display:block;height:100%;min-width:4px}
.roles{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr));gap:12px}
.role{border-radius:calc(var(--card-radius) * .66);overflow:hidden;background:color-mix(in oklab, var(--g-fg) 6%, var(--g-bg))}
.role .sw{height:96px;box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--g-fg) 22%, transparent);border-radius:calc(var(--card-radius) * .66) calc(var(--card-radius) * .66) 0 0}
.role .meta{padding:12px 14px;display:grid;gap:2px;font-size:12px}
.role .meta b{font-size:14px}
.gradient-strip{height:120px;border-radius:var(--card-radius);background:var(--gradient-brand)}
.pair{display:flex;align-items:center;gap:12px}
.pair .aa{width:56px;height:40px;border-radius:10px;display:grid;place-items:center;font-weight:700;flex:none}
details{border-top:1px solid color-mix(in oklab, var(--g-fg) 18%, transparent);padding-top:16px}
summary{cursor:pointer;font-weight:600}
.pal-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));gap:8px;margin-top:16px;font-size:12px}
.pal-list div{display:flex;gap:8px;align-items:center}
.pal-list i{width:22px;height:22px;border-radius:6px;flex:none;border:1px solid color-mix(in oklab, var(--g-fg) 20%, transparent)}
@media (max-width:900px){.colour-top{grid-template-columns:1fr}.colour-top .img{min-height:260px}}
/* layout */
.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--gutter)}
.facts .stat .n{font-size:var(--type-h2-size)}
@media (max-width:900px){.facts{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cols-demo{display:grid;grid-template-columns:repeat(var(--columns),minmax(0,1fr));gap:var(--gutter);height:160px;padding:16px;border-radius:var(--card-radius);background:color-mix(in oklab, var(--g-fg) 4%, var(--g-bg))}
.cols-demo span{background:color-mix(in oklab, var(--color-accent) 22%, transparent);border-radius:4px}
.stair{display:grid;gap:8px}
.stair div{display:grid;grid-template-columns:96px 1fr;gap:16px;align-items:center;font-size:12px}
.stair i{display:block;height:20px;background:var(--color-accent);border-radius:3px}
.radii{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px}
.radii div{aspect-ratio:1;background:color-mix(in oklab, var(--color-accent) 18%, var(--g-bg));border:2px solid var(--color-accent);display:grid;place-items:center;font-size:12px;text-align:center}
.ruler{position:relative;height:72px;border-bottom:2px solid currentColor;margin:16px 0 40px}
.ruler span{position:absolute;bottom:-2px;transform:translateX(-50%);display:grid;justify-items:center;gap:4px;font-size:12px;white-space:nowrap}
.ruler span::after{content:"";width:2px;height:28px;background:var(--color-accent)}
.ruler span:first-child{transform:none;justify-items:start}
.rhythm{display:flex;flex-direction:column;border-radius:var(--card-radius);overflow:hidden;border:1px solid color-mix(in oklab, var(--g-fg) 14%, transparent);max-width:320px}
.rhythm div{display:flex;align-items:center;padding:0 12px;font-size:11px;min-height:14px}
/* components */
.comp-top{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:var(--gutter);align-items:end;margin-bottom:clamp(32px,5vw,64px)}
.comp-top .img{border-radius:var(--card-radius);aspect-ratio:4/3}
.btn-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:var(--gutter);margin-bottom:var(--gutter)}
.tile{border-radius:var(--card-radius);box-shadow:inset 0 0 0 1px color-mix(in oklab, var(--g-fg) 14%, transparent);padding:28px;display:grid;gap:18px;align-content:space-between;min-height:220px;min-width:0}
.navmock{display:flex;align-items:center;gap:24px;height:var(--nav-height);padding:0 24px;background:var(--nav-bg);-webkit-backdrop-filter:var(--nav-backdrop);backdrop-filter:var(--nav-backdrop);border-radius:calc(var(--card-radius) * .66);color:var(--nav-link-color);overflow:hidden}
.navmock .logo{width:var(--nav-logo-width);height:var(--nav-logo-height);border:1.5px dashed var(--nav-logo-color);border-radius:4px;display:grid;place-items:center;font-size:9px;flex:none;color:var(--nav-logo-color)}
.navmock .links{display:flex;gap:20px;font-size:var(--nav-link-size);font-weight:var(--nav-link-weight);white-space:nowrap;overflow:hidden}
.navmock .btn-primary,.navmock .btn-secondary{margin-left:auto;height:36px;padding-block:0;font-size:14px}
.navwrap{padding:24px;border-radius:var(--card-radius);margin-bottom:var(--gutter)}
.comp-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:var(--gutter);margin-bottom:var(--gutter)}
.field{display:grid;gap:8px;max-width:420px}
.inp{height:var(--input-height);border-radius:var(--input-radius);border:var(--input-border-width) solid var(--input-border-color);background:var(--input-bg);color:var(--input-fg);padding:0 var(--input-pad-x);font:400 var(--input-font-size)/1 var(--font-sans);width:100%}
.flag{display:inline-block;font:600 11px/1 var(--font-sans);padding:5px 8px;border-radius:9999px;background:var(--color-accent);color:var(--color-on-action);margin-left:8px;vertical-align:middle}
@media (max-width:900px){.comp-top{grid-template-columns:1fr}}
/* imagery */
.mosaic{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:160px;gap:12px}
.mosaic .img{border-radius:calc(var(--card-radius) * .66)}
.mosaic .m1{grid-column:span 4;grid-row:span 2}.mosaic .m2{grid-column:span 2;grid-row:span 2}.mosaic .m3,.mosaic .m4,.mosaic .m5{grid-column:span 2}
.cap{position:absolute;left:12px;top:12px;z-index:3;font:600 11px/1 var(--font-sans);padding:6px 10px;border-radius:9999px;background:color-mix(in oklab, var(--color-background) 80%, transparent);color:var(--color-text)}
@media (max-width:700px){.mosaic{grid-template-columns:1fr 1fr;grid-auto-rows:140px}.mosaic .m1{grid-column:span 2}.mosaic .m2{grid-column:span 2;grid-row:span 1}.mosaic .m3,.mosaic .m4,.mosaic .m5{grid-column:span 1}.mosaic .m5{grid-column:span 2}}
dl.kv{display:grid;grid-template-columns:minmax(0,max-content) minmax(0,1fr);gap:10px 24px;margin:0}
dl.kv dt{opacity:.7}dl.kv dd{margin:0}
/* voice */
.split{display:grid;grid-template-columns:1fr 1fr;min-height:640px}
.split .img{min-height:420px}
.split > div:last-child{padding:clamp(28px,6vw,96px);display:grid;gap:24px;align-content:center}
@media (max-width:900px){.split{grid-template-columns:1fr}}
.quotes{display:grid;gap:clamp(24px,4vw,48px)}
.quotes blockquote{margin:0;display:grid;gap:10px}
.quotes blockquote p{margin:0}
.rules{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--gutter);margin-top:clamp(40px,6vw,80px)}
.rule{border-radius:var(--card-radius);padding:28px;display:grid;gap:12px;align-content:start;background:color-mix(in oklab, var(--g-fg) 5%, var(--g-bg))}
.rule .k{font:var(--type-h1-weight) var(--type-h2-size)/1 var(--font-display);color:var(--color-accent)}
@media (max-width:900px){.rules{grid-template-columns:1fr}}
/* tokens */
.tok-actions{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px}
.code{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--gutter)}
.code pre{margin:0;max-height:520px;overflow:auto;padding:20px;border-radius:calc(var(--card-radius) * .66);background:color-mix(in oklab, var(--g-fg) 7%, var(--g-bg));font:12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;white-space:pre}
@media (max-width:900px){.code{grid-template-columns:1fr}}
.tok-hero{height:clamp(200px,28vw,360px);border-radius:var(--card-radius);margin-bottom:clamp(32px,5vw,56px)}
/* method */
ol.plain,ul.plain{margin:0;padding-left:1.2em;display:grid;gap:8px}
.foot{padding:40px 0;font-size:var(--type-small-size)}
.foot .wrap{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between}
/* motion */
.js .reveal{opacity:0;transform:translateY(28px);transition:opacity 1s var(--ease-brand),transform 1s var(--ease-brand)}
.js .reveal.in{opacity:1;transform:none}
.kb{animation:kb 24s var(--ease-brand) both}
@keyframes kb{from{transform:scale(1.08)}to{transform:scale(1)}}
.cover .img-bg,.chapter .img-bg{position:absolute;inset:0}
@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}.js .reveal{opacity:1;transform:none;transition:none}.kb{animation:none}.pcard .img{transition:none}.pcard:hover .img{transform:none}*{transition-duration:0s !important}}
`;
}

function guideJs() {
  return `
(function(){
  var d=document;d.documentElement.classList.add('js');
  var bar=d.querySelector('.topbar'),cover=d.getElementById('cover');
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(e){bar.classList.toggle('scrolled',!e[0].isIntersecting)},{rootMargin:'-64px 0px 0px 0px'}).observe(cover);
    var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});
    d.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  } else { d.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in')}); }
  d.querySelectorAll('[role=tablist]').forEach(function(list){
    var tabs=list.querySelectorAll('[role=tab]');
    tabs.forEach(function(t){t.addEventListener('click',function(){
      tabs.forEach(function(o){var on=o===t;o.setAttribute('aria-selected',on);o.className=on?o.dataset.on:o.dataset.off;d.getElementById(o.getAttribute('aria-controls')).hidden=!on});
    })});
  });
  function copy(text,btn){var done=function(){var o=btn.textContent;btn.textContent='Copied';setTimeout(function(){btn.textContent=o},1400)};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,function(){fallback()})}else fallback();
    function fallback(){var t=d.createElement('textarea');t.value=text;d.body.appendChild(t);t.select();try{d.execCommand('copy')}catch(e){}t.remove();done()}}
  d.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){copy(d.getElementById(b.dataset.copy).textContent,b)})});
  d.querySelectorAll('[data-download]').forEach(function(b){b.addEventListener('click',function(){
    var src=d.getElementById(b.dataset.download),blob=new Blob([src.textContent],{type:b.dataset.type}),a=d.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=b.dataset.name;d.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)})});
  // is the measured typeface installed locally? compare glyph widths against generic fallbacks
  var cv=d.createElement('canvas').getContext('2d'),s='mmmmmmmmmmlli1WQ@#0';
  d.querySelectorAll('[data-font-check]').forEach(function(el){
    var f=el.dataset.fontCheck,hit=['monospace','serif','sans-serif'].some(function(g){cv.font='72px '+g;var a=cv.measureText(s).width;cv.font='72px "'+f+'", '+g;return Math.abs(cv.measureText(s).width-a)>0.5});
    el.textContent=hit?'Installed locally: yes. Specimens render in '+f+'.':'Installed locally: no. Specimens fall back to the system sans; the font file is not copied.';
  });
})();`;
}

function build(a, T, files, opts) {
  const { tokensCss, tokensJson, prompts, manifest, runLog } = files;
  const edition = opts.edition; // 'light' | 'hero'
  const images = edition === 'hero' ? (opts.images || {}) : {};
  const brand = brandName(a, opts.name);
  const g = grounds(a);
  const B = a.components.buttons;
  const btnLight = buttonFor(a, g.lightHex), btnDark = buttonFor(a, g.darkHex);
  const darkSecondary = B.translucent ? 'translucent' : B.outline ? 'outline' : btnDark;
  const chipOff = B.translucent ? 'translucent' : B.outline ? 'outline' : btnLight;
  const R = Object.fromEntries(a.colour.roles.map((r) => [r.role, r]));
  const date = a.capturedAt.slice(0, 10);
  const disclaimer = `Unofficial analysis. Not affiliated with or endorsed by ${esc(brand)}. Trademarks belong to their owners.`;
  const slot = (name, cls = '', extra = '') => `<div class="img img-${name} ${cls}" ${extra}>${images[name] ? '<span class="ai-tag">AI-generated image</span>' : ''}</div>`;
  const slotLabel = (name) => (images[name] ? 'AI-generated image' : 'Gradient fallback (no image)');
  const px = (n) => `${Math.round(n * 10) / 10}px`;
  const role = (k) => a.type.roles[k];
  const famCount = a.type.families.length;
  const variants = Object.entries(B).filter(([, v]) => v);

  // ---- sections
  const sections = [];
  const nav = [['overview', 'Overview'], ['typography', 'Typography'], ['colour', 'Colour'], ['layout', 'Layout'], ['components', 'Components'], ['imagery', 'Imagery'], ['voice', 'Voice'], ['tokens', 'Tokens']];

  sections.push(`
<section id="cover" class="cover img" aria-label="Cover">
  <div class="img-bg img-hero kb"></div>${images.hero ? '<span class="ai-tag" style="z-index:3;top:calc(var(--nav-height) + 12px);bottom:auto">AI-generated image</span>' : ''}
  <div class="wrap">
    <div class="cover-grid">
      <div style="display:grid;gap:24px">
        <span class="unofficial" style="justify-self:start">Unofficial analysis</span>
        <h1 class="t-display">${esc(brand)} brand guidelines</h1>
        <p class="t-lead lede">Measured from ${a.pages.length} pages of ${esc(a.host)} on ${date}: ${famCount} typeface${famCount === 1 ? '' : 's'}, ${a.colour.roles.length} colour roles, a ${a.layout.base}px spacing base.</p>
        <div><a class="btn-${btnDark === 'primary' || btnDark === 'secondary' ? btnDark : 'primary'}" href="#contents">View contents</a></div>
      </div>
      <div class="glass token-card" aria-label="Token sample">
        <span class="t-small" style="opacity:.8">--color-accent</span>
        <div class="chip"><span class="sw"></span><span class="val">${esc(R.accent.hex.toUpperCase())}</span></div>
        <span class="spec">${esc(R.accent.oklch)}</span>
        <span class="t-small" style="opacity:.8">Most-used chromatic colour · ${pc(R.accent.share)} of weighted use</span>
      </div>
    </div>
    <div class="cover-foot"><span class="unofficial">Unofficial analysis</span><span class="t-small" style="opacity:.85">${disclaimer}</span></div>
  </div>
</section>`);

  sections.push(`
<section id="overview" class="page ground-light">
  <div class="wrap">
    <div class="sec-head center reveal"><p class="eyebrow">01</p><h2 class="t-h1">Overview</h2>
      <p class="t-lead muted">An unofficial, measured reading of ${esc(a.host)}. Every value below was taken from computed styles at 1440 × 900 and 390 × 844, turned into tokens, and used to rebuild the samples on this page.</p></div>
    <div class="stats reveal">
      <div class="stat"><span class="n">${famCount}</span><span>Typeface${famCount === 1 ? '' : 's'}</span><span class="t-small muted">${esc(a.type.families.map((f) => f.family).join(', '))}</span></div>
      <div class="stat"><span class="n">${a.colour.palette.length}</span><span>Colours measured</span><span class="t-small muted">${a.colour.roles.length} roles assigned</span></div>
      <div class="stat"><span class="n">${a.layout.base}px</span><span>Spacing base</span><span class="t-small muted">${pc(a.layout.shares[a.layout.base])} of spacing values on grid</span></div>
      <div class="stat"><span class="n">${a.components.variantCount}</span><span>Button variants</span><span class="t-small muted">${esc(variants.map(([k]) => k).join(', '))}</span></div>
    </div>
  </div>
</section>`);

  const contents = [['typography', 'Typography', 'horizon'], ['fonts', 'Fonts', 'detail'], ['colour', 'Colour', 'object'], ['layout', 'Layout and spacing', 'grid'], ['components', 'Components', 'glass'], ['imagery', 'Imagery', 'sky'], ['voice', 'Voice and tone', 'street'], ['tokens', 'Design tokens', 'tokens']];
  sections.push(`
<section id="contents" class="page ground-light" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">02</p><h2 class="t-h1">Contents</h2></div>
    <div class="cards reveal">
      ${contents.map(([id, t, s], i) => `<a class="pcard" href="#${id}">${slot(s)}<span class="num">${String(i + 1).padStart(2, '0')}</span><span class="arrow" aria-hidden="true">↗</span><span class="ttl t-h3">${t}</span></a>`).join('\n      ')}
    </div>
  </div>
</section>`);

  const rbCard = (s, title, text) => `<article class="rb-card" data-token-prefix="card">${slot(s, 'media')}<h3 class="t-h4">${title}</h3><p class="t-small" style="color:var(--color-text-muted)">${text}</p></article>`;
  sections.push(`
<section id="rebuild" class="ground-light" aria-label="Token rebuild test">
  <div class="wrap page" style="padding-bottom:32px"><div class="sec-head reveal"><p class="eyebrow">03</p><h2 class="t-h1">Token rebuild test</h2>
    <p class="t-lead muted">One button and two cards, built only from tokens.css, on the site's light and dark grounds. verify.js checks that their computed styles equal the token values.</p></div></div>
  <div class="rebuild">
    <div class="ground-light reveal">
      <p class="eyebrow">Light ground · ${esc(g.lightHex)}</p>
      <div><a class="btn-${btnLight} rb-button" data-token-prefix="button-${btnLight}" href="#tokens">Open the tokens</a></div>
      <div class="rb-cards">${rbCard('street', 'Card, measured', `Radius ${esc(T['card-radius'].css)}, padding ${esc(T['card-pad-y'].css)} / ${esc(T['card-pad-x'].css)}.`)}${rbCard('object', 'Media in cards', `${a.components.cards[0].media ? `Media fills about ${a.components.cards[0].mediaShare}% of the card.` : 'Cards measured without media; media added to test.'}`)}</div>
    </div>
    <div class="ground-dark reveal">
      <p class="eyebrow">Dark ground · ${esc(g.darkHex)}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn-${btnDark}" href="#tokens">Open the tokens</a>${B[darkSecondary] && darkSecondary !== btnDark ? `<a class="btn-${darkSecondary}" href="#method">Method</a>` : ''}</div>
      <div class="rb-cards">${rbCard('sky', 'Card on a dark ground', 'Same tokens; the ground changes, the card does not.')}<article class="rb-card glass">${slot('detail', 'media')}<h3 class="t-h4">Glass card</h3><p class="t-small" style="opacity:.8">${esc(T['card-glass-backdrop'].css)} over the ground, as measured.</p></article></div>
    </div>
  </div>
</section>`);

  const tabsDef = [['display', 'Display', 'Display'], ['heading', 'Heading', 'h1'], ['subhead', 'Subhead', 'h3'], ['lead', 'Lead', 'lead'], ['body', 'Body', 'body']];
  const sampleText = { display: `${brand} type`, heading: 'Heading level one', subhead: 'Subheadings name a section or a card', lead: 'Lead paragraphs open a section in one or two plain sentences.', body: 'Body copy carries most of the reading. It is set for long lines at the measured size, leading and tracking, so a paragraph here reads as it does on the site.' };
  const roleKey = { display: 'display', heading: 'h1', subhead: 'h3', lead: 'lead', body: 'body' };
  const tClass = { display: 't-display', heading: 't-h1', subhead: 't-h3', lead: 't-lead', body: 't-body' };
  sections.push(`
<section id="typography" class="chapter img" aria-labelledby="typography-h">
  <div class="img-bg img-horizon kb"></div>${images.horizon ? '<span class="ai-tag" style="z-index:3">AI-generated image</span>' : ''}
  <div class="wrap">
    <div class="glass specimen reveal">
      <p class="eyebrow" style="margin:0">04 · Typography</p>
      <h2 id="typography-h" class="t-h2">Typography</h2>
      <div class="chips" role="tablist" aria-label="Type roles">
        ${tabsDef.map(([id, label], i) => `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" class="btn-${i === 0 ? btnLight : chipOff}" data-on="btn-${btnLight}" data-off="btn-${chipOff}">${label}</button>`).join('')}
      </div>
      ${tabsDef.map(([id], i) => { const r = role(roleKey[id]); return `<div class="panel" role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" ${i ? 'hidden' : ''}>
        <p class="${tClass[id]} sample">${esc(sampleText[id])}</p>
        <p class="spec">${esc(r.family || '')} · ${px(r.size)} @1440 → ${px(r.mobile)} @390 · leading ${r.lineHeight} · weight ${r.weight} · tracking ${r.tracking}em${r.inferred ? ` · ${esc(r.inferred)}` : ''}</p>
        <p class="spec">font-size: ${esc(r.clamp)}</p></div>`; }).join('\n      ')}
    </div>
  </div>
</section>`);

  const scaleRows = ['display', 'h1', 'h2', 'h3', 'h4', 'lead', 'body', 'small'].map((k) => { const r = role(k); return `<tr><td><b>${k}</b>${r.inferred ? ' <span class="muted">(inferred)</span>' : ''}</td><td>${px(r.mobile)} → ${px(r.size)}</td><td class="spec">${esc(r.clamp)}</td><td>${r.lineHeight}</td><td>${r.weight}</td><td>${r.tracking}em</td></tr>`; }).join('');
  sections.push(`
<section id="fonts" class="page ground-light">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">05</p><h2 class="t-h1">Fonts</h2>
      <p class="t-lead muted">Families ranked by share of rendered characters. Font files are not copied: specimens use your local copy if one is installed, otherwise the system sans.</p></div>
    <div class="fam-grid reveal">
      ${a.type.families.map((f) => `<div class="fam"><span class="aa" style="font-family:'${esc(f.family)}', var(--font-sans)">Aa</span>
        <div><h3 class="t-h3">${esc(f.family)}</h3><p class="t-small muted">${pc(f.share)} of characters · stack: <span class="spec">${esc(f.stack || '')}</span></p><p class="t-small" data-font-check="${esc(f.family)}">Installed locally: checking…</p></div>
        <div class="bars">${f.weights.map((w) => `<div class="bar"><span>${w.weight}</span><i style="width:${Math.max(1, w.share * 100)}%"></i><span>${pc(w.share)}</span></div>`).join('')}</div></div>`).join('')}
    </div>
    <div class="two reveal" style="margin-top:clamp(40px,6vw,80px)">
      <div style="display:grid;gap:16px"><h3 class="t-h3">Character set</h3>
        <p class="charset">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 £€$¥%&amp;@#?!.,:;—–-‘’“”()</p>
        <p class="t-small muted">Non-alphanumeric glyphs seen on the site: <span class="spec">${esc(a.type.glyphsSeen || 'none recorded')}</span></p>
        <h3 class="t-h3" style="margin-top:16px">Sizes in use</h3>
        <div class="bars">${a.type.sizesInUse.slice(0, 10).map((s) => `<div class="bar"><span>${px(s.size)}</span><i style="width:${Math.max(1, s.share * 100 / (a.type.sizesInUse.reduce((m, x) => Math.max(m, x.share), 0) || 1))}%"></i><span>${pc(s.share)}</span></div>`).join('')}</div>
      </div>
      <div style="display:grid;gap:16px;min-width:0"><h3 class="t-h3">Type scale</h3>
        <p class="t-small muted">Ratio ${a.type.ratio} — nearest named interval: ${esc(a.type.interval.name)} (${a.type.interval.value}). Sizes clustered within 12%; mobile sizes matched by identical text at 390px.</p>
        <div class="tscroll"><table><thead><tr><th>Role</th><th>390 → 1440</th><th>Fluid</th><th>Leading</th><th>Weight</th><th>Tracking</th></tr></thead><tbody>${scaleRows}</tbody></table></div>
        <h3 class="t-h3" style="margin-top:16px">Declared type variables</h3>
        ${a.typeVars.length ? `<div class="tscroll"><table><tbody>${a.typeVars.slice(0, 16).map(([k, v]) => `<tr><td class="spec">${esc(k)}</td><td class="spec">${esc(v)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="t-small muted">No type-related :root custom properties were readable.</p>'}
        ${a.fontsDeclared.length ? `<p class="t-small muted">@font-face families declared: ${esc(a.fontsDeclared.join(', '))}</p>` : ''}
      </div>
    </div>
  </div>
</section>`);

  const tileFg = (hex) => (C.contrast(hex, '#ffffff') >= C.contrast(hex, '#111111') ? '#ffffff' : '#111111');
  sections.push(`
<section id="colour" class="page ground-dark">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">06</p><h2 class="t-h1">Colour</h2>
      <p class="t-lead muted">Roles assigned from usage: text weighted by characters, backgrounds by painted area, with repeated header and footer counted once.</p></div>
    <div class="colour-top reveal">
      ${slot('object', 'kbwrap')}
      <div style="display:grid;gap:16px;align-content:start;min-width:0">
        <div class="palette-bar" aria-label="Proportional palette">${a.colour.bar.map((b) => `<span title="${b.hex} ${pc(b.share)}" style="flex:${Math.max(b.share, 0.004)};background:${b.hex}"></span>`).join('')}</div>
        <p class="t-small muted">Share of weighted use (text, background, fill, border). Top ${a.colour.bar.length} colours.</p>
        <div class="roles">${a.colour.roles.map((r) => `<div class="role"><div class="sw" style="background:var(--color-${r.role})"></div><div class="meta"><b>${r.role}</b><span class="spec">${r.hex}</span><span class="spec">${esc(r.oklch)}</span><span>${r.contrast ? `Contrast ${r.contrast}:1 on ${r.contrastAgainst}` : `${pc(r.share)} of ${r.shareOf === 'bg' ? 'painted area' : r.shareOf === 'text' ? 'characters' : 'weighted use'}`}</span></div></div>`).join('')}</div>
      </div>
    </div>
    <div class="two reveal" style="margin-top:clamp(40px,6vw,72px)">
      <div style="display:grid;gap:16px"><h3 class="t-h3">Gradient</h3><div class="gradient-strip"></div>
        <p class="spec">${esc(T['gradient-brand'].css)}</p>
        <p class="t-small muted">${a.colour.gradients.length ? `${a.colour.gradients.length} gradient${a.colour.gradients.length > 1 ? 's' : ''} found; the largest by painted area is used.` : 'No gradient found on the site; this one is a fallback from surface-inverse to accent.'}</p></div>
      <div style="display:grid;gap:12px;min-width:0"><h3 class="t-h3">Most-read contrast pairs</h3>
        ${a.colour.pairs.slice(0, 6).map((p) => `<div class="pair"><span class="aa" style="background:${p.bg};color:${p.fg}">Aa</span><span class="t-small">${p.fg} on ${p.bg}${p.onImage ? ' (image/gradient)' : ''} · <b>${p.ratio}:1</b> · ${p.aaa ? 'AAA' : p.aa ? 'AA' : p.aaLarge ? 'AA large only' : 'fails AA'} · ${pc(p.share)} of characters</span></div>`).join('')}</div>
    </div>
    <details class="reveal" style="margin-top:40px"><summary>Full palette (${a.colour.palette.length} colours)</summary>
      <div class="pal-list">${a.colour.palette.map((p) => `<div><i style="background:${p.hex}"></i><span class="spec">${p.hex} · ${pc(p.usage)}</span></div>`).join('')}</div></details>
  </div>
</section>`);

  const L = a.layout;
  const maxBp = Math.max(1600, ...L.breakpoints.map((b) => b.px + 120));
  const rhythmTotal = L.rhythm.reduce((s, r) => s + r.h, 0) || 1;
  sections.push(`
<section id="layout" class="page ground-light">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">07</p><h2 class="t-h1">Layout and spacing</h2></div>
    <div class="facts reveal">
      <div class="stat"><span class="n">${L.base}px</span><span>Base unit</span><span class="t-small muted">8: ${pc(L.shares[8])} · 4: ${pc(L.shares[4])} · 2: ${pc(L.shares[2])} on grid</span></div>
      <div class="stat"><span class="n">${L.columns}</span><span>Columns</span><span class="t-small muted">from ${esc(L.columnSource)}</span></div>
      <div class="stat"><span class="n">${L.gutter}px</span><span>Gutter</span><span class="t-small muted">most common column gap</span></div>
      <div class="stat"><span class="n">${L.container}px</span><span>Container</span><span class="t-small muted">most common max-width ≥ 900px</span></div>
    </div>
    <div class="reveal" style="margin-top:var(--gutter)"><div class="cols-demo" style="max-width:var(--container)">${Array.from({ length: Math.min(L.columns, 24) }, () => '<span></span>').join('')}</div>
      <p class="t-small muted" style="margin-top:8px">${L.columns} columns, ${L.gutter}px gutter, inside a ${L.container}px container.</p></div>
    <div class="two reveal" style="margin-top:clamp(40px,6vw,72px)">
      <div style="display:grid;gap:16px;min-width:0"><h3 class="t-h3">Spacing scale</h3>
        <div class="stair">${L.scale.map((v, i) => `<div><span class="spec">--space-${i + 1} · ${v}px</span><i style="width:min(100%, var(--space-${i + 1}))"></i></div>`).join('')}</div>
        <p class="t-small muted">On grid (${L.base}px): ${esc(L.onGrid.slice(0, 18).map((v) => `${v.px}×${v.count}`).join(', '))}</p>
        <p class="t-small muted">Off grid: ${L.offGrid.length ? esc(L.offGrid.slice(0, 12).map((v) => `${v.px}×${v.count}`).join(', ')) : 'none'}</p></div>
      <div style="display:grid;gap:16px;min-width:0"><h3 class="t-h3">Radii</h3>
        <div class="radii">${Object.keys(T).filter((k) => /^radius-/.test(k)).map((k) => `<div style="border-radius:var(--${k})"><span>--${k}<br>${esc(T[k].css)}</span></div>`).join('')}</div>
        <p class="t-small muted">${L.pillCount} pill-shaped elements; measured radii: ${esc(L.radii.map((r) => `${r.px}px×${r.count}`).join(', ') || 'none')}</p></div>
    </div>
    <div class="two reveal" style="margin-top:clamp(40px,6vw,72px)">
      <div style="min-width:0"><h3 class="t-h3">Breakpoints</h3>
        ${L.breakpoints.length ? `<div class="ruler"><span style="left:0">0</span>${L.breakpoints.map((b) => `<span style="left:${(b.px / maxBp) * 100}%">${b.px}px</span>`).join('')}</div><p class="t-small muted">From media queries in readable stylesheets (min/max-width clustered within 8px).</p>` : '<p class="t-small muted">No readable media queries.</p>'}</div>
      <div style="min-width:0"><h3 class="t-h3">Section rhythm (home)</h3>
        <div class="rhythm" style="margin-top:16px">${L.rhythm.map((r) => `<div style="height:${Math.max(14, (r.h / rhythmTotal) * 360)}px;background:${r.bg || 'transparent'};color:${r.bg ? tileFg(r.bg) : 'inherit'}">${r.tone} · ${r.h}px</div>`).join('')}</div>
        <p class="t-small muted" style="margin-top:8px">${L.rhythm.length} bands: ${esc(L.rhythm.map((r) => r.tone[0].toUpperCase()).join(' '))} (L light, D dark, I image/gradient).</p></div>
    </div>
  </div>
</section>`);

  const C1 = a.components;
  const btnTile = (k, v) => {
    const ground = v.ground || (k === 'translucent' ? g.darkHex : g.lightHex);
    const imgGround = k === 'translucent' || (v.ground && C.chroma(v.ground) > 0.08);
    return `<div class="tile ${imgGround ? 'img img-hero' : ''}" style="${imgGround ? '' : `background:${ground};`}color:${tileFg(ground)}">${imgGround && images.hero ? '<span class="ai-tag">AI-generated image</span>' : ''}
      <span class="t-small" style="position:relative;z-index:2"><b>${k}</b> · ${v.variant}${v.inferred ? ' <span class="flag">inferred</span>' : ''} · ${v.count}× measured</span>
      <div style="position:relative;z-index:2"><a class="btn-${k}" href="#components">${esc(v.labels && v.labels[0] ? v.labels[0] : 'Button')}</a></div>
      <span class="spec" style="position:relative;z-index:2">${v.pill ? 'pill' : `${v.radius}px`} · h ${v.height}px · ${v.padX}px x-pad · ${v.fontSize}px/${v.weight}${v.backdrop ? ` · ${esc(v.backdrop)}` : ''} · ground ${esc(ground)}</span></div>`;
  };
  const navLinks = (C1.nav.links || []).filter((l) => l && l.length < 24).slice(0, 5);
  sections.push(`
<section id="components" class="page ground-dark">
  <div class="wrap">
    <div class="comp-top reveal">
      <div class="sec-head" style="margin:0"><p class="eyebrow">08</p><h2 class="t-h1">Components</h2>
        <p class="t-lead muted">Buttons, navigation, cards and inputs, each rebuilt from its measured tokens and shown on the ground it was found on.</p></div>
      ${slot('glass')}
    </div>
    <h3 class="t-h3 reveal" style="margin-bottom:16px">Buttons · ${C1.variantCount} variant${C1.variantCount === 1 ? '' : 's'} found</h3>
    <div class="btn-gallery reveal">${variants.map(([k, v]) => btnTile(k, v)).join('')}</div>
    <h3 class="t-h3 reveal" style="margin:40px 0 16px">Navigation</h3>
    <div class="navwrap img img-sky reveal">${images.sky ? '<span class="ai-tag">AI-generated image</span>' : ''}
      <div class="navmock"><span class="logo" title="Logo not copied">LOGO</span><span class="links">${navLinks.map((l) => `<span>${esc(l)}</span>`).join('')}</span><a class="btn-${buttonFor(a, g.lightHex)}" href="#components">${esc((C1.buttons.primary.labels || [])[0] || 'Get started')}</a></div>
    </div>
    <p class="t-small muted reveal" style="margin-bottom:40px">Height ${esc(T['nav-height'].css)}${C1.nav.sticky ? ', sticky' : ''}${C1.nav.backdrop ? `, ${esc(C1.nav.backdrop)}` : ''}. Links ${esc(T['nav-link-size'].css)}/${esc(T['nav-link-weight'].css)}${C1.nav.linkTransform && C1.nav.linkTransform !== 'none' ? `, ${C1.nav.linkTransform}` : ''}. Logo: dashed placeholder at the measured ${C1.nav.logo ? `${C1.nav.logo.w} × ${C1.nav.logo.h}px in ${C1.nav.logo.color}` : 'size (no logo found)'}; the logo itself is not reproduced.</p>
    <h3 class="t-h3 reveal" style="margin-bottom:16px">Cards</h3>
    <div class="comp-cards reveal">
      ${C1.cards.slice(0, 3).map((c, i) => c.fill === 'translucent'
        ? `<div class="tile img img-hero" style="min-height:260px">${images.hero ? '<span class="ai-tag">AI-generated image</span>' : ''}<div class="rb-card glass" style="position:relative;z-index:2"><b>Translucent card</b><span class="spec">${esc(c.backdrop || '')} · r ${c.radius}px · ${c.count}×</span></div></div>`
        : `<article class="rb-card" style="${i ? `border-radius:${c.radius}px;` : ''}">${c.media ? slot(['street', 'sky', 'detail'][i % 3], 'media') : ''}<b>${esc(c.fill)} card${c.inferred ? ' <span class="flag">inferred</span>' : ''}</b><span class="spec">r ${c.radius}px · pad ${c.padY}/${c.padX}px · ${c.shadow ? 'shadow' : 'no shadow'} · ${c.count}×${c.media ? ` · media ${c.mediaShare}%` : ''}</span></article>`).join('\n      ')}
    </div>
    <h3 class="t-h3 reveal" style="margin:40px 0 16px">Form input${C1.input.inferred ? '<span class="flag">inferred</span>' : ''}</h3>
    <div class="tile reveal" style="background:var(--color-background);color:var(--color-text);max-width:640px">
      <label class="field"><span class="t-small">Text field</span><input class="inp" type="email" placeholder="${esc(C1.input.placeholder || 'name@example.com')}"></label>
      <span class="spec">h ${esc(T['input-height'].css)} · r ${esc(T['input-radius'].css)} · border ${esc(T['input-border-width'].css)} ${esc(T['input-border-color'].css)}${C1.input.inferred ? ' · no form fields found; inferred from button and surface tokens' : ` · ${C1.input.count} field${C1.input.count > 1 ? 's' : ''} measured`}</span>
    </div>
  </div>
</section>`);

  const I = a.imagery;
  sections.push(`
<section id="imagery" class="page ground-light">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">09</p><h2 class="t-h1">Imagery</h2>
      <p class="t-lead muted">Described, not copied. The tiles below are ${Object.keys(images).length ? 'AI-generated from text prompts, in the measured style, and labelled' : 'gradient fallbacks; this edition contains no images'}.</p></div>
    <div class="mosaic reveal">
      ${[['hero', 'm1'], ['street', 'm2'], ['sky', 'm3'], ['detail', 'm4'], ['object', 'm5']].map(([s, m]) => (images[s] ? `<div class="img img-${s} ${m}"><span class="ai-tag">AI-generated image</span></div>` : `<div class="img img-${s} ${m}"><span class="cap">${slotLabel(s)}</span></div>`)).join('')}
    </div>
    <div class="two reveal" style="margin-top:clamp(40px,6vw,72px)">
      <dl class="kv">
        <dt>Media elements</dt><dd>${I.count} raster/video (+${I.svgCount} SVG) across ${a.pages.length} pages</dd>
        <dt>Formats</dt><dd>${esc(I.formats.map((f) => `${f.format} ${pc(f.share)}`).join(', ') || '—')}</dd>
        <dt>Crops</dt><dd>${esc(I.crops.map((c) => `${c.crop} ${pc(c.share)}`).join(', ') || '—')}</dd>
        <dt>Full-bleed</dt><dd>${pc(I.fullBleedShare)} of media span ≥ 95% of the viewport</dd>
        <dt>Object-fit</dt><dd>${esc(I.fits.map((f) => `${f.fit} ×${f.count}`).join(', ') || '—')}</dd>
        <dt>Media share</dt><dd>${pc(I.mediaShareOfPage)} of total page area</dd>
        <dt>Rounded</dt><dd>${pc(I.roundedShare)} of media have rounded corners${I.medianRadius ? ` (median ${I.medianRadius}px)` : ''}</dd>
        <dt>Alt text</dt><dd>${I.emptyAlt} empty; themes: ${esc(I.altThemes.map((w) => w.word).join(', ') || '—')}</dd>
      </dl>
      <div><h3 class="t-h3" style="margin-bottom:12px">Source pages</h3><ul class="plain">${I.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener noreferrer">${esc(s.label)}</a> <span class="muted">· ${s.media} media</span></li>`).join('')}</ul>
        <p class="t-small muted" style="margin-top:12px">Open these pages to see the original photography. No image from the site is embedded here.</p></div>
    </div>
  </div>
</section>`);

  const V = a.voice;
  sections.push(`
<section id="voice" class="ground-dark">
  <div class="split">
    ${slot('street', 'kbwrap')}
    <div class="reveal"><p class="eyebrow">10</p><h2 class="t-h1">Voice and tone</h2>
      <dl class="kv">
        <dt>Headlines</dt><dd>${V.stats.headlines} measured · median ${V.stats.wordsMedian} words · 90% ≤ ${V.stats.wordsP90}</dd>
        <dt>Case</dt><dd>sentence ${pc(V.stats.caseShares.sentence)} · title ${pc(V.stats.caseShares.title)} · capitals ${pc(V.stats.caseShares.upper)}</dd>
        <dt>Person</dt><dd>"you" ${V.stats.you}× · "we" ${V.stats.we}× (${V.stats.youPer1000} vs ${V.stats.wePer1000} per 1,000 words)</dd>
        <dt>Numbers</dt><dd>${pc(V.stats.numbersShare)} of headlines contain a figure</dd>
        <dt>"X, Y"</dt><dd>${pc(V.stats.xyShare)} of headlines</dd>
        <dt>CTA verbs</dt><dd>${esc(V.stats.ctaVerbs.slice(0, 5).map((v) => v.verb).join(', ') || '—')} (${pc(V.stats.ctaVerbShare)} start with a verb)</dd>
        <dt>Exclamations</dt><dd>${V.stats.exclamations} in ${V.stats.totalWords} words</dd>
      </dl></div>
  </div>
</section>
<section class="page ground-light" aria-label="Quoted lines and rules">
  <div class="wrap">
    <div class="quotes">${V.quotes.map((q) => `<blockquote class="reveal"><p class="t-h2">“${esc(q.text)}”</p><a class="t-small muted" href="${esc(q.source)}" rel="noopener noreferrer">${esc(q.source.replace(/^https?:\/\//, ''))}</a></blockquote>`).join('')}</div>
    <div class="rules">${V.rules.map((r, i) => `<div class="rule reveal"><span class="k">${i + 1}</span><h3 class="t-h4">${esc(r.title)}</h3><p class="t-small muted">${esc(r.detail)}</p></div>`).join('')}</div>
  </div>
</section>`);

  sections.push(`
<section id="tokens" class="page ground-dark">
  <div class="wrap">
    ${slot('tokens', 'tok-hero reveal')}
    <div class="sec-head reveal"><p class="eyebrow">11</p><h2 class="t-h1">Design tokens</h2>
      <p class="t-lead muted">${Object.keys(T).length} tokens as CSS custom properties and W3C design-tokens JSON, OKLCH next to hex. Every sample in this guide uses only these variables.</p></div>
    <div class="tok-actions reveal">
      <button class="btn-${btnDark}" data-copy="tok-css">Copy CSS</button>
      <button class="btn-${B.translucent ? 'translucent' : B.outline ? 'outline' : btnDark}" data-copy="tok-json">Copy JSON</button>
      <button class="btn-${B.outline ? 'outline' : B.translucent ? 'translucent' : btnDark}" data-download="tok-css" data-name="tokens.css" data-type="text/css">Download tokens.css</button>
      <button class="btn-${B.outline ? 'outline' : B.translucent ? 'translucent' : btnDark}" data-download="tok-json" data-name="tokens.json" data-type="application/json">Download tokens.json</button>
    </div>
    <div class="code reveal"><pre id="tok-css" tabindex="0">${esc(tokensCss)}</pre><pre id="tok-json" tabindex="0">${esc(tokensJson)}</pre></div>
  </div>
</section>`);

  sections.push(`
<section id="method" class="page ground-light">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow">12</p><h2 class="t-h1">Method</h2>
      <p class="t-lead muted">How the numbers were taken, and what was assumed where measurement ran out.</p></div>
    <div class="two reveal">
      <div style="display:grid;gap:16px;min-width:0"><h3 class="t-h3">Assumptions</h3><ul class="plain">${[
        `Viewports: 1440 × 900 for all pages, plus 390 × 844 for the home page.`,
        `Pages: home plus ${a.pages.length - 1} picked by scoring same-origin links (nav, product, pricing, business, company score highest; legal, help, login and locale duplicates skipped; one per top-level path).`,
        'Counts identical on every page (header and footer) are counted once.',
        'Cookie and consent UI excluded by id/class and dialog text.',
        ...a.assumptions,
      ].map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
      <div style="display:grid;gap:16px;min-width:0"><h3 class="t-h3">Run log</h3>
        <div class="tscroll"><table><tbody>
          ${(runLog.phases || []).map((p) => `<tr><td>${esc(p.name)}</td><td>${(p.ms / 1000).toFixed(1)} s</td><td class="muted">${esc(p.note || '')}</td></tr>`).join('')}
          <tr><td>Capture mode</td><td colspan="2">${esc(runLog.mode || '')} · ${esc(runLog.browser || '')}</td></tr>
          <tr><td>Elements</td><td colspan="2">${a.counts.elementsWalked} walked · ${a.counts.elementsVisible} visible · ${a.counts.consentExcluded} consent excluded</td></tr>
        </tbody></table></div>
        <h3 class="t-h3">Pages</h3><ul class="plain">${a.pages.map((p) => `<li><a href="${esc(p.url)}" rel="noopener noreferrer">${esc(p.url.replace(/^https?:\/\//, ''))}</a>${p.score !== null && p.score !== undefined ? ` <span class="muted">· score ${p.score}</span>` : ' <span class="muted">· home</span>'}</li>`).join('')}</ul></div>
    </div>
    <div class="reveal" style="margin-top:clamp(40px,6vw,72px);min-width:0"><h3 class="t-h3" style="margin-bottom:12px">Image prompts</h3>
      <div class="tscroll"><table><thead><tr><th>Slot</th><th>Aspect</th><th>Status</th><th>Prompt</th></tr></thead><tbody>
      ${prompts.slots.map((p) => `<tr><td><b>${p.slot}</b></td><td>${p.aspectRatio}</td><td>${esc((manifest[p.slot] && manifest[p.slot].status) || (edition === 'hero' && images[p.slot] ? 'embedded' : 'not generated'))}</td><td class="t-small">${esc(p.prompt)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="t-small muted" style="margin-top:12px">Images mode: ${esc(prompts.mode)}. AI images are generated from text prompts only; no brand photo is used as input.</p></div>
  </div>
</section>`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand)} brand guidelines — unofficial analysis</title>
<meta name="description" content="${disclaimer}">
<meta name="generator" content="reverse-brand">
<style>
${tokensCss}
${baseCss(a, images)}
${guideCss(a)}
</style>
</head>
<body>
<header class="topbar"><div class="wrap">
  <span class="unofficial">Unofficial analysis</span>
  <a class="name" href="#cover">${esc(brand)} brand guidelines</a>
  <nav aria-label="Sections">${nav.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav>
  <a class="btn-${btnLight} btn-cta" href="#tokens">Tokens</a>
</div></header>
<main>
${sections.join('\n')}
</main>
<footer class="foot ground-dark"><div class="wrap"><span class="unofficial">Unofficial analysis</span><span>${disclaimer}</span><span class="muted">Generated by reverse-brand from ${esc(a.host)} on ${date}.</span></div></footer>
<script>${guideJs()}</script>
</body>
</html>`;
}

module.exports = { build, baseCss, brandName, grounds, buttonFor, SLOTS, esc };
