// Every sound in the game is made here in code (no audio files).
// Each one is built once when the page loads (rendered into a buffer), so a gun sounds exactly the same every shot,
// and playing it is cheap even when several miniguns are going at once.
// sfx(name) plays one for you; sfx(name, { at: position }) plays it out in the world, panned left/right and quieter with distance.
const SR = 44100;
const BUF = {}; // name -> { buf, v }
let ac = null, bus, outGain, verbIn;
let volume = 0.8;
try { const v = parseFloat(localStorage.getItem('voxelstrike-vol')); if (v >= 0 && v <= 1) volume = v; } catch {}
function setVolume(v) { volume = v; if (outGain) outGain.gain.value = v; try { localStorage.setItem('voxelstrike-vol', v); } catch {} }

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function audio() {
  if (!ac) {
    ac = new AudioContext();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    bus = ac.createGain(); outGain = ac.createGain(); outGain.gain.value = volume;
    bus.connect(comp).connect(outGain).connect(ac.destination);
    // a short shared echo so sounds have some space around them instead of sounding flat
    const ir = ac.createBuffer(2, ac.sampleRate * 1.2, ac.sampleRate), r = rng(7); // must match the sound card's rate
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (r() * 2 - 1) * (1 - i / d.length) ** 3.5 * (i < 400 ? i / 400 : 1); }
    const verb = ac.createConvolver(); verb.buffer = ir;
    verbIn = ac.createGain(); const wet = ac.createGain(); wet.gain.value = .35;
    verbIn.connect(verb).connect(wet).connect(bus);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// browsers only allow sound after you click or press something
addEventListener('pointerdown', audio); addEventListener('keydown', audio);

// ---- building blocks used by the sound recipes below. t = start time, a = attack, d = fade time, v = loudness ----
function kit(c, seed) {
  const r = rng(seed), out = c.destination;
  const nb = c.createBuffer(1, SR * 2, SR), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  function env(node, t, a, d, v) {
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d);
    node.connect(g).connect(out);
  }
  function filt(type, f, f2, q, t, dur) {
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t); if (f2 !== f) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    return fl;
  }
  const s = {
    r,
    // an oscillator sliding from f to f2. lp/bp = optional lowpass/bandpass to soften or shape it
    tone({ type = 'sine', f, f2 = f, t = 0, a = .002, d = .1, v = .5, glide = a + d, lp = 0, bp = 0, q = 1 }) {
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f, t); if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + glide);
      let n = o;
      if (lp) n = n.connect(filt('lowpass', lp, lp, .7, t, 0));
      if (bp) n = n.connect(filt('bandpass', bp, bp, q, t, 0));
      env(n, t, a, d, v); o.start(t); o.stop(t + a + d + .02);
    },
    // filtered noise. ft = filter type, swept from f to f2
    hiss({ t = 0, a = .001, d = .1, v = .5, ft = 'lowpass', f = 2000, f2 = f, q = 1, sweep = a + d }) {
      const n = c.createBufferSource(); n.buffer = nb;
      env(n.connect(filt(ft, f, f2, q, t, sweep)), t, a, d, v);
      n.start(t, r() * 1.5); n.stop(t + a + d + .02);
    },
    // metal: a few out-of-tune partials ringing together
    ring({ f, t = 0, d = .3, v = .5, ratios = [1, 2.76, 5.4, 8.93] }) {
      ratios.forEach((k, i) => s.tone({ f: f * k, t, d: d / (1 + i * .5), v: v / (1 + i * .8) }));
    },
    click({ t = 0, f = 2500, v = .6 }) { s.hiss({ t, ft: 'bandpass', f, q: 5, d: .018, v }); s.tone({ type: 'triangle', f: f * .35, f2: f * .25, t, d: .025, v: v * .4 }); },
    // a sound drawn sample by sample. fill(array) writes it, then it's scaled so its loudest point is v
    draw(t, dur, fill, v = 1) {
      const b = c.createBuffer(1, Math.ceil(dur * SR), SR), o = b.getChannelData(0);
      fill(o);
      let pk = 0; for (let i = 0; i < o.length; i++) pk = Math.max(pk, Math.abs(o[i]));
      if (pk) for (let i = 0; i < o.length; i++) o[i] *= v / pk;
      const src = c.createBufferSource(); src.buffer = b; src.connect(out); src.start(t);
    },
    // two parts of a gun hitting: a sharp noise tick colored by a few heavily damped resonances around f.
    // They die out within a few ms so it reads as a click/clack, not a ringing glass or bell. d = how long the tick rattles.
    // body = the weight behind it (a dull noisy thud, not a tone)
    clack({ t = 0, f = 2400, d = .02, v = .8, body = 0 }) {
      const tau = Math.min(d * .12, .0025);
      const res = [[1, 1], [.55, .8], [1.8, .4]].map(([k, A]) => {
        const R = Math.exp(-1 / (tau * SR)), w = 6.2832 * f * k * (.93 + r() * .14) / SR;
        return { A: A * (1 - R) * 2 * Math.sin(w), c1: 2 * R * Math.cos(w), c2: -R * R, y1: 0, y2: 0 };
      });
      s.draw(t, d * 3 + .05 + body * .03, o => {
        let lp = 0, lp2 = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR, w = r() * 2 - 1, ex = w * (Math.exp(-x / .0006) + .08 * Math.exp(-x / (d * .4)));
          let y = ex * .5;
          for (const q of res) { const yy = ex + q.c1 * q.y1 + q.c2 * q.y2; q.y2 = q.y1; q.y1 = yy; y += yy * q.A * 6; }
          if (body) { lp += (w - lp) * .06; lp2 += (lp - lp2) * .06; y += body * lp2 * 8 * Math.exp(-x / .012); }
          o[i] = y;
        }
      }, v);
    },
    // weight landing: low rumbly noise (no pure tone) that dies away over d. f = how deep
    thud({ t = 0, d = .05, f = 140, v = .8 }) {
      const k = 1 - Math.exp(-6.2832 * f / SR);
      s.draw(t, d * 4 + .01, o => {
        let a = 0, b = 0;
        for (let i = 0; i < o.length; i++) { const x = i / SR; a += (r() * 2 - 1 - a) * k; b += (a - b) * k; o[i] = b * Math.min(1, x / .002) * Math.exp(-x / d); }
      }, v);
    },
    // lots of tiny random clicks: grass blades, sand grains, gravel. dens = how many per sample, lo-hi = the band they ring in
    crunch({ t = 0, a = .003, d = .08, dens = .05, lo = 900, hi = 5000, v = .6 }) {
      const kh = 1 - Math.exp(-6.2832 * hi / SR), kl = 1 - Math.exp(-6.2832 * lo / SR);
      s.draw(t, a + d * 3, o => {
        let g = 0, p = 0, q = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR;
          if (r() < dens) g += (r() * 2 - 1) * (.4 + r());
          g *= .7; p += (g - p) * kh; q += (p - q) * kl;
          o[i] = (p - q) * Math.min(1, x / a) * Math.exp(-Math.max(0, x - a) / (d * .45));
        }
      }, v);
    },
    // a hollow knock: noise hitting a few low resonances that die out over tau (wood, a metal deck). Low and short, so it doesn't ring
    knock({ t = 0, f = 300, tau = .02, v = .8, parts = [[1, 1], [1.58, .55], [2.37, .3]], grit = .15 }) {
      const res = parts.map(([k, A]) => {
        const R = Math.exp(-1 / (tau * SR * (1 - .25 * Math.log2(k)))), w = 6.2832 * f * k * (.96 + r() * .08) / SR;
        return { A: A * (1 - R), c1: 2 * R * Math.cos(w), c2: -R * R, y1: 0, y2: 0 };
      });
      s.draw(t, tau * 6 + .02, o => {
        for (let i = 0; i < o.length; i++) {
          const x = i / SR, ex = (r() * 2 - 1) * Math.exp(-x / .0012);
          let y = ex * grit; // grit = how much of the raw hit you hear on top of the knock
          for (const q of res) { const yy = ex + q.c1 * q.y1 + q.c2 * q.y2; q.y2 = q.y1; q.y1 = yy; y += yy * q.A * 4; }
          o[i] = y;
        }
      }, v);
    },
    // a board creaking under weight: the wood sticks and slips, an uneven tick each time (some slips skipped, some bigger),
    // at f to f2 ticks a second. Each tick rings the board's narrow, uneven resonances (res = [freq, width]).
    // The ticks are too fast and too ragged, and the ringing too high and narrow, to sound like a voice. Swells in and out over d
    creak({ t = 0, d = .12, f = 420, f2 = f * 1.25, v = .3, res = [[1380, 45], [2270, 60], [3610, 90]] }) {
      const rs = res.map(([F, bw], k) => { const R = Math.exp(-Math.PI * bw / SR); return { A: (1 - R) / (1 + k * .5), c1: 2 * R * Math.cos(6.2832 * F / SR), c2: -R * R, y1: 0, y2: 0 }; });
      s.draw(t, d + .06, o => {
        let ph = 1, jit = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR, p = Math.min(1, x / d);
          jit += (r() * 2 - 1 - jit) * .08;
          ph += f * (f2 / f) ** p * (1 + jit * 1.2) / SR;
          let ex = 0; if (ph >= 1) { ph -= 1; if (r() > .25) ex = (r() < .15 ? 1.6 : .4 + r() * .6) * (r() < .5 ? 1 : -1); }
          let y = 0;
          for (const q of rs) { const yy = ex + q.c1 * q.y1 + q.c2 * q.y2; q.y2 = q.y1; q.y1 = yy; y += yy * q.A; }
          o[i] = y * (x < d ? Math.sin(Math.PI * p) ** .8 : 0);
        }
      }, v);
    },
    // metal sliding on metal: gritty band-limited noise around f
    scrape({ t = 0, d = .08, f = 1500, v = .35 }) {
      const k1 = 1 - Math.exp(-6.2832 * f * 1.6 / SR), k2 = 1 - Math.exp(-6.2832 * f * .6 / SR);
      s.draw(t, d + .01, o => {
        let a = 0, b = 0, g = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR; a += (r() * 2 - 1 - a) * k1; b += (a - b) * k2;
          if (r() < .004) g = 1; g *= .995;
          o[i] = (a - b) * (.4 + g) * Math.sin(Math.PI * Math.min(1, x / d));
        }
      }, v);
    },
    // a human grunt or groan. A buzzing voice goes through the mouth's vowel resonances (fm = [freq, width, level]),
    // which slide toward fm2 as the mouth closes. h = the breathy "h" before the voice starts. Pitch rises from f0 to fpk
    // (the effort), then falls to f1. rough = growl/strain (every other vocal-cord cycle is weaker), rough2 = how rough it ends.
    // tail = the breath let out after
    voice({ t = 0, d = .18, f0 = 150, fpk = 190, pk = .15, f1 = 115, v = 1, h = .015, rough = .25, rough2 = rough, breath = .3, tail = .08,
      fm = [[640, 90, 1], [1190, 100, .5], [2390, 140, .22], [3300, 220, .1], [3750, 260, .06]], fm2 = fm }) {
      s.draw(t, h + d + tail + .06, o => {
        const res = fm.map(() => ({ y1: 0, y2: 0 }));
        let ph = 0, prev = 0, jit = 0, amp = 1, cyc = 0, lo = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR - h, p = Math.max(0, Math.min(1, x / d));
          let g = 0;
          if (x >= 0) {
            const f = p < pk ? f0 + (fpk - f0) * p / pk : fpk * (f1 / fpk) ** ((p - pk) / (1 - pk));
            jit += (r() * 2 - 1 - jit) * .03;
            ph += f * (1 + jit * .08) / SR;
            if (ph >= 1) { ph -= 1; cyc++; amp = (1 - r() * .35) * (cyc % 2 ? 1 - (rough + (rough2 - rough) * p) : 1); }
            g = ph < .55 ? Math.sin(Math.PI * ph / .55) ** 2 * amp : 0;
          }
          const dg = g - prev; prev = g;
          const venv = x < 0 ? 0 : Math.min(1, x / .006) * (x < d * .45 ? 1 : Math.exp(-(x - d * .45) / (d * .22)));
          const w = r() * 2 - 1;
          const asp = x < 0 ? Math.min(1, (x + h) / .004) * .8 : 0; // the "h" before it
          const out = x > d * .5 ? .45 * Math.exp(-(x - d * .5) / tail) * Math.min(1, (x - d * .5) / .03) : 0; // breathing out after
          const src = dg * 22 * venv + w * (breath * venv * (.3 + g) + (asp + out) * breath);
          let y = 0;
          fm.forEach(([F, B, A], k) => {
            const [F2, B2, A2] = fm2[k], q = res[k];
            const Fx = F + (F2 - F) * p, Bx = B + (B2 - B) * p, Ax = A + (A2 - A) * p;
            const R = Math.exp(-Math.PI * Bx / SR), yy = src + 2 * R * Math.cos(6.2832 * Fx / SR) * q.y1 - R * R * q.y2;
            q.y2 = q.y1; q.y1 = yy; y += yy * Ax;
          });
          lo += (y - lo) * .55; // take the harsh top off, so it sounds like a chest and not a speaker
          o[i] = lo;
        }
      }, v);
    },
    // a bullet hitting a body: a soft thud and a slap
    impact(t) { s.hiss({ t, f: 350, d: .05, v: .9 }); s.hiss({ t, ft: 'bandpass', f: 1500, q: 1, d: .012, v: .6 }); },
    // pieces of reloads (and the ammo pickup)
    magOut(t) { s.clack({ t, f: 3600, d: .008, v: .35 }); s.scrape({ t: t + .02, d: .1, f: 1800, v: .3 }); },
    magIn(t) { s.scrape({ t, d: .06, f: 1400, v: .3 }); s.clack({ t: t + .06, f: 1600, d: .022, v: 1, body: .9 }); s.clack({ t: t + .085, f: 3400, d: .01, v: .4 }); },
    rack(t) { s.scrape({ t, d: .07, f: 2000, v: .35 }); s.clack({ t: t + .07, f: 1900, d: .018, v: .7, body: .3 }); s.clack({ t: t + .16, f: 2300, d: .025, v: 1, body: .7 }); },
    pump(t) { s.scrape({ t, d: .07, f: 1300, v: .4 }); s.clack({ t: t + .07, f: 1500, d: .022, v: .8, body: .6 }); s.scrape({ t: t + .12, d: .05, f: 1500, v: .35 }); s.clack({ t: t + .17, f: 2000, d: .025, v: 1, body: .9 }); },
    shell(t) { s.scrape({ t, d: .05, f: 1100, v: .3 }); s.clack({ t: t + .05, f: 1250, d: .012, v: .7, body: .5 }); s.clack({ t: t + .065, f: 3000, d: .006, v: .25 }); },
    boltUp(t) { s.clack({ t, f: 2600, d: .012, v: .6 }); s.scrape({ t: t + .03, d: .1, f: 1600, v: .35 }); s.clack({ t: t + .13, f: 1800, d: .015, v: .55 }); },
    boltDown(t) { s.scrape({ t, d: .08, f: 1800, v: .35 }); s.clack({ t: t + .08, f: 2100, d: .02, v: .9, body: .5 }); s.clack({ t: t + .12, f: 2800, d: .012, v: .6 }); },
    latch(t) { s.clack({ t, f: 1500, d: .015, v: .8, body: .3 }); },
    thunk(t) { s.clack({ t, f: 750, d: .03, v: 1, body: 1.4 }); },
    rattle(t) { for (let k = 0; k < 6; k++) s.clack({ t: t + k * .035, f: 2400 + r() * 1200, d: .006, v: .3 }); },
    // pickup jingle: quick rising notes
    arp(t, notes, { type = 'triangle', gap = .055, d = .3, v = .4 } = {}) { notes.forEach((f, i) => s.tone({ type, f, t: t + i * gap, d, v })); },
  };
  return s;
}

