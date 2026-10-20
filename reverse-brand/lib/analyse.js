'use strict';
const C = require('./color');

const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function mode(items, keyFn = (x) => x, wFn = () => 1) {
  const m = new Map();
  for (const it of items) { const k = keyFn(it); if (k === null || k === undefined) continue; m.set(k, (m.get(k) || 0) + wFn(it)); }
  let best = null, bw = -1;
  for (const [k, w] of m) if (w > bw) { best = k; bw = w; }
  return best;
}
const topEntries = (map, n = 999) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);

// ---------------------------------------------------------------- dedupe
// Any count that is identical on every page (header and footer chrome) is counted once.
function mergeMaps(maps, valueOf = (v) => v, combine = null) {
  const keys = new Set(maps.flatMap((m) => Object.keys(m || {})));
  const out = {};
  let deduped = 0;
  for (const k of keys) {
    const vals = maps.map((m) => (m && k in m ? m[k] : undefined));
    const nums = vals.map((v) => (v === undefined ? undefined : valueOf(v)));
    const same = maps.length > 1 && nums.every((n) => n !== undefined && Math.round(n) === Math.round(nums[0]));
    if (same) { out[k] = vals[0]; deduped++; } else if (combine) out[k] = vals.filter((v) => v !== undefined).reduce(combine);
    else out[k] = sum(nums.filter((n) => n !== undefined));
  }
  return { map: out, deduped };
}
function mergeArrays(pages, field, sigFn) {
  const perPage = pages.map((p) => {
    const m = new Map();
    for (const it of p.data[field] || []) { const s = sigFn(it); m.set(s, (m.get(s) || 0) + 1); }
    return m;
  });
  const out = [];
  let deduped = 0;
  pages.forEach((p, i) => {
    for (const it of p.data[field] || []) {
      const s = sigFn(it);
      const everywhere = pages.length > 1 && perPage.every((m) => m.get(s) === perPage[0].get(s));
      if (everywhere && i > 0) { deduped++; continue; }
      out.push({ ...it, page: p.url });
    }
  });
  return { list: out, deduped };
}

// ---------------------------------------------------------------- type
const INTERVALS = [
  ['Minor second', 1.067], ['Major second', 1.125], ['Minor third', 1.2], ['Major third', 1.25],
  ['Perfect fourth', 1.333], ['Augmented fourth', 1.414], ['Perfect fifth', 1.5], ['Golden ratio', 1.618],
];
function clusterSizes(items) {
  // items: {size, w}; cluster within 12% of the cluster's largest size
  const sorted = [...items].sort((a, b) => b.size - a.size);
  const clusters = [];
  for (const it of sorted) {
    const c = clusters[clusters.length - 1];
    if (c && it.size >= c.top * 0.88) c.items.push(it); else clusters.push({ top: it.size, items: [it] });
  }
  return clusters.map((c) => ({ ...c, w: sum(c.items.map((i) => i.w)), size: mode(c.items, (i) => i.size, (i) => i.w) }));
}
function roleFrom(items, sizeHint) {
  const pick = items.filter((i) => Math.abs(i.size - sizeHint) / sizeHint <= 0.12);
  const src = pick.length ? pick : items;
  const w = (i) => i.w || 1;
  const size = sizeHint;
  const lhs = src.map((i) => i.lineHeight / i.size).filter((x) => x > 0.6 && x < 3);
  return {
    size: r1(size),
    lineHeight: r2(median(lhs) || 1.2),
    weight: mode(src, (i) => i.weight, w) || 400,
    tracking: r3(median(src.map((i) => (i.letterSpacing || 0) / i.size)) || 0),
    family: mode(src, (i) => i.family, w),
    transform: mode(src, (i) => i.transform, w) || 'none',
    samples: [...new Set(src.flatMap((i) => i.samples || (i.text ? [i.text] : [])))].slice(0, 3),
    tags: [...new Set(src.map((i) => i.tag))].slice(0, 4),
  };
}
function clampFor(minPx, maxPx) {
  if (!minPx || !maxPx || Math.abs(maxPx - minPx) < 0.5) return `${r3(maxPx / 16)}rem`;
  const lo = Math.min(minPx, maxPx), hi = Math.max(minPx, maxPx);
  const slope = (maxPx - minPx) / (1440 - 390);
  const intercept = minPx - slope * 390;
  return `clamp(${r3(lo / 16)}rem, ${r3(intercept / 16)}rem + ${r2(slope * 100)}vw, ${r3(hi / 16)}rem)`;
}

