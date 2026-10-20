'use strict';
// Parses raw stylesheet text for declared breakpoints, :root variables,
// easings and @font-face family names. Self-contained so the DevTools
// snippet can embed it with toString().

/* eslint-disable no-var */
function parseCss(texts) {
  var out = { breakpoints: {}, rootVars: {}, easings: {}, durations: {}, fontFaces: {}, sheets: texts.length, bytes: 0 };
  function bump(m, k, w) { m[k] = (m[k] || 0) + (w || 1); }
  texts.forEach(function (t) {
    if (!t) return;
    out.bytes += t.length;
    var mq = /@media[^{]*\{/g, m;
    while ((m = mq.exec(t))) {
      var re = /(min|max)-width\s*:\s*([\d.]+)(px|em|rem)/g, x;
      while ((x = re.exec(m[0]))) bump(out.breakpoints, x[1] + ':' + Math.round(parseFloat(x[2]) * (x[3] === 'px' ? 1 : 16)));
      var re2 = /width\s*(>=|<=|>|<)\s*([\d.]+)(px|em|rem)/g;
      while ((x = re2.exec(m[0]))) bump(out.breakpoints, (x[1][0] === '>' ? 'min' : 'max') + ':' + Math.round(parseFloat(x[2]) * (x[3] === 'px' ? 1 : 16)));
    }
    var root = /(?:^|[}\s,])(?::root|html)\s*\{([^}]*)\}/g;
    while ((m = root.exec(t))) {
      var decl = /(--[\w-]+)\s*:\s*([^;]+)/g, d;
      while ((d = decl.exec(m[1]))) if (Object.keys(out.rootVars).length < 800 && !(d[1] in out.rootVars)) out.rootVars[d[1]] = d[2].trim().slice(0, 200);
    }
    var cb = /cubic-bezier\([^)]*\)/g;
    while ((m = cb.exec(t))) bump(out.easings, m[0].replace(/\s+/g, ''));
    var tf = /(?:transition|animation)(?:-timing-function)?\s*:\s*([^;}]*)/g;
    while ((m = tf.exec(t))) {
      var k = m[1].match(/\b(ease-in-out|ease-out|ease-in|ease|linear|steps\([^)]*\))\b/g);
      if (k) k.forEach(function (e) { bump(out.easings, e); });
      var du = m[1].match(/\b\d*\.?\d+m?s\b/g);
      if (du) du.forEach(function (e) { bump(out.durations, e); });
    }
    var ff = /@font-face\s*\{([^}]*)\}/g;
    while ((m = ff.exec(t))) {
      var fam = (m[1].match(/font-family\s*:\s*["']?([^;"'}]+)/) || [])[1];
      var wt = (m[1].match(/font-weight\s*:\s*([^;}]+)/) || [])[1];
      if (fam) { fam = fam.trim(); out.fontFaces[fam] = out.fontFaces[fam] || []; if (wt && out.fontFaces[fam].indexOf(wt.trim()) < 0) out.fontFaces[fam].push(wt.trim()); }
    }
  });
  return out;
}

module.exports = { parseCss };
