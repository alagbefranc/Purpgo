'use strict';
// In-page extractor. Both functions are serialised with toString() and run
// inside the page (Playwright) or inside same-origin iframes (DevTools snippet),
// so they must stay self-contained: no closures, no requires.

/* eslint-disable no-var */
function extract(win, opts) {
  opts = opts || {};
  var doc = win.document;
  var vw = win.innerWidth, vh = win.innerHeight;
  var scrollY = win.scrollY || 0;
  var docH = Math.max(doc.documentElement.scrollHeight, doc.body ? doc.body.scrollHeight : 0);
  var docArea = vw * docH;

  // ---- colour normalisation through a 1px canvas (handles oklch()/lab()/color())
  var cv = doc.createElement('canvas'); cv.width = cv.height = 1;
  var cx = cv.getContext('2d', { willReadFrequently: true });
  var cache = {};
  function toHex(c) {
    if (!c) return null;
    if (cache[c] !== undefined) return cache[c];
    var out = null;
    if (c === 'transparent' || c === 'rgba(0, 0, 0, 0)') { cache[c] = { hex: null, a: 0 }; return cache[c]; }
    try {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#010203'; cx.fillStyle = c; // invalid colours keep the sentinel
      var sentinel = cx.fillStyle === '#010203' && !/^#?010203$/i.test(c);
      if (!sentinel) {
        cx.fillRect(0, 0, 1, 1);
        var d = cx.getImageData(0, 0, 1, 1).data;
        var a = d[3] / 255;
        // getImageData returns premultiplied-then-unpremultiplied values; fine for a >= .1
        out = { hex: '#' + [d[0], d[1], d[2]].map(function (v) { return v.toString(16).padStart(2, '0'); }).join(''), a: Math.round(a * 100) / 100 };
        if (a === 0) out = { hex: null, a: 0 };
      }
    } catch (e) { out = null; }
    cache[c] = out;
    return out;
  }
  var COLOR_RE = /(?:rgba?|hsla?|oklch|oklab|lab|lch|color|hwb)\([^()]*(?:\([^()]*\)[^()]*)*\)|#[0-9a-fA-F]{3,8}\b/g;

  // ---- consent / cookie UI exclusion
  var CONSENT_ATTR = /cookie|consent|gdpr|onetrust|ot-sdk|cmp[-_]|cookiebot|didomi|truste|usercentrics|privacy-?banner|cc[-_]window|osano/i;
  var CONSENT_TEXT = /\b(cookies?|consent|privacy preferences|we use cookies|accept all|reject all|manage preferences)\b/i;
  function isConsent(el) {
    for (var n = el; n && n !== doc.body; n = n.parentElement) {
      if (n.__rbConsent !== undefined) { if (n.__rbConsent) return true; continue; }
      var attr = (n.id || '') + ' ' + (typeof n.className === 'string' ? n.className : (n.getAttribute('class') || ''));
      var hit = CONSENT_ATTR.test(attr);
      if (!hit) {
        var role = n.getAttribute('role');
        if (role === 'dialog' || role === 'alertdialog' || n.getAttribute('aria-modal') === 'true' || n.tagName === 'DIALOG') {
          hit = CONSENT_TEXT.test((n.textContent || '').slice(0, 2000));
        }
      }
      n.__rbConsent = hit;
      if (hit) return true;
    }
    return false;
  }

  function px(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function bump(map, key, w) { if (key === null || key === undefined || key === '') return; map[key] = (map[key] || 0) + (w === undefined ? 1 : w); }
  function chromeOf(el) { return el.closest('header,footer,[role=banner],[role=contentinfo]') ? 1 : 0; }
  function visible(el, cs, r) {
    if (r.width < 1 || r.height < 1) return false;
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    if (r.bottom + scrollY < 0 || r.right < 0 || r.left > vw + 2) return false;
    return true;
  }
  function ownText(el) {
    var t = '';
    for (var i = 0; i < el.childNodes.length; i++) { var c = el.childNodes[i]; if (c.nodeType === 3) t += c.nodeValue; }
    return t.replace(/\s+/g, ' ').trim();
  }
  function fullText(el) { return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function fam(f) { return (f || '').split(',')[0].replace(/["']/g, '').trim(); }

  var out = {
    url: win.location.href, title: doc.title, viewport: { w: vw, h: vh }, docHeight: docH,
    textStyles: {}, textColors: {}, bgColors: {}, borderColors: {}, fills: {}, gradients: {},
    pairs: {}, spacing: { padding: {}, margin: {}, gap: {} }, radii: {}, shadows: {},
    maxWidths: {}, centredWidths: {}, grids: [], flexRows: [], media: [], buttons: [], cards: [],
    header: null, inputs: [], headings: [], paragraphs: [], ctas: [], rootVars: {}, breakpoints: {},
    easings: {}, durations: {}, sections: [], backdrop: {}, chromeKeys: {}
  };

  var all = doc.body ? doc.body.querySelectorAll('*') : [];
  var painted = []; // {el, area, hex}
  var paintedSet = new Map();
  var skipTags = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, META: 1, LINK: 1, BR: 1, HEAD: 1, TITLE: 1 };
  var recs = [];
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (skipTags[el.tagName]) continue;
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg' && !/^(path|circle|rect|polygon|ellipse|g)$/i.test(el.tagName)) continue;
    var cs = win.getComputedStyle(el);
    var r = el.getBoundingClientRect();
    if (!visible(el, cs, r)) continue;
    if (isConsent(el)) continue;
    recs.push({ el: el, cs: cs, r: r });
  }

  function effectiveBg(el) {
    for (var n = el; n; n = n.parentElement) {
      var p = paintedSet.get(n);
      if (p && p.a >= 0.9) return { hex: p.hex, image: false };
      if (p && p.gradient) return { hex: p.gradientMid || null, image: true };
      if (p && p.media) return { hex: null, image: true };
    }
    var b = toHex(win.getComputedStyle(doc.body).backgroundColor);
    if (b && b.hex) return { hex: b.hex, image: false };
    var h = toHex(win.getComputedStyle(doc.documentElement).backgroundColor);
    return { hex: (h && h.hex) || '#ffffff', image: false };
  }

  // pass 1: painted layers (backgrounds, gradients, media)
  recs.forEach(function (o) {
    var el = o.el, cs = o.cs, r = o.r;
    var area = r.width * r.height;
    var bg = toHex(cs.backgroundColor);
    var bi = cs.backgroundImage;
    var info = null;
    if (bg && bg.hex && bg.a > 0.05) info = { hex: bg.hex, a: bg.a };
    if (bi && bi !== 'none' && /gradient\(/.test(bi)) {
      var stops = (bi.match(COLOR_RE) || []).map(function (c) { var h = toHex(c); return h && h.hex; }).filter(Boolean);
      info = info || {};
      info.gradient = bi.slice(0, 400);
      info.gradientMid = stops[Math.floor(stops.length / 2)] || null;
      var gk = stops.join(' ') + '|' + (bi.match(/^[a-z-]+/) || [''])[0];
      if (!out.gradients[gk]) out.gradients[gk] = { type: (bi.match(/^[a-z-]+/) || [''])[0], stops: stops, value: bi.slice(0, 300), area: 0, count: 0 };
      out.gradients[gk].area += area; out.gradients[gk].count++;
    }
    if (/^(IMG|VIDEO|PICTURE|CANVAS)$/.test(el.tagName) || (bi && /url\(/.test(bi))) info = Object.assign(info || {}, { media: true });
    if (info) { info.area = area; info.el = el; paintedSet.set(el, info); painted.push(info); }
  });
  // exclusive painted area: subtract a layer's area from its nearest painted ancestor
  painted.forEach(function (p) {
    p.excl = p.area;
  });
  painted.forEach(function (p) {
    for (var n = p.el.parentElement; n; n = n.parentElement) {
      var a = paintedSet.get(n);
      if (a) { a.excl -= p.area; break; }
    }
  });
  var paintedTotal = 0;
  painted.forEach(function (p) {
    if (p.hex && p.a >= 0.5 && !p.media) {
      var w = Math.max(0, p.excl);
      bump(out.bgColors, p.hex, w); paintedTotal += w;
      if (chromeOf(p.el)) out.chromeKeys['bg:' + p.hex] = 1;
    }
  });
  // page ground (html/body) covers whatever is not painted
  var groundHex = (function () {
    var b = toHex(win.getComputedStyle(doc.body).backgroundColor);
    if (b && b.hex && b.a > 0.5) return b.hex;
    var h = toHex(win.getComputedStyle(doc.documentElement).backgroundColor);
    return (h && h.hex && h.a > 0.5) ? h.hex : '#ffffff';
  })();
  bump(out.bgColors, groundHex, Math.max(0, docArea - paintedTotal));

  var cardCandidates = [];
  recs.forEach(function (o) {
    var el = o.el, cs = o.cs, r = o.r, tag = el.tagName.toLowerCase();
    var isChrome = chromeOf(el);
    // ---- text
    var t = ownText(el);
    if (t && t.length > 0 && tag !== 'svg') {
      var size = px(cs.fontSize);
      var lh = cs.lineHeight === 'normal' ? r1(size * 1.2) : px(cs.lineHeight);
      var ls = cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing);
      var family = fam(cs.fontFamily);
      var weight = parseInt(cs.fontWeight, 10) || 400;
      var hTag = /^h[1-6]$/.test(tag) ? tag : (el.closest('h1,h2,h3,h4,h5,h6') ? el.closest('h1,h2,h3,h4,h5,h6').tagName.toLowerCase() : (el.closest('p') ? 'p' : (el.closest('a,button') ? 'a' : 'other')));
      var key = [family, r1(size), weight, r1(lh), r1(ls), cs.textTransform, hTag].join('|');
      var ts = out.textStyles[key];
      if (!ts) ts = out.textStyles[key] = { family: family, stack: cs.fontFamily.slice(0, 200), size: r1(size), weight: weight, lineHeight: r1(lh), letterSpacing: r1(ls * 100) / 100, transform: cs.textTransform, tag: hTag, chars: 0, count: 0, samples: [] };
      ts.chars += t.length; ts.count++;
      if (ts.samples.length < 3 && t.length > 2) ts.samples.push(t.slice(0, 80));
      if (isChrome) out.chromeKeys['ts:' + key] = 1;
      var fg = toHex(cs.color);
      if (fg && fg.hex) {
        bump(out.textColors, fg.hex, t.length);
        if (isChrome) out.chromeKeys['tc:' + fg.hex] = 1;
        var eb = effectiveBg(el);
        if (eb.hex) bump(out.pairs, fg.hex + '>' + eb.hex + (eb.image ? '>img' : ''), t.length);
      }
    }
    // ---- heading candidates (by tag or visual size)
    if ((/^h[1-4]$/.test(tag) || el.getAttribute('role') === 'heading') || (t && px(cs.fontSize) >= 22 && t.length < 160)) {
      var ht = fullText(el);
      if (ht && ht.length < 200 && (/^h[1-4]$/.test(tag) || el.getAttribute('role') === 'heading' || ht === t)) {
        if (out.headings.length < 400) out.headings.push({
          tag: tag, text: ht.slice(0, 160), size: r1(px(cs.fontSize)), weight: parseInt(cs.fontWeight, 10) || 400,
          lineHeight: cs.lineHeight === 'normal' ? r1(px(cs.fontSize) * 1.2) : px(cs.lineHeight),
          letterSpacing: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing), family: fam(cs.fontFamily),
          transform: cs.textTransform, y: Math.round(r.top + scrollY), chrome: isChrome, color: (toHex(cs.color) || {}).hex
        });
      }
    }
    if (tag === 'p') {
      var pt = fullText(el);
      if (pt.length >= 30 && out.paragraphs.length < 80) out.paragraphs.push({ text: pt.slice(0, 300), size: r1(px(cs.fontSize)), weight: parseInt(cs.fontWeight, 10) || 400, lineHeight: px(cs.lineHeight) || r1(px(cs.fontSize) * 1.2), family: fam(cs.fontFamily), chrome: isChrome });
    }
    // ---- borders and svg fills
    ['Top', 'Right', 'Bottom', 'Left'].some(function (s) {
      var bw = px(cs['border' + s + 'Width']);
      if (bw > 0 && cs['border' + s + 'Style'] !== 'none') {
        var bc = toHex(cs['border' + s + 'Color']);
        if (bc && bc.hex && bc.a > 0.05) { bump(out.borderColors, bc.hex); if (isChrome) out.chromeKeys['bc:' + bc.hex] = 1; }
        return true;
      }
      return false;
    });
    if (/^(svg|path|circle|rect|polygon|ellipse|g)$/i.test(tag)) {
      var f = toHex(cs.fill);
      if (f && f.hex && cs.fill !== 'none') bump(out.fills, f.hex);
    }
    // ---- spacing
    [['padding', ['Top', 'Right', 'Bottom', 'Left']], ['margin', ['Top', 'Right', 'Bottom', 'Left']]].forEach(function (pair) {
      pair[1].forEach(function (s) { var v = r1(px(cs[pair[0] + s])); if (v > 0 && v <= 400) bump(out.spacing[pair[0]], v); });
    });
    if (/flex|grid/.test(cs.display)) {
      var g1 = px(cs.rowGap), g2 = px(cs.columnGap);
      if (g1 > 0) bump(out.spacing.gap, r1(g1));
      if (g2 > 0 && g2 !== g1) bump(out.spacing.gap, r1(g2));
    }
    // ---- radius
    var rad = px(cs.borderTopLeftRadius);
    if (rad > 0) {
      var pill = rad >= Math.min(r.width, r.height) / 2 - 0.5 || rad >= 999;
      bump(out.radii, pill ? 'pill' : String(r1(rad)));
    }
    // ---- shadows, backdrop, motion
    if (cs.boxShadow && cs.boxShadow !== 'none') bump(out.shadows, cs.boxShadow.slice(0, 200));
    var bdf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bdf && bdf !== 'none') bump(out.backdrop, bdf);
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      cs.transitionTimingFunction.split(/,(?![^(]*\))/).forEach(function (e) { bump(out.easings, e.trim()); });
      cs.transitionDuration.split(',').forEach(function (d) { if (d.trim() !== '0s') bump(out.durations, d.trim()); });
    }
    if (cs.animationName && cs.animationName !== 'none') bump(out.easings, cs.animationTimingFunction.split(',')[0].trim());
    // ---- containers
    var mw = px(cs.maxWidth);
    if (cs.maxWidth !== 'none' && mw >= 480 && mw <= 2400 && /px$/.test(cs.maxWidth)) bump(out.maxWidths, r1(mw));
    if (r.width >= 480 && r.width < vw - 40 && Math.abs(r.left - (vw - r.right)) <= 2 && r.height > 40) bump(out.centredWidths, Math.round(r.width));
    // ---- grids / flex rows
    if (cs.display === 'grid' || cs.display === 'inline-grid') {
      var cols = cs.gridTemplateColumns.split(' ').filter(function (x) { return /px$/.test(x); }).length;
      if (cols >= 2 && out.grids.length < 120) out.grids.push({ cols: cols, template: cs.gridTemplateColumns.slice(0, 160), gap: r1(px(cs.columnGap)), width: Math.round(r.width), chrome: isChrome });
    } else if (/flex/.test(cs.display) && (cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse') && el.children.length >= 2 && out.flexRows.length < 150) {
      var ws = []; for (var k = 0; k < el.children.length && k < 12; k++) { var cr = el.children[k].getBoundingClientRect(); if (cr.width > 40) ws.push(cr.width); }
      if (ws.length >= 2) {
        var mn = Math.min.apply(null, ws), mx = Math.max.apply(null, ws);
        if (mx - mn < 2 && r.width > 400) out.flexRows.push({ n: ws.length, gap: r1(px(cs.columnGap)), width: Math.round(r.width), chrome: isChrome });
      }
    }
    // ---- media
    if (/^(img|video|picture|canvas|svg)$/.test(tag) || (cs.backgroundImage && /url\(/.test(cs.backgroundImage))) {
      if (tag === 'picture') return;
      var src = tag === 'img' ? (el.currentSrc || el.src) : tag === 'video' ? (el.currentSrc || el.poster || '') : tag === 'svg' ? 'inline.svg' : ((cs.backgroundImage.match(/url\(["']?([^"')]+)/) || [])[1] || '');
      var area = r.width * r.height;
      if (area >= 64 * 64 && out.media.length < 300) {
        var fmt = (function (s) {
          if (/^data:image\/([a-z+]+)/i.test(s)) return RegExp.$1.replace('svg+xml', 'svg').replace('jpeg', 'jpg');
          try { var u = new URL(s, win.location.href); var inner = u.searchParams.get('url'); if (inner) u = new URL(inner, win.location.href); var fm = u.searchParams.get('fm') || u.searchParams.get('format'); if (fm) return fm.toLowerCase(); var m = u.pathname.match(/\.(jpe?g|png|webp|avif|gif|svg|mp4|webm)$/i); return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : (tag === 'video' ? 'video' : 'unknown'); } catch (e) { return 'unknown'; }
        })(src);
        out.media.push({
          kind: tag === 'img' || tag === 'picture' ? 'img' : tag === 'video' ? 'video' : tag === 'svg' ? 'svg' : tag === 'canvas' ? 'canvas' : 'bg',
          format: fmt, w: Math.round(r.width), h: Math.round(r.height),
          nw: el.naturalWidth || el.videoWidth || 0, nh: el.naturalHeight || el.videoHeight || 0,
          fit: tag === 'img' || tag === 'video' ? cs.objectFit : (cs.backgroundSize || ''), fullBleed: r.width >= vw * 0.95,
          alt: tag === 'img' ? (el.getAttribute('alt') || '') : (el.getAttribute('aria-label') || ''), y: Math.round(r.top + scrollY),
          radius: px(cs.borderTopLeftRadius), chrome: isChrome
        });
      }
    }
    // ---- form fields
    if (/^(input|select|textarea)$/.test(tag) && !/^(hidden|checkbox|radio|submit|button|image|range|file)$/i.test(el.type || '')) {
      if (out.inputs.length < 30) out.inputs.push({
        type: el.type || tag, height: r1(r.height), width: r1(r.width), radius: px(cs.borderTopLeftRadius),
        border: px(cs.borderTopWidth) + 'px ' + ((toHex(cs.borderTopColor) || {}).hex || 'none'), bg: (toHex(cs.backgroundColor) || {}).hex || null,
        bgA: (toHex(cs.backgroundColor) || {}).a || 0, color: (toHex(cs.color) || {}).hex, padX: px(cs.paddingLeft), padY: px(cs.paddingTop),
        fontSize: px(cs.fontSize), placeholder: el.getAttribute('placeholder') || ''
      });
    }
    // ---- card candidates (collected; decided after buttons)
    var bgc = toHex(cs.backgroundColor);
    var hasFill = bgc && bgc.hex && bgc.a > 0.03;
    var hasEdge = (cs.boxShadow && cs.boxShadow !== 'none') || (px(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none');
    var hasBd = (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none';
    if (rad >= 6 && (hasFill || hasEdge || hasBd || el.querySelector('img,video')) && r.width >= 180 && r.height >= 140 && r.width <= vw * 0.75 && r.height <= 1100 && (el.innerText || '').trim().length > 0) {
      cardCandidates.push({ el: el, cs: cs, r: r, bg: bgc, bd: hasBd, isChrome: isChrome });
    }
  });

  // ---- buttons: the painted layer can be a child of the <a>
  var btnEls = doc.querySelectorAll('button, a, [role=button], input[type=submit], input[type=button]');
  var seenBtn = new Set();
  for (var b = 0; b < btnEls.length && out.buttons.length < 120; b++) {
    var be = btnEls[b];
    if (isConsent(be)) continue;
    var bcs = win.getComputedStyle(be), br = be.getBoundingClientRect();
    if (!visible(be, bcs, br)) continue;
    var label = (be.innerText || be.value || be.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
    if (!label || label.length > 40 || br.height < 24 || br.height > 90 || br.width > 480) continue;
    // painted layer: the element itself, or a single descendant filling it
    var layer = be, lcs = bcs;
    var paintedSelf = (function (c) { var x = toHex(c.backgroundColor); return (x && x.hex && x.a > 0.03) || (px(c.borderTopWidth) > 0 && c.borderTopStyle !== 'none' && (toHex(c.borderTopColor) || {}).a > 0.1) || (c.backdropFilter || 'none') !== 'none'; })(bcs);
    if (!paintedSelf) {
      var kids = be.querySelectorAll('*');
      for (var q = 0; q < kids.length && q < 6; q++) {
        var kc = win.getComputedStyle(kids[q]), kr = kids[q].getBoundingClientRect();
        var kx = toHex(kc.backgroundColor);
        if (kr.width >= br.width * 0.8 && kr.height >= br.height * 0.7 && ((kx && kx.hex && kx.a > 0.03) || (px(kc.borderTopWidth) > 0 && kc.borderTopStyle !== 'none'))) { layer = kids[q]; lcs = kc; br = kr; paintedSelf = true; break; }
      }
    }
    if (!paintedSelf) continue;
    if (seenBtn.has(layer)) continue; seenBtn.add(layer);
    var bgx = toHex(lcs.backgroundColor) || { hex: null, a: 0 };
    var bcx = toHex(lcs.borderTopColor) || { hex: null, a: 0 };
    var rr = px(lcs.borderTopLeftRadius);
    out.buttons.push({
      text: label, tag: be.tagName.toLowerCase(), bg: bgx.hex, bgA: bgx.a, color: (toHex(lcs.color) || toHex(bcs.color) || {}).hex,
      borderW: px(lcs.borderTopWidth), borderStyle: lcs.borderTopStyle, borderColor: bcx.hex, borderA: bcx.a,
      radius: rr, pill: rr >= br.height / 2 - 0.5, padX: px(lcs.paddingLeft) || px(bcs.paddingLeft), padY: px(lcs.paddingTop) || px(bcs.paddingTop),
      height: r1(br.height), width: r1(br.width), fontSize: px(bcs.fontSize), weight: parseInt(bcs.fontWeight, 10) || 400,
      family: fam(bcs.fontFamily), letterSpacing: bcs.letterSpacing === 'normal' ? 0 : px(bcs.letterSpacing), transform: bcs.textTransform,
      backdrop: lcs.backdropFilter && lcs.backdropFilter !== 'none' ? lcs.backdropFilter : null,
      easing: lcs.transitionTimingFunction, duration: lcs.transitionDuration, y: Math.round(br.top + scrollY), chrome: chromeOf(be),
      ground: (function () { var e = effectiveBg(layer.parentElement || layer); return e.hex; })()
    });
    if (out.ctas.length < 80) out.ctas.push(label);
  }

  // ---- cards (exclude button layers and anything nested in another card)
  var cardSet = new Set();
  cardCandidates.forEach(function (c) { if (!seenBtn.has(c.el)) cardSet.add(c.el); });
  cardCandidates.forEach(function (c) {
    if (!cardSet.has(c.el) || out.cards.length >= 120) return;
    for (var n = c.el.parentElement; n; n = n.parentElement) if (cardSet.has(n)) return;
    var img = c.el.querySelector('img,video,picture');
    var ir = img ? img.getBoundingClientRect() : null;
    out.cards.push({
      w: Math.round(c.r.width), h: Math.round(c.r.height), radius: px(c.cs.borderTopLeftRadius),
      bg: c.bg && c.bg.hex, bgA: c.bg ? c.bg.a : 0, backdrop: c.bd ? (c.cs.backdropFilter || c.cs.webkitBackdropFilter) : null,
      shadow: c.cs.boxShadow !== 'none' ? c.cs.boxShadow.slice(0, 160) : null,
      border: px(c.cs.borderTopWidth) > 0 ? px(c.cs.borderTopWidth) + 'px ' + ((toHex(c.cs.borderTopColor) || {}).hex || '') : null,
      padX: px(c.cs.paddingLeft), padY: px(c.cs.paddingTop), media: !!img, mediaShare: ir ? Math.round(100 * (ir.width * ir.height) / (c.r.width * c.r.height)) : 0,
      title: ((c.el.querySelector('h1,h2,h3,h4,h5,h6,strong,b') || {}).innerText || '').trim().slice(0, 60),
      ground: effectiveBg(c.el.parentElement || c.el).hex, chrome: c.isChrome
    });
  });

  // ---- header / nav
  var hdr = doc.querySelector('header, [role=banner]') || doc.querySelector('nav');
  if (hdr) {
    var hcs = win.getComputedStyle(hdr), hr = hdr.getBoundingClientRect();
    var sticky = /fixed|sticky/.test(hcs.position);
    if (!sticky) { for (var n2 = hdr.firstElementChild; n2; n2 = n2.firstElementChild) { if (/fixed|sticky/.test(win.getComputedStyle(n2).position)) { sticky = true; break; } } }
    var links = Array.prototype.slice.call(hdr.querySelectorAll('nav a, a')).filter(function (a) { var ar = a.getBoundingClientRect(); return ar.width > 0 && ar.height > 0 && (a.innerText || '').trim().length > 1 && (a.innerText || '').trim().length < 30; });
    var l0 = links[0] ? win.getComputedStyle(links[0]) : null;
    var logo = hdr.querySelector('a[href="/"] svg, a[aria-label*="ome"] svg, svg, a[href="/"] img, img');
    var lr = logo ? logo.getBoundingClientRect() : null;
    var lcol = null;
    if (logo) { var lc = win.getComputedStyle(logo); var fx = toHex(lc.fill); lcol = (fx && fx.hex && lc.fill !== 'none') ? fx.hex : (toHex(lc.color) || {}).hex; var p1 = logo.querySelector && logo.querySelector('path'); if (p1) { var pf = toHex(win.getComputedStyle(p1).fill); if (pf && pf.hex) lcol = pf.hex; } }
    var hbg = toHex(hcs.backgroundColor) || {};
    out.header = {
      height: r1(hr.height), sticky: sticky, position: hcs.position, bg: hbg.hex || null, bgA: hbg.a || 0,
      backdrop: (hcs.backdropFilter && hcs.backdropFilter !== 'none') ? hcs.backdropFilter : null,
      linkCount: links.length, links: links.slice(0, 8).map(function (a) { return (a.innerText || '').trim(); }),
      linkSize: l0 ? px(l0.fontSize) : null, linkWeight: l0 ? parseInt(l0.fontWeight, 10) : null, linkColor: l0 ? (toHex(l0.color) || {}).hex : null,
      linkTransform: l0 ? l0.textTransform : null, linkDecoration: l0 ? l0.textDecorationLine : null,
      logo: lr ? { w: r1(lr.width), h: r1(lr.height), color: lcol, kind: logo.tagName.toLowerCase() } : null
    };
  }

  // ---- :root custom properties and breakpoints from readable stylesheets
  try {
    var rcs = win.getComputedStyle(doc.documentElement);
    for (var v = 0; v < rcs.length; v++) { var pn = rcs[v]; if (pn.indexOf('--') === 0 && Object.keys(out.rootVars).length < 600) out.rootVars[pn] = rcs.getPropertyValue(pn).trim().slice(0, 200); }
  } catch (e) { /* ignore */ }
  out.sheetsReadable = 0; out.sheetsBlocked = 0;
  function walkRules(rules) {
    for (var j = 0; j < rules.length; j++) {
      var ru = rules[j];
      if (ru.media && ru.conditionText !== undefined && ru.type === 4) {
        (ru.conditionText.match(/(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g) || []).forEach(function (m) {
          var mm = m.match(/(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/); var val = parseFloat(mm[2]) * (mm[3] === 'px' ? 1 : 16);
          bump(out.breakpoints, mm[1] + ':' + Math.round(val));
        });
      }
      if (ru.selectorText && /^(:root|html)$/.test(ru.selectorText.trim()) && ru.style) {
        for (var s = 0; s < ru.style.length; s++) { var nm = ru.style[s]; if (nm.indexOf('--') === 0 && !out.rootVars[nm]) out.rootVars[nm] = ru.style.getPropertyValue(nm).trim().slice(0, 200); }
      }
      if (ru.cssRules) walkRules(ru.cssRules);
    }
  }
  for (var sh = 0; sh < doc.styleSheets.length; sh++) {
    try { walkRules(doc.styleSheets[sh].cssRules); out.sheetsReadable++; } catch (e) { out.sheetsBlocked++; }
  }

  // ---- section rhythm: full-width bands stacked down the page
  (function () {
    var cands = recs.filter(function (o) { return o.r.width >= vw * 0.95 && o.r.height >= 160 && !chromeOf(o.el); });
    // drop wrappers (main, page containers) that hold two or more bands themselves
    cands = cands.filter(function (o) {
      var inner = 0;
      for (var q = 0; q < cands.length && inner < 2; q++) if (cands[q] !== o && o.el.contains(cands[q].el)) inner++;
      return inner < 2;
    });
    // keep outermost-per-band: sort by top, prefer elements whose painted bg is known
    var bands = [];
    cands.forEach(function (o) {
      var top = o.r.top + scrollY, bot = top + o.r.height;
      var eb = effectiveBg(o.el);
      // look inside for a covering painted layer (section > div.bg)
      var inner = o.el.querySelectorAll(':scope > *, :scope > * > *');
      for (var z = 0; z < inner.length && z < 20; z++) {
        var p = paintedSet.get(inner[z]);
        if (p && (p.hex || p.media || p.gradient)) { var ir2 = inner[z].getBoundingClientRect(); if (ir2.width * ir2.height >= o.r.width * o.r.height * 0.8) { eb = { hex: p.hex || p.gradientMid, image: !!(p.media || p.gradient) }; break; } }
      }
      bands.push({ top: Math.round(top), bottom: Math.round(bot), bg: eb.hex, image: eb.image });
    });
    bands.sort(function (a, b) { return a.top - b.top || (b.bottom - b.top) - (a.bottom - a.top); });
    var res = [], cursor = -1;
    bands.forEach(function (bd) { if (bd.top >= cursor - 4) { res.push(bd); cursor = bd.bottom; } });
    out.sections = res.slice(0, 40);
  })();

  out.stats = { elementsWalked: all.length, elementsVisible: recs.length, consentExcluded: Array.prototype.filter.call(all, function (e) { return e.__rbConsent; }).length };
  return out;
}

function scoreLinks(win, opts) {
  opts = opts || {};
  var doc = win.document, here = new URL(win.location.href);
  var LOCALE = /^[a-z]{2}(?:[-_][a-zA-Z]{2,4})?$/;
  var SKIP = /(legal|terms|privacy|cookie|policy|policies|help|support|faq|login|log-in|signin|sign-in|signup|sign-up|register|account|status|sitemap|accessibility|complaints|careers?|jobs?|press|blog|news|community|security|developer|docs?|api|investor|modern-slavery|licen[cs]e|regulat|disclos|contact)/i;
  var HIGH = /(product|pricing|price|plans?|business|company|about|features?|personal|cards?|accounts?|platform|solutions?|enterprise|pro\b|premium|why)/i;
  var homeSegs = here.pathname.split('/').filter(Boolean);
  var homeLocale = homeSegs[0] && LOCALE.test(homeSegs[0]) ? homeSegs[0] : null;
  var bestByTop = {};
  var links = doc.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    var a = links[i], u;
    try { u = new URL(a.getAttribute('href'), here.href); } catch (e) { continue; }
    if (!/^https?:$/.test(u.protocol)) continue;
    var hostA = u.hostname.replace(/^www\./, ''), hostB = here.hostname.replace(/^www\./, '');
    if (hostA !== hostB) continue;
    if (/\.(pdf|zip|png|jpe?g|svg|xml|json)$/i.test(u.pathname)) continue;
    var segs = u.pathname.split('/').filter(Boolean);
    var loc = segs[0] && LOCALE.test(segs[0]) && segs.length >= 1 && segs[0].length <= 5 ? segs[0] : null;
    if (loc && homeLocale && loc !== homeLocale) continue; // locale duplicate
    if (loc && !homeLocale) continue;
    var rest = loc ? segs.slice(1) : segs;
    if (rest.length === 0) continue; // home again
    var path = rest.join('/');
    if (SKIP.test(path)) continue;
    var top = rest[0].toLowerCase();
    var score = 0;
    if (a.closest('header, nav, [role=navigation], [role=banner]')) score += 5;
    if (a.closest('footer, [role=contentinfo]')) score -= 1;
    if (HIGH.test(path)) score += 4;
    if (rest.length === 1) score += 2; else if (rest.length === 2) score += 1; else score -= rest.length;
    var label = (a.innerText || '').trim();
    if (label.length > 0 && label.length < 30) score += 1;
    var clean = u.origin + u.pathname.replace(/\/$/, '') + '/';
    if (!bestByTop[top] || bestByTop[top].score < score) bestByTop[top] = { url: clean, score: score, label: label.slice(0, 40), top: top };
  }
  return Object.keys(bestByTop).map(function (k) { return bestByTop[k]; }).sort(function (a, b) { return b.score - a.score; });
}

module.exports = { extract, scoreLinks };
