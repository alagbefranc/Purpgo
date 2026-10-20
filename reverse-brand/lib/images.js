'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const C = require('./color');

const SUFFIX = 'photorealistic, no text, letters, logos, brand marks, cards or app screens';
const WIDE = new Set(['hero', 'horizon', 'sky', 'tokens']);

function colourWord(hex) {
  const { l, c, h } = C.oklch(hex);
  if (c < 0.03) return l > 0.9 ? 'white' : l > 0.65 ? 'pale grey' : l > 0.35 ? 'graphite grey' : 'near-black';
  const hue = h < 20 ? 'red' : h < 50 ? 'coral' : h < 75 ? 'amber' : h < 110 ? 'yellow' : h < 150 ? 'lime green' : h < 185 ? 'green' : h < 215 ? 'teal' : h < 245 ? 'cyan blue' : h < 275 ? 'blue' : h < 305 ? 'violet' : h < 340 ? 'magenta' : 'pink';
  return `${l > 0.75 ? 'light ' : l < 0.4 ? 'deep ' : ''}${hue}`;
}

// Prompts describe new subjects in the measured photographic style; no brand photo is ever an input.
function buildPrompts(a, { mode, style }) {
  const R = Object.fromEntries(a.colour.roles.map((r) => [r.role, r.hex]));
  const I = a.imagery;
  const palette = [...new Set([R.accent, R['action-alt'], R['surface-inverse'], R.background].map(colourWord))].join(', ');
  const measured = [
    I.fullBleedShare >= 0.2 ? 'wide full-bleed framing' : 'contained framing with generous negative space',
    I.roundedShare >= 0.5 ? 'composed to sit inside rounded crops' : 'clean edges',
    a.colour.groundIsDark ? 'low-key lighting with deep shadows' : 'bright, soft daylight',
  ].join(', ');
  const look = style || `${measured}; colour palette of ${palette}; calm, modern, premium; shallow depth of field; natural textures`;
  const slots = [
    ['hero', '16:9', 'A wide city horizon at blue hour seen from a high terrace, a single person in silhouette looking out'],
    ['horizon', '16:9', 'A long horizon line over still water at dawn, layered atmospheric haze, minimal composition with open sky for text'],
    ['object', '4:5', 'Studio render of a single smooth sculptural object on a seamless backdrop, soft rim light'],
    ['street', '4:5', 'A person walking through a sunlit modern street, candid lifestyle moment, motion in the background'],
    ['sky', '16:9', 'Clean gradient sky with soft high clouds, very simple, plenty of empty space'],
    ['glass', '1:1', 'Orderly arrangement of frosted glass panels and translucent blocks in a grid, studio light, top-down'],
    ['grid', '4:3', 'Architectural facade with a precise repeating grid of windows, straight-on, symmetrical'],
    ['tokens', '16:9', 'Macro close-up of neatly arranged coloured material swatches and polished tiles in rows'],
    ['detail', '1:1', 'Close-up of hands holding a matte ceramic cup by a bright window, tactile detail'],
  ];
  return {
    mode, suffix: SUFFIX, style: look,
    note: 'New subjects in the brand\'s photographic style, generated from text only. Every use is labelled "AI-generated image".',
    slots: slots.map(([slot, aspectRatio, subject]) => ({ slot, aspectRatio, resolution: WIDE.has(slot) ? 2000 : 1400, prompt: `${subject}. ${look}. ${SUFFIX}.` })),
  };
}