function analyseType(styles, headings, mobile, assumptions) {
  const st = Object.values(styles);
  const totalChars = sum(st.map((s) => s.chars));
  // body: most-read size between 12 and 22px outside headings
  const bodyish = st.filter((s) => s.size >= 12 && s.size <= 22 && !/^h[1-6]$/.test(s.tag));
  const bodySize = mode(bodyish, (s) => s.size, (s) => s.chars) || 16;
  const asItems = (arr) => arr.map((s) => ({ ...s, w: s.chars }));
  const body = roleFrom(asItems(bodyish), bodySize);
  const smallC = st.filter((s) => s.size < bodySize && s.size >= 9);
  const small = smallC.length ? roleFrom(asItems(smallC), mode(smallC, (s) => s.size, (s) => s.chars)) : null;
  const leadC = st.filter((s) => s.size > bodySize * 1.08 && s.size <= Math.min(bodySize * 1.75, 28) && (s.tag === 'p' || s.tag === 'other') && s.weight <= 500);
  const lead = leadC.length ? roleFrom(asItems(leadC), mode(leadC, (s) => s.size, (s) => s.chars)) : null;

  const hc = headings.filter((h) => !h.chrome && h.size >= Math.max(18, bodySize * 1.2)).map((h) => ({ ...h, w: /^h[1-3]$/.test(h.tag) ? 2 : 1 }));
  let clusters = clusterSizes(hc).filter((c) => c.w >= 1);
  // drop single-use outliers when there are many clusters
  if (clusters.length > 5) clusters = clusters.filter((c, i) => i === 0 || c.items.length > 1).slice(0, 5);
  const roles = {};
  const names = [];
  if (clusters.length >= 2 && clusters[0].size >= 40 && clusters[0].size >= clusters[1].size * 1.15) names.push('display');
  ['h1', 'h2', 'h3', 'h4'].forEach((n) => names.push(n));
  clusters.slice(0, names.length).forEach((c, i) => { roles[names[i]] = { ...roleFrom(c.items, c.size), count: c.items.length }; });
  if (!roles.display && roles.h1) { roles.display = { ...roles.h1, inferred: 'same as h1 (no separate display size found)' }; assumptions.push('Type: no display size distinct from h1; display = h1.'); }
  for (const n of ['h1', 'h2', 'h3', 'h4']) {
    if (!roles[n]) {
      const prev = roles[{ h1: 'display', h2: 'h1', h3: 'h2', h4: 'h3' }[n]];
      const base = prev ? prev.size / 1.2 : bodySize * 1.5;
      roles[n] = { ...(prev || body), size: r1(Math.max(base, bodySize * 1.1)), inferred: 'interpolated (no cluster found)' };
      assumptions.push(`Type: ${n} not found as its own size cluster; interpolated at ${roles[n].size}px.`);
    }
  }
  roles.lead = lead || { ...body, size: r1(bodySize * 1.25), inferred: 'body × 1.25 (no lead size found)' };
  if (!lead) assumptions.push('Type: no lead size found; lead = body × 1.25.');
  roles.body = body;
  roles.small = small || { ...body, size: r1(bodySize * 0.8125), inferred: 'body × 0.8125 (no small size found)' };

  // mobile: match the same heading text across viewports
  const mobHead = (mobile && mobile.headings) || [];
  const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const mobByText = new Map(mobHead.map((h) => [norm(h.text), h]));
  const ratios = [];
  for (const [name, role] of Object.entries(roles)) {
    if (['lead', 'body', 'small'].includes(name)) continue;
    const matched = hc.filter((h) => Math.abs(h.size - role.size) / role.size <= 0.12).map((h) => mobByText.get(norm(h.text))).filter(Boolean);
    if (matched.length) { role.mobile = r1(median(matched.map((m) => m.size))); role.mobileMatched = matched.length; ratios.push(role.mobile / role.size); }
  }
  const mobStyles = Object.values((mobile && mobile.textStyles) || {});
  const mobBodyC = mobStyles.filter((s) => s.size >= 12 && s.size <= 22 && !/^h[1-6]$/.test(s.tag));
  const mobBody = mode(mobBodyC, (s) => s.size, (s) => s.chars);
  const fallbackRatio = ratios.length ? median(ratios) : null;
  for (const [name, role] of Object.entries(roles)) {
    if (role.mobile) continue;
    if (name === 'body') role.mobile = mobBody || role.size;
    else if (name === 'small' || name === 'lead') role.mobile = name === 'lead' && mobBody ? r1(Math.max(mobBody, role.size * 0.9)) : role.size;
    else if (fallbackRatio) { role.mobile = r1(Math.max(bodySize * 1.1, role.size * fallbackRatio)); role.mobileInferred = true; }
    else { role.mobile = r1(Math.max(bodySize * 1.1, role.size * 0.7)); role.mobileInferred = true; }
  }
  if (Object.values(roles).some((r) => r.mobileInferred)) assumptions.push('Type: some roles had no matching text at 390px; mobile size scaled by the median matched ratio (or ×0.7).');
  for (const role of Object.values(roles)) role.clamp = clampFor(role.mobile, role.size);

  // scale ratio over body → h4 → … → display
  const ladder = ['body', 'h4', 'h3', 'h2', 'h1', 'display'].map((n) => roles[n].size).filter((v, i, a) => i === 0 || v > a[i - 1]);
  const steps = [];
  for (let i = 1; i < ladder.length; i++) steps.push(ladder[i] / ladder[i - 1]);
  const ratio = steps.length ? Math.exp(sum(steps.map(Math.log)) / steps.length) : 1.25;
  const nearest = INTERVALS.reduce((b, iv) => (Math.abs(iv[1] - ratio) < Math.abs(b[1] - ratio) ? iv : b));

  // families
  const famChars = {};
  for (const s of st) famChars[s.family] = (famChars[s.family] || 0) + s.chars;
  const families = topEntries(famChars).filter(([f]) => f).map(([f, ch]) => {
    const ws = {};
    st.filter((s) => s.family === f).forEach((s) => { ws[s.weight] = (ws[s.weight] || 0) + s.chars; });
    const stack = mode(st.filter((s) => s.family === f), (s) => s.stack, (s) => s.chars);
    return { family: f, stack, share: r3(ch / totalChars), weights: topEntries(ws).map(([w, c]) => ({ weight: +w, share: r3(c / ch) })).sort((a, b) => a.weight - b.weight) };
  }).filter((f) => f.share >= 0.01);

  const sizesInUse = topEntries(st.reduce((m, s) => { m[s.size] = (m[s.size] || 0) + s.chars; return m; }, {}))
    .map(([s, ch]) => ({ size: +s, share: r3(ch / totalChars) })).filter((s) => s.share >= 0.002).sort((a, b) => b.size - a.size);

  const glyphs = [...new Set(st.flatMap((s) => (s.samples || []).join('')).join('').replace(/\s/g, ''))].filter((c) => !/[A-Za-z0-9]/.test(c)).slice(0, 60).join('');

  return { roles, ratio: r3(ratio), interval: { name: nearest[0], value: nearest[1] }, families, sizesInUse, totalChars, glyphsSeen: glyphs, clustersFound: clusters.length };
}

