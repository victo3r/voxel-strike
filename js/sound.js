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
    // pieces of reloads (and the ammo pickup)
    magOut(t) { s.click({ t, f: 2200, v: .7 }); s.hiss({ t: t + .01, ft: 'bandpass', f: 1500, f2: 800, q: 2, d: .09, v: .35 }); },
    magIn(t) { s.hiss({ t, ft: 'bandpass', f: 900, f2: 1600, q: 2, a: .03, d: .03, v: .3 }); s.tone({ f: 230, f2: 130, t: t + .05, d: .05, v: .7 }); s.click({ t: t + .05, f: 3000, v: .9 }); s.click({ t: t + .08, f: 1800, v: .4 }); },
    rack(t) { s.hiss({ t, ft: 'bandpass', f: 1800, q: 2, d: .06, v: .45 }); s.click({ t: t + .05, f: 2600, v: .8 }); s.click({ t: t + .14, f: 3400, v: .9 }); },
    pump(t) { s.hiss({ t, ft: 'bandpass', f: 1100, q: 2, d: .07, v: .5 }); s.click({ t: t + .03, f: 1700, v: .8 }); s.hiss({ t: t + .11, ft: 'bandpass', f: 1500, q: 2, d: .06, v: .5 }); s.click({ t: t + .15, f: 2600, v: 1 }); },
    shell(t) { s.click({ t, f: 1600, v: .7 }); s.tone({ f: 320, f2: 210, t, d: .05, v: .45 }); },
    boltUp(t) { s.click({ t, f: 1900, v: .8 }); s.hiss({ t: t + .02, ft: 'bandpass', f: 2600, f2: 1400, q: 3, d: .08, v: .35 }); },
    boltDown(t) { s.hiss({ t, ft: 'bandpass', f: 1400, f2: 2600, q: 3, d: .07, v: .35 }); s.click({ t: t + .07, f: 2700, v: 1 }); },
    latch(t) { s.click({ t, f: 1300, v: .8 }); s.tone({ f: 190, f2: 120, t, d: .04, v: .5 }); },
    thunk(t) { s.tone({ f: 150, f2: 80, t, d: .1, v: .9 }); s.hiss({ t, f: 900, d: .06, v: .6 }); s.click({ t, f: 900, v: .4 }); },
    rattle(t) { for (let k = 0; k < 6; k++) s.click({ t: t + k * .035, f: 2000 + r() * 1200, v: .45 }); },
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
  dry: [.08, .5, s => { s.click({ f: 1200, v: 1 }); s.tone({ type: 'square', f: 200, d: .02, v: .3, lp: 600 }); }],
  equip: [.2, .4, s => { s.hiss({ ft: 'bandpass', f: 1500, f2: 900, q: 2, d: .07, v: .5 }); s.click({ t: .06, f: 2200, v: .8 }); }],

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
  r_flame: [2.2, .45, s => { s.latch(.15); s.hiss({ ft: 'highpass', f: 3000, t: .45, a: .05, d: .35, v: .5 }); s.thunk(1.2); s.latch(1.75); s.click({ t: 1.95, f: 4000, v: .5 }); s.hiss({ t: 1.98, f: 400, f2: 1200, d: .15, v: .5 }); }],
  r_rocket: [2.6, .45, s => { s.latch(.3); s.hiss({ ft: 'bandpass', f: 600, f2: 300, q: 2, t: 1.0, a: .1, d: .25, v: .5 }); s.thunk(1.35); s.latch(2.1); }],
  r_flare: [1.3, .45, s => { s.latch(.1); s.shell(.6); s.latch(1.0); }],

  // ---- getting hit. These play from whoever got hit, so a far-away hit is barely audible ----
  hurt: [.25, .75, s => { // a cartoony "uhf"
    s.tone({ type: 'sawtooth', f: 250, f2: 150, d: .14, v: .9, bp: 750, q: 3 });
    s.tone({ type: 'sawtooth', f: 250, f2: 150, d: .12, v: .5, bp: 1300, q: 4 });
    s.hiss({ f: 600, d: .05, v: .7 }); s.tone({ f: 120, f2: 60, d: .07, v: .8 });
  }],
  hurtHead: [.3, .8, s => { // same, plus a bright "tink"
    s.tone({ type: 'sawtooth', f: 270, f2: 160, d: .14, v: .8, bp: 750, q: 3 });
    s.tone({ type: 'sawtooth', f: 270, f2: 160, d: .12, v: .45, bp: 1300, q: 4 });
    s.hiss({ f: 600, d: .05, v: .6 });
    s.tone({ f: 1800, d: .22, v: .5 }); s.tone({ f: 2700, d: .14, v: .3 });
  }],
  armorHit: [.35, .55, s => { s.ring({ f: 900, d: .28, v: .7 }); s.hiss({ ft: 'highpass', f: 5000, d: .04, v: .5 }); }],
  die: [.7, .8, s => { s.tone({ type: 'sawtooth', f: 320, f2: 70, a: .01, d: .5, v: .8, bp: 800, q: 2, glide: .5 }); s.tone({ f: 150, f2: 50, t: .05, d: .3, v: .6 }); }],

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
