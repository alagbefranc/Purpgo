'use strict';
const C = require('./color');

const FALLBACK = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const px = (n) => `${Math.round(n * 100) / 100}px`;
const em = (n) => `${Math.round(n * 1000) / 1000}em`;
function hexA(hex, a) {
  if (!hex) return 'transparent';
  if (a === undefined || a === null || a >= 0.995) return hex;
  return hex + Math.round(Math.max(0, a) * 255).toString(16).padStart(2, '0');
}
function stack(family, measured) {
  const base = measured || (family ? `"${family}"` : '');
  return /sans-serif|serif|monospace|system-ui/.test(base) ? base : [base, FALLBACK].filter(Boolean).join(', ');
}
function parseShadow(s) {
  const parts = s.split(/,(?![^(]*\))/).map((p) => p.trim());
  return parts.map((p) => {
    const color = (p.match(/rgba?\([^)]*\)|#[0-9a-f]{3,8}/i) || ['#00000033'])[0];
    const nums = p.replace(color, '').match(/-?[\d.]+px/g) || [];
    return { color, offsetX: nums[0] || '0px', offsetY: nums[1] || '0px', blur: nums[2] || '0px', spread: nums[3] || '0px', inset: /inset/.test(p) };
  });
}
function bezier(e) {
  const m = (e || '').match(/cubic-bezier\(([^)]*)\)/);
  if (m) return m[1].split(',').map((x) => +x.trim());
  return { ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1], linear: [0, 0, 1, 1] }[e] || [0.25, 0.1, 0.25, 1];
}

// Build one token tree; CSS and JSON are both rendered from it.
// Each leaf: { css: value used in CSS, type: W3C $type, value: W3C $value, ext: extra info }
function buildTokens(a) {
  const T = {};
  const set = (path, css, type, value, ext) => { T[path] = { css, type, value: value === undefined ? css : value, ext }; };
  const fams = a.type.families;
  const sans = fams[0] ? stack(fams[0].family, fams[0].stack) : FALLBACK;
  const displayFam = a.type.roles.display.family;
  const display = displayFam && fams.find((f) => f.family === displayFam) ? stack(displayFam, fams.find((f) => f.family === displayFam).stack) : sans;
  set('font-sans', sans, 'fontFamily', sans);
  set('font-display', display, 'fontFamily', display);
  if (fams[1]) set('font-alt', stack(fams[1].family, fams[1].stack), 'fontFamily');

  for (const [role, r] of Object.entries(a.type.roles)) {
    const famVar = r.family && r.family === displayFam && role !== 'body' && role !== 'small' && role !== 'lead' ? 'var(--font-display)' : 'var(--font-sans)';
    set(`type-${role}-family`, famVar, null, null);
    set(`type-${role}-size`, r.clamp, 'dimension', px(r.size), { mobile: px(r.mobile), desktop: px(r.size), fluid: r.clamp });
    set(`type-${role}-leading`, String(r.lineHeight), 'number', r.lineHeight);
    set(`type-${role}-weight`, String(r.weight), 'fontWeight', r.weight);
    set(`type-${role}-tracking`, em(r.tracking), 'dimension', em(r.tracking));
    if (r.transform && r.transform !== 'none') set(`type-${role}-case`, r.transform, null, r.transform);
  }

  for (const r of a.colour.roles) set(`color-${r.role}`, r.hex, 'color', r.hex, { oklch: r.oklch, share: r.share, contrast: r.contrast });
  set('gradient-brand', a.colour.brandGradient, 'gradient', (a.colour.gradients[0] ? a.colour.gradients[0].stops : [a.colour.roles[2].hex, a.colour.roles[9].hex]).map((c, i, arr) => ({ color: c, position: arr.length > 1 ? Math.round((i / (arr.length - 1)) * 100) / 100 : 0 })));

  const L = a.layout;
  set('space-base', px(L.base), 'dimension');
  L.scale.forEach((v, i) => set(`space-${i + 1}`, px(v), 'dimension'));
  set('container', px(L.container), 'dimension');
  set('columns', String(L.columns), 'number', L.columns);
  set('gutter', px(L.gutter), 'dimension');
  L.breakpoints.forEach((b, i) => set(`bp-${i + 1}`, px(b.px), 'dimension'));
  const radNames = ['sm', 'md', 'lg', 'xl'];
  const rt = L.radiusTokens.length ? L.radiusTokens : [8];
  rt.forEach((v, i) => set(`radius-${radNames[i]}`, px(v), 'dimension'));
  set('radius-pill', '9999px', 'dimension');
  L.shadows.forEach((s, i) => set(`shadow-${i + 1}`, s.value, 'shadow', parseShadow(s.value)));
  set('ease-brand', a.motion.easing, 'cubicBezier', bezier(a.motion.easing));
  set('duration-brand', `${a.motion.duration}ms`, 'duration');

  const cv = Object.fromEntries(a.colour.roles.map((r) => [r.role, r.hex]));
  for (const [name, b] of Object.entries(a.components.buttons)) {
    if (!b) continue;
    const pre = `button-${name}`;
    set(`${pre}-bg`, hexA(b.bg, b.bgAlpha), 'color');
    set(`${pre}-fg`, b.fg || cv['on-action'], 'color');
    const bw = b.border && b.border !== 'none' ? b.border.split(' ')[0] : '0px';
    const bc = b.border && b.border !== 'none' ? b.border.split(' ').pop() : 'transparent';
    set(`${pre}-border-width`, bw, 'dimension');
    set(`${pre}-border-color`, bc, 'color');
    set(`${pre}-radius`, b.pill ? '9999px' : px(b.radius), 'dimension');
    set(`${pre}-pad-x`, px(b.padX), 'dimension');
    set(`${pre}-pad-y`, px(b.padY), 'dimension');
    set(`${pre}-height`, px(b.height), 'dimension');
    set(`${pre}-font-size`, px(b.fontSize), 'dimension');
    set(`${pre}-weight`, String(b.weight), 'fontWeight', b.weight);
    set(`${pre}-tracking`, px(b.letterSpacing || 0), 'dimension');
    set(`${pre}-backdrop`, b.backdrop || 'none', null);
  }
  const card = a.components.cards[0];
  const glass = a.components.cards.find((c) => c.fill === 'translucent');
  set('card-bg', hexA(card.bg || cv.surface, card.bgAlpha), 'color');
  set('card-radius', px(card.radius), 'dimension');
  set('card-pad-x', px(card.padX || L.base * 3), 'dimension');
  set('card-pad-y', px(card.padY || L.base * 3), 'dimension');
  set('card-shadow', card.shadow || 'none', card.shadow ? 'shadow' : null, card.shadow ? parseShadow(card.shadow) : 'none');
  set('card-border', card.border ? card.border.replace(/^(\S+) (\S+)$/, '$1 solid $2') : 'none', null);
  set('card-backdrop', card.backdrop || 'none', null);
  set('card-glass-bg', glass ? hexA(glass.bg, glass.bgAlpha) : hexA(cv.background, 0.16), 'color');
  set('card-glass-backdrop', glass && glass.backdrop ? glass.backdrop : 'blur(24px)', null);
  set('card-glass-radius', px(glass ? glass.radius : card.radius), 'dimension');

  const inp = a.components.input;
  const [ibw, ibc] = (inp.border || '1px #cccccc').split(' ');
  set('input-height', px(inp.height), 'dimension');
  set('input-radius', px(inp.radius), 'dimension');
  set('input-border-width', ibw, 'dimension');
  set('input-border-color', ibc && ibc !== 'none' ? ibc : cv.border, 'color');
  set('input-bg', inp.bg || cv.surface, 'color');
  set('input-fg', inp.color || cv.text, 'color');
  set('input-pad-x', px(inp.padX), 'dimension');
  set('input-font-size', px(inp.fontSize || 16), 'dimension');

  const nav = a.components.nav;
  set('nav-height', px(nav.height || 64), 'dimension');
  set('nav-bg', hexA(nav.bg || cv.background, nav.bg ? nav.bgA : 0.8), 'color');
  set('nav-backdrop', nav.backdrop || 'blur(20px)', null);
  set('nav-link-size', px(nav.linkSize || 15), 'dimension');
  set('nav-link-weight', String(nav.linkWeight || 500), 'fontWeight', nav.linkWeight || 500);
  set('nav-link-color', nav.linkColor || cv.text, 'color');
  set('nav-logo-width', px(nav.logo ? nav.logo.w : 96), 'dimension');
  set('nav-logo-height', px(nav.logo ? nav.logo.h : 24), 'dimension');
  set('nav-logo-color', (nav.logo && nav.logo.color) || cv.text, 'color');
  return T;
}