// ---------------------------------------------------------------- colour
function analyseColour({ textColors, bgColors, borderColors, fills, gradients, pairs, buttons }, assumptions) {
  const totalText = sum(Object.values(textColors)) || 1;
  const totalBg = sum(Object.values(bgColors)) || 1;
  const bg = topEntries(bgColors).map(([hex, a]) => ({ hex, share: a / totalBg }));
  const tx = topEntries(textColors).map(([hex, c]) => ({ hex, share: c / totalText }));
  const background = bg[0] ? bg[0].hex : '#ffffff';
  const bgDark = C.isDark(background);
  const surface = (bg.find((b) => b.hex !== background && C.isDark(b.hex) === bgDark && C.deltaE(b.hex, background) < 0.12) || {}).hex
    || C.mix(background, bgDark ? '#ffffff' : '#000000', 0.04);
  if (!bg.find((b) => b.hex === surface)) assumptions.push('Colour: no distinct surface colour; surface = background mixed 4% toward the opposite pole.');
  const surfaceInv = (bg.find((b) => C.isDark(b.hex) !== bgDark) || {}).hex || (bgDark ? '#ffffff' : '#111111');
  if (!bg.find((b) => b.hex === surfaceInv)) assumptions.push('Colour: no inverse ground found; surface-inverse assumed.');
  const text = (tx.find((t) => C.isDark(t.hex) !== bgDark) || tx[0] || { hex: bgDark ? '#ffffff' : '#111111' }).hex;
  const muted = (tx.find((t) => t.hex !== text && C.isDark(t.hex) === C.isDark(text) && C.contrast(t.hex, background) < C.contrast(text, background) && C.contrast(t.hex, background) >= 2.5) || {}).hex
    || C.mix(text, background, 0.4);
  const textInv = (tx.find((t) => C.isDark(t.hex) === bgDark && C.contrast(t.hex, surfaceInv) >= 3) || {}).hex || background;

  const filled = buttons.filter((b) => b.bg && b.bgA >= 0.9 && !b.chrome);
  const filledAll = filled.length ? filled : buttons.filter((b) => b.bg && b.bgA >= 0.9);
  const action = mode(filledAll, (b) => b.bg) || text;
  const actionGround = mode(filledAll.filter((b) => b.bg === action && b.ground), (b) => b.ground) || background;
  const onAction = mode(filledAll.filter((b) => b.bg === action), (b) => b.color) || (C.isDark(action) ? '#ffffff' : '#111111');
  const actionAlt = mode(filledAll.filter((b) => C.deltaE(b.bg, action) > 0.05), (b) => b.bg) || surfaceInv;
  if (!filledAll.length) assumptions.push('Colour: no filled buttons; action = text colour.');

  // accent: most-used chromatic colour across all channels, distinct from action
  const usage = {};
  const add = (m, total, w) => { for (const [h, v] of Object.entries(m)) usage[h] = (usage[h] || 0) + (v / total) * w; };
  add(textColors, totalText, 1); add(bgColors, totalBg, 1);
  add(fills, sum(Object.values(fills)) || 1, 0.5); add(borderColors, sum(Object.values(borderColors)) || 1, 0.3);
  for (const g of Object.values(gradients)) for (const s of g.stops) usage[s] = (usage[s] || 0) + Math.min(0.5, g.area / totalBg) / Math.max(1, g.stops.length);
  const chromatic = topEntries(usage).filter(([h]) => C.chroma(h) >= 0.06)
    .sort((x, y) => (Math.abs(y[1] - x[1]) > 0.002 ? y[1] - x[1] : C.chroma(y[0]) - C.chroma(x[0])));
  const accent = (chromatic.find(([h]) => C.deltaE(h, action) > 0.08) || chromatic[0] || [null])[0] || action;
  if (!chromatic.length) assumptions.push('Colour: no chromatic colour (OKLCH C ≥ 0.06) in use; accent = action.');
  const border = (topEntries(borderColors).find(([h]) => C.contrast(h, background) < 3) || topEntries(borderColors)[0] || [C.mix(text, background, 0.85)])[0];

  const shareOf = (hex, kind) => {
    if (kind === 'text') return r3((textColors[hex] || 0) / totalText);
    if (kind === 'bg') return r3((bgColors[hex] || 0) / totalBg);
    return r3((usage[hex] || 0) / (sum(Object.values(usage)) || 1));
  };
  const role = (name, hex, kind, note) => ({ role: name, hex, oklch: C.oklchString(hex), share: shareOf(hex, kind), shareOf: kind, note });
  const roles = [
    role('background', background, 'bg'), role('surface', surface, 'bg'), role('surface-inverse', surfaceInv, 'bg'),
    role('text', text, 'text'), role('text-muted', muted, 'text'), role('text-inverse', textInv, 'text'),
    role('action', action, 'all', 'most common filled button'), role('on-action', onAction, 'all', 'label on action buttons'),
    role('action-alt', actionAlt, 'all', 'second filled button colour'), role('accent', accent, 'all', 'most-used chromatic colour'),
    role('border', border, 'all'),
  ];
  for (const r of roles) {
    const ground = ['text', 'text-muted', 'border'].includes(r.role) ? background : r.role === 'action' ? actionGround : r.role === 'text-inverse' ? surfaceInv : r.role === 'on-action' ? action : null;
    r.contrast = ground ? r2(C.contrast(r.hex, ground)) : null;
    r.contrastAgainst = ground;
  }

  const gradList = Object.values(gradients).filter((g) => new Set(g.stops).size >= 2).sort((a, b) => b.area - a.area).slice(0, 6)
    .map((g) => ({ type: g.type, stops: g.stops, area: Math.round(g.area), count: g.count, css: `${g.type || 'linear-gradient'}(${g.type === 'radial-gradient' ? 'circle at 30% 20%' : '135deg'}, ${g.stops.join(', ')})` }));
  const brandGradient = gradList[0] ? gradList[0].css : `linear-gradient(135deg, ${surfaceInv}, ${accent})`;
  if (!gradList.length) assumptions.push('Colour: no gradients found; brand gradient = surface-inverse → accent (fallback).');

  const pairList = topEntries(pairs, 12).map(([k, ch]) => {
    const [fg, bgc, img] = k.split('>');
    const ratio = C.contrast(fg, bgc);
    return { fg, bg: bgc, onImage: !!img, chars: ch, share: r3(ch / totalText), ratio: r2(ratio), aa: ratio >= 4.5, aaLarge: ratio >= 3, aaa: ratio >= 7 };
  }).slice(0, 8);

  const palette = [...new Set([...bg.map((b) => b.hex), ...tx.map((t) => t.hex), ...Object.keys(fills), ...Object.keys(borderColors)])]
    .map((h) => ({ hex: h, oklch: C.oklchString(h), text: shareOf(h, 'text'), bg: shareOf(h, 'bg'), usage: shareOf(h, 'all') }))
    .sort((a, b) => b.usage - a.usage);
  const bar = topEntries(usage, 10).map(([h, u]) => ({ hex: h, share: r3(u / (sum(Object.values(usage)) || 1)) }));

  return { roles, gradients: gradList, brandGradient, pairs: pairList, palette, bar, groundIsDark: bgDark };
}

