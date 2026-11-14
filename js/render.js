/* Starhaul — canvas star map: planets, ships, effects */
(function () {
  'use strict';
  const SH = window.SH;
  const G = SH.G;
  const PLANETS = SH.PLANETS;
  const RMAP = SH.RMAP;
  const clamp = SH.clamp;
  const R = (SH.R = {});
  const TAU = Math.PI * 2;
  let TILT = 0.62; // the orbital plane is seen at an angle (adapts to the map's shape)
  const MTILT = 0.5; // ships circling a planet while mining

  let cv, ctx, W = 0, H = 0, DPR = 1, bg = null;
  let clock = 0;
  const view = { s: 0, cx: 0, cy: 0 };
  const P = PLANETS.map(() => ({ x: 0, y: 0, r: 0, bump: 0, acc: 0, lastF: 0, lastPod: 0 }));
  const home = { x: 0, y: 0, r: 0, pulse: 0, key: '', spr: null };
  const rings = [], floats = [], parts = [], pods = [], twinkles = [];
  const sprites = [];
  let shipK = 1;
  let cometXY = null;
  let haulIdx = 0, lastHaulF = 0;
  const FONT = "'Chakra Petch', ui-sans-serif, system-ui, sans-serif";

  SH.RES.forEach((r) => (r.rgb = SH.hexRgb(r.color)));

  /* ---------- tiny seeded RNG ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- planet sprites (painted once, then scaled) ---------- */
  const SP = 256, SC = SP / 2, SR = 52; // sprite size, centre, planet radius inside the sprite
  function mk(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = SP;
    const x = c.getContext('2d');
    x.translate(SC, SC);
    draw(x);
    return c;
  }
  function halo(c, r0, r1, col) {
    const g = c.createRadialGradient(0, 0, r0, 0, 0, r1);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r1, 0, TAU);
    c.fill();
  }
  function blob(c, x, y, r, rnd, fill, squash) {
    const n = 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, rr = r * (0.6 + rnd() * 0.7);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (squash || 0.8)]);
    }
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) c.moveTo(mx, my);
      const q2 = pts[(i + 2) % n];
      c.quadraticCurveTo(q[0], q[1], (q[0] + q2[0]) / 2, (q[1] + q2[1]) / 2);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
  }
  function sphere(c, rad, light, base, dark, paint, shade) {
    c.save();
    c.beginPath();
    c.arc(0, 0, rad, 0, TAU);
    c.clip();
    const g = c.createRadialGradient(-rad * 0.38, -rad * 0.42, rad * 0.05, 0, 0, rad * 1.08);
    g.addColorStop(0, light);
    g.addColorStop(0.5, base);
    g.addColorStop(1, dark);
    c.fillStyle = g;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    if (paint) paint(c, rad);
    // night side
    const sh = c.createRadialGradient(-rad * 0.5, -rad * 0.55, rad * 0.55, -rad * 0.25, -rad * 0.25, rad * 1.55);
    sh.addColorStop(0, 'rgba(3,5,16,0)');
    sh.addColorStop(0.7, 'rgba(3,5,16,' + (shade || 0.6) + ')');
    sh.addColorStop(1, 'rgba(3,5,16,0.9)');
    c.fillStyle = sh;
    c.fillRect(-rad, -rad, rad * 2, rad * 2);
    // rim light
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, 0, rad - 0.8, Math.PI * 0.95, Math.PI * 1.75);
    c.stroke();
    c.restore();
  }
  function inDisc(rnd, rad) {
    const a = rnd() * TAU, d = Math.sqrt(rnd()) * rad;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  const painters = {
    ferra(c) {
      const rnd = rng(11);
      halo(c, SR * 0.9, SR * 1.45, 'rgba(224,130,80,0.22)');
      sphere(c, SR, '#ffb788', '#b9623c', '#5c2414', (c, r) => {
        for (let i = 0; i < 16; i++) {
          const p = inDisc(rnd, r);
          blob(c, p[0], p[1], 8 + rnd() * 16, rnd, rnd() < 0.5 ? 'rgba(90,36,18,0.28)' : 'rgba(255,190,140,0.14)');
        }
        for (let i = 0; i < 11; i++) {
          const p = inDisc(rnd, r * 0.9), cr = 3 + rnd() * 8;
          c.fillStyle = 'rgba(64,24,12,0.55)';
          c.beginPath(); c.ellipse(p[0], p[1], cr, cr * 0.85, 0, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(255,200,160,0.4)'; c.lineWidth = 1.2;
          c.beginPath(); c.ellipse(p[0], p[1], cr, cr * 0.85, 0, 0.2, 1.9); c.stroke();
        }
      });
    },
    glacia(c) {
      const rnd = rng(23);
      halo(c, SR * 0.9, SR * 1.5, 'rgba(134,220,255,0.26)');
      sphere(c, SR, '#ffffff', '#a9e3ff', '#3e7fb8', (c, r) => {
        for (let i = 0; i < 12; i++) {
          const p = inDisc(rnd, r);
          blob(c, p[0], p[1], 10 + rnd() * 18, rnd, rnd() < 0.6 ? 'rgba(255,255,255,0.35)' : 'rgba(70,150,210,0.22)');
        }
        c.strokeStyle = 'rgba(40,110,175,0.5)'; c.lineWidth = 1.3; c.lineJoin = 'round';
        for (let i = 0; i < 9; i++) {
          let p = inDisc(rnd, r * 0.9), a = rnd() * TAU;
          c.beginPath(); c.moveTo(p[0], p[1]);
          for (let k = 0; k < 5; k++) {
            a += (rnd() - 0.5) * 1.4;
            p = [p[0] + Math.cos(a) * (6 + rnd() * 9), p[1] + Math.sin(a) * (6 + rnd() * 9)];
            c.lineTo(p[0], p[1]);
          }
          c.stroke();
        }
        c.fillStyle = 'rgba(255,255,255,0.75)';
        c.beginPath(); c.ellipse(0, -r * 0.92, r * 0.62, r * 0.2, 0, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(0, r * 0.95, r * 0.5, r * 0.16, 0, 0, TAU); c.fill();
      }, 0.5);
    },
    prisma(c) {
      const rnd = rng(37);
      halo(c, SR * 0.9, SR * 1.5, 'rgba(255,110,215,0.26)');
      sphere(c, SR, '#ffe1f8', '#e553c4', '#541266', (c, r) => {
        for (let i = 0; i < 46; i++) {
          const p = inDisc(rnd, r), s = 8 + rnd() * 16, a = rnd() * TAU;
          c.beginPath();
          c.moveTo(p[0] + Math.cos(a) * s, p[1] + Math.sin(a) * s);
          c.lineTo(p[0] + Math.cos(a + 2.1 + rnd() * 0.6) * s, p[1] + Math.sin(a + 2.1 + rnd() * 0.6) * s);
          c.lineTo(p[0] + Math.cos(a + 4.2 + rnd() * 0.6) * s, p[1] + Math.sin(a + 4.2 + rnd() * 0.6) * s);
          c.closePath();
          const t = rnd();
          c.fillStyle = t < 0.4 ? 'rgba(255,255,255,' + (0.1 + rnd() * 0.22) + ')' : t < 0.75 ? 'rgba(70,10,110,' + (0.12 + rnd() * 0.22) + ')' : 'rgba(120,220,255,' + (0.1 + rnd() * 0.18) + ')';
          c.fill();
        }
        c.fillStyle = 'rgba(255,255,255,0.95)';
        for (let i = 0; i < 7; i++) {
          const p = inDisc(rnd, r * 0.8), s = 2.5 + rnd() * 4;
          c.beginPath();
          c.moveTo(p[0], p[1] - s); c.lineTo(p[0] + s * 0.25, p[1] - s * 0.25); c.lineTo(p[0] + s, p[1]); c.lineTo(p[0] + s * 0.25, p[1] + s * 0.25);
          c.lineTo(p[0], p[1] + s); c.lineTo(p[0] - s * 0.25, p[1] + s * 0.25); c.lineTo(p[0] - s, p[1]); c.lineTo(p[0] - s * 0.25, p[1] - s * 0.25);
          c.closePath(); c.fill();
        }
      }, 0.55);
    },
    nimbus(c) {
      const rnd = rng(41);
      const ring = (a0, a1) => {
        c.save();
        c.rotate(-0.38);
        c.lineCap = 'butt';
        c.strokeStyle = 'rgba(190,255,225,0.34)'; c.lineWidth = 13;
        c.beginPath(); c.ellipse(0, 0, SR * 1.78, SR * 0.46, 0, a0, a1); c.stroke();
        c.strokeStyle = 'rgba(235,255,245,0.6)'; c.lineWidth = 2.5;
        c.beginPath(); c.ellipse(0, 0, SR * 1.98, SR * 0.52, 0, a0, a1); c.stroke();
        c.strokeStyle = 'rgba(20,60,50,0.4)'; c.lineWidth = 2;
        c.beginPath(); c.ellipse(0, 0, SR * 1.63, SR * 0.42, 0, a0, a1); c.stroke();
        c.restore();
      };
      halo(c, SR * 0.9, SR * 1.4, 'rgba(125,240,176,0.2)');
      ring(Math.PI, TAU);
      sphere(c, SR, '#ecfff4', '#5bd8a2', '#0e5646', (c, r) => {
        const cols = ['#9af5c6', '#3ebd8b', '#d6fbe4', '#2a9a77', '#74e6b4', '#f0fff6', '#48c795', '#1f8a6b'];
        c.save();
        c.rotate(-0.38);
        let y = -r;
        while (y < r) {
          const hgt = 5 + rnd() * 11;
          c.fillStyle = cols[Math.floor(rnd() * cols.length)];
          c.globalAlpha = 0.55 + rnd() * 0.35;
          c.fillRect(-r * 1.2, y, r * 2.4, hgt + 1);
          y += hgt;
        }
        c.globalAlpha = 0.8;
        c.fillStyle = '#e9fff3';
        c.beginPath(); c.ellipse(r * 0.28, r * 0.22, r * 0.2, r * 0.1, 0, 0, TAU); c.fill();
        c.fillStyle = '#1f8a6b';
        c.beginPath(); c.ellipse(r * 0.28, r * 0.22, r * 0.1, r * 0.045, 0, 0, TAU); c.fill();
        c.restore();
      });
      ring(0, Math.PI);
    },
    cinder(c) {
      const rnd = rng(53);
      halo(c, SR * 0.85, SR * 1.7, 'rgba(255,96,40,0.34)');
      sphere(c, SR, '#8a3a26', '#3b1510', '#120403', (c, r) => {
        for (let i = 0; i < 10; i++) {
          const p = inDisc(rnd, r);
          blob(c, p[0], p[1], 10 + rnd() * 16, rnd, 'rgba(10,4,4,0.4)');
        }
        c.lineJoin = 'round'; c.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
          const r2 = rng(99);
          c.strokeStyle = pass ? '#ffd27a' : '#ff6a22';
          c.shadowColor = '#ff4a10'; c.shadowBlur = pass ? 0 : 9;
          for (let i = 0; i < 13; i++) {
            let p = inDisc(r2, r * 0.95), a = r2() * TAU;
            c.lineWidth = (pass ? 0.9 : 2.6) * (0.6 + r2() * 0.8);
            c.beginPath(); c.moveTo(p[0], p[1]);
            for (let k = 0; k < 6; k++) {
              a += (r2() - 0.5) * 1.6;
              p = [p[0] + Math.cos(a) * (5 + r2() * 10), p[1] + Math.sin(a) * (5 + r2() * 10)];
              c.lineTo(p[0], p[1]);
            }
            c.stroke();
          }
        }
        c.shadowBlur = 12;
        for (let i = 0; i < 6; i++) {
          const p = inDisc(rnd, r * 0.85);
          blob(c, p[0], p[1], 3 + rnd() * 5, rnd, '#ffb24a');
        }
        c.shadowBlur = 0;
      }, 0.45);
    },
    umbra(c) {
      halo(c, SR * 0.5, SR * 1.9, 'rgba(150,110,255,0.3)');
      const disc = (a0, a1) => {
        c.save();
        c.rotate(0.32);
        const widths = [[1.95, 0.5, 'rgba(120,90,255,0.16)', 16], [1.7, 0.43, 'rgba(170,140,255,0.4)', 11], [1.45, 0.36, 'rgba(225,205,255,0.75)', 6], [1.28, 0.31, 'rgba(255,255,255,0.9)', 2.4]];
        for (const w of widths) {
          c.strokeStyle = w[2]; c.lineWidth = w[3];
          c.beginPath(); c.ellipse(0, 0, SR * w[0], SR * w[1], 0, a0, a1); c.stroke();
        }
        c.restore();
      };
      disc(Math.PI, TAU);
      c.fillStyle = '#04030a';
      c.beginPath(); c.arc(0, 0, SR * 0.86, 0, TAU); c.fill();
      const g = c.createRadialGradient(0, 0, SR * 0.6, 0, 0, SR * 0.9);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(140,110,255,0.55)');
      c.fillStyle = g;
      c.beginPath(); c.arc(0, 0, SR * 0.9, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(235,225,255,0.9)'; c.lineWidth = 1.6;
      c.beginPath(); c.arc(0, 0, SR * 0.88, 0, TAU); c.stroke();
      disc(0, Math.PI);
    },
  };

  function paintHome(c, era, hue) {
    const rnd = rng(7 + hue * 13);
    halo(c, SR * 0.92, SR * 1.5, 'rgba(120,195,255,0.34)');
    sphere(c, SR, '#b9e6ff', '#2f82e2', '#0a2a6a', (c, r) => {
      const land = hue % 3 === 1 ? ['#d9b46a', '#b98a45'] : hue % 3 === 2 ? ['#c9a0e8', '#9a6fc8'] : ['#58c784', '#2f9b5e'];
      for (let i = 0; i < 7; i++) {
        const p = inDisc(rnd, r * 0.85), s = 12 + rnd() * 18;
        blob(c, p[0], p[1], s, rnd, land[0]);
        blob(c, p[0] + 2, p[1] + 2, s * 0.6, rnd, land[1]);
      }
      c.fillStyle = 'rgba(255,255,255,0.85)';
      c.beginPath(); c.ellipse(0, -r * 0.96, r * 0.55, r * 0.16, 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(0, r * 0.97, r * 0.45, r * 0.13, 0, 0, TAU); c.fill();
      for (let i = 0; i < 9; i++) {
        const p = inDisc(rnd, r * 0.9);
        c.save(); c.translate(p[0], p[1]); c.rotate(-0.25 + rnd() * 0.3);
        blob(c, 0, 0, 9 + rnd() * 12, rnd, 'rgba(255,255,255,' + (0.3 + rnd() * 0.3) + ')', 0.3);
        c.restore();
      }
    }, 0.62);
    // city lights on the night side grow with every era
    const n = Math.min(120, era * 16);
    if (n > 0) {
      const r2 = rng(404);
      c.save();
      c.beginPath(); c.arc(0, 0, SR - 2, 0, TAU); c.clip();
      c.shadowColor = '#ffcf70'; c.shadowBlur = 5;
      for (let i = 0; i < n * 3; i++) {
        const p = inDisc(r2, SR * 0.96);
        if (p[0] * 0.75 + p[1] < SR * 0.12) continue;
        c.fillStyle = 'rgba(255,' + (200 + Math.floor(r2() * 40)) + ',' + (110 + Math.floor(r2() * 60)) + ',' + (0.65 + r2() * 0.35) + ')';
        const s = 0.9 + r2() * 1.3;
        c.fillRect(p[0], p[1], s, s);
      }
      c.restore();
    }
  }

  // Unsurveyed worlds are shown as dark silhouettes (no ctx.filter: Safari lacks it)
  const dark = [];
  function darken(src) {
    const c = document.createElement('canvas');
    c.width = c.height = SP;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(9,13,32,0.8)';
    x.fillRect(0, 0, SP, SP);
    return c;
  }
  function buildSprites() {
    PLANETS.forEach((p, i) => {
      sprites[i] = mk(painters[p.id]);
      dark[i] = darken(sprites[i]);
    });
  }
  function homeSprite() {
    const s = G.s, key = s.era + ':' + s.warps;
    if (home.key !== key) {
      home.key = key;
      home.spr = mk((c) => paintHome(c, s.era, s.warps));
    }
    return home.spr;
  }

  // Small portraits for the UI cards
  R.thumb = function (canvas, i, locked) {
    const c = canvas.getContext('2d');
    const w = canvas.width;
    c.clearRect(0, 0, w, w);
    const spr = i < 0 ? homeSprite() : locked ? dark[i] : sprites[i];
    const big = i >= 0 && (PLANETS[i].id === 'nimbus' || PLANETS[i].id === 'umbra');
    const k = (w / SP) * (big ? 1.55 : 2.15);
    c.drawImage(spr, w / 2 - (SP * k) / 2, w / 2 - (SP * k) / 2, SP * k, SP * k);
  };

  /* ---------- background ---------- */
  function buildBg() {
    bg = document.createElement('canvas');
    bg.width = Math.max(1, Math.round(W * DPR));
    bg.height = Math.max(1, Math.round(H * DPR));
    const c = bg.getContext('2d');
    c.scale(DPR, DPR);
    c.fillStyle = '#04060f';
    c.fillRect(0, 0, W, H);
    const hue = G.s ? G.s.warps : 0;
    const palettes = [
      ['62,72,190', '20,130,160', '150,60,150'],
      ['170,90,40', '150,50,90', '50,90,170'],
      ['40,150,110', '60,80,190', '160,130,50'],
      ['150,50,150', '50,110,190', '190,80,70'],
    ];
    const pal = palettes[hue % palettes.length];
    const rnd = rng(1000 + hue * 77);
    const neb = (x, y, r, col, a) => {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    };
    neb(W * 0.5, H * 0.5, Math.max(W, H) * 0.75, '26,38,92', 0.55);
    neb(W * (0.1 + rnd() * 0.2), H * (0.15 + rnd() * 0.2), W * 0.55, pal[0], 0.2);
    neb(W * (0.75 + rnd() * 0.2), H * (0.7 + rnd() * 0.2), W * 0.6, pal[1], 0.16);
    neb(W * (0.8 + rnd() * 0.15), H * (0.1 + rnd() * 0.2), W * 0.4, pal[2], 0.12);
    neb(W * (0.1 + rnd() * 0.2), H * (0.85 + rnd() * 0.1), W * 0.35, pal[2], 0.09);
    const n = Math.round((W * H) / 900);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, s = rnd();
      c.fillStyle = 'rgba(' + (200 + Math.floor(rnd() * 55)) + ',' + (210 + Math.floor(rnd() * 45)) + ',255,' + (0.15 + s * 0.6) + ')';
      const sz = s > 0.93 ? 1.6 : s > 0.6 ? 1.1 : 0.7;
      c.fillRect(x, y, sz, sz);
    }
    // soft vignette
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v;
    c.fillRect(0, 0, W, H);
    twinkles.length = 0;
    for (let i = 0; i < 26; i++) twinkles.push({ x: rnd() * W, y: rnd() * H, p: rnd() * TAU, s: 0.6 + rnd() * 1.1, f: 0.6 + rnd() * 1.8 });
  }

  /* ---------- setup ---------- */
  R.init = function (canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    buildSprites();
    R.resize();
    G.on(onEvent);
  };
  R.resize = function () {
    const r = cv.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    W = r.width;
    H = r.height;
    TILT = clamp((H - 34) / (W - 24), 0.5, 0.8);
    DPR = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    buildBg();
    view.s = 0;
  };
  R.rebuild = function () {
    home.key = '';
    if (W) buildBg();
  };

  /* ---------- effects ---------- */
  function ring(x, y, r0, r1, dur, rgb, lw, a) {
    if (rings.length > 40) rings.shift();
    rings.push({ x, y, r0, r1, t: 0, dur, rgb, lw: lw || 2, a: a || 0.8 });
  }
  function float(x, y, text, color, size, dur) {
    if (floats.length > 28) floats.shift();
    floats.push({ x, y, text, color, size: size || 12, t: 0, dur: dur || 1.1 });
  }
  function burst(x, y, rgb, n, spd, size) {
    for (let i = 0; i < n; i++) {
      if (parts.length > 220) parts.shift();
      const a = Math.random() * TAU, v = (0.35 + Math.random() * 0.65) * (spd || 80);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.8, t: 0, dur: 0.35 + Math.random() * 0.45, rgb, size: (size || 2) * (0.6 + Math.random() * 0.8) });
    }
  }
  function pod(i, rgb) {
    if (pods.length > 40) return;
    pods.push({ i, t: 0, dur: 0.42 + Math.random() * 0.1, rgb, side: Math.random() < 0.5 ? 1 : -1 });
  }

  function onEvent(type, a, b) {
    if (!W) return;
    if (type === 'haul') {
      const p = P[a];
      p.acc += b;
      home.pulse = Math.min(1, home.pulse + 0.35);
      ring(home.x, home.y, home.r * 0.9, home.r * 1.45, 0.45, RMAP[PLANETS[a].res].rgb, 1.5, 0.45);
    } else if (type === 'drone') {
      const p = P[a];
      p.acc += b;
      if (clock - p.lastPod > 0.33) {
        p.lastPod = clock;
        pod(a, RMAP[PLANETS[a].res].rgb);
      }
    } else if (type === 'unlock') {
      const p = P[a], rgb = RMAP[PLANETS[a].res].rgb;
      ring(p.x, p.y, p.r, p.r * 5, 0.9, rgb, 3, 0.9);
      ring(p.x, p.y, p.r, p.r * 3.2, 0.6, '255,255,255', 2, 0.8);
      burst(p.x, p.y, rgb, 26, 140, 2.6);
    } else if (type === 'outpost') {
      const p = P[a], rgb = RMAP[PLANETS[a].res].rgb;
      ring(p.x, p.y, p.r, p.r * (b ? 3.4 : 2.1), b ? 0.7 : 0.4, rgb, b ? 3 : 2, 0.8);
      if (b) burst(p.x, p.y, rgb, 18, 110, 2.4);
      p.bump = 1;
    } else if (type === 'era' || type === 'warp') {
      ring(home.x, home.y, home.r, home.r * 6, 1.2, '255,205,110', 4, 0.9);
      ring(home.x, home.y, home.r, home.r * 3.5, 0.8, '255,255,255', 2, 0.8);
      burst(home.x, home.y, '255,205,110', 36, 170, 2.8);
      if (type === 'warp') {
        floats.length = 0; pods.length = 0;
        for (const q of P) q.acc = 0;
        R.rebuild();
      }
    } else if (type === 'bld') {
      ring(home.x, home.y, home.r, home.r * 1.9, 0.45, '255,205,110', 2, 0.7);
      home.pulse = 1;
    } else if (type === 'ship') {
      ring(home.x, home.y, home.r * 0.8, home.r * 1.6, 0.4, '160,215,255', 2, 0.7);
    }
  }

  // Called by the UI when the player taps a planet
  R.tapFx = function (i, amt) {
    const p = P[i], res = RMAP[PLANETS[i].res];
    p.bump = 1;
    ring(p.x, p.y, p.r * 0.9, p.r * 1.9 + 8, 0.35, res.rgb, 2, 0.9);
    burst(p.x, p.y, res.rgb, 5, 90, 2);
    pod(i, res.rgb);
    float(p.x + (Math.random() - 0.5) * p.r * 1.6, p.y - p.r - 6, '+' + SH.fmt(amt, 1), res.color, 13, 0.9);
  };
  R.cometFx = function () {
    if (!cometXY) return;
    ring(cometXY.x, cometXY.y, 6, 70, 0.7, '255,240,190', 3, 0.9);
    burst(cometXY.x, cometXY.y, '255,236,170', 34, 190, 2.8);
    burst(cometXY.x, cometXY.y, '150,220,255', 16, 120, 2.2);
  };
  R.homePulse = function () {
    home.pulse = 1;
    ring(home.x, home.y, home.r, home.r * 1.8, 0.4, '255,205,110', 2, 0.7);
  };

  /* ---------- picking ---------- */
  R.pick = function (x, y) {
    if (cometXY && Math.hypot(x - cometXY.x, y - cometXY.y) < 40) return { type: 'comet' };
    const s = G.s;
    let best = -1, bd = 1e9;
    const next = G.nextLocked();
    for (let i = 0; i < PLANETS.length; i++) {
      if (!s.planets[i].un && i !== next) continue;
      const p = P[i], d = Math.hypot(x - p.x, y - p.y);
      const lim = Math.max(p.r + 16, 27);
      if (d < lim && d < bd) { bd = d; best = i; }
    }
    const dh = Math.hypot(x - home.x, y - home.y);
    if (dh < home.r + 6 && dh < bd) return { type: 'home' };
    if (best >= 0) return { type: 'planet', i: best };
    return null;
  };
  R.planetPos = (i) => P[i];

  /* ---------- frame ---------- */
  const items = [];
  let nItems = 0;
  function item() {
    return items[nItems++] || (items[nItems - 1] = {});
  }
  const bz = { x: 0, y: 0, dx: 0, dy: 0 };
  function bez(x0, y0, cx, cy, x1, y1, u) {
    const v = 1 - u;
    bz.x = v * v * x0 + 2 * v * u * cx + u * u * x1;
    bz.y = v * v * y0 + 2 * v * u * cy + u * u * y1;
    bz.dx = 2 * v * (cx - x0) + 2 * u * (x1 - cx);
    bz.dy = 2 * v * (cy - y0) + 2 * u * (y1 - cy);
  }
  const ease = (u) => u * 0.45 + 0.55 * u * u * (3 - 2 * u);

  function addShips(i) {
    const st = G.s.planets[i], f = G.rt.fleets[i];
    if (!st.un || !f || !f.length) return;
    const pl = PLANETS[i], p = P[i], res = RMAP[pl.res];
    const tt = pl.dist / G.speed(), tm = G.mineTime(), T = 2 * tt + tm;
    const dx = p.x - home.x, dy = p.y - home.y, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, k = 0.17 * len;
    const mx = (home.x + p.x) / 2, my = (home.y + p.y) / 2;
    const rho = p.r + 5 * shipK + 1;
    const aHome = Math.atan2(-dy, -dx);
    const aIn = aHome + 0.9, sweep = TAU - 1.8;
    const ex = p.x + Math.cos(aIn) * rho, ey = p.y + Math.sin(aIn) * rho * MTILT;
    const ox = p.x + Math.cos(aIn + sweep) * rho, oy = p.y + Math.sin(aIn + sweep) * rho * MTILT;
    for (let n = 0; n < f.length; n++) {
      const e = f[n], tp = e.ph * T, it = item();
      it.kind = 1; it.rgb = res.rgb; it.col = res.color; it.pi = i;
      let near = 1;
      if (tp < tt) {
        const u = ease(tp / tt), u0 = Math.max(0, u - 0.08);
        bez(home.x, home.y, mx - nx * k, my - ny * k, ex, ey, u0);
        it.px = bz.x; it.py = bz.y;
        bez(home.x, home.y, mx - nx * k, my - ny * k, ex, ey, u);
        it.st = 0;
      } else if (tp < tt + tm) {
        const q = (tp - tt) / tm, ang = aIn + q * sweep;
        bz.x = p.x + Math.cos(ang) * rho; bz.y = p.y + Math.sin(ang) * rho * MTILT;
        bz.dx = -Math.sin(ang); bz.dy = Math.cos(ang) * MTILT;
        it.px = bz.x - bz.dx * 4; it.py = bz.y - bz.dy * 4;
        it.st = 1;
        it.front = Math.sin(ang) > -0.15;
      } else {
        const u = ease((tp - tt - tm) / tt), u0 = Math.max(0, u - 0.08);
        bez(ox, oy, mx + nx * k, my + ny * k, home.x, home.y, u0);
        it.px = bz.x; it.py = bz.y;
        bez(ox, oy, mx + nx * k, my + ny * k, home.x, home.y, u);
        it.st = 2;
      }
      const dh = Math.hypot(bz.x - home.x, bz.y - home.y);
      near = clamp((dh - home.r * 0.5) / (home.r * 0.7), 0, 1);
      it.x = bz.x; it.y = bz.y; it.ang = Math.atan2(bz.dy, bz.dx);
      it.a = near * Math.min(1, e.age * 2.5);
      it.sy = it.st === 1 ? (it.front ? p.y + 0.5 : p.y - 0.5) : bz.y;
    }
  }

  function drawShip(it) {
    if (it.a <= 0.01) return;
    const k = shipK;
    ctx.globalAlpha = it.a;
    const loaded = it.st === 2;
    const tg = ctx.createLinearGradient(it.px, it.py, it.x, it.y);
    tg.addColorStop(0, 'rgba(' + (loaded ? it.rgb : '130,205,255') + ',0)');
    tg.addColorStop(1, 'rgba(' + (loaded ? it.rgb : '130,205,255') + ',0.85)');
    ctx.strokeStyle = tg;
    ctx.lineWidth = (loaded ? 2.2 : 1.5) * k;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(it.px, it.py); ctx.lineTo(it.x, it.y); ctx.stroke();
    if (it.st === 1 && it.front) {
      const p = P[it.pi];
      const tx = p.x + (it.x - p.x) * 0.3, ty = p.y + (it.y - p.y) * 0.3;
      ctx.strokeStyle = 'rgba(' + it.rgb + ',' + (0.45 + Math.random() * 0.4) + ')';
      ctx.lineWidth = 1.1 * k;
      ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(tx, ty); ctx.stroke();
      if (Math.random() < 0.12) burst(tx, ty, it.rgb, 1, 26, 1.4);
    }
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.ang);
    ctx.scale(k, k);
    ctx.fillStyle = '#f3f7ff';
    ctx.beginPath(); ctx.moveTo(5.2, 0); ctx.lineTo(-4, -3.3); ctx.lineTo(-2.2, 0); ctx.lineTo(-4, 3.3); ctx.closePath(); ctx.fill();
    if (loaded) {
      ctx.fillStyle = it.col;
      ctx.beginPath(); ctx.arc(-0.3, 0, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPlanet(i, locked, canBuy) {
    const p = P[i], pl = PLANETS[i];
    const r = p.r * (1 - 0.1 * Math.sin(p.bump * Math.PI) * p.bump);
    const d = (SP / SR) * r;
    if (locked) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(dark[i], p.x - d / 2, p.y - d / 2, d, d);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = canBuy ? 'rgba(255,205,110,' + (0.55 + 0.4 * Math.sin(clock * 5)) + ')' : 'rgba(170,190,255,0.35)';
      ctx.lineWidth = canBuy ? 2 : 1.2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5 + (canBuy ? Math.sin(clock * 5) * 1.5 : 0), 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = canBuy ? '#ffd27a' : 'rgba(200,215,255,0.8)';
      ctx.font = '700 ' + Math.round(clamp(p.r * 1.1, 9, 15)) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', p.x, p.y + 0.5);
    } else {
      ctx.drawImage(sprites[i], p.x - d / 2, p.y - d / 2, d, d);
      if (pl.id === 'prisma') {
        const a = 0.5 + 0.5 * Math.sin(clock * 3.1);
        ctx.fillStyle = 'rgba(255,255,255,' + a * 0.9 + ')';
        const sx = p.x - r * 0.3, sy = p.y - r * 0.25, s = r * 0.32 * a;
        ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s * 0.22, sy - s * 0.22); ctx.lineTo(sx + s, sy); ctx.lineTo(sx + s * 0.22, sy + s * 0.22);
        ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s * 0.22, sy + s * 0.22); ctx.lineTo(sx - s, sy); ctx.lineTo(sx - s * 0.22, sy - s * 0.22); ctx.closePath(); ctx.fill();
      } else if (pl.id === 'cinder') {
        ctx.fillStyle = 'rgba(255,110,40,' + (0.06 + 0.05 * Math.sin(clock * 2.3)) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.5, 0, TAU); ctx.fill();
      }
    }
  }

  function drawLabel(i, locked) {
    const p = P[i], pl = PLANETS[i];
    const fs = clamp(Math.round(view.s / 7.5), 8, 11);
    ctx.font = '600 ' + fs + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const y = p.y + p.r * (pl.id === 'nimbus' ? 1.25 : 1.15) + 4;
    const txt = pl.name.toUpperCase();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(4,6,15,0.75)';
    ctx.strokeText(txt, p.x, y);
    ctx.fillStyle = locked ? 'rgba(170,185,225,0.6)' : 'rgba(228,236,255,0.92)';
    ctx.fillText(txt, p.x, y);
  }

  function drawHome(era) {
    const r = home.r * (1 + 0.05 * home.pulse);
    const d = (SP / SR) * r;
    const rings2 = era >= 2 ? (era >= 4 ? 2 : 1) : 0;
    const half = (a0, a1) => {
      for (let k = 0; k < rings2; k++) {
        ctx.save();
        ctx.translate(home.x, home.y);
        ctx.rotate(k ? 0.5 : -0.28);
        ctx.strokeStyle = k ? 'rgba(150,215,255,0.55)' : 'rgba(255,208,120,0.65)';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.beginPath(); ctx.ellipse(0, 0, r * (1.55 + k * 0.28), r * (0.36 + k * 0.1), 0, a0, a1); ctx.stroke();
        ctx.restore();
      }
    };
    if (era >= 5) {
      const g = ctx.createRadialGradient(home.x, home.y, r, home.x, home.y, r * 2.6);
      g.addColorStop(0, 'rgba(255,214,130,0.22)');
      g.addColorStop(1, 'rgba(255,214,130,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(home.x, home.y, r * 2.6, 0, TAU); ctx.fill();
    }
    half(Math.PI, TAU);
    const st = [];
    if (era >= 1) {
      // orbital stations
      const n = Math.min(6, era >= 3 ? era : 1);
      for (let k = 0; k < n; k++) {
        const a = clock * (0.5 + k * 0.07) + (k * TAU) / n;
        const x = home.x + Math.cos(a) * r * 1.42, y = home.y + Math.sin(a) * r * 1.42 * 0.42;
        st.push([x, y, Math.sin(a) >= 0]);
      }
      ctx.fillStyle = '#ffe2a8';
      for (const s of st) if (!s[2]) ctx.fillRect(s[0] - 1.2, s[1] - 1.2, 2.4, 2.4);
    }
    ctx.drawImage(homeSprite(), home.x - d / 2, home.y - d / 2, d, d);
    half(0, Math.PI);
    ctx.fillStyle = '#fff1cf';
    for (const s of st) if (s[2]) ctx.fillRect(s[0] - 1.3, s[1] - 1.3, 2.6, 2.6);
  }

  function drawComet(dt) {
    const c = G.rt.comet;
    if (!c) { cometXY = null; return; }
    const u = c.t / c.dur;
    const x0 = c.dir > 0 ? -30 : W + 30, x1 = c.dir > 0 ? W + 30 : -30;
    const y0 = H * (0.14 + c.seed * 0.3), y1 = H * (0.3 + (1 - c.seed) * 0.5);
    const x = x0 + (x1 - x0) * u;
    const y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * H * 0.12;
    const vx = (x1 - x0), vy = (y1 - y0) - Math.cos(u * Math.PI) * Math.PI * H * 0.12;
    const vl = Math.hypot(vx, vy) || 1;
    const tx = -vx / vl, ty = -vy / vl;
    cometXY = { x, y };
    const tail = 58;
    const g = ctx.createLinearGradient(x, y, x + tx * tail, y + ty * tail);
    g.addColorStop(0, 'rgba(255,244,200,0.95)');
    g.addColorStop(0.3, 'rgba(160,220,255,0.5)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - ty * 5, y + tx * 5);
    ctx.lineTo(x + tx * tail, y + ty * tail);
    ctx.lineTo(x + ty * 5, y - tx * 5);
    ctx.closePath(); ctx.fill();
    const hg = ctx.createRadialGradient(x, y, 0, x, y, 16);
    hg.addColorStop(0, 'rgba(255,255,255,1)');
    hg.addColorStop(0.25, 'rgba(255,236,170,0.9)');
    hg.addColorStop(1, 'rgba(255,220,130,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,160,' + (0.35 + 0.3 * Math.sin(clock * 8)) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 21 + Math.sin(clock * 8) * 2.5, 0, TAU); ctx.stroke();
    if (Math.random() < dt * 40) {
      parts.push({ x: x + tx * 8, y: y + ty * 8, vx: tx * 40 + (Math.random() - 0.5) * 40, vy: ty * 40 + (Math.random() - 0.5) * 40, t: 0, dur: 0.5, rgb: '255,236,170', size: 1.6 });
    }
    if (G.s.stats.comets < 2) {
      ctx.font = '700 10px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(255,236,170,0.95)';
      ctx.fillText('TAP!', x, y - 26);
    }
  }

  R.frame = function (dt) {
    if (!W) return;
    const s = G.s;
    clock += dt;
    const now = Date.now() / 1000;

    // camera: zoom out as the empire reaches further worlds
    const next = G.nextLocked();
    const far = next >= 0 ? next : PLANETS.length - 1;
    const Rmax = PLANETS[far].orbit + 0.45;
    const ts = Math.min((W / 2 - 12) / Rmax, (H / 2 - 16) / (Rmax * TILT));
    if (!view.s) view.s = ts;
    view.s += (ts - view.s) * (1 - Math.exp(-dt * 2.2));
    view.cx = W / 2;
    view.cy = H / 2 + 2;
    const zs = view.s;
    shipK = clamp(zs / 72, 0.62, 1.2);
    home.x = view.cx; home.y = view.cy;
    home.r = clamp(zs * 0.4, 15, 34);
    home.pulse = Math.max(0, home.pulse - dt * 3);
    const pk = clamp(zs / 62, 0.62, 1.45);
    for (let i = 0; i < PLANETS.length; i++) {
      const pl = PLANETS[i], p = P[i];
      const a = pl.a0 + (now * TAU) / pl.period;
      p.x = view.cx + Math.cos(a) * pl.orbit * zs;
      p.y = view.cy + Math.sin(a) * pl.orbit * zs * TILT;
      p.r = pl.size * pk;
      p.bump = Math.max(0, p.bump - dt * 5);
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.drawImage(bg, 0, 0, W, H);
    for (const t of twinkles) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(clock * t.f + t.p));
      ctx.fillStyle = 'rgba(235,242,255,' + a * 0.9 + ')';
      ctx.fillRect(t.x, t.y, t.s, t.s);
    }

    // orbits
    for (let i = 0; i <= far; i++) {
      const un = s.planets[i].un, pl = PLANETS[i];
      ctx.strokeStyle = un ? (i === s.sel ? 'rgba(' + RMAP[pl.res].rgb + ',0.38)' : 'rgba(150,175,255,0.17)') : 'rgba(150,175,255,0.1)';
      ctx.lineWidth = 1;
      if (!un) ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.ellipse(view.cx, view.cy, pl.orbit * zs, pl.orbit * zs * TILT, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }

    // depth-sorted scene
    nItems = 0;
    for (let i = 0; i <= far; i++) {
      const it = item();
      it.kind = 0; it.pi = i; it.sy = P[i].y;
      if (s.planets[i].un) addShips(i);
    }
    const hi = item();
    hi.kind = 2; hi.sy = home.y;
    const order = items.slice(0, nItems).sort((a, b) => a.sy - b.sy);
    const canNext = next >= 0 && G.can(PLANETS[next].unlock);
    for (const it of order) {
      if (it.kind === 1) drawShip(it);
      else if (it.kind === 2) drawHome(s.era);
      else drawPlanet(it.pi, !s.planets[it.pi].un, canNext);
    }

    // selection + labels
    if (s.planets[s.sel] && s.planets[s.sel].un) {
      const p = P[s.sel];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(clock * 0.6);
      ctx.strokeStyle = 'rgba(' + RMAP[PLANETS[s.sel].res].rgb + ',0.75)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.arc(0, 0, p.r + 6 + shipK * 5, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.setLineDash([]);
    }
    for (let i = 0; i <= far; i++) drawLabel(i, !s.planets[i].un);

    // first-run hint: tap the planet
    if (s.mission === 0 && s.stats.taps < 10) {
      const p = P[0], k = (clock * 1.3) % 1;
      ctx.strokeStyle = 'rgba(255,214,130,' + (1 - k) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6 + k * 18, 0, TAU); ctx.stroke();
      ctx.font = '700 12px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,6,15,0.8)';
      ctx.strokeText('TAP', p.x, p.y - p.r - 9 - Math.sin(clock * 5) * 2);
      ctx.fillStyle = '#ffd27a';
      ctx.fillText('TAP', p.x, p.y - p.r - 9 - Math.sin(clock * 5) * 2);
    }

    // haul numbers at home: one world at a time, so they never pile up
    if (clock - lastHaulF > 0.6) {
      for (let k = 1; k <= PLANETS.length; k++) {
        const i = (haulIdx + k) % PLANETS.length, p = P[i];
        if (p.acc <= 0) continue;
        const a = Math.atan2(p.y - home.y, p.x - home.x);
        float(home.x + Math.cos(a) * (home.r + 26), home.y + Math.sin(a) * (home.r + 14), '+' + SH.fmt(p.acc, 1), RMAP[PLANETS[i].res].color, 11, 1);
        p.acc = 0;
        haulIdx = i;
        lastHaulF = clock;
        break;
      }
    }

    drawComet(dt);

    // pods (tap / drone deliveries)
    ctx.globalCompositeOperation = 'lighter';
    for (let n = pods.length - 1; n >= 0; n--) {
      const o = pods[n];
      o.t += dt;
      const u = o.t / o.dur;
      if (u >= 1) {
        pods.splice(n, 1);
        home.pulse = Math.min(1, home.pulse + 0.25);
        continue;
      }
      const p = P[o.i];
      const dx = home.x - p.x, dy = home.y - p.y, len = Math.hypot(dx, dy) || 1;
      const cxx = (p.x + home.x) / 2 - (dy / len) * len * 0.22 * o.side, cyy = (p.y + home.y) / 2 + (dx / len) * len * 0.22 * o.side;
      const e = u * u * (3 - 2 * u);
      bez(p.x, p.y, cxx, cyy, home.x, home.y, Math.max(0, e - 0.12));
      const bx = bz.x, by = bz.y;
      bez(p.x, p.y, cxx, cyy, home.x, home.y, e);
      const g = ctx.createLinearGradient(bx, by, bz.x, bz.y);
      g.addColorStop(0, 'rgba(' + o.rgb + ',0)');
      g.addColorStop(1, 'rgba(' + o.rgb + ',0.95)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.4 * shipK; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bz.x, bz.y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(bz.x, bz.y, 1.6 * shipK, 0, TAU); ctx.fill();
    }
    // rings
    for (let n = rings.length - 1; n >= 0; n--) {
      const o = rings[n];
      o.t += dt;
      const u = o.t / o.dur;
      if (u >= 1) { rings.splice(n, 1); continue; }
      const e = 1 - (1 - u) * (1 - u);
      ctx.strokeStyle = 'rgba(' + o.rgb + ',' + o.a * (1 - u) + ')';
      ctx.lineWidth = o.lw * (1 - u * 0.6);
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r0 + (o.r1 - o.r0) * e, 0, TAU); ctx.stroke();
    }
    // particles
    for (let n = parts.length - 1; n >= 0; n--) {
      const o = parts[n];
      o.t += dt;
      const u = o.t / o.dur;
      if (u >= 1) { parts.splice(n, 1); continue; }
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.vx *= 1 - dt * 2.5; o.vy *= 1 - dt * 2.5;
      ctx.fillStyle = 'rgba(' + o.rgb + ',' + (1 - u) + ')';
      const sz = o.size * (1 - u * 0.5);
      ctx.fillRect(o.x - sz / 2, o.y - sz / 2, sz, sz);
    }
    ctx.globalCompositeOperation = 'source-over';
    // floating numbers
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let n = floats.length - 1; n >= 0; n--) {
      const o = floats[n];
      o.t += dt;
      const u = o.t / o.dur;
      if (u >= 1) { floats.splice(n, 1); continue; }
      const y = o.y - 22 * (1 - (1 - u) * (1 - u));
      ctx.globalAlpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      ctx.font = '700 ' + o.size + 'px ' + FONT;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(4,6,15,0.8)';
      ctx.strokeText(o.text, o.x, y);
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, o.x, y);
    }
    ctx.globalAlpha = 1;
  };
})();
