/* Starhaul — tiny synthesized sound effects (no audio files) */
(function () {
  'use strict';
  const SH = window.SH;
  const A = (SH.A = {});
  let ac = null, master = null;

  A.unlock = function () {
    try {
      if (!ac) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.5;
        master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
  };

  function tone(freq, dur, type, vol, to, delay) {
    const t0 = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  const seq = (notes, step, dur, type, vol) => notes.forEach((f, i) => tone(f, dur, type, vol, 0, i * step));

  A.play = function (name) {
    const s = SH.G.s;
    if (!ac || !s || !s.opts.sound || ac.state !== 'running') return;
    try {
      switch (name) {
        case 'buy': tone(420, 0.09, 'triangle', 0.16, 640); tone(640, 0.1, 'sine', 0.1, 0, 0.05); break;
        case 'deny': tone(170, 0.11, 'square', 0.05, 120); break;
        case 'ui': tone(700, 0.04, 'sine', 0.07); break;
        case 'claim': seq([523, 659, 784], 0.07, 0.16, 'triangle', 0.15); break;
        case 'unlock': seq([392, 523, 659, 784, 1047], 0.08, 0.26, 'triangle', 0.16); break;
        case 'era': seq([262, 330, 392, 523, 659, 784, 1047], 0.09, 0.4, 'sawtooth', 0.07); seq([131, 196], 0.3, 0.7, 'sine', 0.16); break;
        case 'ach': seq([659, 880, 1175], 0.09, 0.22, 'sine', 0.14); break;
        case 'cometSpawn': seq([1319, 1568, 2093], 0.06, 0.18, 'sine', 0.06); break;
        case 'comet': seq([784, 988, 1175, 1568, 1976], 0.05, 0.24, 'triangle', 0.14); break;
        case 'tech': seq([440, 554, 659, 880], 0.07, 0.22, 'sine', 0.14); break;
        case 'warp': tone(90, 1.4, 'sawtooth', 0.12, 1800); tone(180, 1.4, 'sine', 0.14, 2400, 0.1); break;
      }
    } catch (e) { /* audio is optional */ }
  };
  A.buzz = function (ms) {
    const s = SH.G.s;
    if (s && s.opts.haptic && navigator.vibrate) {
      try { navigator.vibrate(ms || 8); } catch (e) { /* ignore */ }
    }
  };
})();
