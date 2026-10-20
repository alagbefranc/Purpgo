'use strict';
const fs = require('fs');
const { extract, scoreLinks } = require('./extract');
const { parseCss } = require('./css-parse');

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

class ChallengeError extends Error {
  constructor(url, reason) { super(`Bot check detected at ${url} (${reason})`); this.url = url; this.reason = reason; }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return { executablePath: c, name: 'Google Chrome' };
  const pw = '/opt/pw-browsers/chromium/chrome-linux/chrome';
  if (fs.existsSync(pw)) return { executablePath: pw, name: 'Chromium (Playwright build; Chrome not installed)' };
  return { executablePath: undefined, name: 'Playwright default Chromium' };
}

async function launch({ headed = false } = {}) {
  const { chromium } = require('playwright');
  const exe = findChrome();
  // --disable-gpu: some machines hang on the first canvas call without it.
  const browser = await chromium.launch({ headless: !headed, executablePath: exe.executablePath, args: ['--disable-gpu'] });
  browser.__name = exe.name;
  return browser;
}

const CHALLENGE_TEXT = /just a moment|checking your browser|verify (that )?you are (a )?human|are you a robot|attention required|please complete the security check|press (&|and) hold|unusual traffic|access denied|request (was )?blocked|enable javascript and cookies to continue/i;
const CHALLENGE_HTML = /cf-chl-|challenge-platform|cf_chl_opt|px-captcha|captcha-delivery\.com|_Incapsula_Resource|geo\.captcha|hcaptcha\.com\/captcha|g-recaptcha[^>]*data-size="invisible"[^>]*challenge/i;

async function detectChallenge(page, resp) {
  const status = resp ? resp.status() : 0;
  const info = await page.evaluate(() => ({
    title: document.title || '',
    text: (document.body && document.body.innerText || '').slice(0, 4000),
    html: document.documentElement.outerHTML.slice(0, 60000),
    textLen: (document.body && document.body.innerText || '').length,
  })).catch(() => ({ title: '', text: '', html: '', textLen: 0 }));
  if (CHALLENGE_HTML.test(info.html)) return 'challenge markup';
  if (CHALLENGE_TEXT.test(info.title)) return `title "${info.title.slice(0, 60)}"`;
  if (info.textLen < 1500 && CHALLENGE_TEXT.test(info.text)) return 'challenge text';
  if ([401, 403, 429, 503].includes(status) && info.textLen < 3000) return `HTTP ${status}`;
  return null;
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let y = 0;
    for (let i = 0; i < 60; i++) {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (y >= max || y > 30000) break;
      y = Math.min(max, y + Math.round(innerHeight * 0.8));
      window.scrollTo(0, y);
      await sleep(160);
    }
    await sleep(400);
    window.scrollTo(0, 0);
    await sleep(500);
  });
}

async function visit(page, url, { headed, log }) {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  let reason = await detectChallenge(page, resp);
  if (reason && headed) {
    log(`  bot check at ${url} — complete it in the browser window; waiting up to 5 minutes…`);
    const t0 = Date.now();
    while (reason && Date.now() - t0 < 300000) {
      await page.waitForTimeout(2000);
      reason = await detectChallenge(page, null);
    }
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  }
  if (reason) throw new ChallengeError(url, reason);
  return resp;
}

async function capture(url, { headed = false, maxPages = 5, log = console.log } = {}) {
  const browser = await launch({ headed });
  const cssTexts = new Map();
  const timings = {};
  try {
    const ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1, locale: 'en-GB' });
    const page = await ctx.newPage();
    page.on('response', async (r) => {
      try {
        if (r.request().resourceType() === 'stylesheet' && r.ok() && !cssTexts.has(r.url())) cssTexts.set(r.url(), await r.text());
      } catch (_) { /* body unavailable */ }
    });
    const run = async (u) => {
      const t0 = Date.now();
      await visit(page, u, { headed, log });
      await scrollThrough(page);
      // inline <style> blocks too
      const inline = await page.evaluate(() => Array.from(document.querySelectorAll('style')).map((s) => s.textContent).join('\n'));
      cssTexts.set(`${u}#inline`, inline);
      const data = await page.evaluate(`(${extract.toString()})(window, {})`);
      return { data, ms: Date.now() - t0 };
    };

    log(`  home ${url}`);
    const home = await run(url);
    const homeUrl = home.data.url;
    const links = await page.evaluate(`(${scoreLinks.toString()})(window, {})`);
    const picks = links.filter((l) => l.score >= 2).slice(0, Math.max(3, Math.min(5, maxPages - 1)));
    const pages = [{ url: homeUrl, label: 'Home', isHome: true, score: null, ms: home.ms, data: home.data }];
    for (const l of picks) {
      if (pages.length >= maxPages + 0) break;
      log(`  page ${l.url}  (score ${l.score}, "${l.label}")`);
      try {
        const r = await run(l.url);
        if (pages.some((p) => p.data.url === r.data.url)) continue;
        pages.push({ url: r.data.url, label: l.label || l.top, isHome: false, score: l.score, ms: r.ms, data: r.data });
      } catch (e) {
        if (e instanceof ChallengeError) throw e;
        log(`    skipped: ${e.message.split('\n')[0]}`);
      }
    }
    timings.desktopMs = pages.reduce((a, p) => a + p.ms, 0);

    log(`  mobile pass 390×844 ${homeUrl}`);
    const mctx = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'en-GB' });
    const mpage = await mctx.newPage();
    const tm = Date.now();
    await visit(mpage, homeUrl, { headed, log });
    await scrollThrough(mpage);
    const mobile = { url: homeUrl, data: await mpage.evaluate(`(${extract.toString()})(window, {})`) };
    timings.mobileMs = Date.now() - tm;

    return {
      meta: {
        tool: 'reverse-brand', version: require('../package.json').version, url, host: new URL(homeUrl).host,
        capturedAt: new Date().toISOString(), mode: headed ? 'playwright-headed' : 'playwright-headless',
        browser: browser.__name, viewports: { desktop: DESKTOP, mobile: MOBILE }, timings,
      },
      linkCandidates: links.slice(0, 25),
      pages,
      mobile,
      css: parseCss([...cssTexts.values()]),
    };
  } finally {
    await browser.close();
  }
}

module.exports = { capture, launch, ChallengeError, DESKTOP, MOBILE };