// recipes: name -> [length in seconds, volume, build]
const SOUNDS = {
  // ---- your guns firing (bots use these too) ----
  voxel: [.3, .5, s => { // teal energy pistol: a bright "pew"
    s.tone({ type: 'square', f: 1500, f2: 320, d: .11, v: .3, lp: 3500 });
    s.tone({ f: 950, f2: 220, d: .14, v: .55 });
    s.hiss({ ft: 'bandpass', f: 3500, q: 1.5, d: .025, v: .5 });
    s.tone({ f: 120, f2: 50, d: .08, v: .6 });
  }],
  shotgun: [.75, .9, s => { // big boom, then the pump racks
    s.hiss({ f: 3200, f2: 220, d: .35, v: 1 });
    s.tone({ f: 140, f2: 40, d: .25, v: 1 });
    s.hiss({ ft: 'highpass', f: 4000, d: .02, v: .5 });
    s.pump(.38);
  }],
  ar: [.2, .42, s => { // short punchy "pap" (fires 11 times a second, so it stays tight)
    s.hiss({ ft: 'bandpass', f: 2000, f2: 900, q: .8, d: .07, v: .9 });
    s.tone({ f: 170, f2: 60, d: .06, v: .9 });
    s.click({ f: 4000, v: .35 });
  }],
  thrasher: [.2, .42, s => { // like the AR's "pap" but grittier: a raspy square-wave crunch and a brighter, rougher crack
    s.hiss({ ft: 'bandpass', f: 2600, f2: 1100, q: .7, d: .065, v: .9 });
    s.tone({ f: 190, f2: 65, d: .055, v: .85 });
    s.tone({ type: 'square', f: 230, f2: 90, d: .05, v: .32, lp: 2200 });
    s.tone({ type: 'sawtooth', f: 115, f2: 70, d: .04, v: .2, lp: 1400 });
    s.click({ f: 4800, v: .4 });
  }],
  sniper: [1.05, 1, s => { // sharp crack, rolling boom, then the bolt cycles
    s.hiss({ ft: 'highpass', f: 3000, d: .03, v: 1 });
    s.hiss({ f: 4000, f2: 150, d: .6, v: .9 });
    s.tone({ f: 100, f2: 30, d: .45, v: 1 });
    s.tone({ type: 'square', f: 300, f2: 60, d: .15, v: .3, lp: 800 });
    s.boltUp(.55); s.boltDown(.72);
  }],
  semisniper: [.55, .9, s => { // a tighter, punchier crack than the bolt-action and a shorter boom, then the action snaps back on its own
    s.hiss({ ft: 'highpass', f: 3400, d: .025, v: 1 });
    s.hiss({ f: 3600, f2: 220, d: .32, v: .75 });
    s.tone({ f: 130, f2: 40, d: .26, v: .9 });
    s.tone({ type: 'square', f: 360, f2: 90, d: .09, v: .28, lp: 1100 });
    s.clack({ t: .07, f: 2300, d: .012, v: .5, body: .3 }); s.clack({ t: .1, f: 3000, d: .01, v: .35 });
  }],
  eradicator: [.12, .32, s => { // tiny "tk" with a thump; the motor whir is a separate live sound
    s.hiss({ ft: 'bandpass', f: 1500, f2: 700, d: .045, v: .9 });
    s.tone({ f: 150, f2: 70, d: .05, v: .8 });
    s.click({ f: 3500, v: .25 });
  }],
  flameStart: [.45, .5, s => { // "fwoomp" when the flamethrower lights up
    s.hiss({ f: 250, f2: 1600, a: .05, d: .3, v: 1, sweep: .12 });
    s.tone({ f: 70, f2: 120, a: .04, d: .3, v: .6 });
  }],
  flameEnd: [.3, .35, s => { s.hiss({ f: 900, f2: 200, d: .25, v: 1 }); }],
  rocket: [.8, .85, s => { // thump out of the tube and a whoosh
    s.tone({ f: 90, f2: 40, d: .2, v: 1 });
    s.hiss({ ft: 'bandpass', f: 300, f2: 2500, q: 2, a: .05, d: .55, v: .8 });
    s.click({ f: 900, v: .5 });
  }],
  boom: [1.6, 1, s => { // rockets and exploders
    s.hiss({ f: 1800, f2: 80, a: .004, d: 1.3, v: 1 });
    s.tone({ f: 70, f2: 25, d: .7, v: 1 });
    s.hiss({ ft: 'highpass', f: 2500, d: .05, v: .6 });
    s.tone({ type: 'square', f: 120, f2: 40, d: .4, v: .35, lp: 400 });
    s.hiss({ f: 220, t: .05, a: .05, d: 1.1, v: .6 });
  }],
  flare: [.5, .55, s => { // "ploomp" and a fizzing hiss
    s.tone({ f: 260, f2: 110, d: .1, v: 1 });
    s.hiss({ ft: 'highpass', f: 2500, f2: 6000, a: .02, d: .35, v: .45 });
    s.click({ f: 1200, v: .3 });
  }],
  flareHit: [.6, .6, s => { // burst of sparks
    s.hiss({ ft: 'bandpass', f: 1500, f2: 400, d: .35, v: .9 });
    s.tone({ f: 180, f2: 60, d: .15, v: .7 });
    for (let k = 0; k < 7; k++) s.click({ t: .04 + s.r() * .4, f: 2500 + s.r() * 3000, v: .3 });
  }],
  hitman: [.25, .32, s => { // suppressed: a soft "thwp" and the slide clacking back, no bang
    s.hiss({ ft: 'bandpass', f: 1300, f2: 500, q: 1.2, d: .045, v: 1 });
    s.thud({ d: .025, f: 220, v: .7 });
    s.clack({ t: .012, f: 3200, d: .01, v: .55 }); s.clack({ t: .05, f: 2600, d: .012, v: .4 });
  }],
  heatStart: [.3, .45, s => { // the beam catching: a quick rising zap
    s.tone({ f: 300, f2: 1800, d: .14, v: .5, glide: .1 });
    s.tone({ type: 'square', f: 150, f2: 420, d: .14, v: .2, lp: 2000, glide: .1 });
    s.hiss({ ft: 'highpass', f: 4000, d: .08, v: .35 });
  }],
  heatEnd: [.25, .3, s => { s.tone({ f: 1400, f2: 300, d: .13, v: .4 }); s.hiss({ f: 2200, f2: 400, d: .12, v: .3 }); }],
  djump: [.25, .4, s => { s.hiss({ ft: 'bandpass', f: 350, f2: 1500, q: 2, a: .03, d: .14, v: .8, sweep: .16 }); s.tone({ f: 260, f2: 560, d: .1, v: .22 }); }], // Raider Boots' second jump: a quick puff of air
  swing: [.25, .45, s => { s.hiss({ ft: 'bandpass', f: 500, f2: 2800, q: 3, a: .06, d: .12, v: 1, sweep: .14 }); }], // knife whoosh
  slash: [.2, .6, s => { // knife connecting: a metal "shing" and a thud
    s.hiss({ ft: 'highpass', f: 3000, f2: 6000, d: .06, v: .8 });
    s.tone({ f: 2600, f2: 2400, d: .14, v: .25 }); s.tone({ f: 3900, d: .08, v: .15 });
    s.tone({ f: 160, f2: 70, d: .06, v: .6 });
  }],
  // ---- aiming down a scope or holo sight (zin_ = in, zout_ = out). Same every time, no glassy ring ----
  zin_sniper: [.4, .42, s => { // stock pulled into the shoulder, then the zoom ring turns three notches
    s.hiss({ ft: 'bandpass', f: 500, f2: 1400, q: 1.5, a: .03, d: .07, v: .6, sweep: .09 });
    s.thud({ t: .07, d: .03, f: 130, v: .9 });
    s.clack({ t: .08, f: 1500, d: .014, v: .5, body: .5 });
    for (let k = 0; k < 3; k++) s.clack({ t: .16 + k * .045, f: 3000 + k * 250, d: .005, v: .3 });
  }],
  zout_sniper: [.3, .36, s => { // ring clicks back, the stock leaves your shoulder
    for (let k = 0; k < 2; k++) s.clack({ t: k * .04, f: 3200 - k * 250, d: .005, v: .28 });
    s.hiss({ ft: 'bandpass', f: 1300, f2: 450, q: 1.5, a: .02, d: .08, v: .5, sweep: .1 });
    s.clack({ t: .11, f: 1300, d: .012, v: .3, body: .3 });
  }],
  zin_semisniper: [.32, .4, s => { // stock into the shoulder, then two quick notches on the zoom ring
    s.hiss({ ft: 'bandpass', f: 550, f2: 1500, q: 1.5, a: .025, d: .06, v: .55, sweep: .08 });
    s.thud({ t: .06, d: .025, f: 150, v: .8 });
    s.clack({ t: .07, f: 1700, d: .012, v: .45, body: .4 });
    for (let k = 0; k < 2; k++) s.clack({ t: .14 + k * .04, f: 3400 + k * 300, d: .005, v: .28 });
  }],
  zout_semisniper: [.25, .34, s => {
    s.clack({ f: 3500, d: .005, v: .26 });
    s.hiss({ ft: 'bandpass', f: 1400, f2: 500, q: 1.5, a: .02, d: .07, v: .45, sweep: .09 });
    s.clack({ t: .09, f: 1400, d: .012, v: .28, body: .3 });
  }],
  zin_thrasher: [.3, .4, s => { // rifle snaps up and the holo sight blinks on with a short rising chirp
    s.hiss({ ft: 'bandpass', f: 600, f2: 1800, q: 1.4, a: .02, d: .06, v: .55, sweep: .07 });
    s.clack({ t: .05, f: 1800, d: .012, v: .55, body: .4 });
    s.tone({ type: 'square', f: 1100, f2: 1700, t: .07, a: .004, d: .05, v: .16, lp: 2600, glide: .04 });
  }],
  zout_thrasher: [.25, .34, s => { // the chirp drops as it shuts off and the rifle comes down
    s.tone({ type: 'square', f: 1500, f2: 900, a: .004, d: .045, v: .14, lp: 2400, glide: .04 });
    s.hiss({ ft: 'bandpass', f: 1600, f2: 550, q: 1.4, a: .015, d: .07, v: .45, sweep: .08 });
  }],
  zin_hitman: [.22, .32, s => { // a light pistol: quick lift, small tick and a tiny high blip
    s.hiss({ ft: 'bandpass', f: 900, f2: 2200, q: 1.6, a: .015, d: .045, v: .45, sweep: .05 });
    s.clack({ t: .035, f: 2800, d: .007, v: .4 });
    s.tone({ type: 'square', f: 1900, f2: 2400, t: .05, a: .003, d: .035, v: .12, lp: 3200, glide: .025 });
  }],
  zout_hitman: [.18, .28, s => {
    s.tone({ type: 'square', f: 2200, f2: 1500, a: .003, d: .03, v: .1, lp: 3000, glide: .025 });
    s.hiss({ ft: 'bandpass', f: 2000, f2: 800, q: 1.6, a: .01, d: .05, v: .4, sweep: .06 });
  }],
  dry: [.1, .5, s => { s.clack({ f: 2800, d: .01, v: .8 }); }],
  equip: [.25, .4, s => { s.scrape({ d: .07, f: 1500, v: .4 }); s.clack({ t: .07, f: 2200, d: .015, v: .8, body: .3 }); }],

  // ---- reloads: one per gun, timed to the gun's base reload. Upgrades make reloads faster, so these just play faster too ----
  r_voxel: [1, .45, s => { // mag out, mag in, then the teal charge-up
    s.magOut(.08); s.magIn(.32);
    s.tone({ type: 'square', f: 300, f2: 1600, t: .55, a: .2, d: .08, v: .2, lp: 2500, glide: .25 });
    s.tone({ f: 600, f2: 2400, t: .55, a: .2, d: .08, v: .3, glide: .25 });
    s.tone({ f: 2400, t: .82, d: .15, v: .3 });
  }],
  r_shotgun: [1.6, .45, s => { for (const t of [.15, .45, .75, 1.05]) s.shell(t); s.pump(1.3); }],
  r_ar: [1.4, .45, s => { s.magOut(.15); s.magIn(.7); s.rack(1.05); }],
  r_thrasher: [1.5, .45, s => { s.magOut(.15); s.magIn(.72); s.clack({ t: .82, f: 1800, d: .015, v: .5, body: .3 }); s.rack(1.12); }],
  r_sniper: [2, .45, s => { s.boltUp(.15); s.magOut(.45); s.magIn(1.1); s.boltDown(1.6); }],
  r_semisniper: [1.8, .45, s => { s.magOut(.2); s.magIn(.9); s.clack({ t: 1.0, f: 1600, d: .015, v: .5, body: .3 }); s.rack(1.4); }],
  r_eradicator: [2.6, .45, s => { s.latch(.2); s.rattle(.9); s.rattle(1.4); s.latch(2.0); s.tone({ type: 'sawtooth', f: 60, f2: 180, t: 2.15, a: .2, d: .2, v: .15, lp: 900 }); }],
  r_flame: [2.2, .45, s => { s.latch(.15); s.hiss({ ft: 'highpass', f: 3000, t: .45, a: .05, d: .35, v: .5 }); s.thunk(1.2); s.latch(1.75); s.clack({ t: 1.95, f: 4000, d: .008, v: .5 }); s.hiss({ t: 1.98, f: 400, f2: 1200, d: .15, v: .5 }); }],
  r_rocket: [2.6, .45, s => { s.latch(.3); s.hiss({ ft: 'bandpass', f: 600, f2: 300, q: 2, t: 1.0, a: .1, d: .25, v: .5 }); s.thunk(1.35); s.latch(2.1); }],
  r_flare: [1.3, .45, s => { s.latch(.1); s.shell(.6); s.latch(1.0); }],
  r_hitman: [1.1, .45, s => { s.magOut(.08); s.magIn(.5); s.rack(.82); }],
  r_heatray: [2, .45, s => { // vent the heat, swap the cell, then it charges back up
    s.latch(.12); s.hiss({ ft: 'highpass', f: 3500, f2: 1500, t: .18, a: .03, d: .45, v: .5 });
    s.magOut(.8); s.magIn(1.2);
    s.tone({ f: 400, f2: 2000, t: 1.5, a: .25, d: .1, v: .28, glide: .3 }); s.tone({ f: 2000, t: 1.85, d: .12, v: .25 });
  }],

  // ---- getting hit. These play from whoever got hit, so a far-away hit is barely audible ----
  // a short, strained "hgh!" pushed out of the chest, the mouth closing toward "uhm"
  hurt: [.25, .5, s => {
    s.impact(0);
    s.voice({ t: .005, h: .015, d: .1, f0: 135, fpk: 185, pk: .2, f1: 110, rough: .3, rough2: .55, breath: .35, tail: .03,
      fm2: [[480, 100, 1], [1050, 110, .45], [2300, 150, .18], [3300, 240, .08], [3750, 280, .05]] });
  }],
  hurtHead: [.3, .55, s => { // same grunt, sharper, with a hard crack on top
    s.impact(0); s.clack({ f: 1300, d: .012, v: .7, body: .7 }); s.hiss({ ft: 'bandpass', f: 3200, q: 1.2, d: .02, v: .5 });
    s.voice({ t: .01, h: .01, d: .1, f0: 150, fpk: 205, pk: .15, f1: 115, rough: .35, rough2: .6, breath: .4, tail: .03, v: .9,
      fm2: [[480, 100, 1], [1050, 110, .45], [2300, 150, .18], [3300, 240, .08], [3750, 280, .05]] });
  }],
  armorHit: [.3, .55, s => { s.clack({ f: 1100, d: .02, v: 1, body: .8 }); s.hiss({ ft: 'bandpass', f: 2800, q: 1.3, d: .03, v: .45 }); }], // bullet into a plate
  // a groan that strains up, breaks into a rough fry, and fades out on a last breath ("aAAghh...hhh")
  die: [.65, .55, s => {
    s.impact(0);
    s.voice({ t: .005, h: .02, d: .35, f0: 140, fpk: 200, pk: .12, f1: 75, rough: .2, rough2: .85, breath: .45, tail: .12,
      fm: [[750, 100, 1], [1180, 110, .55], [2500, 150, .22], [3400, 230, .1], [3800, 270, .06]],
      fm2: [[520, 120, 1], [1000, 130, .4], [2350, 170, .15], [3300, 260, .06], [3750, 300, .04]] });
  }],

  // ---- kills (only for yours) ----
  kill: [.45, .55, s => { s.tone({ f: 120, f2: 60, d: .1, v: .8 }); s.tone({ type: 'triangle', f: 1046, t: .02, d: .3, v: .6 }); s.tone({ f: 2093, t: .02, d: .15, v: .2 }); }],
  killSpecial: [.85, .65, s => { // headshots and streaks
    s.tone({ f: 100, f2: 50, d: .12, v: .8 });
    s.arp(0, [784, 1046, 1318, 1568], { gap: .06, d: .35, v: .5 });
    s.hiss({ ft: 'highpass', f: 7000, t: .1, a: .05, d: .4, v: .25 });
  }],

  // ---- moving ----
  // footsteps and landings (step_<surface>, step_<surface>2 for the other foot, land_<surface>) are made from FOOT below

  // ---- pickups ----
  pickHealth: [.75, .5, s => { // sparkly "bling"
    s.arp(0, [1318, 1661, 1976, 2637], { gap: .05, d: .3, v: .45 });
    s.tone({ f: 3951, t: .15, d: .4, v: .15 });
    s.hiss({ ft: 'highpass', f: 8000, a: .05, d: .35, v: .15 });
  }],
  pickAmmo: [.45, .6, s => { s.magOut(0); s.magIn(.14); }],
  pickArmor: [.5, .65, s => { // a strap pulled tight, then the plates settling on
    s.scrape({ d: .1, f: 900, v: .4 });
    s.clack({ t: .1, f: 900, d: .025, v: 1, body: 1 }); s.clack({ t: .19, f: 1300, d: .015, v: .55, body: .5 });
  }],

  // ---- zombies ----
  zAttack: [.35, .6, s => { s.hiss({ ft: 'bandpass', f: 600, f2: 1800, q: 2, a: .03, d: .1, v: .7 }); s.tone({ type: 'sawtooth', f: 140, f2: 90, d: .2, v: .6, bp: 600, q: 2 }); s.tone({ f: 100, f2: 50, t: .08, d: .08, v: .6 }); }],
  zDie: [.6, .55, s => { s.tone({ type: 'sawtooth', f: 180, f2: 60, a: .02, d: .45, v: .8, bp: 600, q: 2 }); }],
  fuse: [.08, .4, s => { s.tone({ type: 'square', f: 1500, d: .05, v: .5, lp: 4000 }); }],
  bossRoar: [1.4, .85, s => {
    s.tone({ type: 'sawtooth', f: 110, f2: 70, a: .1, d: 1.1, v: .9, bp: 500, q: 2 });
    s.tone({ type: 'sawtooth', f: 83, f2: 55, a: .1, d: 1.0, v: .6, bp: 900, q: 3 });
    s.hiss({ f: 600, a: .1, d: 1, v: .5 });
  }],
  bossCharge: [.6, .7, s => { s.tone({ type: 'sawtooth', f: 60, f2: 130, a: .05, d: .4, v: .8, lp: 600 }); s.hiss({ ft: 'bandpass', f: 300, f2: 900, a: .05, d: .4, v: .6 }); }],
  bonk: [.4, .6, s => { s.tone({ f: 420, f2: 200, d: .2, v: .7 }); s.clack({ f: 800, d: .02, v: .8, body: 1 }); }],
  smash: [.5, .8, s => { s.tone({ f: 120, f2: 40, d: .3, v: 1 }); s.hiss({ f: 1000, f2: 100, d: .3, v: .8 }); }],

  // ---- menus and match events ----
  ui: [.06, .3, s => { s.tone({ f: 900, f2: 700, d: .04, v: .6 }); s.click({ f: 3000, v: .3 }); }],
  buy: [.4, .45, s => { s.tone({ type: 'square', f: 988, d: .06, v: .35, lp: 3000 }); s.tone({ type: 'square', f: 1318, t: .07, d: .25, v: .35, lp: 3000 }); }],
  upgrade: [.6, .45, s => { s.arp(0, [523, 659, 784, 1046, 1318], { gap: .05, d: .25, v: .4 }); }],
  join: [.3, .25, s => { s.tone({ type: 'triangle', f: 660, d: .1, v: .5 }); s.tone({ type: 'triangle', f: 880, t: .08, d: .15, v: .5 }); }],
  tick: [.1, .3, s => { s.tone({ type: 'square', f: 1000, d: .05, v: .5, lp: 2000 }); }],
  waveStart: [.9, .5, s => { s.tone({ type: 'sawtooth', f: 220, a: .02, d: .6, v: .5, lp: 1200 }); s.tone({ type: 'sawtooth', f: 330, t: .2, a: .02, d: .5, v: .5, lp: 1200 }); }],
  win: [1.1, .5, s => { s.arp(0, [523, 659, 784], { gap: .1, d: .25, v: .45 }); s.tone({ type: 'triangle', f: 1046, t: .3, d: .7, v: .5 }); }],
  lose: [1, .45, s => { s.arp(0, [523, 440, 349], { gap: .15, d: .35, v: .45 }); }],
  levelUp: [.9, .5, s => { s.arp(0, [523, 784, 1046, 1568, 2093], { gap: .045, d: .4, v: .4 }); s.hiss({ ft: 'highpass', f: 7000, t: .15, a: .05, d: .5, v: .2 }); }],
};