// ---------------------------------------------------------------- layout
function analyseLayout({ spacing, radii, maxWidths, centredWidths, grids, flexRows, breakpoints, sections, shadows }, assumptions) {
  const vals = {};
  for (const m of [spacing.padding, spacing.margin, spacing.gap]) for (const [v, c] of Object.entries(m)) vals[v] = (vals[v] || 0) + c;
  const entries = Object.entries(vals).map(([v, c]) => [+v, c]).filter(([v]) => v >= 1);
  const total = sum(entries.map((e) => e[1])) || 1;
  const shareFor = (b) => sum(entries.filter(([v]) => Math.abs(v / b - Math.round(v / b)) < 0.05).map((e) => e[1])) / total;
  const shares = { 8: shareFor(8), 4: shareFor(4), 2: shareFor(2) };
  let base = [8, 4, 2].find((b) => shares[b] >= 0.75);
  if (!base) { base = 4; assumptions.push(`Layout: no base unit reaches 75% on-grid (8: ${Math.round(shares[8] * 100)}%, 4: ${Math.round(shares[4] * 100)}%, 2: ${Math.round(shares[2] * 100)}%); base set to 4.`); }
  const on = entries.filter(([v]) => Math.abs(v / base - Math.round(v / base)) < 0.05).sort((a, b) => a[0] - b[0]);
  const off = entries.filter(([v]) => Math.abs(v / base - Math.round(v / base)) >= 0.05).sort((a, b) => b[1] - a[1]);
  const onTotal = sum(on.map((e) => e[1])) || 1;
  let scale = on.filter(([v, c]) => c / onTotal >= 0.01 && v <= 160).map(([v]) => v);
  if (!scale.includes(base)) scale.unshift(base);
  scale = [...new Set(scale)].sort((a, b) => a - b);
  while (scale.length > 12) { // thin the scale, keeping the most used
    const least = scale.reduce((b, v) => ((vals[v] || 0) < (vals[b] || 0) ? v : b), scale[1]);
    scale = scale.filter((v) => v !== least || v === base);
  }

  const radList = topEntries(radii).filter(([k]) => k !== 'pill').map(([k, c]) => ({ px: +k, count: c }));
  const radTokens = radList.slice(0, 4).map((r) => r.px).sort((a, b) => a - b);
  const pillCount = radii.pill || 0;

  const mw = topEntries(maxWidths).map(([v, c]) => [+v, c]).filter(([v]) => v >= 900);
  const cw = topEntries(centredWidths).map(([v, c]) => [+v, c]).filter(([v]) => v >= 900);
  let container = mw[0] ? mw[0][0] : cw[0] ? cw[0][0] : null;
  if (!container) { container = 1200; assumptions.push('Layout: no max-width container ≥ 900px found; container assumed 1200px.'); }

  const wide = grids.filter((g) => !g.chrome && g.width >= container * 0.5);
  let columns = mode(wide, (g) => g.cols), gutter = mode(wide.filter((g) => g.gap > 0), (g) => g.gap);
  let colSource = 'CSS grid';
  if (!columns) {
    const fr = flexRows.filter((f) => !f.chrome && f.width >= container * 0.5);
    columns = mode(fr, (f) => f.n); gutter = gutter || mode(fr.filter((f) => f.gap > 0), (f) => f.gap); colSource = 'equal-width flex rows';
  }
  if (!columns) { columns = 12; colSource = 'assumed'; assumptions.push('Layout: no repeating grid found; 12 columns assumed.'); }
  if (!gutter) { gutter = base * 3; assumptions.push(`Layout: no column gap found; gutter assumed ${gutter}px (3 × base).`); }

  const bpRaw = topEntries(breakpoints).map(([k, c]) => ({ kind: k.split(':')[0], px: +k.split(':')[1], count: c })).filter((b) => b.px >= 320 && b.px <= 2560);
  const bpClusters = [];
  for (const b of [...bpRaw].sort((a, z) => a.px - z.px)) {
    const last = bpClusters[bpClusters.length - 1];
    // a max-width: 767 and min-width: 768 describe the same break
    if (last && b.px - last.px <= 8) { last.count += b.count; last.kinds.add(b.kind); } else bpClusters.push({ px: b.kind === 'max' ? b.px + 1 : b.px, count: b.count, kinds: new Set([b.kind]) });
  }
  const bps = bpClusters.sort((a, b) => b.count - a.count).slice(0, 6).sort((a, b) => a.px - b.px).map((b) => ({ px: Math.round(b.px), count: b.count, kinds: [...b.kinds] }));
  if (!bps.length) assumptions.push('Layout: no media-query breakpoints readable (cross-origin stylesheets); none reported.');

  const rhythm = (sections || []).map((s) => ({ y: s.top, h: s.bottom - s.top, bg: s.bg, image: s.image, tone: s.image ? 'image' : s.bg ? (C.isDark(s.bg) ? 'dark' : 'light') : 'light' }));
  return {
    base, shares: { 8: r3(shares[8]), 4: r3(shares[4]), 2: r3(shares[2]) }, onGrid: on.map(([v, c]) => ({ px: v, count: c })), offGrid: off.slice(0, 20).map(([v, c]) => ({ px: v, count: c })),
    scale, radii: radList.slice(0, 10), radiusTokens: radTokens, pillCount, container, columns, gutter, columnSource: colSource,
    breakpoints: bps, rhythm, shadows: topEntries(shadows, 3).map(([s, c]) => ({ value: s, count: c })),
  };
}

