/* Starhaul — static game data (no DOM access; also loaded by the balance sim) */
(function (root) {
  'use strict';
  const SH = (root.SH = root.SH || {});

  SH.VERSION = 2; // save format (2: tap mining removed)

  SH.RES = [
    { id: 'ore', name: 'Ore', color: '#e0a56b' },
    { id: 'ice', name: 'Ice', color: '#86dcff' },
    { id: 'cry', name: 'Crystal', color: '#ff7ad9' },
    { id: 'gas', name: 'Gas', color: '#7df0b0' },
    { id: 'pla', name: 'Plasma', color: '#ff6a3d' },
    { id: 'dm', name: 'Dark Matter', color: '#a48dff' },
  ];
  SH.RID = SH.RES.map((r) => r.id);
  SH.RMAP = {};
  SH.RES.forEach((r) => (SH.RMAP[r.id] = r));

  // dist = logical travel distance, orbit = radius drawn on the map
  SH.PLANETS = [
    { id: 'ferra', post: 50, name: 'Ferra', res: 'ore', dist: 1.0, orbit: 1.0, size: 9, period: 80, a0: 0.5,
      blurb: 'A rust-red moon, heavy with iron ore.', unlock: {} },
    { id: 'glacia', post: 50, name: 'Glacia', res: 'ice', dist: 1.7, orbit: 1.62, size: 10, period: 130, a0: 3.5,
      blurb: 'A frozen world wrapped in ancient ice.', unlock: { ore: 200 } },
    { id: 'prisma', post: 2000, name: 'Prisma', res: 'cry', dist: 2.5, orbit: 2.25, size: 9.5, period: 190, a0: 5.3,
      blurb: 'Singing crystal spires cover its surface.', unlock: { ore: 2e5, ice: 2e4 } },
    { id: 'nimbus', post: 8e5, name: 'Nimbus', res: 'gas', dist: 3.5, orbit: 2.95, size: 14, period: 270, a0: 2.1,
      blurb: 'A ringed giant with endless fuel storms.', unlock: { ore: 2.5e9, ice: 8e8, cry: 2e8 } },
    { id: 'cinder', post: 1.2e9, name: 'Cinder', res: 'pla', dist: 4.7, orbit: 3.65, size: 10.5, period: 360, a0: 4.2,
      blurb: 'A molten world that bleeds raw plasma.', unlock: { ore: 3e13, ice: 1.2e13, cry: 1.5e12, gas: 1e12 } },
    { id: 'umbra', post: 1.2e12, name: 'Umbra', res: 'dm', dist: 6.0, orbit: 4.35, size: 11, period: 480, a0: 0.9,
      blurb: 'A collapsed star leaking dark matter.', unlock: { ore: 1e16, ice: 8e15, cry: 6e15, gas: 8e14, pla: 5e14 } },
  ];

  // Outpost milestone levels: each one doubles that outpost's yield
  SH.MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];

  SH.SHIP = { baseCost: 20, growth: 1.25, speed: 0.4, mine: 3, cargo: 10, cargoGrowth: 1.15, startOre: 25 };
  SH.OUTPOST = { growth: 1.6, per: 0.2 };

  // Ship upgrades. cost parts: r=resource, b=base, g=growth, from=first level that needs it
  SH.UPG = {
    cargo: { name: 'Cargo Bays', icon: 'cargo', max: 100000, need: null,
      desc: 'Every ship hauls 15% more per trip.',
      cost: [{ r: 'ore', b: 60, g: 2 }, { r: 'cry', b: 1500, g: 2, from: 8 }, { r: 'pla', b: 2e9, g: 2, from: 36 }] },
    thr: { name: 'Ion Thrusters', icon: 'thruster', max: 30, need: 'ice',
      desc: 'Ships fly faster between worlds.',
      cost: [{ r: 'ice', b: 50, g: 1.7 }] },
    laser: { name: 'Mining Lasers', icon: 'laser', max: 20, need: 'cry',
      desc: 'Ships fill their holds faster.',
      cost: [{ r: 'cry', b: 4000, g: 1.75 }] },
  };
  SH.UPG_ORDER = ['cargo', 'thr', 'laser'];

  SH.BLD = {
    hab: { name: 'Habitat Domes', icon: 'hab', need: null,
      desc: 'Homes for your people. A bigger workforce boosts all production.',
      cost: [{ r: 'ore', b: 100, g: 1.6 }, { r: 'ice', b: 40, g: 1.6, from: 1 }] },
    lab: { name: 'Research Lab', icon: 'lab', needEra: 1,
      desc: 'Scientists generate Research to unlock breakthroughs.',
      cost: [{ r: 'ore', b: 400, g: 1.5 }, { r: 'ice', b: 250, g: 1.5 }, { r: 'cry', b: 1000, g: 1.5, from: 10 }] },
    ref: { name: 'Refinery', icon: 'ref', need: 'cry',
      desc: '+10% all production per level.',
      cost: [{ r: 'cry', b: 6000, g: 1.6 }] },
    acad: { name: 'Fleet Academy', icon: 'acad', need: 'gas',
      desc: '+0.4% all production per ship you own, per level.',
      cost: [{ r: 'gas', b: 2.5e6, g: 1.6 }] },
    core: { name: 'Fusion Core', icon: 'core', need: 'pla',
      desc: '+15% all production and research per level.',
      cost: [{ r: 'pla', b: 3e9, g: 1.6 }] },
    forge: { name: 'Dark Forge', icon: 'forge', need: 'dm',
      desc: '+10% Stardust gained when you warp, per level.',
      cost: [{ r: 'dm', b: 4e12, g: 1.6 }] },
  };
  SH.BLD_ORDER = ['hab', 'lab', 'ref', 'acad', 'core', 'forge'];

  SH.ERAS = [
    { name: 'Outpost' },
    { name: 'Colony', cost: { ore: 800, ice: 300 }, pop: 100, perk: 'Unlocks Research' },
    { name: 'Settlement', cost: { ore: 6e6, ice: 2e6, cry: 4e5 }, pop: 2e4, perk: 'New research tier' },
    { name: 'City-State', cost: { ore: 1.5e12, ice: 3e11, cry: 2e11, gas: 3e10 }, pop: 2e8, perk: 'New research tier' },
    { name: 'Planetary Nation', cost: { ore: 1.5e15, ice: 1e15, cry: 7e14, gas: 1e14, pla: 1e13 }, pop: 2e10, perk: 'New research tier' },
    { name: 'Star Empire', cost: { ore: 6e16, ice: 5e16, cry: 4e16, gas: 3e16, pla: 3e15, dm: 4e14 }, pop: 5e11, perk: 'Opens the Warp Gate' },
  ];
  SH.ERA_EXTRA = ['Stellar Dominion', 'Galactic Power', 'Cosmic Ascendancy'];
  SH.eraDef = function (n) {
    if (n < SH.ERAS.length) return SH.ERAS[n];
    const k = n - (SH.ERAS.length - 1);
    const base = SH.ERAS[SH.ERAS.length - 1];
    const cost = {};
    for (const r in base.cost) cost[r] = base.cost[r] * Math.pow(100, k);
    const nm = k <= SH.ERA_EXTRA.length ? SH.ERA_EXTRA[k - 1] : 'Ascendancy ' + roman(k - SH.ERA_EXTRA.length + 1);
    return { name: nm, cost, pop: base.pop * Math.pow(25, k), perk: 'Even greater glory' };
  };
  function roman(n) {
    const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, c] of t) while (n >= v) { s += c; n -= v; }
    return s;
  }
  SH.roman = roman;

  // Research. fx mutates the effects object built in game.js
  SH.TECHS = [
    { id: 'sift', era: 1, cost: 30, name: 'Ore Sifters', desc: 'Ore yield ×2', fx: (f) => (f.res.ore *= 2) },
    { id: 'drill', era: 1, cost: 150, name: 'Thermal Drills', desc: 'Ice yield ×2', fx: (f) => (f.res.ice *= 2) },
    { id: 'link', era: 1, cost: 500, name: 'Bulk Loaders', desc: 'All production ×1.15', fx: (f) => (f.all *= 1.15) },
    { id: 'auto', era: 1, cost: 1200, name: 'Autopilot', desc: 'Offline hauling runs at 100% instead of 50%', fx: (f) => (f.offEff = 1) },
    { id: 'watch', era: 1, cost: 2500, name: 'Comet Watch', desc: 'Comets appear 50% more often', fx: (f) => (f.cometFreq *= 1.5) },

    { id: 'prism', era: 2, cost: 8000, name: 'Prism Cutters', desc: 'Crystal yield ×2', fx: (f) => (f.res.cry *= 2) },
    { id: 'drones', era: 2, cost: 25000, name: 'Mining Drones', desc: 'Outpost drones pre-load cargo: all production ×1.2', fx: (f) => (f.all *= 1.2) },
    { id: 'relay', era: 2, cost: 50000, name: 'Long-Range Relay', desc: 'Offline time limit 4h → 12h', fx: (f) => (f.offCap += 8 * 3600) },
    { id: 'sift2', era: 2, cost: 100000, name: 'Deep-Core Sifters', desc: 'Ore yield ×3', fx: (f) => (f.res.ore *= 3) },
    { id: 'doctrine', era: 2, cost: 150000, name: 'Fleet Doctrine', desc: 'All production ×1.5', fx: (f) => (f.all *= 1.5) },

    { id: 'skim', era: 3, cost: 500000, name: 'Gas Skimmers', desc: 'Gas yield ×2', fx: (f) => (f.res.gas *= 2) },
    { id: 'drill2', era: 3, cost: 1e6, name: 'Cryo Harvesters', desc: 'Ice yield ×3', fx: (f) => (f.res.ice *= 3) },
    { id: 'harpoon', era: 3, cost: 2.5e6, name: 'Comet Harpoons', desc: 'Comet rewards ×2', fx: (f) => (f.cometMult *= 2) },
    { id: 'prism2', era: 3, cost: 5e6, name: 'Resonance Cutters', desc: 'Crystal yield ×3', fx: (f) => (f.res.cry *= 3) },
    { id: 'swarm', era: 3, cost: 8e6, name: 'Drone Swarm', desc: 'Swarms of drones work every outpost: all production ×1.4', fx: (f) => (f.all *= 1.4) },

    { id: 'bottle', era: 4, cost: 6e7, name: 'Magnetic Bottles', desc: 'Plasma yield ×2', fx: (f) => (f.res.pla *= 2) },
    { id: 'skim2', era: 4, cost: 1.2e8, name: 'Storm Divers', desc: 'Gas yield ×3', fx: (f) => (f.res.gas *= 3) },
    { id: 'sing', era: 4, cost: 2e8, name: 'Singularity Drives', desc: 'All production ×2', fx: (f) => (f.all *= 2) },

    { id: 'lens', era: 5, cost: 3e8, name: 'Void Lensing', desc: 'Dark Matter yield ×2', fx: (f) => (f.res.dm *= 2) },
    { id: 'bottle2', era: 5, cost: 4e8, name: 'Stellar Forges', desc: 'Plasma yield ×3', fx: (f) => (f.res.pla *= 3) },
    { id: 'unify', era: 5, cost: 5e8, name: 'Grand Unification', desc: 'All production ×3', fx: (f) => (f.all *= 3) },
    { id: 'lens2', era: 5, cost: 6e8, name: 'Event Horizon Taps', desc: 'Dark Matter yield ×3', fx: (f) => (f.res.dm *= 3) },
  ];

  // Legacy perks bought with Stardust (kept through every warp)
  SH.PERKS = [
    { id: 'crew', name: 'Veteran Crews', max: 5, base: 3, desc: 'Start every system with +4 ships', fx: (f, l) => (f.startShips += 4 * l) },
    { id: 'hold', name: 'Quantum Holds', max: 10, base: 2, desc: 'Cargo ×1.25', fx: (f, l) => (f.cargo *= Math.pow(1.25, l)) },
    { id: 'mind', name: 'Golden Age', max: 6, base: 3, desc: 'Research speed ×1.5', fx: (f, l) => (f.research *= Math.pow(1.5, l)) },
    { id: 'luck', name: 'Comet Magnet', max: 5, base: 2, desc: 'Comet rewards +50%', fx: (f, l) => (f.cometMult *= 1 + 0.5 * l) },
    { id: 'time', name: 'Time Dilation', max: 4, base: 4, desc: 'Offline time limit +8h', fx: (f, l) => (f.offCap += 8 * 3600 * l) },
    { id: 'chart', name: 'Charted Routes', max: 1, base: 8, desc: 'Glacia and Prisma start already surveyed', fx: (f, l) => (f.charted = l > 0) },
    { id: 'wright', name: 'Auto-Shipwright', max: 1, base: 10, desc: 'Builds ships automatically when you can afford them', fx: (f, l) => (f.autoShip = l > 0) },
    { id: 'foreman', name: 'Auto-Foreman', max: 1, base: 15, desc: 'Upgrades outposts automatically', fx: (f, l) => (f.autoPost = l > 0) },
  ];
  SH.perkCost = (p, lvl) => p.base * Math.pow(2, lvl);

  const tot = (s, r) => s.total[r];
  const maxPost = (s) => Math.max.apply(null, s.planets.map((p) => p.post));
  const unlocked = (s) => s.planets.filter((p) => p.un).length;
  const techs = (s) => Object.keys(s.tech).length;

  SH.ACHS = [
    { id: 'ship1', name: 'Squadron', desc: 'Own 5 ships', t: (s) => s.ships >= 5 },
    { id: 'ship2', name: 'Flotilla', desc: 'Own 25 ships', t: (s) => s.ships >= 25 },
    { id: 'ship3', name: 'Armada', desc: 'Own 50 ships', t: (s) => s.ships >= 50 },
    { id: 'ship4', name: 'Grand Fleet', desc: 'Own 100 ships', t: (s) => s.ships >= 100 },
    { id: 'ship5', name: 'Sky Full of Ships', desc: 'Own 150 ships', t: (s) => s.ships >= 150 },
    { id: 'pl1', name: 'Explorer', desc: 'Survey a second world', t: (s) => unlocked(s) >= 2 },
    { id: 'pl2', name: 'Pathfinder', desc: 'Survey four worlds', t: (s) => unlocked(s) >= 4 },
    { id: 'pl3', name: 'Master of Orbits', desc: 'Survey every world', t: (s) => unlocked(s) >= 6 },
    { id: 'era1', name: 'Roots', desc: 'Become a Colony', t: (s) => s.era >= 1 },
    { id: 'era2', name: 'Settled', desc: 'Become a Settlement', t: (s) => s.era >= 2 },
    { id: 'era3', name: 'Skyline', desc: 'Become a City-State', t: (s) => s.era >= 3 },
    { id: 'era4', name: 'One World', desc: 'Become a Planetary Nation', t: (s) => s.era >= 4 },
    { id: 'era5', name: 'Star Empire', desc: 'Become a Star Empire', t: (s) => s.era >= 5 },
    { id: 'era7', name: 'Beyond', desc: 'Reach the 7th era', t: (s) => s.era >= 7 },
    { id: 'haul1', name: 'Regular Service', desc: 'Complete 100 hauls', t: (s) => s.stats.hauls >= 100 },
    { id: 'haul2', name: 'Trade Lanes', desc: 'Complete 10,000 hauls', t: (s) => s.stats.hauls >= 1e4 },
    { id: 'haul3', name: 'Lifeblood', desc: 'Complete 1,000,000 hauls', t: (s) => s.stats.hauls >= 1e6 },
    { id: 'com1', name: 'Stargazer', desc: 'Harvest a passing comet', t: (s) => s.stats.comets >= 1 },
    { id: 'com2', name: 'Comet Chaser', desc: 'Harvest 10 comets', t: (s) => s.stats.comets >= 10 },
    { id: 'com3', name: 'Tail Rider', desc: 'Harvest 50 comets', t: (s) => s.stats.comets >= 50 },
    { id: 'ore1', name: 'Stockpile', desc: 'Haul 1,000 ore', t: (s) => tot(s, 'ore') >= 1e3 },
    { id: 'ore2', name: 'Iron Age', desc: 'Haul 1 million ore', t: (s) => tot(s, 'ore') >= 1e6 },
    { id: 'ore3', name: 'Mountain Mover', desc: 'Haul 1 trillion ore', t: (s) => tot(s, 'ore') >= 1e12 },
    { id: 'ore4', name: 'World Eater', desc: 'Haul 1 quintillion ore', t: (s) => tot(s, 'ore') >= 1e18 },
    { id: 'dm1', name: 'Into the Dark', desc: 'Haul your first Dark Matter', t: (s) => tot(s, 'dm') >= 1 },
    { id: 'pop1', name: 'Township', desc: 'Reach 1,000 citizens', t: (s) => s.pop >= 1e3 },
    { id: 'pop2', name: 'Megacity', desc: 'Reach 1 million citizens', t: (s) => s.pop >= 1e6 },
    { id: 'pop3', name: 'Teeming World', desc: 'Reach 1 billion citizens', t: (s) => s.pop >= 1e9 },
    { id: 'rs1', name: 'Curious Minds', desc: 'Complete 5 research projects', t: (s) => techs(s) >= 5 },
    { id: 'rs2', name: 'Enlightened', desc: 'Complete every research project', t: (s) => techs(s) >= SH.TECHS.length },
    { id: 'op1', name: 'Dug In', desc: 'Raise an outpost to level 10', t: (s) => maxPost(s) >= 10 },
    { id: 'op2', name: 'Deep Roots', desc: 'Raise an outpost to level 40', t: (s) => maxPost(s) >= 40 },
    { id: 'op3', name: 'Planet Cracker', desc: 'Raise an outpost to level 75', t: (s) => maxPost(s) >= 75 },
    { id: 'thr', name: 'Lightspeed-ish', desc: 'Max out Ion Thrusters', t: (s) => s.upg.thr >= SH.UPG.thr.max },
    { id: 'las', name: 'Hot Knife', desc: 'Max out Mining Lasers', t: (s) => s.upg.laser >= SH.UPG.laser.max },
    { id: 'warp1', name: 'New Horizons', desc: 'Warp to a new system', t: (s) => s.warps >= 1 },
    { id: 'warp2', name: 'Wanderers', desc: 'Warp 3 times', t: (s) => s.warps >= 3 },
    { id: 'warp3', name: 'Star Nomads', desc: 'Warp 10 times', t: (s) => s.warps >= 10 },
  ];
  SH.ACH_BONUS = 0.02;
  SH.STARDUST_BONUS = 0.05; // production per Stardust ever earned

  // Mission chain. p(s) -> [current, goal]; tab = where the player should look.
  // reward: fixed amounts, or secs = that many seconds of current income from every world.
  SH.MISSIONS = [
    { text: 'Build ships until you own 3', tab: 'planets', p: (s) => [s.ships, 3], reward: { ore: 60 } },
    { text: 'Upgrade Ferra’s outpost to level 2', tab: 'planets', p: (s) => [s.planets[0].post, 2], reward: { ore: 100 } },
    { text: 'Build a Habitat Dome', tab: 'empire', p: (s) => [s.bld.hab, 1], reward: { ore: 150 } },
    { text: 'Survey the ice world Glacia', tab: 'planets', p: (s) => [s.planets[1].un ? 1 : 0, 1], reward: { ice: 40 } },
    { text: 'Send 3 ships to Glacia', tab: 'planets', p: (s) => [s.planets[1].ships, 3], reward: { ice: 80 } },
    { text: 'Upgrade Ion Thrusters to level 2', tab: 'ships', p: (s) => [s.upg.thr, 2], reward: { ice: 150 } },
    { text: 'Advance to the Colony era', tab: 'empire', p: (s) => [s.era, 1], reward: { secs: 60 } },
    { text: 'Build a Research Lab', tab: 'empire', p: (s) => [s.bld.lab, 1], reward: { secs: 60 } },
    { text: 'Complete a research project', tab: 'research', p: (s) => [techs(s), 1], reward: { rp: 40 } },
    { text: 'Survey the crystal world Prisma', tab: 'planets', p: (s) => [s.planets[2].un ? 1 : 0, 1], reward: { secs: 90 } },
    { text: 'Harvest a passing comet', tab: null, p: (s) => [s.stats.comets, 1], reward: { secs: 120 } },
    { text: 'Grow your fleet to 45 ships', tab: 'planets', p: (s) => [s.ships, 45], reward: { secs: 120 } },
    { text: 'Raise the Refinery to level 3', tab: 'empire', p: (s) => [s.bld.ref, 3], reward: { secs: 120 } },
    { text: 'Advance to the Settlement era', tab: 'empire', p: (s) => [s.era, 2], reward: { secs: 180 } },
    { text: 'Survey the gas giant Nimbus', tab: 'planets', p: (s) => [s.planets[3].un ? 1 : 0, 1], reward: { secs: 180 } },
    { text: 'Raise the Fleet Academy to level 3', tab: 'empire', p: (s) => [s.bld.acad, 3], reward: { secs: 180 } },
    { text: 'Raise any outpost to level 40', tab: 'planets', p: (s) => [maxPost(s), 40], reward: { secs: 240 } },
    { text: 'Advance to the City-State era', tab: 'empire', p: (s) => [s.era, 3], reward: { secs: 240 } },
    { text: 'Survey the molten world Cinder', tab: 'planets', p: (s) => [s.planets[4].un ? 1 : 0, 1], reward: { secs: 300 } },
    { text: 'Grow your fleet to 130 ships', tab: 'planets', p: (s) => [s.ships, 130], reward: { secs: 300 } },
    { text: 'Advance to the Planetary Nation era', tab: 'empire', p: (s) => [s.era, 4], reward: { secs: 300 } },
    { text: 'Survey the dark star Umbra', tab: 'planets', p: (s) => [s.planets[5].un ? 1 : 0, 1], reward: { secs: 300 } },
    { text: 'Become a Star Empire', tab: 'empire', p: (s) => [s.era, 5], reward: { secs: 600 } },
    { text: 'Open the Warp Gate and settle a new system', tab: 'legacy', p: (s) => [s.warps, 1], reward: { sd: 5 } },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
