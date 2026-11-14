/* Starhaul — small shared helpers */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  // 1234 -> "1.23K"; small numbers keep up to `dec` decimals
  SH.fmt = function (n, dec) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + SH.fmt(-n, dec);
    if (n < 1000) {
      if (dec && n < 100) {
        const s = n.toFixed(dec);
        return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
      }
      return String(Math.floor(n + 1e-9));
    }
    let e = Math.floor(Math.log10(n) / 3);
    let m = n / Math.pow(1000, e);
    if (m >= 999.5) { m /= 1000; e++; }
    if (e >= SUF.length) return n.toExponential(2).replace('+', '');
    const s = m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2);
    return s + SUF[e];
  };
  SH.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    if (sec < 60) return sec + 's';
    const m = Math.floor(sec / 60);
    if (m < 60) return m + 'm ' + (sec % 60) + 's';
    const h = Math.floor(m / 60);
    if (h < 48) return h + 'h ' + (m % 60) + 'm';
    return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
  };
  SH.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  SH.hexRgb = function (hex) {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  };
})(typeof window !== 'undefined' ? window : globalThis);