// ---------------------------------------------------------------- components
function analyseComponents({ buttons, cards, header, inputs }, layout, colour, assumptions) {
  const variantOf = (b) => (b.backdrop || (b.bg && b.bgA > 0.03 && b.bgA < 0.9) ? 'translucent' : b.bg && b.bgA >= 0.9 ? 'filled' : b.borderW >= 1 && b.borderA >= 0.3 ? 'outline' : null);
  const groups = new Map();
  for (const b of buttons) {
    const v = variantOf(b); if (!v) continue;
    const key = `${v}|${v === 'outline' ? b.borderColor : b.bg}|${b.pill ? 'pill' : Math.round(b.radius)}`;
    if (!groups.has(key)) groups.set(key, { variant: v, items: [] });
    groups.get(key).items.push(b);
  }
  const summarise = (g) => {
    const it = g.items;
    return {
      variant: g.variant, count: it.length, bg: mode(it, (b) => b.bg), bgAlpha: mode(it, (b) => b.bgA), fg: mode(it, (b) => b.color),
      border: g.variant === 'outline' ? `${mode(it, (b) => b.borderW)}px solid ${mode(it, (b) => b.borderColor)}` : 'none',
      radius: it.some((b) => b.pill) ? 9999 : mode(it, (b) => Math.round(b.radius)), pill: it.filter((b) => b.pill).length > it.length / 2,
      padX: mode(it, (b) => Math.round(b.padX)), padY: mode(it, (b) => Math.round(b.padY)), height: r1(median(it.map((b) => b.height))),
      fontSize: mode(it, (b) => b.fontSize), weight: mode(it, (b) => b.weight), letterSpacing: mode(it, (b) => b.letterSpacing), transform: mode(it, (b) => b.transform),
      backdrop: mode(it, (b) => b.backdrop), ground: mode(it, (b) => b.ground), labels: [...new Set(it.map((b) => b.text))].slice(0, 5),
      easing: (mode(it, (b) => b.easing) || 'ease').split(/,(?![^(]*\))/)[0].trim(), duration: (mode(it, (b) => b.duration) || '0s').split(',')[0].trim(),
    };
  };
  const all = [...groups.values()].map(summarise).sort((a, b) => b.count - a.count);
  const filled = all.filter((v) => v.variant === 'filled');
  const pickVariants = { primary: filled[0] || null, secondary: filled[1] || null, outline: all.find((v) => v.variant === 'outline') || null, translucent: all.find((v) => v.variant === 'translucent') || null };
  if (!pickVariants.primary) {
    pickVariants.primary = { variant: 'filled', count: 0, bg: colour.action, fg: colour.onAction, border: 'none', radius: 9999, pill: true, padX: layout.base * 3, padY: layout.base * 1.5, height: layout.base * 6, fontSize: 16, weight: 600, letterSpacing: 0, transform: 'none', inferred: true, labels: [] };
    assumptions.push('Components: no filled button measured; primary button inferred from action colour.');
  }

  const fillOf = (c) => (c.backdrop || (c.bg && c.bgA > 0.03 && c.bgA < 0.9) ? 'translucent' : c.bg && c.bgA >= 0.9 ? 'solid' : c.border ? 'outline' : 'none');
  const cg = new Map();
  for (const c of cards) { const k = `${fillOf(c)}|${Math.round(c.radius)}`; if (!cg.has(k)) cg.set(k, []); cg.get(k).push(c); }
  const cardVariants = [...cg.entries()].map(([k, it]) => ({
    fill: k.split('|')[0], radius: +k.split('|')[1], count: it.length, bg: mode(it, (c) => c.bg), bgAlpha: mode(it, (c) => c.bgA),
    backdrop: mode(it, (c) => c.backdrop), shadow: mode(it, (c) => c.shadow), border: mode(it, (c) => c.border),
    padX: mode(it, (c) => Math.round(c.padX)), padY: mode(it, (c) => Math.round(c.padY)), media: it.filter((c) => c.media).length / it.length >= 0.5,
    mediaShare: median(it.filter((c) => c.media).map((c) => c.mediaShare)) || 0, w: median(it.map((c) => c.w)), h: median(it.map((c) => c.h)),
    ground: mode(it, (c) => c.ground), titles: [...new Set(it.map((c) => c.title).filter(Boolean))].slice(0, 4),
  })).sort((a, b) => b.count - a.count).slice(0, 4);
  if (!cardVariants.length) {
    cardVariants.push({ fill: 'solid', radius: layout.radiusTokens.slice(-1)[0] || 16, count: 0, bg: colour.surface, padX: layout.base * 3, padY: layout.base * 3, media: true, inferred: true });
    assumptions.push('Components: no card candidates; card inferred from surface colour and the largest radius.');
  }

  let input;
  if (inputs.length) {
    const it = inputs;
    input = { inferred: false, count: it.length, height: mode(it, (i) => Math.round(i.height)), radius: mode(it, (i) => Math.round(i.radius)), border: mode(it, (i) => i.border), bg: mode(it, (i) => i.bg) || colour.background, color: mode(it, (i) => i.color), padX: mode(it, (i) => Math.round(i.padX)), fontSize: mode(it, (i) => i.fontSize), placeholder: mode(it, (i) => i.placeholder) };
  } else {
    const p = pickVariants.primary;
    input = { inferred: true, count: 0, height: p.height || 48, radius: p.pill ? Math.min(layout.radiusTokens[0] || 12, 16) : p.radius, border: `1px ${colour.border}`, bg: colour.surface, color: colour.text, padX: layout.base * 2, fontSize: 16, placeholder: 'Email address' };
    assumptions.push('Components: no visible form fields; input inferred from the primary button height, smallest radius, surface and border colours (flagged "inferred").');
  }
  const nav = header ? { ...header } : { inferred: true, height: 64, sticky: true, links: [], logo: null };
  if (!header) assumptions.push('Components: no header element found; nav inferred.');
  return { buttons: pickVariants, buttonGroups: all.slice(0, 10), variantCount: all.length, cards: cardVariants, input, nav };
}

