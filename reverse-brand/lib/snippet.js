'use strict';
// Builds a paste-into-DevTools snippet that runs the same extractor in
// same-origin iframes at 1440px and 390px and downloads snapshot.json.
// The user runs it in their own browser after passing any bot check
// themselves; nothing here tries to get around one.
const { extract, scoreLinks } = require('./extract');
const { parseCss } = require('./css-parse');

function buildSnippet({ version }) {
  return `// reverse-brand ${version} — DevTools snippet. Paste into the Console on the brand's home page.
// It loads the home page and up to 4 key pages in hidden same-origin iframes,
// measures them at 1440×900 (plus home at 390×844) and downloads snapshot.json.
(async () => {
  const extract = ${extract.toString()};
  const scoreLinks = ${scoreLinks.toString()};
  const parseCss = ${parseCss.toString()};
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('%c[reverse-brand]', 'color:#888', ...a);
  const css = new Map();
  async function inFrame(url, w, h) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;opacity:0.01;pointer-events:none;z-index:2147483647;border:0';
    f.src = url;
    document.body.appendChild(f);
    await new Promise((res, rej) => { f.onload = res; setTimeout(() => rej(new Error('timeout ' + url)), 45000); });
    const win = f.contentWindow;
    await sleep(1500);
    let y = 0;
    for (let i = 0; i < 60; i++) {
      const max = win.document.documentElement.scrollHeight - h;
      if (y >= max || y > 30000) break;
      y = Math.min(max, y + Math.round(h * 0.8)); win.scrollTo(0, y); await sleep(160);
    }
    await sleep(400); win.scrollTo(0, 0); await sleep(500);
    for (const l of win.document.querySelectorAll('link[rel~=stylesheet]')) {
      if (css.has(l.href)) continue;
      try { css.set(l.href, await (await fetch(l.href)).text()); } catch (e) { css.set(l.href, ''); }
    }
    css.set(url + '#inline', Array.from(win.document.querySelectorAll('style')).map((s) => s.textContent).join('\\n'));
    const data = extract(win, {});
    const links = scoreLinks(win, {});
    f.remove();
    return { data, links };
  }
  const segs = location.pathname.split('/').filter(Boolean);
  const home = location.origin + '/' + (segs[0] && /^[a-z]{2}(?:[-_][a-zA-Z]{2,4})?$/.test(segs[0]) ? segs[0] + '/' : '');
  log('home', home);
  const h = await inFrame(home, 1440, 900);
  const picks = h.links.filter((l) => l.score >= 2).slice(0, 4);
  const pages = [{ url: h.data.url, label: 'Home', isHome: true, score: null, data: h.data }];
  for (const l of picks) {
    log('page', l.url);
    try { const r = await inFrame(l.url, 1440, 900); pages.push({ url: r.data.url, label: l.label || l.top, isHome: false, score: l.score, data: r.data }); }
    catch (e) { log('skipped', l.url, e.message); }
  }
  log('mobile pass 390×844');
  const m = await inFrame(home, 390, 844);
  const snapshot = {
    meta: { tool: 'reverse-brand', version: '${version}', url: home, host: location.host, capturedAt: new Date().toISOString(),
      mode: 'devtools-snippet', browser: navigator.userAgent, viewports: { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }, timings: {} },
    linkCandidates: h.links.slice(0, 25), pages, mobile: { url: home, data: m.data }, css: parseCss(Array.from(css.values())),
  };
  const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'snapshot.json'; a.click();
  log('done — snapshot.json downloaded (' + Math.round(blob.size / 1024) + ' KB). Run: reverse-brand --snapshot snapshot.json');
})();
`;
}

module.exports = { buildSnippet };
