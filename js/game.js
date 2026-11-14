/* Starhaul — game state + rules (no DOM access; also loaded by the balance sim) */
(function (root) {
  'use strict';
  const SH = root.SH;
  const { RID, PLANETS, UPG, BLD, TECHS, PERKS, ACHS, MISSIONS, MILESTONES, SHIP, OUTPOST } = SH;
  const G = (SH.G = {});

  let S = null; // saved state
  let FX = null; // effects from research + perks
  let GM = 1; // global production multiplier
  const RT = (G.rt = { fleets: [], comet: null, cometT: 80, droneAcc: 0, slowAcc: 0, nextId: 1 });
  const MAXV = 10; // max ship sprites per planet (each sprite stands in for several ships)

  const subs = [];
  G.on = (fn) => subs.push(fn);
  function emit(t, a, b) {
    for (let i = 0; i < subs.length; i++) subs[i](t, a, b);
  }

  Object.defineProperty(G, 's', { get: () => S });
  Object.defineProperty(G, 'fx', { get: () => FX });
  Object.defineProperty(G, 'gm', { get: () => GM });

  function zeroRes() {
    const o = {};
    for (const r of RID) o[r] = 0;
    return o;
  }

  G.newState = function () {
    const s = {
      v: SH.VERSION,
      res: zeroRes(),
      total: zeroRes(),
      planets: PLANETS.map((p, i) => ({ un: i === 0, ships: i === 0 ? 1 : 0, post: 0 })),
      ships: 1,
      bought: 0,
      upg: { cargo: 0, thr: 0, laser: 0, tap: 0 },
      bld: { hab: 0, lab: 0, ref: 0, acad: 0, core: 0, forge: 0 },
      era: 0,
      pop: 12,
      rp: 0,
      tech: {},
      stardust: 0,
      stardustTotal: 0,
      perks: {},
      warps: 0,
      ach: {},
      mission: 0,
      boostT: 0,
      boostMult: 1,
      stats: { taps: 0, hauls: 0, comets: 0, time: 0, runTime: 0, built: 1 },
      opts: { sound: true, haptic: true, buy: 1, autoShip: true, autoPost: true, intro: false },
      sel: 0,
      last: Date.now(),
    };
    return s;
  };

  /* ---------- derived values ---------- */
  function milestoneMult(L) {
    let m = 1;
    for (let i = 0; i < MILESTONES.length && L >= MILESTONES[i]; i++) m *= 2;
    return m;
  }
  G.nextMilestone = function (L) {
    for (const m of MILESTONES) if (L < m) return m;
    return null;
  };
  const levelMult = (L, per) => (1 + per * L) * milestoneMult(L);

  G.speed = () => SHIP.speed * (1 + 0.12 * S.upg.thr);
  G.speedAt = (L) => SHIP.speed * (1 + 0.12 * L);
  G.mineTime = () => SHIP.mine * Math.pow(0.93, S.upg.laser);
  G.mineTimeAt = (L) => SHIP.mine * Math.pow(0.93, L);
  G.cargo = () => SHIP.cargo * Math.pow(SHIP.cargoGrowth, S.upg.cargo) * FX.cargo;
  G.cargoAt = (L) => SHIP.cargo * Math.pow(SHIP.cargoGrowth, L) * FX.cargo;
  G.tapFrac = () => 0.1 + 0.04 * S.upg.tap;
  G.tapFracAt = (L) => 0.1 + 0.04 * L;
  G.cycle = (i) => (2 * PLANETS[i].dist) / G.speed() + G.mineTime();
  G.outpostMult = (L) => levelMult(L, OUTPOST.per);
  G.yieldMult = (i) => G.outpostMult(S.planets[i].post) * FX.res[PLANETS[i].res];
  G.haul = (i) => G.cargo() * G.yieldMult(i) * GM; // one ship, one trip
  G.shipRate = (i) => (S.planets[i].ships * G.haul(i)) / G.cycle(i);
  G.tapValue = (i) => (G.haul(i) * G.tapFrac() + FX.tapLink * G.shipRate(i)) * FX.tapMult;
  G.rate = (i) => (S.planets[i].un ? G.shipRate(i) + FX.autoTap * G.tapValue(i) : 0);
  G.resRate = function (r) {
    let t = 0;
    for (let i = 0; i < PLANETS.length; i++) if (PLANETS[i].res === r) t += G.rate(i);
    return t;
  };
  G.idle = function () {
    let a = 0;
    for (const p of S.planets) a += p.ships;
    return S.ships - a;
  };
  G.popCap = (L) => {
    if (L === undefined) L = S.bld.hab;
    return L <= 0 ? 12 : Math.round(50 * Math.pow(1.4, L - 1));
  };
  G.workforce = (pop) => 1 + 0.2 * Math.log2(Math.max(1, (pop === undefined ? S.pop : pop) / 12));
  G.refMult = (L) => 1 + 0.1 * (L === undefined ? S.bld.ref : L);
  G.coreMult = (L) => 1 + 0.15 * (L === undefined ? S.bld.core : L);
  G.acadMult = (L) => 1 + 0.004 * (L === undefined ? S.bld.acad : L) * S.ships;
  G.rpRate = (L) => {
    if (L === undefined) L = S.bld.lab;
    return 0.3 * L * Math.pow(1.08, L) * FX.research * G.coreMult();
  };
  G.achCount = () => Object.keys(S.ach).length;
  G.multParts = function () {
    return [
      ['Era', Math.pow(2, S.era)],
      ['Workforce', G.workforce()],
      ['Refinery', G.refMult()],
      ['Fleet Academy', G.acadMult()],
      ['Fusion Core', G.coreMult()],
      ['Research', FX.all],
      ['Achievements', 1 + SH.ACH_BONUS * G.achCount()],
      ['Stardust', 1 + SH.STARDUST_BONUS * S.stardustTotal],
      ['Comet Frenzy', S.boostT > 0 ? S.boostMult : 1],
    ];
  };
  function buildFx() {
    const f = {
      res: {}, all: 1, tapLink: 0, offEff: 0.5, cometFreq: 1, autoTap: 0, offCap: 4 * 3600, cometMult: 1,
      startShips: 0, cargo: 1, research: 1, tapMult: 1, charted: false, autoShip: false, autoPost: false,
    };
    for (const r of RID) f.res[r] = 1;
    for (const t of TECHS) if (S.tech[t.id]) t.fx(f);
    for (const p of PERKS) {
      const l = S.perks[p.id] || 0;
      if (l) p.fx(f, l);
    }
    FX = f;
  }
  function calcGM() {
    let m = Math.pow(2, S.era) * G.workforce() * G.refMult() * G.acadMult() * G.coreMult() * FX.all;
    m *= (1 + SH.ACH_BONUS * G.achCount()) * (1 + SH.STARDUST_BONUS * S.stardustTotal);
    if (S.boostT > 0) m *= S.boostMult;
    GM = m;
  }
  G.refresh = function () {
    buildFx();
    calcGM();
  };

  /* ---------- costs ---------- */
  function scale(parts, L) {
    const c = {};
    for (const p of parts) {
      const f = p.from || 0;
      if (L >= f) c[p.r] = Math.ceil(p.b * Math.pow(p.g, L - f));
    }
    return c;
  }
  G.can = function (c) {
    for (const r in c) if (S.res[r] < c[r]) return false;
    return true;
  };
  function pay(c) {
    for (const r in c) S.res[r] = Math.max(0, S.res[r] - c[r]);
  }
  function gain(r, n) {
    S.res[r] += n;
    S.total[r] += n;
  }
  G.item = {
    ship: () => ({ lvl: S.bought, room: 1e9, costAt: (k) => ({ ore: Math.ceil(SHIP.baseCost * Math.pow(SHIP.growth, S.bought + k)) }) }),
    post: (i) => ({ lvl: S.planets[i].post, room: 1e9,
      costAt: (k) => ({ [PLANETS[i].res]: Math.ceil(PLANETS[i].post * Math.pow(OUTPOST.growth, S.planets[i].post + k)) }) }),
    upg: (id) => ({ lvl: S.upg[id], room: UPG[id].max - S.upg[id], costAt: (k) => scale(UPG[id].cost, S.upg[id] + k) }),
    bld: (id) => ({ lvl: S.bld[id], room: 1e9, costAt: (k) => scale(BLD[id].cost, S.bld[id] + k) }),
  };
  // How many of `item` can be bought right now (up to `want`), and the total price.
  G.quote = function (item, want) {
    const lim = Math.min(want, item.room, 400);
    const total = {};
    let n = 0;
    for (let k = 0; k < lim; k++) {
      const c = item.costAt(k);
      let ok = true;
      for (const r in c) if ((total[r] || 0) + c[r] > S.res[r]) { ok = false; break; }
      if (!ok) break;
      for (const r in c) total[r] = (total[r] || 0) + c[r];
      n++;
    }
    if (n === 0) return { n: 0, cost: item.room > 0 ? item.costAt(0) : null };
    return { n, cost: total };
  };

  /* ---------- fleets (visual ship entities drive the deliveries) ---------- */
  G.syncFleet = function (i, fresh) {
    const n = Math.min(S.planets[i].ships, MAXV);
    const f = RT.fleets[i] || (RT.fleets[i] = []);
    if (fresh) {
      f.length = 0;
      const off = Math.random();
      for (let k = 0; k < n; k++) f.push({ ph: (off + k / n) % 1, id: RT.nextId++, age: 9 });
      return;
    }
    while (f.length > n) {
      let bi = 0, bd = 9;
      for (let k = 0; k < f.length; k++) {
        const d = Math.min(f[k].ph, 1 - f[k].ph);
        if (d < bd) { bd = d; bi = k; }
      }
      f.splice(bi, 1);
    }
    while (f.length < n) {
      let ph = 0;
      if (f.some((e) => e.ph < 0.07)) {
        const a = f.map((e) => e.ph).sort((x, y) => x - y);
        let bg = 0;
        for (let k = 0; k < a.length; k++) {
          const nx = k + 1 < a.length ? a[k + 1] : a[0] + 1;
          const g = nx - a[k];
          if (g > bg) { bg = g; ph = (a[k] + g / 2) % 1; }
        }
      }
      f.push({ ph, id: RT.nextId++, age: 0 });
    }
  };
  function syncAll(fresh) {
    for (let i = 0; i < PLANETS.length; i++) G.syncFleet(i, fresh);
  }

  /* ---------- actions ---------- */
  G.buyShip = function (want, target) {
    const q = G.quote(G.item.ship(), want);
    if (!q.n) return 0;
    pay(q.cost);
    S.ships += q.n;
    S.bought += q.n;
    S.stats.built += q.n;
    if (target != null && S.planets[target] && S.planets[target].un) {
      S.planets[target].ships += q.n;
      G.syncFleet(target);
    }
    calcGM();
    emit('ship', q.n, target);
    return q.n;
  };
  // + sends ships to planet i: idle ships first, then borrowed from the busiest other world.
  // - recalls ships to the idle pool.
  G.assign = function (i, delta) {
    const p = S.planets[i];
    if (!p.un) return 0;
    if (delta < 0) {
      const d = Math.min(-delta, p.ships);
      if (!d) return 0;
      p.ships -= d;
      G.syncFleet(i);
      return -d;
    }
    let need = delta, moved = Math.min(need, G.idle());
    p.ships += moved;
    need -= moved;
    const touched = {};
    while (need > 0) {
      let b = -1;
      for (let k = 0; k < S.planets.length; k++)
        if (k !== i && S.planets[k].ships > 0 && (b < 0 || S.planets[k].ships > S.planets[b].ships)) b = k;
      if (b < 0) break;
      S.planets[b].ships--;
      p.ships++;
      touched[b] = 1;
      need--;
      moved++;
    }
    if (moved) {
      G.syncFleet(i);
      for (const k in touched) G.syncFleet(+k);
    }
    return moved;
  };
  G.canAssign = function (i) {
    if (G.idle() > 0) return true;
    for (let k = 0; k < S.planets.length; k++) if (k !== i && S.planets[k].ships > 0) return true;
    return false;
  };
  // Seconds until `cost` is affordable at current income (0 = now, Infinity = never)
  G.eta = function (cost) {
    let t = 0;
    for (const r in cost) {
      const lack = cost[r] - S.res[r];
      if (lack <= 0) continue;
      const rate = G.resRate(r);
      if (rate <= 0) return Infinity;
      t = Math.max(t, lack / rate);
    }
    return t;
  };
  G.recallAll = function () {
    for (let i = 0; i < S.planets.length; i++) { S.planets[i].ships = 0; G.syncFleet(i); }
  };
  G.spreadIdle = function () {
    // hand idle ships to whichever unlocked planet has the fewest
    let idle = G.idle();
    const un = [];
    for (let i = 0; i < S.planets.length; i++) if (S.planets[i].un) un.push(i);
    while (idle > 0 && un.length) {
      let b = un[0];
      for (const i of un) if (S.planets[i].ships < S.planets[b].ships) b = i;
      S.planets[b].ships++;
      idle--;
    }
    syncAll();
  };
  G.nextLocked = function () {
    for (let i = 0; i < S.planets.length; i++) if (!S.planets[i].un) return i;
    return -1;
  };
  G.unlock = function (i) {
    if (i !== G.nextLocked() || !G.can(PLANETS[i].unlock)) return false;
    pay(PLANETS[i].unlock);
    S.planets[i].un = true;
    S.sel = i;
    emit('unlock', i);
    return true;
  };
  G.upOutpost = function (i, want) {
    if (!S.planets[i].un) return 0;
    const q = G.quote(G.item.post(i), want);
    if (!q.n) return 0;
    const before = S.planets[i].post;
    pay(q.cost);
    S.planets[i].post += q.n;
    emit('outpost', i, milestoneMult(S.planets[i].post) > milestoneMult(before));
    return q.n;
  };
  G.upgAvail = (id) => !UPG[id].need || S.planets[PLANETS.findIndex((p) => p.res === UPG[id].need)].un;
  G.bldAvail = function (id) {
    const b = BLD[id];
    if (b.needEra && S.era < b.needEra) return false;
    if (b.need && !S.planets[PLANETS.findIndex((p) => p.res === b.need)].un) return false;
    return true;
  };
  G.buyUpg = function (id, want) {
    if (!G.upgAvail(id)) return 0;
    const q = G.quote(G.item.upg(id), want);
    if (!q.n) return 0;
    pay(q.cost);
    S.upg[id] += q.n;
    emit('upg', id);
    return q.n;
  };
  G.buyBld = function (id, want) {
    if (!G.bldAvail(id)) return 0;
    const q = G.quote(G.item.bld(id), want);
    if (!q.n) return 0;
    pay(q.cost);
    S.bld[id] += q.n;
    calcGM();
    emit('bld', id);
    return q.n;
  };
  G.eraReady = function () {
    const e = SH.eraDef(S.era + 1);
    return S.pop >= e.pop && G.can(e.cost);
  };
  G.advanceEra = function () {
    if (!G.eraReady()) return false;
    pay(SH.eraDef(S.era + 1).cost);
    S.era++;
    calcGM();
    emit('era', S.era);
    return true;
  };
  G.techAvail = (t) => !S.tech[t.id] && S.era >= t.era;
  G.buyTech = function (id) {
    const t = TECHS.find((x) => x.id === id);
    if (!t || !G.techAvail(t) || S.rp < t.cost) return false;
    S.rp -= t.cost;
    S.tech[id] = 1;
    G.refresh();
    emit('tech', id);
    return true;
  };
  G.buyPerk = function (id) {
    const p = PERKS.find((x) => x.id === id);
    const l = S.perks[id] || 0;
    if (!p || l >= p.max) return false;
    const c = SH.perkCost(p, l);
    if (S.stardust < c) return false;
    S.stardust -= c;
    S.perks[id] = l + 1;
    G.refresh();
    emit('perk', id);
    return true;
  };

  G.tap = function (i, auto) {
    if (!S.planets[i].un) return 0;
    const amt = G.tapValue(i);
    gain(PLANETS[i].res, amt);
    if (!auto) S.stats.taps++;
    return amt;
  };

  /* ---------- comets ---------- */
  function cometDelay() {
    return (70 + Math.random() * 40) / FX.cometFreq;
  }
  G.catchComet = function () {
    if (!RT.comet) return null;
    RT.comet = null;
    RT.cometT = cometDelay();
    S.stats.comets++;
    const roll = Math.random();
    const out = { kind: 'bounty', gains: {}, rp: 0, secs: 0 };
    if (roll < 0.3 && S.boostT <= 0) {
      out.kind = 'frenzy';
      out.secs = 30 + 10 * Math.log2(FX.cometMult);
      S.boostMult = 2;
      S.boostT = out.secs;
      calcGM();
    } else if (roll < 0.45 && S.bld.lab > 0) {
      out.kind = 'research';
      out.rp = G.rpRate() * 40 * FX.cometMult;
      S.rp += out.rp;
    } else {
      const secs = 20 * FX.cometMult;
      for (let i = 0; i < PLANETS.length; i++) {
        if (!S.planets[i].un) continue;
        const amt = Math.max(G.rate(i) * secs, G.tapValue(i) * 15);
        gain(PLANETS[i].res, amt);
        out.gains[PLANETS[i].res] = amt;
      }
    }
    emit('comet', out);
    return out;
  };

  /* ---------- missions + achievements ---------- */
  G.mission = () => MISSIONS[S.mission] || null;
  G.missionProg = function () {
    const m = G.mission();
    if (!m) return null;
    const p = m.p(S);
    return { cur: Math.min(p[0], p[1]), goal: p[1], done: p[0] >= p[1] };
  };
  // Resolve a mission's reward into concrete amounts right now.
  G.missionReward = function (m) {
    const out = {};
    for (const k in m.reward) {
      if (k === 'secs') {
        const boost = S.boostT > 0 ? S.boostMult : 1;
        for (let i = 0; i < PLANETS.length; i++) {
          if (!S.planets[i].un) continue;
          out[PLANETS[i].res] = Math.max((G.rate(i) / boost) * m.reward.secs, G.tapValue(i) * 10);
        }
      } else out[k] = m.reward[k];
    }
    return out;
  };
  G.claimMission = function () {
    const m = G.mission();
    const p = G.missionProg();
    if (!m || !p.done) return null;
    const rw = G.missionReward(m);
    for (const k in rw) {
      const v = rw[k];
      if (k === 'rp') S.rp += v;
      else if (k === 'sd') { S.stardust += v; S.stardustTotal += v; }
      else gain(k, v);
    }
    S.mission++;
    calcGM();
    emit('mission', m, rw);
    return rw;
  };
  function checkAch() {
    let got = false;
    for (const a of ACHS) {
      if (!S.ach[a.id] && a.t(S)) {
        S.ach[a.id] = 1;
        got = true;
        emit('ach', a);
      }
    }
    if (got) calcGM();
  }

  /* ---------- prestige ---------- */
  G.stardustGain = function () {
    if (S.era < 5) return 0;
    return Math.floor(4 * Math.pow(S.total.dm / 1e15, 0.25) * (1 + 0.1 * S.bld.forge));
  };
  G.warp = function () {
    const g = G.stardustGain();
    if (g <= 0) return 0;
    const n = G.newState();
    n.stardust = S.stardust + g;
    n.stardustTotal = S.stardustTotal + g;
    n.perks = S.perks;
    n.warps = S.warps + 1;
    n.ach = S.ach;
    n.mission = S.mission;
    n.opts = S.opts;
    n.stats = S.stats;
    n.stats.runTime = 0;
    S = n;
    applyStart();
    G.refresh();
    syncAll(true);
    RT.comet = null;
    RT.cometT = cometDelay();
    emit('warp', g);
    return g;
  };
  function applyStart() {
    buildFx();
    if (FX.startShips) {
      S.ships += FX.startShips;
      S.planets[0].ships += FX.startShips;
    }
    if (FX.charted) {
      S.planets[1].un = true;
      S.planets[2].un = true;
    }
  }

  /* ---------- time ---------- */
  function slowStep(dt) {
    // population
    const cap = G.popCap();
    if (S.pop < cap) S.pop = Math.min(cap, S.pop + ((cap - S.pop) * 0.08 + 0.5) * dt);
    // research
    if (S.bld.lab > 0) S.rp += G.rpRate() * dt;
    // frenzy
    if (S.boostT > 0) {
      S.boostT -= dt;
      if (S.boostT <= 0) { S.boostT = 0; S.boostMult = 1; emit('boostEnd'); }
    }
  }
  function autoBuy() {
    if (FX.autoShip && S.opts.autoShip) {
      const q = G.quote(G.item.ship(), 1);
      if (q.n) {
        let b = -1;
        for (let i = 0; i < S.planets.length; i++)
          if (S.planets[i].un && (b < 0 || S.planets[i].ships < S.planets[b].ships)) b = i;
        G.buyShip(1, b);
      }
    }
    if (FX.autoPost && S.opts.autoPost) {
      for (let i = 0; i < S.planets.length; i++) if (S.planets[i].un) G.upOutpost(i, 1);
    }
  }

  // Real-time step: ships fly, deliveries land one by one.
  G.tick = function (dt) {
    S.stats.time += dt;
    S.stats.runTime += dt;
    calcGM();
    for (let i = 0; i < PLANETS.length; i++) {
      const p = S.planets[i];
      if (!p.un || !p.ships) continue;
      const f = RT.fleets[i];
      if (!f || !f.length) continue;
      const d = dt / G.cycle(i);
      const w = p.ships / f.length;
      const per = G.haul(i) * w;
      for (let k = 0; k < f.length; k++) {
        const e = f[k];
        e.ph += d;
        e.age += dt;
        if (e.ph >= 1) {
          const trips = Math.floor(e.ph);
          e.ph -= trips;
          gain(PLANETS[i].res, per * trips);
          S.stats.hauls += w * trips;
          emit('haul', i, per * trips);
        }
      }
    }
    if (FX.autoTap > 0) {
      RT.droneAcc += dt * FX.autoTap;
      let n = Math.floor(RT.droneAcc);
      if (n > 0) {
        RT.droneAcc -= n;
        for (let i = 0; i < PLANETS.length; i++) {
          if (!S.planets[i].un) continue;
          const amt = G.tapValue(i) * n;
          gain(PLANETS[i].res, amt);
          emit('drone', i, amt);
        }
      }
    }
    slowStep(dt);
    // comets
    if (RT.comet) {
      RT.comet.t += dt;
      if (RT.comet.t >= RT.comet.dur) { RT.comet = null; RT.cometT = cometDelay(); }
    } else if (S.stats.taps >= 10 || S.stats.time > 240) {
      RT.cometT -= dt;
      if (RT.cometT <= 0) {
        RT.comet = { t: 0, dur: 12, seed: Math.random(), dir: Math.random() < 0.5 ? 1 : -1 };
        emit('cometSpawn');
      }
    }
    RT.slowAcc += dt;
    if (RT.slowAcc >= 0.5) {
      RT.slowAcc = 0;
      autoBuy();
      checkAch();
    }
  };

  // Analytic step for long gaps (offline, hidden tab, balance sim). Returns what was earned.
  G.fastForward = function (dt, eff) {
    if (eff === undefined) eff = 1;
    const out = { gains: {}, rp: 0 };
    if (S.boostT > 0 && dt > S.boostT) { S.boostT = 0; S.boostMult = 1; }
    calcGM();
    for (let i = 0; i < PLANETS.length; i++) {
      if (!S.planets[i].un) continue;
      const r = PLANETS[i].res;
      const amt = G.rate(i) * dt * eff;
      if (amt > 0) {
        gain(r, amt);
        out.gains[r] = (out.gains[r] || 0) + amt;
        S.stats.hauls += (S.planets[i].ships * dt * eff) / G.cycle(i);
      }
    }
    const rp0 = S.rp;
    // integrate pop/research in a few coarse steps
    const steps = Math.min(40, Math.max(1, Math.ceil(dt / 5)));
    for (let k = 0; k < steps; k++) slowStep(dt / steps);
    out.rp = S.rp - rp0;
    S.stats.time += dt;
    S.stats.runTime += dt;
    return out;
  };
  G.simStep = function () {
    autoBuy();
    checkAch();
  };

  G.offline = function (secs) {
    const t = Math.min(secs, FX.offCap);
    const out = G.fastForward(t, FX.offEff);
    out.time = secs;
    out.used = t;
    out.capped = secs > FX.offCap;
    out.eff = FX.offEff;
    autoBuy();
    checkAch();
    return out;
  };

  /* ---------- save / load ---------- */
  function merge(def, src) {
    if (src == null || typeof src !== 'object') return def;
    for (const k in src) {
      if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && src[k] && typeof src[k] === 'object') def[k] = merge(def[k], src[k]);
      else if (src[k] !== null && src[k] !== undefined) def[k] = src[k];
    }
    return def;
  }
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  G.init = function (json) {
    let s = G.newState();
    let loaded = false;
    if (json) {
      try {
        const raw = typeof json === 'string' ? JSON.parse(json) : json;
        if (raw && typeof raw === 'object' && raw.res) {
          const pl = raw.planets;
          delete raw.planets;
          s = merge(s, raw);
          if (Array.isArray(pl)) {
            s.planets.forEach((p, i) => {
              if (pl[i]) { p.un = !!pl[i].un || i === 0; p.ships = Math.max(0, num(pl[i].ships, 0) | 0); p.post = Math.max(0, num(pl[i].post, 0) | 0); }
            });
          }
          for (const r of RID) { s.res[r] = Math.max(0, num(s.res[r], 0)); s.total[r] = Math.max(0, num(s.total[r], 0)); }
          s.ships = Math.max(1, num(s.ships, 1) | 0);
          let a = 0;
          for (const p of s.planets) a += p.ships;
          if (a > s.ships) s.ships = a;
          s.pop = Math.max(12, num(s.pop, 12));
          s.rp = Math.max(0, num(s.rp, 0));
          s.v = SH.VERSION;
          loaded = true;
        }
      } catch (e) {
        loaded = false;
      }
    }
    S = s;
    if (S.sel == null || !S.planets[S.sel] || !S.planets[S.sel].un) S.sel = 0;
    G.refresh();
    syncAll(true);
    RT.comet = null;
    RT.cometT = 60 + Math.random() * 40;
    return loaded;
  };
  G.serialize = function () {
    S.last = Date.now();
    return JSON.stringify(S);
  };
})(typeof window !== 'undefined' ? window : globalThis);