// ---------------------------------------------------------------- imagery
const STOP = new Set('a an the and or of in on at to for with by from is are was be this that your you our we it its as into over under up down out about image photo picture icon logo of'.split(' '));
function analyseImagery(media, pages) {
  const m = media.filter((x) => !x.chrome && x.kind !== 'svg');
  const total = m.length || 1;
  const formats = topEntries(m.reduce((o, x) => { o[x.format] = (o[x.format] || 0) + 1; return o; }, {})).map(([f, c]) => ({ format: f, count: c, share: r3(c / total) }));
  const crop = (x) => { const a = x.w / x.h; return a >= 1.6 ? 'wide (≥16:10)' : a >= 1.2 ? 'landscape' : a >= 0.85 ? 'square' : 'portrait'; };
  const crops = topEntries(m.reduce((o, x) => { const k = crop(x); o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, c]) => ({ crop: k, count: c, share: r3(c / total) }));
  const fits = topEntries(m.reduce((o, x) => { const k = x.kind === 'bg' ? `background-size: ${x.fit}` : x.fit || 'fill'; o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, c]) => ({ fit: k, count: c }));
  const docArea = sum(pages.map((p) => p.data.viewport.w * p.data.docHeight)) || 1;
  const mediaArea = sum(m.map((x) => x.w * x.h));
  const words = {};
  let emptyAlt = 0;
  for (const x of m) {
    if (x.kind === 'img' && !x.alt.trim()) emptyAlt++;
    for (const w of (x.alt || '').toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []) if (!STOP.has(w)) words[w] = (words[w] || 0) + 1;
  }
  const svgCount = media.filter((x) => x.kind === 'svg').length;
  return {
    count: m.length, svgCount, formats, crops, fits, fullBleedShare: r3(m.filter((x) => x.fullBleed).length / total),
    mediaShareOfPage: r3(Math.min(1, mediaArea / docArea)), emptyAlt, altThemes: topEntries(words, 10).map(([w, c]) => ({ word: w, count: c })),
    roundedShare: r3(m.filter((x) => x.radius > 0).length / total), medianRadius: median(m.filter((x) => x.radius > 0).map((x) => x.radius)) || 0,
    sources: pages.map((p) => ({ url: p.url, label: p.label, media: (p.data.media || []).filter((x) => !x.chrome && x.kind !== 'svg').length })),
  };
}

