/* Starhaul — DOM interface: resource bar, tabs, modals, toasts */
(function () {
  'use strict';
  const SH = window.SH;
  const G = SH.G, R = SH.R, A = SH.A;
  const { PLANETS, RES, RID, RMAP, UPG, UPG_ORDER, BLD, BLD_ORDER, TECHS, PERKS, ACHS } = SH;
  const fmt = SH.fmt;
  const UI = (SH.UI = {});
  const $ = (q, r) => (r || document).querySelector(q);
  const $$ = (q, r) => Array.from((r || document).querySelectorAll(q));

  let tab = 'planets';
  let dyn = []; // per-tab updaters, run a few times a second
  let dirty = true;
  let resKey = '';
  let acc = 0;
  let el = {};
  let flash = null;

  /* ---------- icons ---------- */
  const IC = {
    planets: '<circle cx="12" cy="12" r="5"/><path d="M3.2 15.200c-1.300-1.600 2.200-4.500 7.300-6.300s9.200-1.900 10.300-.1"/><path d="M20.800 8.800c1.300 1.600-2.200 4.500-7.300 6.300s-9.200 1.900-10.300.1" opacity=".55"/>',
    ships: '<path d="M12 2.500c2.800 2.600 4.200 5.900 4.200 9.600l2.600 3v3.400l-4-1.500H9.200l-4 1.500v-3.400l2.600-3c0-3.700 1.400-7 4.200-9.600z"/><circle cx="12" cy="9.800" r="1.700"/><path d="M10.500 20.500h3"/>',
    empire: '<path d="M3 21h18"/><path d="M5 21v-9l4-2v11"/><path d="M9 21V5.500L15 3v18"/><path d="M15 21V9l4 2v10"/><path d="M11.500 8v.01M11.500 12v.01M11.500 16v.01"/>',
    research: '<path d="M9 3h6"/><path d="M10 3v6.200L4.900 18a2 2 0 0 0 1.700 3h10.800a2 2 0 0 0 1.700-3L14 9.200V3"/><path d="M7.600 14.500h8.800"/>',
    legacy: '<path d="M12 2.500l2.400 6.100 6.600.5-5 4.300 1.600 6.400-5.600-3.500-5.600 3.500L8 13.400 3 9.100l6.600-.5z"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.500H4.200c0 3 1.300 4.700 3.300 5M17 5.500h2.800c0 3-1.300 4.700-3.300 5"/><path d="M12 14v3.500M8.500 20.500h7M9.500 17.500h5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.800v2.400M12 18.800v2.400M2.800 12h2.400M18.800 12h2.400M5.500 5.500l1.700 1.700M16.800 16.800l1.700 1.700M5.500 18.500l1.700-1.700M16.800 7.200l1.700-1.700"/>',
    target: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4.500"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    lock: '<rect x="5.500" y="10.500" width="13" height="9.500" rx="2"/><path d="M8.500 10.500V7.800a3.500 3.500 0 0 1 7 0v2.700"/>',
    check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
    bolt: '<path d="M13 2.500L5 13.500h5.500L9.500 21.500 18 10.500h-5.500z"/>',
    pop: '<circle cx="9" cy="8" r="3.200"/><path d="M3 20c0-3.500 2.700-6 6-6s6 2.500 6 6"/><circle cx="17" cy="9" r="2.400"/><path d="M16.500 14c2.700.2 4.500 2.300 4.500 5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    cargo: '<path d="M3.500 8L12 3.500 20.500 8v8L12 20.500 3.500 16z"/><path d="M3.500 8L12 12.500 20.500 8M12 12.500v8"/>',
    thruster: '<path d="M4 12h9"/><path d="M13 7l6 5-6 5z"/><path d="M4 7.500h4M4 16.500h4"/>',
    laser: '<path d="M4 20l9-9"/><path d="M13 11l2.500-2.500"/><path d="M17 3v3M21 7h-3M19.800 4.200l-2 2"/><circle cx="16" cy="8" r="1.500"/>',
    tap: '<path d="M9 11V5.500a1.500 1.500 0 0 1 3 0V10"/><path d="M12 10V8.500a1.500 1.500 0 0 1 3 0V11"/><path d="M15 11v-.5a1.500 1.500 0 0 1 3 0V15c0 3.300-2.200 5.500-5.500 5.500-2.500 0-3.800-1-5-3L5.300 14a1.400 1.400 0 0 1 2.300-1.600L9 14"/>',
    hab: '<path d="M3 19.500a9 9 0 0 1 18 0z"/><path d="M12 10.500v9M7.500 12.500l-2 7M16.500 12.500l2 7"/>',
    lab: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9.500" ry="3.800"/><ellipse cx="12" cy="12" rx="9.500" ry="3.800" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.500" ry="3.800" transform="rotate(120 12 12)"/>',
    ref: '<path d="M4 20.500V11l5 3V11l5 3V4.500h4v16z"/><path d="M3 20.500h18"/>',
    acad: '<path d="M2.500 9L12 4.500 21.500 9 12 13.500z"/><path d="M6.500 11.200V16c1.500 1.500 3.300 2.200 5.500 2.200s4-.7 5.500-2.200v-4.800"/><path d="M21.500 9v5"/>',
    core: '<circle cx="12" cy="12" r="3.500"/><path d="M12 2.500v3M12 18.500v3M2.500 12h3M18.500 12h3M5.300 5.300l2.100 2.100M16.600 16.600l2.100 2.100M5.300 18.700l2.100-2.100M16.600 7.400l2.100-2.100"/>',
    forge: '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="3.500" transform="rotate(-25 12 12)"/>',
    star: '<path d="M12 3l1.900 5.600L19.500 10l-5.600 1.900L12 17.500l-1.900-5.600L4.500 10l5.600-1.400z"/>',
  };
  const svg = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>';
  const RI = {
    ore: '<path d="M2.500 10.500L5 4l4.800-2 4 3.600-1.100 6.400-5.200 2z"/><path d="M5 4l3.200 4 5.600-2.400M8.200 8l-.7 6" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>',
    ice: '<path d="M8 1.200l5.900 3.400v6.800L8 14.800l-5.900-3.400V4.600z"/><path d="M8 1.200v13.600M2.100 4.600l11.800 6.800M13.900 4.600L2.100 11.400" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1"/>',
    cry: '<path d="M4.500 2h7L15 6l-7 8.500L1 6z"/><path d="M1 6h14M4.500 2L6 6l2 8.500L10 6l1.500-4" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1"/>',
    gas: '<circle cx="8" cy="8" r="6.500"/><path d="M2 6.500c3 1.200 9 1.200 12 0M2.200 10c3.500-1.300 8.500-1.300 11.600 0" fill="none" stroke="rgba(0,0,0,.32)" stroke-width="1.200"/>',
    pla: '<path d="M9.500 1L3 9.200h3.800L5.800 15 13 6.600H9z"/>',
    dm: '<circle cx="8" cy="8" r="3.400"/><ellipse cx="8" cy="8" rx="7.300" ry="2.600" fill="none" stroke="currentColor" stroke-width="1.300" transform="rotate(-22 8 8)"/>',
    rp: '<path d="M6 1.500h4M6.500 1.500v4.200L2.600 12.500A1.500 1.500 0 0 0 3.900 14.800h8.200a1.500 1.500 0 0 0 1.300-2.300L9.500 5.700V1.500" fill="none" stroke="currentColor" stroke-width="1.500" stroke-linejoin="round"/><path d="M4.600 10.500h6.800l1 2.600H3.600z"/>',
    sd: '<path d="M8 .8l1.700 5.500L15.200 8l-5.500 1.700L8 15.200 6.300 9.700.8 8l5.500-1.700z"/>',
  };
  const ri = (r) => '<svg class="ri ' + r + '" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' + RI[r] + '</svg>';
  UI.svg = svg;

  /* ---------- small DOM helpers (only touch the DOM when something changed) ---------- */
  function setHTML(n, h) { if (n && n._h !== h) { n._h = h; n.innerHTML = h; } }
  function setText(n, t) { if (n && n._t !== t) { n._t = t; n.textContent = t; } }
  function setCls(n, c, on) { on = !!on; if (n && n['_c' + c] !== on) { n['_c' + c] = on; n.classList.toggle(c, on); } }
  function setW(n, pct) { const v = Math.round(pct * 10) / 10 + '%'; if (n && n._w !== v) { n._w = v; n.style.width = v; } }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const want = () => (G.s.opts.buy === 0 ? 1e9 : G.s.opts.buy || 1);

  function costHTML(cost, plain) {
    if (!cost) return '';
    let h = '';
    for (const r of RID) {
      if (!cost[r]) continue;
      h += '<span class="c ' + r + (!plain && G.s.res[r] < cost[r] ? ' lack' : '') + '">' + ri(r) + fmt(cost[r]) + '</span>';
    }
    return h;
  }
  function gainsHTML(g) {
    let h = '';
    for (const r of RID) if (g[r]) h += '<span class="c ' + r + '">' + ri(r) + '+' + fmt(g[r], 1) + '</span>';
    if (g.rp) h += '<span class="c rp">' + ri('rp') + '+' + fmt(g.rp, 1) + '</span>';
    if (g.sd) h += '<span class="c sd">' + ri('sd') + '+' + fmt(g.sd) + '</span>';
    return h;
  }
  function buyBtn(btn, q, label) {
    const maxed = !q.cost;
    setCls(btn, 'go', q.n > 0);
    setCls(btn, 'maxed', maxed);
    setHTML(btn, maxed ? '<span class="lbl">MAX</span>' : '<span class="lbl">' + label + (q.n > 1 ? ' <em>×' + q.n + '</em>' : '') + '</span><span class="cost">' + costHTML(q.cost) + '</span>');
  }
  const segHTML = () => '<div class="seg" role="group" aria-label="Buy amount">' + [[1, '×1'], [10, '×10'], [0, 'MAX']].map((o) => '<button data-act="buymode" data-n="' + o[0] + '" class="' + (G.s.opts.buy === o[0] ? 'on' : '') + '">' + o[1] + '</button>').join('') + '</div>';
  const homeName = () => (G.s.warps ? 'Haven ' + SH.roman(G.s.warps + 1) : 'Haven');
  const seen = (r) => G.s.planets[PLANETS.findIndex((p) => p.res === r)].un;

  /* ---------- toasts ---------- */
  // At most two toasts on screen; the rest wait their turn so the map stays visible.
  const toastQ = [];
  let toastN = 0;
  function toast(html, cls, ms) {
    toastQ.push({ html, cls: cls || '', ms: ms || 2400 });
    if (toastQ.length > 5) toastQ.shift();
    pumpToasts();
  }
  function pumpToasts() {
    while (toastN < 2 && toastQ.length) {
      const o = toastQ.shift();
      const t = document.createElement('div');
      t.className = 'toast ' + o.cls;
      t.innerHTML = o.html;
      el.toasts.appendChild(t);
      toastN++;
      const ms = toastQ.length ? Math.min(o.ms, 1500) : o.ms;
      setTimeout(() => t.classList.add('out'), ms);
      setTimeout(() => { t.remove(); toastN--; pumpToasts(); }, ms + 320);
    }
  }
  UI.toast = toast;

  /* ---------- modal ---------- */
  let modalOpts = null;
  function modal(html, opts) {
    modalOpts = opts || {};
    el.modal.innerHTML = '<div class="mback"><div class="mbox ' + (modalOpts.cls || '') + '" role="dialog" aria-modal="true">' + (modalOpts.sticky ? '' : '<button class="mx" data-m="close" aria-label="Close">' + svg('x') + '</button>') + html + '</div></div>';
    el.modal.classList.add('on');
  }
  function closeModal() {
    el.modal.classList.remove('on');
    el.modal.innerHTML = '';
    const o = modalOpts;
    modalOpts = null;
    if (o && o.onClose) o.onClose();
  }
  UI.modal = modal;
  UI.closeModal = closeModal;

  /* ---------- top bar + HUD ---------- */
  function updateTop() {
    const s = G.s;
    const list = RID.filter(seen);
    const key = list.join(',');
    if (key !== resKey) {
      resKey = key;
      el.resbar.innerHTML = list.map((r) => '<button class="chip ' + r + '" data-r="' + r + '">' + ri(r) + '<span class="cv"><b></b><i></i></span></button>').join('');
      el.resbar.dataset.n = list.length;
      el.chips = {};
      $$('.chip', el.resbar).forEach((c) => (el.chips[c.dataset.r] = { b: $('b', c), i: $('i', c) }));
    }
    for (const r of list) {
      setText(el.chips[r].b, fmt(s.res[r]));
      setText(el.chips[r].i, '+' + fmt(G.resRate(r), 1) + '/s');
    }
    setText(el.eraName, SH.eraDef(s.era).name);
    setText(el.homeName, homeName());
    setText(el.popN, fmt(s.pop));
    const boosting = s.boostT > 0;
    setCls(el.boost, 'on', boosting);
    if (boosting) setText(el.boostT, '×' + s.boostMult + ' production · ' + Math.ceil(s.boostT) + 's');

    // mission bar
    const m = G.mission();
    if (!m) {
      setCls(el.mission, 'done', false);
      setCls(el.mission, 'fin', true);
      setHTML(el.mission, '<span class="m-ic">' + svg('star') + '</span><span class="m-tx"><b>All missions complete</b><i>The galaxy is yours, Commander.</i></span>');
    } else {
      const p = G.missionProg();
      setCls(el.mission, 'done', p.done);
      const rw = gainsHTML(G.missionReward(m));
      setHTML(el.mission, '<span class="m-fill" style="width:' + Math.round((p.cur / p.goal) * 100) + '%"></span><span class="m-ic">' + svg(p.done ? 'check' : 'target') + '</span><span class="m-tx"><b>' + esc(m.text) + '</b><i>Reward ' + rw + '</i></span><span class="m-pr">' + (p.done ? 'CLAIM' : fmt(p.cur) + '/' + fmt(p.goal)) + '</span>');
    }

    // nav badges
    const next = G.nextLocked();
    const b = {
      planets: G.idle() > 0 || (next >= 0 && G.can(PLANETS[next].unlock)),
      empire: G.eraReady(),
      research: s.era >= 1 && s.bld.lab > 0 && TECHS.some((t) => G.techAvail(t) && s.rp >= t.cost),
      legacy: G.stardustGain() > 0 || PERKS.some((p) => (s.perks[p.id] || 0) < p.max && s.stardust >= SH.perkCost(p, s.perks[p.id] || 0)),
    };
    for (const k in el.nav) {
      setCls(el.nav[k], 'badge', !!b[k] && k !== tab);
      setCls(el.nav[k], 'on', k === tab);
    }
    setCls(el.nav.research, 'locked', s.era < 1);
    setCls(el.nav.legacy, 'locked', s.era < 5 && !s.warps);
  }

  /* ---------- tab: planets ---------- */
  function buildPlanets() {
    const s = G.s, next = G.nextLocked();
    let h = '<div class="bar"><div class="fleet">' + svg('ships') + '<b data-k="fl"></b><span data-k="idle"></span></div>' + segHTML() + '</div>';
    h += '<button class="btn big" data-act="ship"></button>';
    h += '<button class="btn big ghost" data-act="spread" hidden>Send idle ships to work</button>';
    for (let i = 0; i < PLANETS.length; i++) {
      if (!s.planets[i].un) continue;
      const pl = PLANETS[i];
      h += '<div class="pcard" data-act="sel" data-i="' + i + '" style="--rc:var(--' + pl.res + ')">' +
        '<canvas class="pimg" width="112" height="112" data-i="' + i + '"></canvas>' +
        '<div class="pinfo"><div class="pname">' + pl.name + ' <span class="tag ' + pl.res + '">' + ri(pl.res) + RMAP[pl.res].name + '</span></div><div class="psub" data-k="sub"></div></div>' +
        '<div class="prate" data-k="rate"></div>' +
        '<div class="pctl"><div class="step"><button data-act="assign" data-i="' + i + '" data-d="-1" aria-label="Recall ship">−</button><span class="n">' + svg('ships') + '<b data-k="n"></b></span><button data-act="assign" data-i="' + i + '" data-d="1" aria-label="Send ship">+</button></div>' +
        '<button class="btn" data-act="post" data-i="' + i + '"></button></div></div>';
    }
    if (next >= 0) {
      const pl = PLANETS[next];
      h += '<div class="pcard locked" data-lock="' + next + '" style="--rc:var(--' + pl.res + ')"><canvas class="pimg" width="112" height="112" data-i="' + next + '" data-l="1"></canvas>' +
        '<div class="pinfo"><div class="pname">' + pl.name + ' <span class="tag ' + pl.res + '">' + ri(pl.res) + RMAP[pl.res].name + '</span></div><div class="psub">' + pl.blurb + '</div></div>' +
        '<button class="btn wide" data-act="unlock" data-i="' + next + '"></button></div>';
      const more = PLANETS.length - 1 - next;
      if (more > 0) h += '<div class="more">' + svg('lock') + more + ' more world' + (more > 1 ? 's lie' : ' lies') + ' beyond…</div>';
    }
    el.panel.innerHTML = h;
    $$('canvas.pimg', el.panel).forEach((c) => R.thumb(c, +c.dataset.i, c.dataset.l === '1'));
    const fl = $('[data-k=fl]', el.panel), idleEl = $('[data-k=idle]', el.panel), shipBtn = $('[data-act=ship]', el.panel), spread = $('[data-act=spread]', el.panel);
    const cards = $$('.pcard[data-act=sel]', el.panel).map((c) => ({
      c, i: +c.dataset.i, sub: $('[data-k=sub]', c), rate: $('[data-k=rate]', c), n: $('[data-k=n]', c),
      minus: $('[data-d="-1"]', c), plus: $('[data-d="1"]', c), post: $('[data-act=post]', c),
    }));
    const unl = $('[data-act=unlock]', el.panel);
    dyn.push(() => {
      const idle = G.idle();
      setText(fl, s.ships + (s.ships === 1 ? ' ship' : ' ships'));
      setText(idleEl, idle ? idle + ' idle' : '');
      if (spread.hidden !== !idle) spread.hidden = !idle;
      buyBtn(shipBtn, G.quote(G.item.ship(), want()), 'Build ship ' + svg('arrow', 'sm') + ' ' + PLANETS[s.sel].name);
      for (const k of cards) {
        const st = s.planets[k.i];
        setCls(k.c, 'sel', s.sel === k.i);
        setText(k.rate, '+' + fmt(G.rate(k.i), 1) + '/s');
        const nm = G.nextMilestone(st.post);
        setText(k.sub, 'Trip ' + G.cycle(k.i).toFixed(1) + 's · yield ×' + fmt(G.yieldMult(k.i), 1) + (nm ? ' · ×2 at Lv ' + nm : ''));
        setText(k.n, String(st.ships));
        setCls(k.minus, 'off', st.ships <= 0);
        setCls(k.plus, 'off', idle <= 0);
        setCls(k.plus, 'hot', idle > 0);
        buyBtn(k.post, G.quote(G.item.post(k.i), want()), 'Outpost <u>Lv ' + st.post + '</u>');
      }
      if (unl) {
        const c = PLANETS[next].unlock, ok = G.can(c);
        setCls(unl, 'go', ok);
        setHTML(unl, '<span class="lbl">Survey ' + PLANETS[next].name + '</span><span class="cost">' + costHTML(c) + '</span>');
      }
    });
  }

  /* ---------- tab: ships ---------- */
  function upgStat(id, L) {
    const next = L + 1;
    if (id === 'cargo') return 'Hold ' + fmt(G.cargoAt(L), 1) + ' → <b>' + fmt(G.cargoAt(next), 1) + '</b>';
    if (id === 'thr') return 'Speed ' + Math.round((G.speedAt(L) / SH.SHIP.speed) * 100) + '% → <b>' + Math.round((G.speedAt(next) / SH.SHIP.speed) * 100) + '%</b>';
    if (id === 'laser') return 'Mining ' + G.mineTimeAt(L).toFixed(2) + 's → <b>' + G.mineTimeAt(next).toFixed(2) + 's</b>';
    return 'Each tap pulls ' + Math.round(G.tapFracAt(L) * 100) + '% → <b>' + Math.round(G.tapFracAt(next) * 100) + '%</b> of a haul';
  }
  function upgStatMax(id, L) {
    if (id === 'thr') return 'Speed ' + Math.round((G.speedAt(L) / SH.SHIP.speed) * 100) + '% — top speed reached';
    if (id === 'laser') return 'Mining ' + G.mineTimeAt(L).toFixed(2) + 's — fully tuned';
    if (id === 'tap') return 'Each tap pulls ' + Math.round(G.tapFracAt(L) * 100) + '% of a haul';
    return 'Hold ' + fmt(G.cargoAt(L), 1);
  }
  function buildShips() {
    const s = G.s;
    let h = '<div class="bar"><div class="fleet">' + svg('ships') + '<b>Ship systems</b></div>' + segHTML() + '</div>';
    h += '<div class="tiles"><div class="tile"><i>Speed</i><b data-k="t-sp"></b></div><div class="tile"><i>Cargo</i><b data-k="t-ca"></b></div><div class="tile"><i>Mining</i><b data-k="t-mi"></b></div><div class="tile"><i>Tap</i><b data-k="t-ta"></b></div></div>';
    for (const id of UPG_ORDER) {
      const u = UPG[id];
      if (!G.upgAvail(id)) {
        const pl = PLANETS.find((p) => p.res === u.need);
        h += '<div class="ucard lockd"><div class="uicon">' + svg('lock') + '</div><div class="uinfo"><div class="uname">' + u.name + '</div><div class="udesc">Needs ' + RMAP[u.need].name + ' — survey ' + pl.name + ' first.</div></div></div>';
        continue;
      }
      h += '<div class="ucard" data-u="' + id + '"><div class="uicon">' + svg(u.icon) + '</div><div class="uinfo"><div class="uname">' + u.name + ' <span class="lv" data-k="lv"></span></div><div class="udesc">' + u.desc + '</div><div class="ustat" data-k="st"></div></div><button class="btn" data-act="upg" data-id="' + id + '"></button></div>';
    }
    el.panel.innerHTML = h;
    const t = { sp: $('[data-k=t-sp]', el.panel), ca: $('[data-k=t-ca]', el.panel), mi: $('[data-k=t-mi]', el.panel), ta: $('[data-k=t-ta]', el.panel) };
    const cards = $$('.ucard[data-u]', el.panel).map((c) => ({ id: c.dataset.u, lv: $('[data-k=lv]', c), st: $('[data-k=st]', c), btn: $('button', c) }));
    dyn.push(() => {
      setText(t.sp, Math.round((G.speed() / SH.SHIP.speed) * 100) + '%');
      setText(t.ca, fmt(G.cargo(), 1));
      setText(t.mi, G.mineTime().toFixed(2) + 's');
      setText(t.ta, '+' + fmt(G.tapValue(s.sel), 1));
      for (const k of cards) {
        const L = s.upg[k.id], maxed = L >= UPG[k.id].max;
        setText(k.lv, 'Lv ' + L + (UPG[k.id].max < 1000 ? '/' + UPG[k.id].max : ''));
        setHTML(k.st, maxed ? upgStatMax(k.id, L) : upgStat(k.id, L));
        buyBtn(k.btn, G.quote(G.item.upg(k.id), want()), 'Upgrade');
      }
    });
  }

  /* ---------- tab: empire ---------- */
  function bldStat(id, L) {
    const n = L + 1, x = (v) => '×' + (v < 10 ? v.toFixed(2) : fmt(v, 1));
    if (id === 'hab') return 'Homes for ' + fmt(G.popCap(L)) + ' → <b>' + fmt(G.popCap(n)) + '</b>';
    if (id === 'lab') return 'Research +' + fmt(G.rpRate(L), 1) + ' → <b>+' + fmt(G.rpRate(n), 1) + '</b>/s';
    if (id === 'ref') return 'Production ' + x(G.refMult(L)) + ' → <b>' + x(G.refMult(n)) + '</b>';
    if (id === 'acad') return 'Production ' + x(G.acadMult(L)) + ' → <b>' + x(G.acadMult(n)) + '</b>';
    if (id === 'core') return 'Production ' + x(G.coreMult(L)) + ' → <b>' + x(G.coreMult(n)) + '</b>';
    return 'Stardust gain +' + L * 10 + '% → <b>+' + n * 10 + '%</b>';
  }
  function buildEmpire() {
    const s = G.s, e = SH.eraDef(s.era + 1);
    let h = '<div class="card era"><div class="era-top"><div><i>Current era</i><b>' + SH.eraDef(s.era).name + '</b></div>' + svg('arrow') + '<div class="nx"><i>Next</i><b>' + e.name + '</b></div></div>' +
      '<div class="era-perk">' + svg('bolt', 'sm') + 'All production ×2 · ' + e.perk + '</div><div class="reqs" data-k="reqs"></div><button class="btn big" data-act="era"><span class="lbl">Advance to ' + e.name + '</span></button></div>';
    h += '<div class="card popc"><div class="row"><span class="lab">' + svg('pop', 'sm') + 'Population</span><b data-k="pop"></b></div><div class="pbar"><span data-k="popbar"></span></div><div class="row sub"><span data-k="wf"></span><span data-k="mult" class="multb" data-act="mults"></span></div></div>';
    h += '<div class="bar"><div class="fleet">' + svg('empire') + '<b>Buildings</b></div>' + segHTML() + '</div>';
    for (const id of BLD_ORDER) {
      const b = BLD[id];
      if (!G.bldAvail(id)) {
        let why = '';
        if (b.needEra && s.era < b.needEra) why = 'Reach the ' + SH.eraDef(b.needEra).name + ' era to unlock.';
        else { const pl = PLANETS.find((p) => p.res === b.need); why = 'Needs ' + RMAP[b.need].name + ' — survey ' + pl.name + ' first.'; }
        h += '<div class="ucard lockd"><div class="uicon">' + svg('lock') + '</div><div class="uinfo"><div class="uname">' + b.name + '</div><div class="udesc">' + why + '</div></div></div>';
        continue;
      }
      h += '<div class="ucard" data-b="' + id + '"><div class="uicon">' + svg(b.icon) + '</div><div class="uinfo"><div class="uname">' + b.name + ' <span class="lv" data-k="lv"></span></div><div class="udesc">' + b.desc + '</div><div class="ustat" data-k="st"></div></div><button class="btn" data-act="bld" data-id="' + id + '"></button></div>';
    }
    el.panel.innerHTML = h;
    const reqs = $('[data-k=reqs]', el.panel), eraBtn = $('[data-act=era]', el.panel);
    const pop = $('[data-k=pop]', el.panel), popbar = $('[data-k=popbar]', el.panel), wf = $('[data-k=wf]', el.panel), mult = $('[data-k=mult]', el.panel);
    const cards = $$('.ucard[data-b]', el.panel).map((c) => ({ id: c.dataset.b, lv: $('[data-k=lv]', c), st: $('[data-k=st]', c), btn: $('button', c) }));
    dyn.push(() => {
      let rh = '<span class="req' + (s.pop >= e.pop ? ' ok' : '') + '">' + svg('pop', 'sm') + fmt(Math.min(s.pop, e.pop)) + '/' + fmt(e.pop) + '</span>';
      for (const r of RID) {
        if (!e.cost[r]) continue;
        rh += '<span class="req ' + r + (s.res[r] >= e.cost[r] ? ' ok' : '') + '">' + ri(r) + fmt(Math.min(s.res[r], e.cost[r])) + '/' + fmt(e.cost[r]) + '</span>';
      }
      setHTML(reqs, rh);
      setCls(eraBtn, 'go', G.eraReady());
      const cap = G.popCap();
      setText(pop, fmt(s.pop) + ' / ' + fmt(cap));
      setW(popbar, Math.min(100, (s.pop / cap) * 100));
      setText(wf, 'Workforce bonus ×' + G.workforce().toFixed(2));
      setText(mult, 'Total ×' + fmt(G.gm, 2) + ' ›');
      for (const k of cards) {
        const L = s.bld[k.id];
        setText(k.lv, 'Lv ' + L);
        setHTML(k.st, bldStat(k.id, L));
        buyBtn(k.btn, G.quote(G.item.bld(k.id), want()), L ? 'Upgrade' : 'Build');
      }
    });
  }
  function showMults() {
    let h = '<h2>Production bonuses</h2><p class="mut">Everything your ships haul is multiplied by all of these.</p><div class="mlist">';
    for (const p of G.multParts()) if (p[1] !== 1) h += '<div><span>' + p[0] + '</span><b>×' + fmt(p[1], 2) + '</b></div>';
    h += '<div class="tot"><span>Total</span><b>×' + fmt(G.gm, 2) + '</b></div></div>';
    modal(h);
  }

  /* ---------- tab: research ---------- */
  function buildResearch() {
    const s = G.s;
    if (s.era < 1) {
      el.panel.innerHTML = '<div class="empty">' + svg('lock') + '<h3>Research is locked</h3><p>Grow your outpost into a <b>Colony</b> to open the first laboratory.</p><button class="btn go" data-act="goto" data-tab="empire"><span class="lbl">Go to Empire</span></button></div>';
      return;
    }
    if (s.bld.lab < 1) {
      el.panel.innerHTML = '<div class="empty">' + svg('research') + '<h3>No laboratory yet</h3><p>Build a <b>Research Lab</b> in the Empire tab to start generating Research.</p><button class="btn go" data-act="goto" data-tab="empire"><span class="lbl">Go to Empire</span></button></div>';
      return;
    }
    const avail = TECHS.filter((t) => G.techAvail(t));
    const done = TECHS.filter((t) => s.tech[t.id]);
    const later = TECHS.filter((t) => !s.tech[t.id] && s.era < t.era);
    let h = '<div class="card rpc"><div class="row"><span class="lab">' + ri('rp') + 'Research</span><b data-k="rp"></b></div><div class="row sub"><span data-k="rps"></span><span>' + done.length + '/' + TECHS.length + ' projects</span></div></div>';
    for (const t of avail) {
      h += '<div class="ucard tech" data-t="' + t.id + '"><div class="uicon">' + svg('research') + '</div><div class="uinfo"><div class="uname">' + t.name + '</div><div class="udesc">' + t.desc + '</div><div class="pbar thin"><span data-k="bar"></span></div></div><button class="btn" data-act="tech" data-id="' + t.id + '"><span class="lbl">Research</span><span class="cost"><span class="c rp">' + ri('rp') + fmt(t.cost) + '</span></span></button></div>';
    }
    if (!avail.length && !later.length) h += '<div class="more">' + svg('check') + 'Every project is complete. Brilliant.</div>';
    if (later.length) {
      const ne = later[0].era;
      h += '<div class="more">' + svg('lock') + later.filter((t) => t.era === ne).length + ' more projects unlock in the ' + SH.eraDef(ne).name + ' era</div>';
    }
    if (done.length) {
      h += '<div class="donehead">Completed</div><div class="donelist">';
      for (const t of done) h += '<div><b>' + t.name + '</b><span>' + t.desc + '</span></div>';
      h += '</div>';
    }
    el.panel.innerHTML = h;
    const rp = $('[data-k=rp]', el.panel), rps = $('[data-k=rps]', el.panel);
    const cards = $$('.ucard.tech', el.panel).map((c) => ({ t: TECHS.find((x) => x.id === c.dataset.t), bar: $('[data-k=bar]', c), btn: $('button', c) }));
    dyn.push(() => {
      setText(rp, fmt(s.rp, 1));
      setText(rps, '+' + fmt(G.rpRate(), 1) + ' per second');
      for (const k of cards) {
        setW(k.bar, Math.min(100, (s.rp / k.t.cost) * 100));
        setCls(k.btn, 'go', s.rp >= k.t.cost);
        setCls($('.c', k.btn), 'lack', s.rp < k.t.cost);
      }
    });
  }

  /* ---------- tab: legacy ---------- */
  function buildLegacy() {
    const s = G.s;
    let h = '<div class="card warp"><div class="warp-art">' + svg('legacy') + '</div><h3>The Warp Gate</h3><p>Leave this system behind and settle a new one. Worlds, ships, buildings and research stay here — <b>Stardust</b>, Legacy perks and achievements travel with you.</p>' +
      '<div class="sdrow"><div><i>Stardust</i><b data-k="sd"></b></div><div><i>Lifetime</i><b data-k="sdt"></b></div><div><i>Bonus</i><b data-k="sdb"></b></div></div>' +
      '<button class="btn big" data-act="warp"></button><div class="hint" data-k="whint"></div></div>';
    h += '<div class="bar"><div class="fleet">' + svg('legacy') + '<b>Legacy perks</b></div><span class="mut sm">kept forever</span></div>';
    for (const p of PERKS) {
      h += '<div class="ucard perk" data-p="' + p.id + '"><div class="uicon">' + svg('star') + '</div><div class="uinfo"><div class="uname">' + p.name + ' <span class="lv" data-k="lv"></span></div><div class="udesc">' + p.desc + (p.max > 1 ? ' per level' : '') + '</div></div><button class="btn" data-act="perk" data-id="' + p.id + '"></button></div>';
    }
    h += '<div class="autos" data-k="autos"></div>';
    el.panel.innerHTML = h;
    const sd = $('[data-k=sd]', el.panel), sdt = $('[data-k=sdt]', el.panel), sdb = $('[data-k=sdb]', el.panel), wbtn = $('[data-act=warp]', el.panel), whint = $('[data-k=whint]', el.panel), autos = $('[data-k=autos]', el.panel);
    const cards = $$('.ucard.perk', el.panel).map((c) => ({ p: PERKS.find((x) => x.id === c.dataset.p), lv: $('[data-k=lv]', c), btn: $('button', c) }));
    dyn.push(() => {
      setText(sd, fmt(s.stardust));
      setText(sdt, fmt(s.stardustTotal));
      setText(sdb, '+' + Math.round(s.stardustTotal * SH.STARDUST_BONUS * 100) + '%');
      const g = G.stardustGain();
      setCls(wbtn, 'go', g > 0);
      if (s.era < 5) {
        setHTML(wbtn, '<span class="lbl">' + svg('lock', 'sm') + ' Requires the Star Empire era</span>');
        setText(whint, 'Each Stardust adds +' + Math.round(SH.STARDUST_BONUS * 100) + '% to all production, forever.');
      } else {
        setHTML(wbtn, '<span class="lbl">Open the gate</span><span class="cost"><span class="c sd">' + ri('sd') + '+' + fmt(g) + ' Stardust</span></span>');
        setText(whint, g > 0 ? 'Haul more Dark Matter before you leave to earn more Stardust.' : 'Haul more Dark Matter from Umbra to earn Stardust.');
      }
      for (const k of cards) {
        const l = s.perks[k.p.id] || 0, c = SH.perkCost(k.p, l), maxed = l >= k.p.max;
        setText(k.lv, k.p.max > 1 ? 'Lv ' + l + '/' + k.p.max : l ? 'Owned' : '');
        setCls(k.btn, 'go', !maxed && s.stardust >= c);
        setCls(k.btn, 'maxed', maxed);
        setHTML(k.btn, maxed ? '<span class="lbl">' + (k.p.max > 1 ? 'MAX' : 'OWNED') + '</span>' : '<span class="lbl">Unlock</span><span class="cost"><span class="c sd' + (s.stardust < c ? ' lack' : '') + '">' + ri('sd') + fmt(c) + '</span></span>');
      }
      let ah = '';
      if (G.fx.autoShip) ah += '<button class="tog' + (s.opts.autoShip ? ' on' : '') + '" data-act="opt" data-o="autoShip"><span></span>Auto-Shipwright</button>';
      if (G.fx.autoPost) ah += '<button class="tog' + (s.opts.autoPost ? ' on' : '') + '" data-act="opt" data-o="autoPost"><span></span>Auto-Foreman</button>';
      setHTML(autos, ah);
    });
  }

  const builders = { planets: buildPlanets, ships: buildShips, empire: buildEmpire, research: buildResearch, legacy: buildLegacy };
  function rebuild() {
    const top = el.panel.scrollTop;
    dyn = [];
    builders[tab]();
    el.panel.dataset.tab = tab;
    for (const f of dyn) f();
    el.panel.scrollTop = top;
    dirty = false;
    if (flash) {
      const n = $(flash, el.panel);
      flash = null;
      if (n) {
        n.scrollIntoView({ block: 'center', behavior: 'smooth' });
        n.classList.add('flash');
        setTimeout(() => n.classList.remove('flash'), 1200);
      }
    }
  }
  function go(t, flashSel) {
    if (t !== tab) { tab = t; el.panel.scrollTop = 0; }
    flash = flashSel || null;
    dirty = true;
    rebuild();
    updateTop();
  }
  UI.go = go;

  /* ---------- actions ---------- */
  function deny(btn) {
    A.play('deny');
    if (btn) {
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
    }
  }
  function bought(n, btn) {
    if (n) { A.play('buy'); A.buzz(6); SH.save.soon(); for (const f of dyn) f(); updateTop(); }
    else deny(btn);
  }
  function onPanel(ev) {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const s = G.s, act = b.dataset.act;
    A.unlock();
    switch (act) {
      case 'buymode': s.opts.buy = +b.dataset.n; A.play('ui'); dirty = true; rebuild(); break;
      case 'ship': bought(G.buyShip(want(), s.sel), b); break;
      case 'spread': G.spreadIdle(); A.play('buy'); for (const f of dyn) f(); break;
      case 'sel': if (s.sel !== +b.dataset.i) { s.sel = +b.dataset.i; A.play('ui'); for (const f of dyn) f(); } break;
      case 'assign': {
        ev.stopPropagation();
        const d = +b.dataset.d, i = +b.dataset.i;
        const n = G.assign(i, d * (s.opts.buy === 0 ? 1e6 : s.opts.buy || 1));
        if (n) { A.play('ui'); A.buzz(5); for (const f of dyn) f(); } else deny(b);
        break;
      }
      case 'post': ev.stopPropagation(); bought(G.upOutpost(+b.dataset.i, want()), b); break;
      case 'unlock': if (!G.unlock(+b.dataset.i)) deny(b); break;
      case 'upg': bought(G.buyUpg(b.dataset.id, want()), b); break;
      case 'bld': bought(G.buyBld(b.dataset.id, want()), b); break;
      case 'era': if (!G.advanceEra()) deny(b); break;
      case 'tech': if (!G.buyTech(b.dataset.id)) deny(b); break;
      case 'perk': if (G.buyPerk(b.dataset.id)) { A.play('tech'); SH.save.soon(); } else deny(b); break;
      case 'warp': askWarp(b); break;
      case 'mults': showMults(); break;
      case 'goto': go(b.dataset.tab); break;
      case 'opt': s.opts[b.dataset.o] = !s.opts[b.dataset.o]; A.play('ui'); for (const f of dyn) f(); break;
    }
  }
  function askWarp(btn) {
    const g = G.stardustGain();
    if (g <= 0) return deny(btn);
    modal('<div class="warp-art big">' + svg('legacy') + '</div><h2>Open the Warp Gate?</h2><p>Your people will leave ' + homeName() + ' and found a new homeworld. You start over with a single ship — but far stronger.</p>' +
      '<div class="gain"><span class="c sd">' + ri('sd') + '+' + fmt(g) + ' Stardust</span><i>+' + Math.round(g * SH.STARDUST_BONUS * 100) + '% production, forever</i></div>' +
      '<div class="mrow"><button class="btn ghost" data-m="close"><span class="lbl">Not yet</span></button><button class="btn go" data-m="warp"><span class="lbl">Warp</span></button></div>');
  }

  function onMap(ev) {
    ev.preventDefault();
    A.unlock();
    const rect = el.map.getBoundingClientRect();
    const hit = R.pick(ev.clientX - rect.left, ev.clientY - rect.top);
    if (!hit) return;
    const s = G.s;
    if (hit.type === 'comet') {
      R.cometFx();
      const out = G.catchComet();
      if (out) { A.play('comet'); A.buzz(20); }
    } else if (hit.type === 'planet') {
      if (s.planets[hit.i].un) {
        const amt = G.tap(hit.i);
        R.tapFx(hit.i, amt);
        A.play('tap');
        A.buzz(8);
        if (s.sel !== hit.i) { s.sel = hit.i; if (tab === 'planets') for (const f of dyn) f(); }
      } else {
        A.play('ui');
        go('planets', '[data-lock]');
      }
    } else if (hit.type === 'home') {
      R.homePulse();
      A.play('ui');
      if (tab !== 'empire') go('empire');
    }
  }

  function onMission() {
    A.unlock();
    const m = G.mission();
    if (!m) return;
    const p = G.missionProg();
    if (p.done) {
      const rw = G.claimMission();
      A.play('claim');
      A.buzz(15);
      toast('<b>Mission complete</b><span>' + gainsHTML(rw) + '</span>', 'good');
      SH.save.soon();
      updateTop();
    } else if (m.tab) {
      A.play('ui');
      go(m.tab);
    } else toast('<span>Watch the sky — a comet will streak across the map.</span>');
  }

  /* ---------- modals: settings, achievements, offline, intro ---------- */
  function showAch() {
    const s = G.s, n = G.achCount();
    let h = '<h2>Achievements</h2><p class="mut">' + n + ' of ' + ACHS.length + ' earned · each adds +' + Math.round(SH.ACH_BONUS * 100) + '% production (<b>+' + Math.round(n * SH.ACH_BONUS * 100) + '%</b> now)</p><div class="achs">';
    for (const a of ACHS) h += '<div class="ach' + (s.ach[a.id] ? ' got' : '') + '">' + svg(s.ach[a.id] ? 'trophy' : 'lock') + '<div><b>' + a.name + '</b><span>' + a.desc + '</span></div></div>';
    modal(h + '</div>', { cls: 'tall' });
  }
  function showSettings() {
    const s = G.s, st = s.stats;
    const tog = (o, label) => '<button class="tog' + (s.opts[o] ? ' on' : '') + '" data-m="opt" data-o="' + o + '"><span></span>' + label + '</button>';
    modal('<h2>Settings</h2><div class="togs">' + tog('sound', 'Sound effects') + tog('haptic', 'Vibration') + '</div>' +
      '<h3>Your empire</h3><div class="mlist"><div><span>Time played</span><b>' + SH.fmtTime(st.time) + '</b></div><div><span>Taps</span><b>' + fmt(st.taps) + '</b></div><div><span>Hauls delivered</span><b>' + fmt(st.hauls) + '</b></div><div><span>Ships built</span><b>' + fmt(st.built) + '</b></div><div><span>Comets caught</span><b>' + fmt(st.comets) + '</b></div><div><span>Systems settled</span><b>' + (s.warps + 1) + '</b></div></div>' +
      '<h3>Save data</h3><p class="mut">Progress saves automatically on this device.</p><div class="mrow"><button class="btn ghost" data-m="export"><span class="lbl">Export</span></button><button class="btn ghost" data-m="import"><span class="lbl">Import</span></button><button class="btn ghost danger" data-m="reset"><span class="lbl">Reset</span></button></div><p class="ver">Starhaul v' + SH.BUILD + '</p>', { cls: 'tall' });
  }
  function showOffline(o) {
    const s = G.s;
    let note = '';
    if (o.eff < 1) note += 'Unattended fleets hauled at ' + Math.round(o.eff * 100) + '% — research <b>Autopilot</b> to fix that. ';
    if (o.capped) note += 'Fleets only run for ' + SH.fmtTime(G.fx.offCap) + ' without orders.';
    modal('<div class="warp-art big home">' + svg('planets') + '</div><h2>Welcome back, Commander</h2><p>While you were away for <b>' + SH.fmtTime(o.time) + '</b>, your fleets kept hauling for ' + homeName() + '.</p><div class="gain col">' + gainsHTML(Object.assign({}, o.gains, { rp: o.rp })) + '</div>' + (note ? '<p class="mut">' + note + '</p>' : '') + '<div class="mrow"><button class="btn go" data-m="close"><span class="lbl">Back to work</span></button></div>');
    void s;
  }
  UI.showOffline = showOffline;
  function showIntro() {
    modal('<div class="logo"><span>STAR</span>HAUL</div><p class="lead">Your colony ship has touched down on <b>Haven</b>. One hauler, one dusty moon, and a whole system waiting.</p><ul class="how"><li>' + svg('tap', 'sm') + '<span><b>Tap worlds</b> to mine them by hand.</span></li><li>' + svg('ships', 'sm') + '<span><b>Build ships</b> — they fly out, mine and bring the cargo home on their own.</span></li><li>' + svg('empire', 'sm') + '<span><b>Grow Haven</b> from a lonely outpost into a star empire.</span></li></ul><div class="mrow"><button class="btn go big" data-m="start"><span class="lbl">Launch</span></button></div>', { sticky: true, cls: 'intro' });
  }
  UI.showIntro = showIntro;

  function onModal(ev) {
    const b = ev.target.closest('[data-m]');
    if (!b) {
      if (ev.target.classList.contains('mback') && modalOpts && !modalOpts.sticky) closeModal();
      return;
    }
    const s = G.s;
    A.unlock();
    switch (b.dataset.m) {
      case 'close': A.play('ui'); closeModal(); break;
      case 'start': s.opts.intro = true; A.play('unlock'); closeModal(); SH.save.now(); break;
      case 'opt': s.opts[b.dataset.o] = !s.opts[b.dataset.o]; b.classList.toggle('on', s.opts[b.dataset.o]); A.play('ui'); SH.save.soon(); break;
      case 'warp': closeModal(); A.play('warp'); G.warp(); SH.save.now(); break;
      case 'export': {
        const code = SH.save.exportCode();
        modal('<h2>Export save</h2><p class="mut">Copy this code and keep it somewhere safe.</p><textarea class="code" readonly>' + code + '</textarea><div class="mrow"><button class="btn go" data-m="copy"><span class="lbl">Copy</span></button></div>');
        break;
      }
      case 'copy': {
        const ta = $('textarea.code', el.modal);
        ta.select();
        const done = () => toast('<b>Copied</b>', 'good');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, () => { document.execCommand('copy'); done(); });
        else { document.execCommand('copy'); done(); }
        break;
      }
      case 'import':
        modal('<h2>Import save</h2><p class="mut">Paste a save code. This replaces your current game.</p><textarea class="code" placeholder="Paste code here"></textarea><div class="mrow"><button class="btn go" data-m="doimport"><span class="lbl">Load</span></button></div>');
        break;
      case 'doimport': {
        const ok = SH.save.importCode($('textarea.code', el.modal).value);
        if (ok) { closeModal(); UI.reset(); toast('<b>Save loaded</b>', 'good'); } else toast('<b>That code didn’t work</b>', 'bad');
        break;
      }
      case 'reset':
        modal('<h2>Reset everything?</h2><p>This wipes your whole empire, including Stardust and achievements. It can’t be undone.</p><div class="mrow"><button class="btn ghost" data-m="close"><span class="lbl">Cancel</span></button><button class="btn danger go" data-m="doreset"><span class="lbl">Wipe save</span></button></div>');
        break;
      case 'doreset': SH.save.wipe(); closeModal(); UI.reset(); showIntro(); break;
    }
  }

  /* ---------- game events ---------- */
  function onEvent(type, a, b) {
    const s = G.s;
    switch (type) {
      case 'unlock': {
        const pl = PLANETS[a];
        toast('<b>' + pl.name + ' surveyed</b><span><span class="c ' + pl.res + '">' + ri(pl.res) + RMAP[pl.res].name + '</span> discovered — send ships!</span>', 'good', 3600);
        A.play('unlock'); A.buzz(30);
        dirty = true; SH.save.soon();
        break;
      }
      case 'era':
        toast('<b>A new era: ' + SH.eraDef(a).name + '</b><span>All production ×2 · ' + SH.eraDef(a).perk + '</span>', 'gold', 4200);
        A.play('era'); A.buzz(40);
        dirty = true; SH.save.soon();
        break;
      case 'tech': {
        const t = TECHS.find((x) => x.id === a);
        toast('<b>' + t.name + '</b><span>' + t.desc + '</span>', 'good');
        A.play('tech');
        dirty = true; SH.save.soon();
        break;
      }
      case 'ach':
        toast('<b>' + svg('trophy', 'sm') + a.name + '</b><span>' + a.desc + ' · +' + Math.round(SH.ACH_BONUS * 100) + '% production</span>', 'gold', 3200);
        A.play('ach');
        break;
      case 'comet':
        if (a.kind === 'frenzy') toast('<b>Comet Frenzy!</b><span>Production ×' + s.boostMult + ' for ' + Math.round(a.secs) + 's</span>', 'gold', 3200);
        else if (a.kind === 'research') toast('<b>Comet data recovered</b><span>' + gainsHTML({ rp: a.rp }) + '</span>', 'good', 3200);
        else toast('<b>Comet harvested</b><span>' + gainsHTML(a.gains) + '</span>', 'good', 3200);
        break;
      case 'cometSpawn': A.play('cometSpawn'); break;
      case 'outpost':
        if (b) { toast('<b>' + PLANETS[a].name + ' outpost milestone</b><span>Yield doubled!</span>', 'good'); A.play('claim'); }
        break;
      case 'bld': if (s.bld[a] === 1) dirty = true; break;
      case 'perk': dirty = true; break;
      case 'mission': dirty = true; break;
      case 'warp':
        toastQ.length = 0;
        el.toasts.innerHTML = '';
        toast('<b>Welcome to ' + homeName() + '</b><span>' + gainsHTML({ sd: a }) + ' carried through the gate</span>', 'gold', 4500);
        tab = 'planets'; dirty = true; resKey = '';
        break;
    }
  }

  /* ---------- lifecycle ---------- */
  UI.init = function () {
    el = {
      resbar: $('#resbar'), map: $('#map'), panel: $('#panel'), modal: $('#modal'), toasts: $('#toasts'), mission: $('#mission'),
      eraName: $('#era-name'), homeName: $('#home-name'), popN: $('#pop-n'), boost: $('#boost'), boostT: $('#boost-t'), nav: {}, chips: {},
    };
    const tabs = [['planets', 'Planets'], ['ships', 'Ships'], ['empire', 'Empire'], ['research', 'Research'], ['legacy', 'Legacy']];
    $('#nav').innerHTML = tabs.map((t) => '<button data-tab="' + t[0] + '">' + svg(t[0]) + '<span>' + t[1] + '</span></button>').join('');
    $$('#nav button').forEach((b) => (el.nav[b.dataset.tab] = b));
    $('#btn-ach').innerHTML = svg('trophy');
    $('#btn-set').innerHTML = svg('gear');
    $('#boost').insertAdjacentHTML('afterbegin', svg('bolt', 'sm'));
    $('#pop-ic').innerHTML = svg('pop', 'sm');

    $('#nav').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      A.unlock(); A.play('ui');
      go(b.dataset.tab);
    });
    el.panel.addEventListener('click', onPanel);
    el.modal.addEventListener('click', onModal);
    el.map.addEventListener('pointerdown', onMap);
    el.mission.addEventListener('click', onMission);
    $('#btn-ach').addEventListener('click', () => { A.unlock(); A.play('ui'); showAch(); });
    $('#btn-set').addEventListener('click', () => { A.unlock(); A.play('ui'); showSettings(); });
    el.resbar.addEventListener('click', (ev) => {
      const c = ev.target.closest('.chip');
      if (!c) return;
      const r = c.dataset.r, pl = PLANETS.find((p) => p.res === r);
      toast('<b><span class="c ' + r + '">' + ri(r) + RMAP[r].name + '</span></b><span>Hauled from ' + pl.name + ' · ' + fmt(G.s.total[r], 1) + ' so far</span>');
    });
    G.on(onEvent);
    UI.reset();
  };
  UI.reset = function () {
    resKey = '';
    tab = 'planets';
    dirty = true;
    R.rebuild();
    rebuild();
    updateTop();
  };
  UI.tick = function (dt) {
    acc += dt;
    if (dirty) { rebuild(); updateTop(); acc = 0; return; }
    if (acc >= 0.2) {
      acc = 0;
      updateTop();
      for (const f of dyn) f();
    }
  };
})();