// one foot coming down on each surface at time t. k = pitch (the two feet differ a little), w = how hard
const FOOT = {
  grass(s, t, k, w) {
    s.thud({ t, d: .04, f: 120 * k, v: .8 * w });
    s.crunch({ t, d: .075, dens: .04, lo: 800 * k, hi: 4500 * k, v: .9 * w }); // the blades crushing
    s.hiss({ t, f: 1500 * k, f2: 500, a: .003, d: .07, v: .3 * w });
  },
  sand(s, t, k, w) {
    s.thud({ t, d: .05, f: 110 * k, v: .7 * w });
    s.crunch({ t, a: .012, d: .12, dens: .3, lo: 1500 * k, hi: 7000, v: .75 * w }); // fine grains shifting
    s.hiss({ t, ft: 'bandpass', f: 2600 * k, f2: 1100, q: .7, a: .01, d: .11, v: .4 * w });
  },
  wood(s, t, k, w) { // a hollow plank knock with a little scuff
    s.thud({ t, d: .035, f: 160 * k, v: .8 * w });
    s.knock({ t, f: 240 * k, tau: .022, v: w, parts: [[1, 1], [1.47, .6], [2.3, .35], [3.1, .15]] });
    s.crunch({ t, d: .02, dens: .03, lo: 2000, hi: 6000, v: .2 * w });
  },
  stone(s, t, k, w) { // a hard heel tap and a gritty scuff
    s.thud({ t, d: .03, f: 150 * k, v: .6 * w });
    s.clack({ t, f: 2200 * k, d: .01, v: .65 * w, body: .6 });
    s.scrape({ t: t + .004, d: .045, f: 2800 * k, v: .3 * w });
  },
  metal(s, t, k, w) { // a dull clunk on an iron deck
    s.thud({ t, d: .035, f: 150 * k, v: .7 * w });
    s.knock({ t, f: 520 * k, tau: .03, v: .8 * w, grit: .04, parts: [[1, 1], [2.03, .45], [2.9, .4], [4.2, .2]] });
    s.clack({ t, f: 1500 * k, d: .006, v: .12 * w });
  },
};
// creaks under the boards: [step, other foot, landing]. Each sounds a little different, but the same every time
const CREAK = [{ t: .045, d: .11, f: 380, f2: 470, v: .16 },
  { t: .05, d: .09, f: 460, f2: 400, v: .13, res: [[1520, 50], [2490, 65], [3880, 95]] },
  { t: .035, d: .16, f: 340, f2: 430, v: .2, res: [[1290, 45], [2120, 60], [3420, 90]] }];
