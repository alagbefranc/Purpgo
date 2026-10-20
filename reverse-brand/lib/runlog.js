'use strict';
const fs = require('fs');
const path = require('path');

const kb = (f) => (fs.existsSync(f) ? `${Math.round(fs.statSync(f).size / 1024)} KB` : '—');

function writeRunLog(outDir, { a, snapshot, phases, manifest, prompts, video, report, opts }) {
  const L = [];
  const total = phases.reduce((s, p) => s + p.ms, 0);
  L.push(`# reverse-brand run log — ${a.host}`, '');
  L.push(`Unofficial analysis. Not affiliated with or endorsed by the brand owner. Trademarks belong to their owners.`, '');
  L.push(`- Source: ${a.url}`, `- Captured: ${snapshot.meta.capturedAt} (${snapshot.meta.mode}, ${snapshot.meta.browser})`, `- Images mode: ${opts.images}${opts.provider ? ` (${opts.provider})` : ''}`, '');
  L.push('## Timing per phase', '', '| Phase | Time | Note |', '|---|---|---|');
  for (const p of phases) L.push(`| ${p.name} | ${(p.ms / 1000).toFixed(1)} s | ${p.note || ''} |`);
  L.push(`| **Total** | **${(total / 1000).toFixed(1)} s** | |`, '');
  L.push('## Pages', '', '| Page | Link score | Visible elements | Doc height |', '|---|---|---|---|');
  for (const p of snapshot.pages) L.push(`| ${p.url} | ${p.isHome ? 'home' : p.score} | ${p.data.stats.elementsVisible} of ${p.data.stats.elementsWalked} | ${p.data.docHeight}px |`);
  L.push(`| ${snapshot.mobile.url} @390×844 | mobile pass | ${snapshot.mobile.data.stats.elementsVisible} of ${snapshot.mobile.data.stats.elementsWalked} | ${snapshot.mobile.data.docHeight}px |`, '');
  L.push(`Elements: ${a.counts.elementsWalked} walked, ${a.counts.elementsVisible} visible, ${a.counts.consentExcluded} excluded as cookie/consent UI. Buttons ${a.counts.buttons}, cards ${a.counts.cards}, media ${a.counts.media}, headings ${a.counts.headings} (after dedupe).`, '');
  L.push(`Dedupe (keys or items identical on every page, counted once): ${Object.entries(a.counts.dedupedKeys).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.`, '');
  L.push('Link candidates (top 10):', '');
  for (const l of (snapshot.linkCandidates || []).slice(0, 10)) L.push(`- ${l.score} · ${l.url} ("${l.label}")`);
  L.push('', '## Sizes', '', '| File | Size |', '|---|---|');
  for (const f of ['brand-guide.html', 'brand-guide-hero.html', 'tokens.css', 'tokens.json', 'snapshot.json', 'prompts.json']) L.push(`| ${f} | ${kb(path.join(outDir, f))} |`);
  if (video && video.file) L.push(`| video/${path.basename(video.file)} | ${kb(video.file)} (${video.frames} frames, ${video.seconds.toFixed(1)} s @ 60 fps) |`);
  const slideDir = path.join(outDir, 'slides');
  if (fs.existsSync(slideDir)) L.push(`| slides/ | ${fs.readdirSync(slideDir).length} PNGs |`);
  L.push('', '## Images and cost', '');
  const done = Object.entries(manifest).filter(([, m]) => m.status === 'done');
  if (!done.length) L.push(`No images generated (mode ${opts.images}). Image cost: $0.00. Every image slot uses a CSS gradient built from the tokens.`);
  else {
    L.push('| Slot | Source | Size | Cost | Time |', '|---|---|---|---|---|');
    for (const [s, m] of done) L.push(`| ${s} | ${m.source} | ${m.w}×${m.h}, ${Math.round(m.bytes / 1024)} KB | ${m.costUsd === null || m.costUsd === undefined ? 'n/a (manual)' : `$${m.costUsd.toFixed(3)}`} | ${m.ms ? (m.ms / 1000).toFixed(1) + ' s' : '—'} |`);
    const cost = done.reduce((s, [, m]) => s + (m.costUsd || 0), 0);
    L.push('', `Total image cost: $${cost.toFixed(2)} (list-price estimate).`);
  }
  L.push('', '## LLM token usage', '', 'reverse-brand makes no LLM calls; analysis is deterministic. The agent session that wrote and ran it is billed separately and its token count is not visible to the tool.', '');
  L.push('## Assumptions', '');
  [
    'Viewports: 1440×900 for every page; 390×844 for the home page only.',
    `Browser: ${snapshot.meta.browser}, launched with --disable-gpu.`,
    'Page picks: same-origin links scored (+5 in header/nav, +4 product/pricing/business/company-type paths, +2 one-segment paths); legal, help, login, careers and locale duplicates skipped; one page per top-level path.',
    'Counts identical on every page are treated as header/footer chrome and counted once.',
    'Cookie/consent UI excluded by id/class pattern and by dialog text.',
    'Type roles: heading sizes clustered within 12%; largest cluster is "display" only if ≥ 40px and ≥ 1.15× the next; mobile sizes matched by identical heading text at 390px.',
    'Colour: text weighted by characters, backgrounds by exclusive painted area (each layer minus painted children); action = most common filled button.',
    'Fonts: font files and logos are never copied; specimens render with a local copy when installed.',
    ...a.assumptions,
  ].forEach((s) => L.push(`- ${s}`));
  if (report) {
    L.push('', '## Verify', '', `${report.passed}/${report.checks.length} checks passed.`, '');
    for (const c of report.checks) L.push(`- ${c.ok ? '✓' : '✗'} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    L.push('', `Screenshots: ${report.screenshots.length} in screenshots/.`);
  }
  fs.writeFileSync(path.join(outDir, 'run-log.md'), L.join('\n') + '\n');
}

module.exports = { writeRunLog };