// ---------------------------------------------------------------- .env and HTTP helpers
function loadEnv(dir) {
  const out = {};
  for (const f of [path.join(dir, '.env'), path.join(process.cwd(), '.env')]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}
function request(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: { ...headers, ...(body ? { 'content-type': 'application/json' } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (res.statusCode >= 400) return reject(new Error(`${method} ${new URL(url).host}${new URL(url).pathname} → HTTP ${res.statusCode}: ${buf.toString().slice(0, 300)}`));
        resolve({ status: res.statusCode, buf, json: () => JSON.parse(buf.toString()) });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
function streamTo(url, file) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return streamTo(res.headers.location, file).then(resolve, reject);
      if (res.statusCode >= 400) return reject(new Error(`download HTTP ${res.statusCode}`));
      const out = fs.createWriteStream(file);
      res.pipe(out);
      out.on('finish', () => out.close(() => resolve(file)));
      out.on('error', reject);
    }).on('error', reject);
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- provider adapters
// Each: generate({prompt, aspectRatio, resolution}, ctx) → { file, jobId?, costUsd }
// ctx.saveJob(id, info) is called BEFORE polling, so a crash never loses a paid image.
// Prices are list-price estimates (USD per image); override with IMAGE_COST_USD.
const PROVIDERS = {
  openai: {
    keyVar: 'OPENAI_API_KEY', estCost: 0.17,
    async balance() { return null; },
    async generate({ prompt, aspectRatio }, ctx) {
      const size = aspectRatio === '1:1' ? '1024x1024' : ['4:5', '3:4', '9:16'].includes(aspectRatio) ? '1024x1536' : '1536x1024';
      const r = await request('POST', 'https://api.openai.com/v1/images/generations', { headers: { authorization: `Bearer ${ctx.key}` }, body: { model: ctx.env.OPENAI_IMAGE_MODEL || 'gpt-image-1', prompt, size, quality: 'high', n: 1 } });
      const j = r.json();
      fs.writeFileSync(ctx.rawFile, Buffer.from(j.data[0].b64_json, 'base64'));
      return { file: ctx.rawFile, jobId: j.created ? String(j.created) : null };
    },
  },
  gemini: {
    keyVar: 'GEMINI_API_KEY', estCost: 0.039,
    async balance() { return null; },
    async generate({ prompt, aspectRatio }, ctx) {
      const model = ctx.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
      const r = await request('POST', `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        headers: { 'x-goog-api-key': ctx.key },
        body: { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } } },
      });
      const part = (r.json().candidates || [])[0].content.parts.find((p) => p.inlineData);
      if (!part) throw new Error('no image in response');
      fs.writeFileSync(ctx.rawFile, Buffer.from(part.inlineData.data, 'base64'));
      return { file: ctx.rawFile };
    },
  },
  fal: {
    keyVar: 'FAL_KEY', estCost: 0.025,
    async balance() { return null; },
    async generate({ prompt, aspectRatio, resolution }, ctx) {
      const model = ctx.env.FAL_MODEL || 'fal-ai/flux/dev';
      const size = { '16:9': 'landscape_16_9', '4:3': 'landscape_4_3', '1:1': 'square_hd', '4:5': 'portrait_4_3', '3:4': 'portrait_4_3' }[aspectRatio] || 'landscape_4_3';
      const auth = { authorization: `Key ${ctx.key}` };
      let job = ctx.resumeJob;
      if (!job) {
        const r = (await request('POST', `https://queue.fal.run/${model}`, { headers: auth, body: { prompt, image_size: size, num_images: 1, enable_safety_checker: true } })).json();
        job = { id: r.request_id, status_url: r.status_url, response_url: r.response_url };
        ctx.saveJob(job.id, job);
      }
      for (let i = 0; i < 120; i++) {
        const s = (await request('GET', job.status_url, { headers: auth })).json();
        if (s.status === 'COMPLETED') break;
        if (i === 119) throw new Error('fal job timed out; job id saved for resume');
        await sleep(2000);
      }
      const out = (await request('GET', job.response_url, { headers: auth })).json();
      await streamTo(out.images[0].url, ctx.rawFile);
      return { file: ctx.rawFile, jobId: job.id, resolution };
    },
  },
  replicate: {
    keyVar: 'REPLICATE_API_TOKEN', estCost: 0.04,
    async balance() { return null; },
    async generate({ prompt, aspectRatio }, ctx) {
      const model = ctx.env.REPLICATE_MODEL || 'black-forest-labs/flux-1.1-pro';
      const auth = { authorization: `Bearer ${ctx.key}` };
      let job = ctx.resumeJob;
      if (!job) {
        const r = (await request('POST', `https://api.replicate.com/v1/models/${model}/predictions`, { headers: auth, body: { input: { prompt, aspect_ratio: aspectRatio, output_format: 'png' } } })).json();
        job = { id: r.id, get: r.urls.get };
        ctx.saveJob(job.id, job);
      }
      let p;
      for (let i = 0; i < 120; i++) {
        p = (await request('GET', job.get, { headers: auth })).json();
        if (p.status === 'succeeded') break;
        if (p.status === 'failed' || p.status === 'canceled') throw new Error(`replicate ${p.status}: ${p.error}`);
        await sleep(2000);
      }
      await streamTo(Array.isArray(p.output) ? p.output[0] : p.output, ctx.rawFile);
      return { file: ctx.rawFile, jobId: job.id };
    },
  },
};

// ---------------------------------------------------------------- WebP
function toWebp(input, output, width) {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', input, '-vf', `scale='min(${width},iw)':-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', '-compression_level', '6', output]);
  const probe = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', output]).toString().trim().split(',');
  return { w: +probe[0], h: +probe[1], bytes: fs.statSync(output).size };
}