// ---------------------------------------------------------------- voice
function analyseVoice(headings, paragraphs, ctas, roles) {
  const h3 = roles.h3 ? roles.h3.size * 0.88 : 22;
  const seen = new Set();
  const heads = headings.filter((h) => !h.chrome && (/^h[1-3]$/.test(h.tag) || h.size >= h3) && /[a-z]/i.test(h.text))
    .filter((h) => { const k = h.text.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  const wc = (t) => (t.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%£$€-]*/gu) || []).length;
  const lengths = heads.map((h) => wc(h.text));
  const caseOf = (h) => {
    if (h.transform === 'uppercase' || (h.text === h.text.toUpperCase() && /[A-Z]/.test(h.text))) return 'upper';
    const ws = h.text.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
    if (ws.length <= 1) return 'sentence';
    const caps = ws.slice(1).filter((w) => /^[A-Z][a-z]/.test(w) && !/^(I|I'm|I've)$/.test(w)).length;
    const minor = ws.slice(1).filter((w) => /^(a|an|the|and|or|of|in|on|to|for|with|by|at)$/i.test(w)).length;
    return caps >= Math.max(2, (ws.length - 1 - minor) * 0.6) ? 'title' : 'sentence';
  };
  const cases = heads.reduce((o, h) => { const c = caseOf(h); o[c] = (o[c] || 0) + 1; return o; }, {});
  const corpus = [...heads.map((h) => h.text), ...paragraphs.filter((p) => !p.chrome).map((p) => p.text), ...ctas].join(' \n ');
  const count = (re) => (corpus.match(re) || []).length;
  const you = count(/\b(you|your|yours|you're|you’ll|you'll|yourself)\b/gi), we = count(/\b(we|our|ours|us|we're|we’ll|we'll)\b/gi);
  const totalWords = wc(corpus) || 1;
  const withNum = heads.filter((h) => /\d/.test(h.text)).length;
  const xy = heads.filter((h) => /^[^,]{2,32},\s[^,]{2,48}$/.test(h.text) && wc(h.text) <= 10).length;
  const exclaim = count(/!/g);
  const ctaList = [...new Set(ctas.map((c) => c.trim()).filter((c) => c && c.length < 40))];
  const verbs = topEntries(ctaList.reduce((o, c) => { const v = c.split(/\s+/)[0].replace(/[^\p{L}]/gu, ''); if (v) o[v] = (o[v] || 0) + 1; return o; }, {}), 8);
  const verbish = /^(get|open|start|join|download|try|see|learn|explore|discover|sign|apply|send|buy|order|book|find|compare|switch|create|view|read|shop|contact|talk|claim|upgrade|go|choose|request|watch|pay|save|spend|invest|trade|add|log|continue|accept|reject|show|calculate|check|register|subscribe|use|meet|exchange|transfer|earn)$/i;
  const ctaVerbShare = ctaList.length ? ctaList.filter((c) => verbish.test(c.split(/\s+/)[0])).length / ctaList.length : 0;
  const endsPeriod = heads.filter((h) => /\.$/.test(h.text.trim())).length;
  const nh = heads.length || 1;

  const stats = {
    headlines: heads.length, wordsMedian: median(lengths) || 0, wordsP90: pct(lengths, 0.9) || 0, wordsMax: Math.max(0, ...lengths),
    caseShares: { sentence: r3((cases.sentence || 0) / nh), title: r3((cases.title || 0) / nh), upper: r3((cases.upper || 0) / nh) },
    you, we, youPer1000: r1((you / totalWords) * 1000), wePer1000: r1((we / totalWords) * 1000), numbersShare: r3(withNum / nh), xyShare: r3(xy / nh),
    exclamations: exclaim, ctaVerbs: verbs.map(([v, c]) => ({ verb: v, count: c })), ctaVerbShare: r3(ctaVerbShare), ctaCount: ctaList.length,
    periodShare: r3(endsPeriod / nh), totalWords,
  };

  // quotes: 5 lines ≤ 15 words, spread across pages
  const quotes = [];
  const byPage = new Map();
  for (const h of heads) { if (!byPage.has(h.page)) byPage.set(h.page, []); byPage.get(h.page).push(h); }
  const pools = [...byPage.values()].map((a) => a.filter((h) => wc(h.text) >= 2 && wc(h.text) <= 15).sort((x, y) => y.size - x.size));
  for (let round = 0; quotes.length < 5 && round < 10; round++) {
    for (const pool of pools) { const h = pool[round]; if (h && quotes.length < 5) quotes.push({ text: h.text, source: h.page, words: wc(h.text) }); }
  }
  for (const p of paragraphs) { if (quotes.length >= 5) break; const s = p.text.split(/(?<=[.!?])\s/)[0]; if (wc(s) <= 15 && wc(s) >= 4 && !quotes.some((q) => q.text === s)) quotes.push({ text: s, source: p.page, words: wc(s) }); }

  // rules: the three most decisive measured patterns
  const cand = [];
  cand.push({ score: 0.9, title: `Keep headlines to ${stats.wordsP90 || 8} words or fewer`, detail: `Median headline is ${stats.wordsMedian} words; 90% are ${stats.wordsP90} or fewer (n = ${heads.length}).`, stat: 'headline length' });
  const cs = stats.caseShares;
  const topCase = Object.entries(cs).sort((a, b) => b[1] - a[1])[0];
  if (topCase && topCase[1] >= 0.6) cand.push({ score: topCase[1], title: { sentence: 'Write headlines in sentence case', title: 'Write headlines in Title Case', upper: 'Set headlines in capitals' }[topCase[0]], detail: `${Math.round(topCase[1] * 100)}% of headlines are ${topCase[0]} case.`, stat: 'case' });
  if (you + we > 5) {
    if (you >= we * 2) cand.push({ score: Math.min(1, you / (you + we)), title: 'Address the reader as "you"', detail: `"you/your" ${you}× vs "we/our/us" ${we}× (${stats.youPer1000} vs ${stats.wePer1000} per 1,000 words).`, stat: 'you vs we' });
    else if (we >= you * 2) cand.push({ score: Math.min(1, we / (you + we)), title: 'Speak as "we"', detail: `"we/our/us" ${we}× vs "you/your" ${you}×.`, stat: 'you vs we' });
  }
  if (ctaVerbShare >= 0.5 && ctaList.length >= 3) cand.push({ score: ctaVerbShare * 0.95, title: 'Start calls to action with a verb', detail: `${Math.round(ctaVerbShare * 100)}% of ${ctaList.length} CTA labels start with a verb; most used: ${verbs.slice(0, 4).map(([v]) => v).join(', ')}.`, stat: 'CTA verbs' });
  if (exclaim === 0 && stats.totalWords > 150) cand.push({ score: 0.85, title: 'Do not use exclamation marks', detail: `0 exclamation marks in ${stats.totalWords} words of headlines, body copy and CTAs.`, stat: 'exclamation marks' });
  if (stats.numbersShare >= 0.2) cand.push({ score: 0.5 + stats.numbersShare, title: 'Use concrete numbers', detail: `${Math.round(stats.numbersShare * 100)}% of headlines contain a figure.`, stat: 'numbers' });
  if (stats.xyShare >= 0.15) cand.push({ score: 0.5 + stats.xyShare, title: 'Use the short "X, Y" pattern', detail: `${Math.round(stats.xyShare * 100)}% of headlines are two short clauses joined by a comma.`, stat: '"X, Y" pattern' });
  if (stats.periodShare <= 0.1 && heads.length >= 5) cand.push({ score: 0.6, title: 'Leave the full stop off headlines', detail: `${Math.round(stats.periodShare * 100)}% of headlines end with a full stop.`, stat: 'punctuation' });
  const rules = cand.sort((a, b) => b.score - a.score).slice(0, 3);
  return { stats, quotes: quotes.slice(0, 5), rules };
}