const AFTER = { wood: (s, n) => s.creak(CREAK[n]) };
for (const [surf, foot] of Object.entries(FOOT)) {
  const toe = .05, after = AFTER[surf] || (() => {}); // heel, then the rest of the foot rolling down
  SOUNDS['step_' + surf] = [.32, .38, s => { foot(s, 0, 1, 1); foot(s, toe, 1.08, .45); after(s, 0); }];
  SOUNDS['step_' + surf + '2'] = [.32, .38, s => { foot(s, 0, .93, 1); foot(s, toe + .006, 1, .45); after(s, 1); }];
  SOUNDS['land_' + surf] = [.38, .5, s => { s.thud({ d: .04, f: 170, v: .55 }); foot(s, 0, .95, 1.1); foot(s, .022, 1, .85); after(s, 2); }]; // both feet, nearly together
}
// falling into deep water: the slap, the spray coming back down, and bubbles rising after
SOUNDS.splash = [1.1, .8, s => {
  s.thud({ d: .07, f: 130, v: .7 });
  s.hiss({ ft: 'lowpass', f: 5500, f2: 1500, a: .002, d: .07, v: .9 });
  s.hiss({ ft: 'bandpass', f: 2600, f2: 700, q: .8, a: .02, d: .42, v: .65, sweep: .5 });
  s.crunch({ t: .03, a: .02, d: .32, dens: .02, lo: 900, hi: 6500, v: .5 });
  for (let i = 0; i < 16; i++) { const t = .04 + s.r() ** 1.5 * .75, f = 380 + s.r() * 900; s.tone({ f, f2: f * 1.7, t, a: .003, d: .03 + s.r() * .05, v: .22 * (1 - t * .9) }); }
}];
const FOOT_OK = s => FOOT[s] ? s : 'stone';