function toCss(T, a) {
  const lines = [];
  lines.push(`/* ${a.host} — unofficial analysis by reverse-brand. Not affiliated with or endorsed by the brand owner. */`);
  lines.push(`/* Measured ${a.capturedAt.slice(0, 10)} from ${a.pages.length} pages. Colours: hex, with OKLCH in comments. */`);
  lines.push(':root {');
  let group = '';
  for (const [k, t] of Object.entries(T)) {
    const g = k.split('-')[0];
    if (g !== group) { lines.push(`  /* ${g} */`); group = g; }
    const note = t.ext && t.ext.oklch ? ` /* ${t.ext.oklch} */` : t.ext && t.ext.fluid ? ` /* ${t.ext.mobile} @390 → ${t.ext.desktop} @1440 */` : '';
    lines.push(`  --${k}: ${t.css};${note}`);
  }
  lines.push('}');
  return lines.join('\n') + '\n';
}

function toJson(T, a) {
  const root = {
    $description: `${a.host} — unofficial analysis. Not affiliated with or endorsed by the brand owner. Trademarks belong to their owners.`,
    $extensions: { 'dev.reverse-brand': { source: a.url, capturedAt: a.capturedAt, pages: a.pages.map((p) => p.url) } },
  };
  for (const [k, t] of Object.entries(T)) {
    const parts = k.split('-');
    const groupKey = parts[0];
    const rest = parts.slice(1).join('-') || 'value';
    root[groupKey] = root[groupKey] || {};
    const leaf = {};
    if (t.type) leaf.$type = t.type;
    leaf.$value = t.type ? t.value : t.css;
    const ext = Object.assign({}, t.ext || {});
    ext.css = `var(--${k})`;
    if (t.type === 'color' && !ext.oklch && /^#[0-9a-f]{6}/i.test(t.value)) ext.oklch = C.oklchString(t.value.slice(0, 7));
    leaf.$extensions = { 'dev.reverse-brand': ext };
    root[groupKey][rest] = leaf;
  }
  return JSON.stringify(root, null, 2) + '\n';
}

module.exports = { buildTokens, toCss, toJson, hexA };
