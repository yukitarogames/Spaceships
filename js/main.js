/* Starhaul — boot, main loop, saving */
(function () {
  'use strict';
  const SH = window.SH;
  const G = SH.G, R = SH.R, UI = SH.UI;
  SH.BUILD = '1.0.0';
  const KEY = 'starhaul.save.v1';
  let saveTimer = 0, hiddenAt = 0, last = 0;

  const store = {
    get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); return true; } catch (e) { return false; } },
    del() { try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ } },
  };

  SH.save = {
    now() { store.set(G.serialize()); },
    soon() {
      if (saveTimer) return;
      saveTimer = setTimeout(() => { saveTimer = 0; SH.save.now(); }, 1500);
    },
    exportCode() { return btoa(unescape(encodeURIComponent(G.serialize()))); },
    importCode(code) {
      try {
        const raw = JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));
        if (!raw || typeof raw !== 'object' || !raw.res || !Array.isArray(raw.planets)) return false;
        if (!G.init(raw)) return false;
        SH.save.now();
        return true;
      } catch (e) { return false; }
    },
    wipe() { store.del(); G.init(null); },
  };

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    if (dt > 1) {
      // a long stall that wasn't a tab switch: catch up analytically
      if (!hiddenAt) G.fastForward(Math.min(dt, 3600), 1);
      dt = 0.016;
    } else G.tick(dt);
    R.frame(Math.min(dt, 0.05));
    UI.tick(dt);
    requestAnimationFrame(frame);
  }

  function boot() {
    const loaded = G.init(store.get());
    R.init(document.getElementById('map'));
    UI.init();
    if (loaded) {
      const away = (Date.now() - G.s.last) / 1000;
      if (away > 60) UI.showOffline(G.offline(away));
      else if (away > 1) G.fastForward(away, 1);
    }
    if (!G.s.opts.intro) UI.showIntro();

    const wrap = document.getElementById('mapwrap');
    if (window.ResizeObserver) new ResizeObserver(() => R.resize()).observe(wrap);
    window.addEventListener('resize', () => R.resize());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        SH.save.now();
      } else if (hiddenAt) {
        const away = (Date.now() - hiddenAt) / 1000;
        hiddenAt = 0;
        last = performance.now();
        if (away > 90) UI.showOffline(G.offline(away));
        else if (away > 0.5) G.fastForward(away, 1);
      }
    });
    window.addEventListener('pagehide', () => SH.save.now());
    setInterval(() => { if (!document.hidden) SH.save.now(); }, 10000);

    // keep the page from zooming / scrolling like a document
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());

    last = performance.now();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
