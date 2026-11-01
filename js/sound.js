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
    // two metal parts hitting: a noise tick plus a few short out-of-tune rings. body = the weight behind it (a dull noisy thud, not a tone)
    clack({ t = 0, f = 2400, d = .02, v = .8, body = 0 }) {
      const modes = [1, 1.52, 2.17, 2.94, 3.81].map((k, i) => [f * k * (.96 + r() * .08), 1 / (1 + i * .7), r() * 6.28, d / (1 + i * .35)]);
      s.draw(t, d * 5 + .04, o => {
        let lp = 0, lp2 = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR, w = r() * 2 - 1;
          let y = w * Math.exp(-x / .0015) * .9;
          for (const [fr, a, ph, dd] of modes) y += a * Math.sin(6.2832 * fr * x + ph) * Math.exp(-x / dd);
          if (body) { lp += (w - lp) * .06; lp2 += (lp - lp2) * .06; y += body * lp2 * 8 * Math.exp(-x / .012); }
          o[i] = y;
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
    // a short vocal grunt: a buzzing voice through vowel resonances, pitch sliding f0 -> f1
    voice({ t = 0, d = .18, f0 = 170, f1 = 120, v = 1, fm = [[640, 80, 1], [1190, 90, .5], [2390, 120, .22]], breath = .25 }) {
      s.draw(t, d * 1.6 + .05, o => {
        const res = fm.map(([F, B, A]) => ({ A, c1: 2 * Math.exp(-Math.PI * B / SR) * Math.cos(2 * Math.PI * F / SR), c2: -Math.exp(-2 * Math.PI * B / SR), y1: 0, y2: 0 }));
        let ph = 0, prev = 0, jit = 0;
        for (let i = 0; i < o.length; i++) {
          const x = i / SR, p = Math.min(1, x / d);
          jit += (r() * 2 - 1 - jit) * .01;
          ph = (ph + f0 * (f1 / f0) ** p * (1 + jit * .04) / SR) % 1;
          const g = ph < .45 ? Math.sin(Math.PI * ph / .45) ** 2 : 0, dg = g - prev; prev = g;
          const env = Math.min(1, x / .012) * (x < d * .5 ? 1 : Math.exp(-(x - d * .5) / (d * .25)));
          const src = (dg * 20 + (r() * 2 - 1) * breath * (x < .025 ? 1.5 : .5)) * env;
          let y = 0;
          for (const q of res) { const yy = src + q.c1 * q.y1 + q.c2 * q.y2; q.y2 = q.y1; q.y1 = yy; y += yy * q.A; }
          o[i] = y;
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
  sniper: [1.05, 1, s => { // sharp crack, rolling boom, then the bolt cycles
    s.hiss({ ft: 'highpass', f: 3000, d: .03, v: 1 });
    s.hiss({ f: 4000, f2: 150, d: .6, v: .9 });
    s.tone({ f: 100, f2: 30, d: .45, v: 1 });
    s.tone({ type: 'square', f: 300, f2: 60, d: .15, v: .3, lp: 800 });
    s.boltUp(.55); s.boltDown(.72);
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
  swing: [.25, .45, s => { s.hiss({ ft: 'bandpass', f: 500, f2: 2800, q: 3, a: .06, d: .12, v: 1, sweep: .14 }); }], // knife whoosh
  slash: [.2, .6, s => { // knife connecting: a metal "shing" and a thud
    s.hiss({ ft: 'highpass', f: 3000, f2: 6000, d: .06, v: .8 });
    s.tone({ f: 2600, f2: 2400, d: .14, v: .25 }); s.tone({ f: 3900, d: .08, v: .15 });
    s.tone({ f: 160, f2: 70, d: .06, v: .6 });
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
  r_sniper: [2, .45, s => { s.boltUp(.15); s.magOut(.45); s.magIn(1.1); s.boltDown(1.6); }],
  r_eradicator: [2.6, .45, s => { s.latch(.2); s.rattle(.9); s.rattle(1.4); s.latch(2.0); s.tone({ type: 'sawtooth', f: 60, f2: 180, t: 2.15, a: .2, d: .2, v: .15, lp: 900 }); }],
  r_flame: [2.2, .45, s => { s.latch(.15); s.hiss({ ft: 'highpass', f: 3000, t: .45, a: .05, d: .35, v: .5 }); s.thunk(1.2); s.latch(1.75); s.clack({ t: 1.95, f: 4000, d: .008, v: .5 }); s.hiss({ t: 1.98, f: 400, f2: 1200, d: .15, v: .5 }); }],
  r_rocket: [2.6, .45, s => { s.latch(.3); s.hiss({ ft: 'bandpass', f: 600, f2: 300, q: 2, t: 1.0, a: .1, d: .25, v: .5 }); s.thunk(1.35); s.latch(2.1); }],
  r_flare: [1.3, .45, s => { s.latch(.1); s.shell(.6); s.latch(1.0); }],

  // ---- getting hit. These play from whoever got hit, so a far-away hit is barely audible ----
  hurt: [.35, .75, s => { s.impact(0); s.voice({ t: .01, d: .17, f0: 175, f1: 125 }); }], // a thud and an "uhh"
  hurtHead: [.4, .8, s => { // same, plus a bright "tink"
    s.impact(0); s.voice({ t: .01, d: .17, f0: 185, f1: 130, v: .9 });
    s.tone({ f: 1800, d: .22, v: .5 }); s.tone({ f: 2700, d: .14, v: .3 });
  }],
  armorHit: [.35, .55, s => { s.ring({ f: 900, d: .28, v: .7 }); s.hiss({ ft: 'highpass', f: 5000, d: .04, v: .5 }); }],
  die: [.9, .8, s => { s.impact(0); s.voice({ t: .01, d: .5, f0: 165, f1: 85, breath: .4, fm: [[600, 90, 1], [1000, 100, .5], [2400, 140, .2]] }); }], // a falling groan

  // ---- kills (only for yours) ----
  kill: [.45, .55, s => { s.tone({ f: 120, f2: 60, d: .1, v: .8 }); s.tone({ type: 'triangle', f: 1046, t: .02, d: .3, v: .6 }); s.tone({ f: 2093, t: .02, d: .15, v: .2 }); }],
  killSpecial: [.85, .65, s => { // headshots and streaks
    s.tone({ f: 100, f2: 50, d: .12, v: .8 });
    s.arp(0, [784, 1046, 1318, 1568], { gap: .06, d: .35, v: .5 });
    s.hiss({ ft: 'highpass', f: 7000, t: .1, a: .05, d: .4, v: .25 });
  }],

  // ---- moving ----
  step: [.12, .3, s => { s.hiss({ f: 700, f2: 250, d: .06, v: 1 }); s.tone({ f: 90, f2: 55, d: .05, v: .6 }); }],
  step2: [.12, .3, s => { s.hiss({ f: 800, f2: 280, d: .06, v: 1 }); s.tone({ f: 100, f2: 60, d: .05, v: .6 }); }],
  stepCrate: [.15, .35, s => { s.tone({ f: 220, f2: 150, d: .06, v: .8 }); s.hiss({ ft: 'bandpass', f: 900, q: 2, d: .05, v: .7 }); }],
  land: [.2, .5, s => { s.hiss({ f: 500, f2: 150, d: .12, v: 1 }); s.tone({ f: 80, f2: 45, d: .1, v: .8 }); }],

  // ---- pickups ----
  pickHealth: [.75, .5, s => { // sparkly "bling"
    s.arp(0, [1318, 1661, 1976, 2637], { gap: .05, d: .3, v: .45 });
    s.tone({ f: 3951, t: .15, d: .4, v: .15 });
    s.hiss({ ft: 'highpass', f: 8000, a: .05, d: .35, v: .15 });
  }],
  pickAmmo: [.45, .6, s => { s.magOut(0); s.magIn(.14); }],
  pickArmor: [.75, .65, s => { // metal armor clanking on
    s.ring({ f: 420, d: .5, v: .7, ratios: [1, 2.4, 3.9, 5.6] }); s.ring({ f: 690, t: .07, d: .4, v: .5 });
    s.hiss({ ft: 'bandpass', f: 3000, d: .05, v: .5 }); s.tone({ f: 110, f2: 70, d: .1, v: .5 });
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
  bonk: [.5, .6, s => { s.tone({ f: 420, f2: 200, d: .3, v: .8 }); s.ring({ f: 600, d: .3, v: .4 }); }],
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

// render every recipe into a buffer, scaled so its loudest point is the same for all of them
const soundsReady = Promise.all(Object.entries(SOUNDS).map(async ([name, [len, v, build]], i) => {
  const c = new OfflineAudioContext(1, Math.ceil(SR * len), SR);
  build(kit(c, 1000 + i));
  const buf = await c.startRendering(), d = buf.getChannelData(0);
  let peak = 0; for (let k = 0; k < d.length; k++) peak = Math.max(peak, Math.abs(d[k]));
  if (peak > 0) for (let k = 0; k < d.length; k++) d[k] /= peak;
  BUF[name] = { buf, v };
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
  const sg = ac.createGain(); sg.gain.value = send; n.connect(sg).connect(verbIn);
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

// ---- sounds that keep going while something is held: the flamethrower and the eradicator's motor ----
let flameHeld = 0, flameOn = false, flameLoop = null, flameGain = null, spinOsc = null, spinGain = null;
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
}
function soundsOff() { flameHeld = 0; if (flameGain) flameGain.gain.value = 0; flameOn = false; if (spinGain) spinGain.gain.value = 0; }