// small close-up sounds (gun handling, voices, steps) get much less of the shared echo, so clicks don't smear into a ringing room
const CLOSE = /^(r_|zin_|zout_|dry$|equip$|pick|hurt|die$|armorHit$|step_|land_|ui$|slash$)/;
// render every recipe into a buffer, scaled so its loudest point is the same for all of them
const soundsReady = Promise.all(Object.entries(SOUNDS).map(async ([name, [len, v, build]], i) => {
  const c = new OfflineAudioContext(1, Math.ceil(SR * len), SR);
  build(kit(c, 1000 + i));
  const buf = await c.startRendering(), d = buf.getChannelData(0);
  let peak = 0; for (let k = 0; k < d.length; k++) peak = Math.max(peak, Math.abs(d[k]));
  if (peak > 0) for (let k = 0; k < d.length; k++) d[k] /= peak;
  BUF[name] = { buf, v, echo: CLOSE.test(name) ? .2 : 1 };
}));
soundsReady.catch(e => console.warn('sound setup failed', e));

// play a sound. at = where it happens in the world (leave it out for your own sounds).
// v = volume, rate = speed (also raises/lowers the pitch), far = distance where it fades out completely.
function sfx(name, { at = null, v = 1, rate = 1, far = 60 } = {}) {
  if (!ac || ac.state !== 'running' || !BUF[name]) return null;
  let gain = BUF[name].v * v, pan = 0, cut = 20000, send = .1;
  if (at) {
    const dx = at.x - camera.position.x, dz = at.z - camera.position.z, dy = (at.y || 0) + 1 - camera.position.y;
    const d = Math.hypot(dx, dy, dz);
    if (d >= far) return null;
    gain *= (1 - d / far) ** 1.5 / (1 + d / 6);
    // which side it's on, relative to where you're looking (you look down -z when yaw is 0)
    const yaw = camera.rotation.y, dh = Math.hypot(dx, dz);
    if (dh > .01) {
      const right = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / dh, ahead = (-dx * Math.sin(yaw) - dz * Math.cos(yaw)) / dh;
      pan = right * .85 * Math.min(1, dh / 1.5);
      cut = 20000 / (1 + d / 10) * (ahead < -.3 ? .55 : 1); // further away and behind you = more muffled
    }
    send = .12 + .45 * d / far;
  }
  if (gain < .002) return null;
  const src = ac.createBufferSource(); src.buffer = BUF[name].buf; src.playbackRate.value = rate;
  const g = ac.createGain(); g.gain.value = gain;
  let n = src.connect(g);
  if (cut < 19000) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(600, cut); n = n.connect(lp); }
  if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; n = n.connect(p); }
  n.connect(bus);
  const sg = ac.createGain(); sg.gain.value = send * BUF[name].echo; n.connect(sg).connect(verbIn);
  src.start();
  return src;
}
function stopSfx(src) { try { src?.stop(); } catch {} }