async function generateApi(prompts, outDir, { provider, log, only }) {
  const P = PROVIDERS[provider];
  if (!P) throw new Error(`Unknown provider "${provider}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`);
  const env = loadEnv(outDir);
  const key = env[P.keyVar];
  if (!key) throw new Error(`Set ${P.keyVar} in .env (never paste it into chat).`);
  const imgDir = path.join(outDir, 'images');
  fs.mkdirSync(imgDir, { recursive: true });
  const jobsFile = path.join(imgDir, 'jobs.json');
  const jobs = fs.existsSync(jobsFile) ? JSON.parse(fs.readFileSync(jobsFile, 'utf8')) : {};
  const manifestFile = path.join(imgDir, 'manifest.json');
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
  const cost = env.IMAGE_COST_USD ? +env.IMAGE_COST_USD : P.estCost;
  const todo = prompts.slots.filter((s) => (!only || only.includes(s.slot)) && !(manifest[s.slot] && manifest[s.slot].status === 'done' && !only));
  // balance first: providers that expose it are checked; otherwise enforce IMAGE_BUDGET_USD
  const bal = await P.balance({ key, env }).catch(() => null);
  const budget = env.IMAGE_BUDGET_USD ? +env.IMAGE_BUDGET_USD : null;
  log(`  balance: ${bal === null ? `not exposed by ${provider}'s API` : `$${bal}`}; estimated cost ${todo.length} × $${cost.toFixed(3)} = $${(todo.length * cost).toFixed(2)}${budget !== null ? `; budget $${budget}` : ''}`);
  if ((bal !== null && bal < todo.length * cost) || (budget !== null && budget < todo.length * cost)) throw new Error('Estimated cost exceeds the available balance or IMAGE_BUDGET_USD; nothing generated.');
  for (const s of todo) {
    const t0 = Date.now();
    const rawFile = path.join(imgDir, `${s.slot}.raw`);
    const ctx = { key, env, rawFile, resumeJob: jobs[s.slot] && jobs[s.slot].status !== 'done' ? jobs[s.slot].job : null,
      saveJob: (id, job) => { jobs[s.slot] = { id, job, status: 'pending', at: new Date().toISOString() }; fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2)); } };
    try {
      const r = await P.generate(s, ctx);
      const webp = path.join(imgDir, `${s.slot}.webp`);
      const info = toWebp(r.file, webp, s.resolution);
      fs.unlinkSync(r.file);
      if (jobs[s.slot]) { jobs[s.slot].status = 'done'; fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2)); }
      manifest[s.slot] = { file: `${s.slot}.webp`, ...info, source: `api:${provider}`, jobId: r.jobId || null, costUsd: cost, ms: Date.now() - t0, status: 'done', ai: true, prompt: s.prompt };
      log(`  ${s.slot}: ${info.w}×${info.h} ${Math.round(info.bytes / 1024)} KB · $${cost.toFixed(3)} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    } catch (e) {
      manifest[s.slot] = { status: 'failed', error: e.message.replace(key, '***'), source: `api:${provider}` };
      log(`  ${s.slot}: failed — ${e.message.replace(key, '***').slice(0, 200)}`);
    }
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  }
  return manifest;
}

function importManual(prompts, outDir, { log }) {
  const imgDir = path.join(outDir, 'images');
  fs.mkdirSync(imgDir, { recursive: true });
  const manifest = {};
  for (const s of prompts.slots) {
    const src = ['png', 'jpg', 'jpeg', 'webp'].map((e) => path.join(imgDir, `${s.slot}.${e}`)).find((f) => fs.existsSync(f));
    if (!src) { manifest[s.slot] = { status: 'missing' }; continue; }
    const webp = path.join(imgDir, `${s.slot}.webp`);
    const tmp = src === webp ? path.join(imgDir, `${s.slot}.src.webp`) : null;
    if (tmp) fs.copyFileSync(src, tmp);
    const info = toWebp(tmp || src, webp, s.resolution);
    if (tmp) fs.unlinkSync(tmp);
    manifest[s.slot] = { file: `${s.slot}.webp`, ...info, source: 'manual', costUsd: null, status: 'done', ai: true, prompt: s.prompt };
    log(`  ${s.slot}: ${path.basename(src)} → ${info.w}×${info.h} webp ${Math.round(info.bytes / 1024)} KB`);
  }
  fs.writeFileSync(path.join(imgDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

function loadImages(outDir, manifest) {
  const out = {};
  for (const [slot, m] of Object.entries(manifest || {})) {
    if (m.status !== 'done' || !m.file) continue;
    const f = path.join(outDir, 'images', m.file);
    if (fs.existsSync(f)) out[slot] = { dataUri: `data:image/webp;base64,${fs.readFileSync(f).toString('base64')}`, file: f, ...m };
  }
  return out;
}

module.exports = { buildPrompts, generateApi, importManual, loadImages, toWebp, PROVIDERS };