// ---------------------------------------------------------------- main
function analyse(snapshot) {
  const assumptions = [];
  const pages = snapshot.pages;
  const D = (f) => pages.map((p) => p.data[f] || {});
  const dd = {};
  const merged = {};
  for (const f of ['textColors', 'bgColors', 'borderColors', 'fills', 'radii', 'shadows', 'maxWidths', 'centredWidths', 'breakpoints', 'easings', 'durations', 'backdrop']) {
    const r = mergeMaps(D(f)); merged[f] = r.map; dd[f] = r.deduped;
  }
  const pairsR = mergeMaps(D('pairs')); merged.pairs = pairsR.map; dd.pairs = pairsR.deduped;
  merged.spacing = {};
  for (const k of ['padding', 'margin', 'gap']) { const r = mergeMaps(pages.map((p) => p.data.spacing[k])); merged.spacing[k] = r.map; dd['spacing.' + k] = r.deduped; }
  const tsR = mergeMaps(D('textStyles'), (v) => v.chars, (a, b) => ({ ...a, chars: a.chars + b.chars, count: a.count + b.count, samples: [...a.samples, ...b.samples].slice(0, 3) }));
  merged.textStyles = tsR.map; dd.textStyles = tsR.deduped;
  const gR = mergeMaps(D('gradients'), (v) => v.area, (a, b) => ({ ...a, area: a.area + b.area, count: a.count + b.count }));
  merged.gradients = gR.map;
  const arr = (f, sig) => { const r = mergeArrays(pages, f, sig); dd[f] = r.deduped; return r.list; };
  merged.buttons = arr('buttons', (b) => [b.text, b.bg, b.bgA, b.color, b.radius, b.height].join('|'));
  merged.cards = arr('cards', (c) => [c.w, c.h, c.bg, c.radius, c.title].join('|'));
  merged.media = arr('media', (m) => [m.kind, m.w, m.h, m.alt, m.format].join('|'));
  merged.headings = arr('headings', (h) => [h.text, h.size].join('|'));
  merged.paragraphs = arr('paragraphs', (p) => p.text);
  merged.inputs = arr('inputs', (i) => [i.type, i.height, i.width, i.placeholder].join('|'));
  merged.grids = arr('grids', (g) => [g.cols, g.template, g.gap, g.width].join('|'));
  merged.flexRows = arr('flexRows', (g) => [g.n, g.gap, g.width].join('|'));
  merged.ctas = pages.flatMap((p) => p.data.ctas || []);
  // css breakpoints/easings from raw stylesheet text win over the in-page walk (cross-origin sheets)
  for (const [k, v] of Object.entries((snapshot.css || {}).breakpoints || {})) merged.breakpoints[k] = Math.max(merged.breakpoints[k] || 0, v);
  for (const [k, v] of Object.entries((snapshot.css || {}).easings || {})) merged.easings[k] = (merged.easings[k] || 0) + v;
  for (const [k, v] of Object.entries((snapshot.css || {}).durations || {})) merged.durations[k] = (merged.durations[k] || 0) + v;
  const home = pages.find((p) => p.isHome) || pages[0];

  const type = analyseType(merged.textStyles, merged.headings, snapshot.mobile && snapshot.mobile.data, assumptions);
  const colour = analyseColour(merged, assumptions);
  const layout = analyseLayout({ ...merged, sections: home.data.sections }, assumptions);
  const cv = Object.fromEntries(colour.roles.map((r) => [r.role.replace(/-(\w)/g, (_, c) => c.toUpperCase()), r.hex]));
  const components = analyseComponents({ buttons: merged.buttons, cards: merged.cards, header: home.data.header, inputs: merged.inputs }, layout, cv, assumptions);
  const imagery = analyseImagery(merged.media, pages);
  const voice = analyseVoice(merged.headings, merged.paragraphs, merged.ctas, type.roles);

  // motion: declared easing (cubic-bezier preferred over keywords)
  const eases = topEntries(merged.easings);
  const bez = eases.find(([e]) => /cubic-bezier/.test(e) && !/cubic-bezier\(0?\.25,0?\.1,0?\.25,1\)/.test(e.replace(/\s/g, '')));
  const easing = bez ? bez[0].replace(/\s+/g, '').replace(/,/g, ', ') : eases[0] ? eases[0][0] : 'ease';
  if (!bez) assumptions.push(`Motion: no custom cubic-bezier declared; easing = "${easing}".`);
  const durMs = (d) => (/ms$/.test(d) ? parseFloat(d) : parseFloat(d) * 1000);
  const duration = Math.round(durMs(mode(topEntries(merged.durations).map(([d, c]) => ({ d, c })), (x) => x.d, (x) => x.c) || '0.3s')) || 300;

  const fontsDeclared = Object.keys((snapshot.css || {}).fontFaces || {});
  const typeVars = Object.entries({ ...(snapshot.css || {}).rootVars, ...pages.reduce((o, p) => Object.assign(o, p.data.rootVars), {}) })
    .filter(([k, v]) => /font|type|text|size|leading|line|track|letter|heading|display|body/i.test(k) && !/color|colour|bg/i.test(k) && String(v).length < 120).slice(0, 40);

  const counts = {
    pages: pages.length, elementsWalked: sum(pages.map((p) => p.data.stats.elementsWalked)), elementsVisible: sum(pages.map((p) => p.data.stats.elementsVisible)),
    consentExcluded: sum(pages.map((p) => p.data.stats.consentExcluded)), buttons: merged.buttons.length, cards: merged.cards.length, media: merged.media.length,
    headings: merged.headings.length, dedupedKeys: dd,
  };
  return {
    host: snapshot.meta.host, url: snapshot.meta.url, capturedAt: snapshot.meta.capturedAt, pages: pages.map((p) => ({ url: p.url, label: p.label, score: p.score, isHome: !!p.isHome })),
    type, colour, layout, components, imagery, voice, motion: { easing, duration, declared: eases.slice(0, 6).map(([e, c]) => ({ value: e, count: c })) },
    fontsDeclared, typeVars, rootVarCount: Object.keys((snapshot.css || {}).rootVars || {}).length, counts, assumptions,
    header: home.data.header,
  };
}

module.exports = { analyse, clampFor, mergeMaps };