// hit sounds come from whoever got hit, at most one every 0.07s each (so a shotgun blast is one "uhf", not nine)
function hurtSfx(who, name, at, opts = {}) {
  if (!ac) return;
  if (who._sndT > ac.currentTime - .07) return;
  who._sndT = ac.currentTime;
  sfx(name, { at, far: 30, ...opts });
}

// ---- sounds that keep going while something is held: the flamethrower, the eradicator's motor and the heat ray ----
let flameHeld = 0, flameOn = false, flameLoop = null, flameGain = null, spinOsc = null, spinGain = null;
let beamHeld = 0, beamOn = false, beamGain = null;
function flameBuffer() { // 2 seconds of roaring, crackling fire that loops without a seam
  const n = SR * 2, x = SR / 10, r = rng(99), raw = new Float32Array(n + x);
  let lo = 0, lo2 = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = r() * 2 - 1; lo += (w - lo) * .08; lo2 += (w - lo2) * .015;
    raw[i] = lo * 1.6 + lo2 * 3 + (r() < .0012 ? (r() * 2 - 1) * 1.5 : 0);
  }
  const buf = ac.createBuffer(1, n, SR), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = raw[i] * .5;
  for (let i = 0; i < x; i++) d[i] = (raw[i] * (i / x) + raw[n + i] * (1 - i / x)) * .5; // blend the end into the start
  return buf;
}
// called every frame. live = false while the game isn't running (lobby, shop, death screen), so held sounds stop
function soundTick(dt, live) {
  if (!ac || ac.state !== 'running') return;
  const t = ac.currentTime;
  flameHeld = live ? flameHeld - dt : 0;
  const fOn = flameHeld > 0;
  if (fOn && !flameLoop) {
    flameLoop = ac.createBufferSource(); flameLoop.buffer = flameBuffer(); flameLoop.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    flameGain = ac.createGain(); flameGain.gain.value = 0;
    flameLoop.connect(lp).connect(flameGain).connect(bus); flameLoop.start();
  }
  if (fOn !== flameOn) { flameOn = fOn; sfx(fOn ? 'flameStart' : 'flameEnd'); flameGain?.gain.setTargetAtTime(fOn ? .45 : 0, t, fOn ? .04 : .08); }
  // eradicator motor: whirs up while the barrels spin and winds down after
  const spin = live && gunSpin ? gunSpinV / 30 : 0;
  if (spin > 0 && !spinOsc) {
    spinOsc = ac.createOscillator(); spinOsc.type = 'sawtooth';
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    spinGain = ac.createGain(); spinGain.gain.value = 0;
    spinOsc.connect(lp).connect(spinGain).connect(bus); spinOsc.start();
  }
  if (spinOsc) { spinOsc.frequency.setTargetAtTime(50 + spin * 130, t, .05); spinGain.gain.setTargetAtTime(spin * .07, t, .05); }
  // heat ray: a buzzing hum with a fast shimmer while the beam is on
  beamHeld = live ? beamHeld - dt : 0;
  const bOn = beamHeld > 0;
  if (bOn && !beamGain) {
    beamGain = ac.createGain(); beamGain.gain.value = 0;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.5;
    const lfo = ac.createOscillator(), depth = ac.createGain(); lfo.frequency.value = 11; depth.gain.value = 9;
    for (const [type, f] of [['sawtooth', 110], ['square', 221]]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; lfo.connect(depth).connect(o.frequency); o.connect(bp); o.start(); }
    bp.connect(beamGain).connect(bus); lfo.start();
  }
  if (bOn !== beamOn) { beamOn = bOn; sfx(bOn ? 'heatStart' : 'heatEnd'); beamGain?.gain.setTargetAtTime(bOn ? .1 : 0, t, bOn ? .03 : .06); }
}
function soundsOff() { flameHeld = 0; if (flameGain) flameGain.gain.value = 0; flameOn = false; if (spinGain) spinGain.gain.value = 0; beamHeld = 0; beamOn = false; if (beamGain) beamGain.gain.value = 0; }
