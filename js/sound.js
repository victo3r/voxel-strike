// sound effects, all made in code and rendered once at load
const SR = 44100;
const BUF = {};
let ac = null, bus, outGain, verbIn;
let volume = 0.8;
try { const v = parseFloat(localStorage.getItem('voxelstrike-vol')); if (v >= 0 && v <= 1) volume = v; } catch {}
// mute buttons
let mutes = { sfx: false, music: false };
try { const m = JSON.parse(localStorage.getItem('voxelstrike-mute')); if (m) mutes = { sfx: !!m.sfx, music: !!m.music }; } catch {}
const sfxGain = () => mutes.sfx ? 0 : volume;
function setMute(k, on) {
  mutes[k] = on; try { localStorage.setItem('voxelstrike-mute', JSON.stringify(mutes)); } catch {}
  if (k === 'sfx') { if (outGain) outGain.gain.value = sfxGain(); } else setMusicVolume(musicVol);
}
// silent while CrazyGames mutes us or an ad plays
let hush = null;
function cgHush() { if (hush) hush.gain.value = cgQuiet() ? 0 : 1; }
function setVolume(v) { volume = v; if (outGain) outGain.gain.value = sfxGain(); try { localStorage.setItem('voxelstrike-vol', v); } catch {} }

function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function audio() {
  if (!ac) {
    ac = new AudioContext();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
    bus = ac.createGain(); outGain = ac.createGain(); outGain.gain.value = sfxGain();
    hush = ac.createGain(); hush.connect(ac.destination); cgHush();
    bus.connect(comp).connect(outGain).connect(hush);
    // shared echo
    const ir = ac.createBuffer(2, ac.sampleRate * 1.2, ac.sampleRate), r = rng(7);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (r() * 2 - 1) * (1 - i / d.length) ** 3.5 * (i < 400 ? i / 400 : 1); }
    const verb = ac.createConvolver(); verb.buffer = ir;
    verbIn = ac.createGain(); const wet = ac.createGain(); wet.gain.value = .35;
    verbIn.connect(verb).connect(wet).connect(bus);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
// browsers only allow sound after a click or key press
addEventListener('pointerdown', audio); addEventListener('keydown', audio);

// building blocks for the sounds below
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
    tone({ type = 'sine', f, f2 = f, t = 0, a = .002, d = .1, v = .5, glide = a + d, lp = 0, bp = 0, q = 1 }) {
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f, t); if (f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + glide);
      let n = o;
      if (lp) n = n.connect(filt('lowpass', lp, lp, .7, t, 0));
      if (bp) n = n.connect(filt('bandpass', bp, bp, q, t, 0));
      env(n, t, a, d, v); o.start(t); o.stop(t + a + d + .02);
    },
    hiss({ t = 0, a = .001, d = .1, v = .5, ft = 'lowpass', f = 2000, f2 = f, q = 1, sweep = a + d }) {
      const n = c.createBufferSource(); n.buffer = nb;
      env(n.connect(filt(ft, f, f2, q, t, sweep)), t, a, d, v);
      n.start(t, r() * 1.5); n.stop(t + a + d + .02);
    },
    // metal ring
    ring({ f, t = 0, d = .3, v = .5, ratios = [1, 2.76, 5.4, 8.93] }) {
      ratios.forEach((k, i) => s.tone({ f: f * k, t, d: d / (1 + i * .5), v: v / (1 + i * .8) }));
    },
    click({ t = 0, f = 2500, v = .6 }) { s.hiss({ t, ft: 'bandpass', f, q: 5, d: .018, v }); s.tone({ type: 'triangle', f: f * .35, f2: f * .25, t, d: .025, v: v * .4 }); },
    // a sound drawn sample by sample
    draw(t, dur, fill, v = 1) {
      const b = c.createBuffer(1, Math.ceil(dur * SR), SR), o = b.getChannelData(0);
      fill(o);
      let pk = 0; for (let i = 0; i < o.length; i++) pk = Math.max(pk, Math.abs(o[i]));
      if (pk) for (let i = 0; i < o.length; i++) o[i] *= v / pk;
      const src = c.createBufferSource(); src.buffer = b; src.connect(out); src.start(t);
    },
    // gun parts clacking together
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
    // low thud
    thud({ t = 0, d = .05, f = 140, v = .8 }) {
      const k = 1 - Math.exp(-6.2832 * f / SR);
      s.draw(t, d * 4 + .01, o => {
        let a = 0, b = 0;
        for (let i = 0; i < o.length; i++) { const x = i / SR; a += (r() * 2 - 1 - a) * k; b += (a - b) * k; o[i] = b * Math.min(1, x / .002) * Math.exp(-x / d); }
      }, v);
    },
    // crunchy grass, sand or gravel
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
    // hollow knock on wood or metal
    knock({ t = 0, f = 300, tau = .02, v = .8, parts = [[1, 1], [1.58, .55], [2.37, .3]], grit = .15 }) {
      const res = parts.map(([k, A]) => {
        const R = Math.exp(-1 / (tau * SR * (1 - .25 * Math.log2(k)))), w = 6.2832 * f * k * (.96 + r() * .08) / SR;
        return { A: A * (1 - R), c1: 2 * R * Math.cos(w), c2: -R * R, y1: 0, y2: 0 };
      });
      s.draw(t, tau * 6 + .02, o => {
        for (let i = 0; i < o.length; i++) {
          const x = i / SR, ex = (r() * 2 - 1) * Math.exp(-x / .0012);
          let y = ex * grit;
          for (const q of res) { const yy = ex + q.c1 * q.y1 + q.c2 * q.y2; q.y2 = q.y1; q.y1 = yy; y += yy * q.A * 4; }
          o[i] = y;
        }
      }, v);
    },
    // creaky floorboard
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
    // metal sliding on metal
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
    // grunts and groans
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
          const asp = x < 0 ? Math.min(1, (x + h) / .004) * .8 : 0;
          const out = x > d * .5 ? .45 * Math.exp(-(x - d * .5) / tail) * Math.min(1, (x - d * .5) / .03) : 0;
          const src = dg * 22 * venv + w * (breath * venv * (.3 + g) + (asp + out) * breath);
          let y = 0;
          fm.forEach(([F, B, A], k) => {
            const [F2, B2, A2] = fm2[k], q = res[k];
            const Fx = F + (F2 - F) * p, Bx = B + (B2 - B) * p, Ax = A + (A2 - A) * p;
            const R = Math.exp(-Math.PI * Bx / SR), yy = src + 2 * R * Math.cos(6.2832 * Fx / SR) * q.y1 - R * R * q.y2;
            q.y2 = q.y1; q.y1 = yy; y += yy * Ax;
          });
          lo += (y - lo) * .55;
          o[i] = lo;
        }
      }, v);
    },
    // bullet hitting a body
    impact(t) { s.hiss({ t, f: 350, d: .05, v: .9 }); s.hiss({ t, ft: 'bandpass', f: 1500, q: 1, d: .012, v: .6 }); },
    // reload pieces
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
    arp(t, notes, { type = 'triangle', gap = .055, d = .3, v = .4 } = {}) { notes.forEach((f, i) => s.tone({ type, f, t: t + i * gap, d, v })); },
  };
  return s;
}

// name: [length, volume, build]
const SOUNDS = {
  // guns
  voxel: [.3, .5, s => {
    s.tone({ type: 'square', f: 1500, f2: 320, d: .11, v: .3, lp: 3500 });
    s.tone({ f: 950, f2: 220, d: .14, v: .55 });
    s.hiss({ ft: 'bandpass', f: 3500, q: 1.5, d: .025, v: .5 });
    s.tone({ f: 120, f2: 50, d: .08, v: .6 });
  }],
  shotgun: [.75, .9, s => {
    s.hiss({ f: 3200, f2: 220, d: .35, v: 1 });
    s.tone({ f: 140, f2: 40, d: .25, v: 1 });
    s.hiss({ ft: 'highpass', f: 4000, d: .02, v: .5 });
    s.pump(.38);
  }],
  ar: [.2, .42, s => {
    s.hiss({ ft: 'bandpass', f: 2000, f2: 900, q: .8, d: .07, v: .9 });
    s.tone({ f: 170, f2: 60, d: .06, v: .9 });
    s.click({ f: 4000, v: .35 });
  }],
  thrasher: [.2, .42, s => {
    s.hiss({ ft: 'bandpass', f: 2600, f2: 1100, q: .7, d: .065, v: .9 });
    s.tone({ f: 190, f2: 65, d: .055, v: .85 });
    s.tone({ type: 'square', f: 230, f2: 90, d: .05, v: .32, lp: 2200 });
    s.tone({ type: 'sawtooth', f: 115, f2: 70, d: .04, v: .2, lp: 1400 });
    s.click({ f: 4800, v: .4 });
  }],
  trex: [.9, 1, s => {
    s.hiss({ f: 3800, f2: 150, d: .55, v: 1 }); // the blast
    s.hiss({ ft: 'bandpass', f: 1100, f2: 260, q: .7, d: .35, v: .85 }); // its body
    s.tone({ f: 125, f2: 28, d: .42, v: 1 }); s.thud({ d: .09, f: 85, v: 1 }); // a deep thump
    s.hiss({ ft: 'highpass', f: 4500, d: .03, v: .65 }); // the crack
    s.tone({ type: 'sawtooth', t: .04, f: 78, f2: 48, d: .32, v: .2, lp: 520 }); // a low growl in the tail
    s.pump(.46);
  }],
  starsmasher: [.2, .45, s => {
    s.hiss({ ft: 'bandpass', f: 2300, f2: 1000, q: .8, d: .07, v: .9 });
    s.tone({ f: 180, f2: 62, d: .06, v: .9 });
    s.click({ f: 4600, v: .35 });
    s.tone({ t: .01, f: 2637, f2: 2600, d: .09, v: .07 }); s.tone({ t: .03, f: 3520, f2: 3480, d: .08, v: .05 }); // a starry twinkle
  }],
  sniper: [1.05, 1, s => {
    s.hiss({ ft: 'highpass', f: 3000, d: .03, v: 1 });
    s.hiss({ f: 4000, f2: 150, d: .6, v: .9 });
    s.tone({ f: 100, f2: 30, d: .45, v: 1 });
    s.tone({ type: 'square', f: 300, f2: 60, d: .15, v: .3, lp: 800 });
    s.boltUp(.55); s.boltDown(.72);
  }],
  semisniper: [.55, .9, s => {
    s.hiss({ ft: 'highpass', f: 3400, d: .025, v: 1 });
    s.hiss({ f: 3600, f2: 220, d: .32, v: .75 });
    s.tone({ f: 130, f2: 40, d: .26, v: .9 });
    s.tone({ type: 'square', f: 360, f2: 90, d: .09, v: .28, lp: 1100 });
    s.clack({ t: .07, f: 2300, d: .012, v: .5, body: .3 }); s.clack({ t: .1, f: 3000, d: .01, v: .35 });
  }],
  tigerbite: [1, 1, s => {
    s.hiss({ ft: 'highpass', f: 2800, d: .035, v: 1 });
    s.hiss({ f: 3800, f2: 140, d: .55, v: .95 });
    s.tone({ f: 90, f2: 28, d: .5, v: 1 });
    s.tone({ type: 'sawtooth', f: 160, f2: 70, d: .22, v: .3, lp: 700 }); // a growl under the crack
    s.clack({ t: .12, f: 2000, d: .014, v: .5, body: .4 });
  }],
  executioner: [.4, .5, s => {
    s.tone({ type: 'square', f: 2600, f2: 380, d: .16, v: .32, lp: 5000 });
    s.tone({ type: 'sawtooth', f: 1300, f2: 180, d: .2, v: .28, lp: 3000 });
    s.tone({ f: 4200, f2: 900, d: .08, v: .3 });
    s.hiss({ ft: 'bandpass', f: 5000, q: 2, d: .04, v: .35 });
  }],
  rubypierce: [.9, .9, s => { // a heavy zap with a glassy ring after it
    s.tone({ f: 150, f2: 40, d: .35, v: .9 });
    s.tone({ type: 'sawtooth', f: 1900, f2: 140, d: .32, v: .32, lp: 4200 });
    s.tone({ type: 'square', f: 3800, f2: 700, d: .16, v: .2, lp: 6000 });
    s.hiss({ ft: 'bandpass', f: 4200, f2: 900, q: 1.5, d: .45, v: .45 });
    s.ring({ f: 1760, t: .03, d: .55, v: .09 });
  }],
  paragon: [1.2, 1, s => { // a crack, a long electric tear and a low ring
    s.hiss({ ft: 'highpass', f: 3200, d: .03, v: .9 });
    s.tone({ f: 105, f2: 26, d: .55, v: 1 });
    s.tone({ type: 'sawtooth', f: 1500, f2: 85, d: .5, v: .34, lp: 3600 });
    s.hiss({ ft: 'bandpass', f: 3400, f2: 450, q: 1.2, d: .8, v: .55 });
    s.ring({ f: 1175, t: .05, d: .8, v: .08 });
  }],
  zap: [.12, .22, s => { for (let k = 0; k < 4; k++) s.clack({ t: k * .018, f: 3000 + Math.random() * 3000, d: .008, v: .5 }); s.hiss({ ft: 'highpass', f: 5000, d: .05, v: .4 }); }], // shock beam crackle
  eradicator: [.12, .32, s => { // the motor whir is in soundTick
    s.hiss({ ft: 'bandpass', f: 1500, f2: 700, d: .045, v: .9 });
    s.tone({ f: 150, f2: 70, d: .05, v: .8 });
    s.click({ f: 3500, v: .25 });
  }],
  flameStart: [.45, .5, s => {
    s.hiss({ f: 250, f2: 1600, a: .05, d: .3, v: 1, sweep: .12 });
    s.tone({ f: 70, f2: 120, a: .04, d: .3, v: .6 });
  }],
  flameEnd: [.3, .35, s => { s.hiss({ f: 900, f2: 200, d: .25, v: 1 }); }],
  rocket: [.8, .85, s => {
    s.tone({ f: 90, f2: 40, d: .2, v: 1 });
    s.hiss({ ft: 'bandpass', f: 300, f2: 2500, q: 2, a: .05, d: .55, v: .8 });
    s.click({ f: 900, v: .5 });
  }],
  boom: [1.6, 1, s => {
    s.hiss({ f: 1800, f2: 80, a: .004, d: 1.3, v: 1 });
    s.tone({ f: 70, f2: 25, d: .7, v: 1 });
    s.hiss({ ft: 'highpass', f: 2500, d: .05, v: .6 });
    s.tone({ type: 'square', f: 120, f2: 40, d: .4, v: .35, lp: 400 });
    s.hiss({ f: 220, t: .05, a: .05, d: 1.1, v: .6 });
  }],
  flare: [.5, .55, s => {
    s.tone({ f: 260, f2: 110, d: .1, v: 1 });
    s.hiss({ ft: 'highpass', f: 2500, f2: 6000, a: .02, d: .35, v: .45 });
    s.click({ f: 1200, v: .3 });
  }],
  crossbow: [.35, .4, s => { // a twang
    s.tone({ type: 'triangle', f: 230, f2: 150, d: .26, v: .8 });
    s.tone({ f: 460, f2: 300, d: .12, v: .3 });
    s.hiss({ ft: 'highpass', f: 3000, d: .05, v: .35 });
    s.click({ f: 1800, v: .3 });
  }],
  grenade: [.45, .7, s => { // a bloop
    s.tone({ f: 170, f2: 60, d: .16, v: 1 });
    s.hiss({ ft: 'bandpass', f: 900, f2: 300, q: 1.2, d: .14, v: .7 });
    s.click({ f: 1400, v: .35 });
  }],
  bounce: [.15, .35, s => { s.tone({ f: 620, f2: 480, d: .06, v: .5 }); s.click({ f: 2400, v: .25 }); }],
  aerial: [.8, .85, s => { // a deep whump and a rush of air
    s.tone({ f: 110, f2: 45, d: .22, v: .9 });
    s.hiss({ ft: 'bandpass', f: 2400, f2: 380, q: 1.2, a: .01, d: .6, v: .9, sweep: .5 });
    s.hiss({ ft: 'highpass', f: 4000, d: .05, v: .3 });
  }],
  gust: [1.3, 1, s => { // a blast of wind: a thump and a big whoosh, no crackle
    s.tone({ f: 85, f2: 30, d: .5, v: .9 });
    s.hiss({ f: 2600, f2: 140, a: .004, d: 1, v: .9 });
    s.hiss({ ft: 'bandpass', f: 500, f2: 2800, q: 1, t: .02, a: .06, d: .75, v: .6, sweep: .6 });
  }],
  flareHit: [.6, .6, s => {
    s.hiss({ ft: 'bandpass', f: 1500, f2: 400, d: .35, v: .9 });
    s.tone({ f: 180, f2: 60, d: .15, v: .7 });
    for (let k = 0; k < 7; k++) s.click({ t: .04 + s.r() * .4, f: 2500 + s.r() * 3000, v: .3 });
  }],
  hitman: [.25, .32, s => {
    s.hiss({ ft: 'bandpass', f: 1300, f2: 500, q: 1.2, d: .045, v: 1 });
    s.thud({ d: .025, f: 220, v: .7 });
    s.clack({ t: .012, f: 3200, d: .01, v: .55 }); s.clack({ t: .05, f: 2600, d: .012, v: .4 });
  }],
  heatStart: [.3, .45, s => {
    s.tone({ f: 300, f2: 1800, d: .14, v: .5, glide: .1 });
    s.tone({ type: 'square', f: 150, f2: 420, d: .14, v: .2, lp: 2000, glide: .1 });
    s.hiss({ ft: 'highpass', f: 4000, d: .08, v: .35 });
  }],
  frostStart: [.45, .45, s => { // ice forming
    s.crunch({ a: .01, d: .2, dens: .06, lo: 700, hi: 4000, v: .7 });
    s.tone({ type: 'triangle', f: 220, f2: 330, d: .2, v: .25 });
  }],
  frostEnd: [.4, .3, s => s.crunch({ a: .005, d: .15, dens: .05, lo: 600, hi: 3200, v: .7 })],
  iceLoop: [2, .3, s => s.draw(0, 2, o => { // the wand's beam: crackling ice, made to loop
    const N = o.length, kh = 1 - Math.exp(-6.2832 * 3800 / SR), kl = 1 - Math.exp(-6.2832 * 600 / SR);
    let g = 0, p = 0, q = 0;
    for (let k = 0; k < 2 * N; k++) { // twice round so the filters are settled where it loops
      if (s.r() < .003) g += (s.r() * 2 - 1) * (.3 + s.r());
      g *= .7; p += (g - p) * kh; q += (p - q) * kl;
      if (k >= N) o[k - N] = (p - q) * 1.4;
    }
  })],
  heatEnd: [.25, .3, s => { s.tone({ f: 1400, f2: 300, d: .13, v: .4 }); s.hiss({ f: 2200, f2: 400, d: .12, v: .3 }); }],
  djump: [.25, .4, s => { s.hiss({ ft: 'bandpass', f: 350, f2: 1500, q: 2, a: .03, d: .14, v: .8, sweep: .16 }); s.tone({ f: 260, f2: 560, d: .1, v: .22 }); }], // double jump
  swing: [.25, .45, s => { s.hiss({ ft: 'bandpass', f: 500, f2: 2800, q: 3, a: .06, d: .12, v: 1, sweep: .14 }); }], // knife
  saber: [.85, .75, s => { // a humming blade: a buzz that swells and falls as it swings
    s.tone({ type: 'sawtooth', f: 90, f2: 116, d: .8, v: .46, lp: 1050 });
    s.tone({ type: 'sawtooth', f: 93, f2: 120, d: .8, v: .36, lp: 880 }); // a little off, so they beat
    s.tone({ f: 180, f2: 310, d: .38, v: .36 });
    s.hiss({ ft: 'bandpass', f: 600, f2: 2600, q: 3, a: .06, d: .38, v: .6, sweep: .26 });
  }],
  hammer: [.45, .55, s => { // a heavy swing
    s.hiss({ ft: 'bandpass', f: 280, f2: 1100, q: 2.5, a: .09, d: .28, v: 1, sweep: .22 });
    s.tone({ f: 95, f2: 60, d: .22, v: .3 });
  }],
  chill: [.3, .3, s => s.crunch({ a: .005, d: .12, dens: .05, lo: 900, hi: 4200, v: .6 })], // frost crackles
  slash: [.25, .6, s => {
    s.hiss({ ft: 'bandpass', f: 2200, f2: 7500, q: 4, a: .008, d: .2, v: 1, sweep: .18 });
    s.hiss({ ft: 'highpass', f: 5000, f2: 8000, a: .015, d: .15, v: .4 });
    for (const [f, v] of [[3150, .06], [4420, .045], [5930, .035]]) s.tone({ t: .02, f, f2: f * .97, d: .22, v });
    s.thud({ d: .05, f: 150, v: .7 });
  }],
  // aiming in and out
  zin_sniper: [.4, .42, s => {
    s.hiss({ ft: 'bandpass', f: 500, f2: 1400, q: 1.5, a: .03, d: .07, v: .6, sweep: .09 });
    s.thud({ t: .07, d: .03, f: 130, v: .9 });
    s.clack({ t: .08, f: 1500, d: .014, v: .5, body: .5 });
    for (let k = 0; k < 3; k++) s.clack({ t: .16 + k * .045, f: 3000 + k * 250, d: .005, v: .3 });
  }],
  zout_sniper: [.3, .36, s => {
    for (let k = 0; k < 2; k++) s.clack({ t: k * .04, f: 3200 - k * 250, d: .005, v: .28 });
    s.hiss({ ft: 'bandpass', f: 1300, f2: 450, q: 1.5, a: .02, d: .08, v: .5, sweep: .1 });
    s.clack({ t: .11, f: 1300, d: .012, v: .3, body: .3 });
  }],
  zin_semisniper: [.32, .4, s => {
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
  zin_thrasher: [.3, .4, s => {
    s.hiss({ ft: 'bandpass', f: 600, f2: 1800, q: 1.4, a: .02, d: .06, v: .55, sweep: .07 });
    s.clack({ t: .05, f: 1800, d: .012, v: .55, body: .4 });
    s.tone({ type: 'square', f: 1100, f2: 1700, t: .07, a: .004, d: .05, v: .16, lp: 2600, glide: .04 });
  }],
  zout_thrasher: [.25, .34, s => {
    s.tone({ type: 'square', f: 1500, f2: 900, a: .004, d: .045, v: .14, lp: 2400, glide: .04 });
    s.hiss({ ft: 'bandpass', f: 1600, f2: 550, q: 1.4, a: .015, d: .07, v: .45, sweep: .08 });
  }],
  zin_starsmasher: [.3, .4, s => {
    s.hiss({ ft: 'bandpass', f: 600, f2: 1800, q: 1.4, a: .02, d: .06, v: .55, sweep: .07 });
    s.clack({ t: .05, f: 1800, d: .012, v: .55, body: .4 });
    s.tone({ type: 'square', f: 1300, f2: 1900, t: .07, a: .004, d: .05, v: .14, lp: 2800, glide: .04 });
  }],
  zout_starsmasher: [.25, .34, s => {
    s.tone({ type: 'square', f: 1700, f2: 1000, a: .004, d: .045, v: .12, lp: 2600, glide: .04 });
    s.hiss({ ft: 'bandpass', f: 1600, f2: 550, q: 1.4, a: .015, d: .07, v: .45, sweep: .08 });
  }],
  zin_hitman: [.22, .32, s => {
    s.hiss({ ft: 'bandpass', f: 900, f2: 2200, q: 1.6, a: .015, d: .045, v: .45, sweep: .05 });
    s.clack({ t: .035, f: 2800, d: .007, v: .4 });
    s.tone({ type: 'square', f: 1900, f2: 2400, t: .05, a: .003, d: .035, v: .12, lp: 3200, glide: .025 });
  }],
  zout_hitman: [.18, .28, s => {
    s.tone({ type: 'square', f: 2200, f2: 1500, a: .003, d: .03, v: .1, lp: 3000, glide: .025 });
    s.hiss({ ft: 'bandpass', f: 2000, f2: 800, q: 1.6, a: .01, d: .05, v: .4, sweep: .06 });
  }],
  zin_executioner: [.24, .34, s => { // the holo powers up with a rising chirp
    s.hiss({ ft: 'bandpass', f: 1200, f2: 3000, q: 2, a: .012, d: .04, v: .35, sweep: .05 });
    s.tone({ type: 'sine', f: 900, f2: 2600, t: .01, a: .004, d: .06, v: .16, glide: .05 });
    s.tone({ type: 'square', f: 2600, f2: 3100, t: .055, a: .002, d: .03, v: .06, lp: 4000, glide: .02 });
  }],
  zout_executioner: [.2, .3, s => {
    s.tone({ type: 'sine', f: 2400, f2: 800, a: .003, d: .05, v: .14, glide: .045 });
    s.hiss({ ft: 'bandpass', f: 2600, f2: 900, q: 2, a: .01, d: .045, v: .3, sweep: .05 });
  }],
  zin_rubypierce: [.24, .34, s => {
    s.hiss({ ft: 'bandpass', f: 1000, f2: 2600, q: 2, a: .012, d: .04, v: .35, sweep: .05 });
    s.tone({ type: 'sine', f: 700, f2: 2100, t: .01, a: .004, d: .07, v: .16, glide: .06 });
  }],
  zout_rubypierce: [.2, .3, s => {
    s.tone({ type: 'sine', f: 2000, f2: 650, a: .003, d: .05, v: .14, glide: .045 });
    s.hiss({ ft: 'bandpass', f: 2400, f2: 800, q: 2, a: .01, d: .045, v: .3, sweep: .05 });
  }],
  zin_paragon: [.45, .42, s => { // the scope hums up
    s.hiss({ ft: 'bandpass', f: 450, f2: 1300, q: 1.5, a: .03, d: .07, v: .55, sweep: .09 });
    s.clack({ t: .08, f: 1600, d: .012, v: .45, body: .4 });
    s.tone({ type: 'sine', f: 220, f2: 880, t: .05, a: .02, d: .18, v: .12, glide: .15 });
  }],
  zout_paragon: [.3, .36, s => {
    s.hiss({ ft: 'bandpass', f: 1200, f2: 420, q: 1.5, a: .02, d: .08, v: .5, sweep: .1 });
    s.tone({ type: 'sine', f: 800, f2: 240, a: .01, d: .1, v: .1, glide: .1 });
  }],
  zin_tigerbite: [.4, .42, s => {
    s.hiss({ ft: 'bandpass', f: 450, f2: 1300, q: 1.5, a: .03, d: .07, v: .6, sweep: .09 });
    s.thud({ t: .07, d: .03, f: 120, v: .9 });
    s.clack({ t: .08, f: 1400, d: .014, v: .5, body: .5 });
  }],
  zout_tigerbite: [.3, .36, s => {
    s.hiss({ ft: 'bandpass', f: 1200, f2: 420, q: 1.5, a: .02, d: .08, v: .5, sweep: .1 });
    s.clack({ t: .1, f: 1200, d: .012, v: .3, body: .3 });
  }],
  dry: [.1, .5, s => { s.clack({ f: 2800, d: .01, v: .8 }); }],
  equip: [.25, .4, s => { s.scrape({ d: .07, f: 1500, v: .4 }); s.clack({ t: .07, f: 2200, d: .015, v: .8, body: .3 }); }],

  // reloads, timed to each gun's base reload
  r_voxel: [1, .45, s => {
    s.magOut(.08); s.magIn(.32);
    s.tone({ type: 'square', f: 300, f2: 1600, t: .55, a: .2, d: .08, v: .2, lp: 2500, glide: .25 });
    s.tone({ f: 600, f2: 2400, t: .55, a: .2, d: .08, v: .3, glide: .25 });
    s.tone({ f: 2400, t: .82, d: .15, v: .3 });
  }],
  r_shotgun: [1.6, .45, s => { for (const t of [.15, .45, .75, 1.05]) s.shell(t); s.pump(1.3); }],
  r_trex: [1.6, .45, s => { for (const t of [.15, .45, .75, 1.05]) s.shell(t); s.pump(1.3); }],
  r_starsmasher: [1.6, .45, s => { s.magOut(.15); s.magIn(.75); s.clack({ t: .85, f: 1900, d: .015, v: .5, body: .3 }); s.rack(1.2); }],
  r_ar: [1.4, .45, s => { s.magOut(.15); s.magIn(.7); s.rack(1.05); }],
  r_thrasher: [1.5, .45, s => { s.magOut(.15); s.magIn(.72); s.clack({ t: .82, f: 1800, d: .015, v: .5, body: .3 }); s.rack(1.12); }],
  r_sniper: [2, .45, s => { s.boltUp(.15); s.magOut(.45); s.magIn(1.1); s.boltDown(1.6); }],
  r_semisniper: [1.8, .45, s => { s.magOut(.2); s.magIn(.9); s.clack({ t: 1.0, f: 1600, d: .015, v: .5, body: .3 }); s.rack(1.4); }],
  r_eradicator: [2.6, .45, s => { s.latch(.2); s.rattle(.9); s.rattle(1.4); s.latch(2.0); s.tone({ type: 'sawtooth', f: 60, f2: 180, t: 2.15, a: .2, d: .2, v: .15, lp: 900 }); }],
  r_flame: [2.2, .45, s => { s.latch(.15); s.hiss({ ft: 'highpass', f: 3000, t: .45, a: .05, d: .35, v: .5 }); s.thunk(1.2); s.latch(1.75); s.clack({ t: 1.95, f: 4000, d: .008, v: .5 }); s.hiss({ t: 1.98, f: 400, f2: 1200, d: .15, v: .5 }); }],
  r_rocket: [2.6, .45, s => { s.latch(.3); s.hiss({ ft: 'bandpass', f: 600, f2: 300, q: 2, t: 1.0, a: .1, d: .25, v: .5 }); s.thunk(1.35); s.latch(2.1); }],
  r_crossbow: [2.2, .45, s => { s.latch(.2); for (const t of [.5, .75, 1, 1.25]) s.click({ t, f: 1500, v: .35 }); s.tone({ t: 1.55, type: 'triangle', f: 180, f2: 240, d: .2, v: .35 }); s.latch(1.9); }],
  r_grenade: [2.4, .45, s => { for (const t of [.35, .7, 1.05, 1.4]) s.shell(t); s.latch(2.0); }],
  r_aerial: [2.2, .45, s => { s.magOut(.15); s.magIn(.8); s.hiss({ ft: 'bandpass', f: 500, f2: 2400, q: 1.5, t: 1.0, a: .2, d: .45, v: .45, sweep: .6 }); s.latch(1.75); }], // a fresh tank, the turbine winding up
  r_flare: [1.3, .45, s => { s.latch(.1); s.shell(.6); s.latch(1.0); }],
  r_hitman: [1.1, .45, s => { s.magOut(.08); s.magIn(.5); s.rack(.82); }],
  r_executioner: [1.4, .45, s => {
    s.magOut(.1); s.magIn(.55);
    s.tone({ type: 'square', f: 250, f2: 1400, t: .8, a: .25, d: .1, v: .2, lp: 2600, glide: .3 }); s.tone({ f: 1900, t: 1.15, d: .15, v: .28 });
  }],
  r_rubypierce: [1.6, .45, s => {
    s.magOut(.1); s.magIn(.65);
    s.tone({ type: 'square', f: 220, f2: 1300, t: .9, a: .3, d: .1, v: .2, lp: 2400, glide: .35 }); s.ring({ f: 1760, t: 1.3, d: .25, v: .12 });
  }],
  r_paragon: [2.2, .45, s => {
    s.magOut(.2); s.magIn(1.05);
    s.tone({ type: 'sine', f: 200, f2: 1600, t: 1.25, a: .3, d: .15, v: .22, glide: .4 }); s.clack({ t: 1.8, f: 1700, d: .015, v: .5, body: .3 });
  }],
  r_tigerbite: [2, .45, s => { s.magOut(.2); s.magIn(1.0); s.clack({ t: 1.1, f: 1500, d: .015, v: .5, body: .3 }); s.rack(1.55); }],
  r_shockbeam: [2, .45, s => {
    s.latch(.12); s.magOut(.7); s.magIn(1.15);
    for (let k = 0; k < 5; k++) s.clack({ t: 1.5 + k * .04, f: 2500 + k * 400, d: .008, v: .35 });
    s.tone({ f: 300, f2: 2600, t: 1.55, a: .2, d: .1, v: .25, glide: .3 });
  }],
  r_heatray: [2, .45, s => {
    s.latch(.12); s.hiss({ ft: 'highpass', f: 3500, f2: 1500, t: .18, a: .03, d: .45, v: .5 });
    s.magOut(.8); s.magIn(1.2);
    s.tone({ f: 400, f2: 2000, t: 1.5, a: .25, d: .1, v: .28, glide: .3 }); s.tone({ f: 2000, t: 1.85, d: .12, v: .25 });
  }],

  // getting hit
  hurt: [.25, .5, s => {
    s.impact(0);
    s.voice({ t: .005, h: .015, d: .1, f0: 135, fpk: 185, pk: .2, f1: 110, rough: .3, rough2: .55, breath: .35, tail: .03,
      fm2: [[480, 100, 1], [1050, 110, .45], [2300, 150, .18], [3300, 240, .08], [3750, 280, .05]] });
  }],
  hurtHead: [.3, .55, s => {
    s.impact(0); s.clack({ f: 1300, d: .012, v: .7, body: .7 }); s.hiss({ ft: 'bandpass', f: 3200, q: 1.2, d: .02, v: .5 });
    s.voice({ t: .01, h: .01, d: .1, f0: 150, fpk: 205, pk: .15, f1: 115, rough: .35, rough2: .6, breath: .4, tail: .03, v: .9,
      fm2: [[480, 100, 1], [1050, 110, .45], [2300, 150, .18], [3300, 240, .08], [3750, 280, .05]] });
  }],
  armorHit: [.3, .55, s => { s.clack({ f: 1100, d: .02, v: 1, body: .8 }); s.hiss({ ft: 'bandpass', f: 2800, q: 1.3, d: .03, v: .45 }); }],
  die: [.65, .55, s => {
    s.impact(0);
    s.voice({ t: .005, h: .02, d: .35, f0: 140, fpk: 200, pk: .12, f1: 75, rough: .2, rough2: .85, breath: .45, tail: .12,
      fm: [[750, 100, 1], [1180, 110, .55], [2500, 150, .22], [3400, 230, .1], [3800, 270, .06]],
      fm2: [[520, 120, 1], [1000, 130, .4], [2350, 170, .15], [3300, 260, .06], [3750, 300, .04]] });
  }],

  // kills
  kill: [.45, .55, s => { s.tone({ f: 120, f2: 60, d: .1, v: .8 }); s.tone({ type: 'triangle', f: 1046, t: .02, d: .3, v: .6 }); s.tone({ f: 2093, t: .02, d: .15, v: .2 }); }],
  killSpecial: [.85, .65, s => {
    s.tone({ f: 100, f2: 50, d: .12, v: .8 });
    s.arp(0, [784, 1046, 1318, 1568], { gap: .06, d: .35, v: .5 });
    s.hiss({ ft: 'highpass', f: 7000, t: .1, a: .05, d: .4, v: .25 });
  }],

  // big kill streaks
  streak_ace: [1.2, 1, s => { // a brass fanfare
    s.tone({ f: 110, f2: 45, d: .2, v: .9 });
    for (const [t, fs, d] of [[0, [392, 494], .12], [.12, [523, 659], .12], [.24, [523, 659, 784, 1046], .75]]) for (const f of fs) s.tone({ type: 'sawtooth', f, t, a: .01, d, v: .22, lp: 2600 });
    s.hiss({ ft: 'highpass', f: 6000, t: .24, a: .05, d: .6, v: .25 });
  }],
  streak_fury: [1.5, 1, s => { // fire whoosh and a power chord
    s.hiss({ ft: 'bandpass', f: 300, f2: 3000, q: 1.2, a: .25, d: .5, v: .8 });
    s.tone({ f: 90, f2: 40, t: .22, d: .3, v: 1 });
    for (const f of [165, 247, 330, 494]) s.tone({ type: 'sawtooth', f, t: .22, a: .01, d: 1, v: .2, lp: 1800 });
    s.arp(.3, [659, 880, 1318], { type: 'square', gap: .07, d: .3, v: .12 });
  }],
  streak_rampage: [1.7, 1, s => { // three war drums, then a power chord with a roar under it
    for (const t of [0, .16, .32]) { s.tone({ f: 150, f2: 55, t, d: .3, v: 1 }); s.clack({ t, f: 900, d: .02, v: .6, body: 1.2 }); }
    for (const f of [110, 165, 220]) { s.tone({ type: 'sawtooth', f, t: .5, a: .01, d: 1, v: .22, lp: 1400 }); s.tone({ type: 'square', f: f * 1.004, t: .5, a: .01, d: 1, v: .1, lp: 1000 }); }
    s.tone({ f: 110, f2: 40, t: .5, d: .4, v: 1 });
    s.voice({ t: .52, h: .02, d: .55, f0: 95, fpk: 135, pk: .25, f1: 70, rough: .6, rough2: .85, breath: .5, tail: .15, v: .8 });
  }],
  streak_violence: [2.4, 1, s => { // a huge boom, a dark choir chord and a scream of noise
    s.tone({ f: 70, f2: 28, d: .9, v: 1 }); s.hiss({ f: 500, d: .5, v: .9 });
    s.ring({ f: 95, t: .02, d: 1.6, v: .5 });
    for (const f of [147, 175, 220, 294, 349]) { s.tone({ type: 'sawtooth', f, t: .1, a: .3, d: 1.6, v: .14, lp: 1500 }); s.tone({ type: 'sawtooth', f: f * 1.006, t: .1, a: .3, d: 1.6, v: .1, lp: 1500 }); }
    s.hiss({ ft: 'bandpass', f: 800, f2: 7000, q: 2, t: .2, a: .6, d: .3, v: .5 });
    for (const f of [587, 698, 880, 1175]) s.tone({ type: 'square', f, t: 1, a: .01, d: .9, v: .1, lp: 3000 });
    s.tone({ f: 60, f2: 30, t: 1, d: .6, v: .9 });
  }],
  // pickups
  pickHealth: [.75, .5, s => {
    s.arp(0, [1318, 1661, 1976, 2637], { gap: .05, d: .3, v: .45 });
    s.tone({ f: 3951, t: .15, d: .4, v: .15 });
    s.hiss({ ft: 'highpass', f: 8000, a: .05, d: .35, v: .15 });
  }],
  pickAmmo: [.45, .6, s => { s.magOut(0); s.magIn(.14); }],
  pickArmor: [.5, .65, s => {
    s.scrape({ d: .1, f: 900, v: .4 });
    s.clack({ t: .1, f: 900, d: .025, v: 1, body: 1 }); s.clack({ t: .19, f: 1300, d: .015, v: .55, body: .5 });
  }],

  // zombies
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

  // menus and match events
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

// footsteps for each surface
const FOOT = {
  grass(s, t, k, w) {
    s.thud({ t, d: .04, f: 120 * k, v: .8 * w });
    s.crunch({ t, d: .075, dens: .04, lo: 800 * k, hi: 4500 * k, v: .9 * w });
    s.hiss({ t, f: 1500 * k, f2: 500, a: .003, d: .07, v: .3 * w });
  },
  sand(s, t, k, w) {
    s.thud({ t, d: .05, f: 110 * k, v: .7 * w });
    s.crunch({ t, a: .012, d: .12, dens: .3, lo: 1500 * k, hi: 7000, v: .75 * w });
    s.hiss({ t, ft: 'bandpass', f: 2600 * k, f2: 1100, q: .7, a: .01, d: .11, v: .4 * w });
  },
  wood(s, t, k, w) {
    s.thud({ t, d: .035, f: 160 * k, v: .8 * w });
    s.knock({ t, f: 240 * k, tau: .022, v: w, parts: [[1, 1], [1.47, .6], [2.3, .35], [3.1, .15]] });
    s.crunch({ t, d: .02, dens: .03, lo: 2000, hi: 6000, v: .2 * w });
  },
  stone(s, t, k, w) {
    s.thud({ t, d: .03, f: 150 * k, v: .6 * w });
    s.clack({ t, f: 2200 * k, d: .01, v: .65 * w, body: .6 });
    s.scrape({ t: t + .004, d: .045, f: 2800 * k, v: .3 * w });
  },
  metal(s, t, k, w) {
    s.thud({ t, d: .035, f: 150 * k, v: .7 * w });
    s.knock({ t, f: 520 * k, tau: .03, v: .8 * w, grit: .04, parts: [[1, 1], [2.03, .45], [2.9, .4], [4.2, .2]] });
    s.clack({ t, f: 1500 * k, d: .006, v: .12 * w });
  },
};
// wood creaks: step, other foot, landing
const CREAK = [{ t: .045, d: .11, f: 380, f2: 470, v: .16 },
  { t: .05, d: .09, f: 460, f2: 400, v: .13, res: [[1520, 50], [2490, 65], [3880, 95]] },
  { t: .035, d: .16, f: 340, f2: 430, v: .2, res: [[1290, 45], [2120, 60], [3420, 90]] }];
const AFTER = { wood: (s, n) => s.creak(CREAK[n]) };
for (const [surf, foot] of Object.entries(FOOT)) {
  const toe = .05, after = AFTER[surf] || (() => {});
  SOUNDS['step_' + surf] = [.32, .38, s => { foot(s, 0, 1, 1); foot(s, toe, 1.08, .45); after(s, 0); }];
  SOUNDS['step_' + surf + '2'] = [.32, .38, s => { foot(s, 0, .93, 1); foot(s, toe + .006, 1, .45); after(s, 1); }];
  SOUNDS['land_' + surf] = [.38, .5, s => { s.thud({ d: .04, f: 170, v: .55 }); foot(s, 0, .95, 1.1); foot(s, .022, 1, .85); after(s, 2); }];
}
// splash
SOUNDS.splash = [1.1, .8, s => {
  s.thud({ d: .07, f: 130, v: .7 });
  s.hiss({ ft: 'lowpass', f: 5500, f2: 1500, a: .002, d: .07, v: .9 });
  s.hiss({ ft: 'bandpass', f: 2600, f2: 700, q: .8, a: .02, d: .42, v: .65, sweep: .5 });
  s.crunch({ t: .03, a: .02, d: .32, dens: .02, lo: 900, hi: 6500, v: .5 });
  for (let i = 0; i < 16; i++) { const t = .04 + s.r() ** 1.5 * .75, f = 380 + s.r() * 900; s.tone({ f, f2: f * 1.7, t, a: .003, d: .03 + s.r() * .05, v: .22 * (1 - t * .9) }); }
}];
const FOOT_OK = s => FOOT[s] ? s : 'stone';

// close-up sounds get less echo
const CLOSE = /^(r_|zin_|zout_|dry$|equip$|pick|hurt|die$|armorHit$|step_|land_|ui$|slash$)/;
// render every sound at load
const soundsReady = Promise.all(Object.entries(SOUNDS).map(async ([name, [len, v, build]], i) => {
  const c = new OfflineAudioContext(1, Math.ceil(SR * len), SR);
  build(kit(c, 1000 + i));
  const buf = await c.startRendering(), d = buf.getChannelData(0);
  let peak = 0; for (let k = 0; k < d.length; k++) peak = Math.max(peak, Math.abs(d[k]));
  if (peak > 0) for (let k = 0; k < d.length; k++) d[k] /= peak;
  BUF[name] = { buf, v, echo: CLOSE.test(name) ? .2 : 1 };
}));
soundsReady.catch(e => console.warn('sound setup failed', e));

// play a sound, optionally out in the world at a position
function sfx(name, { at = null, v = 1, rate = 1, far = 60 } = {}) {
  if (self.event) tapN++; // played by a click or key handler
  if (!ac || ac.state !== 'running' || !BUF[name]) return null;
  let gain = BUF[name].v * v, pan = 0, cut = 20000, send = .1;
  if (at) {
    const dx = at.x - camera.position.x, dz = at.z - camera.position.z, dy = (at.y || 0) + 1 - camera.position.y;
    const d = Math.hypot(dx, dy, dz);
    if (d >= far) return null;
    gain *= (1 - d / far) ** 1.5 / (1 + d / 6);
    // pan left or right
    const yaw = camera.rotation.y, dh = Math.hypot(dx, dz);
    if (dh > .01) {
      const right = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / dh, ahead = (-dx * Math.sin(yaw) - dz * Math.cos(yaw)) / dh;
      pan = right * .85 * Math.min(1, dh / 1.5);
      cut = 20000 / (1 + d / 10) * (ahead < -.3 ? .55 : 1); // muffle far and behind
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

// every click on something clickable makes the ui sound, unless its own handler played one
let tapN = 0, tapDown = 0, tapAt = 0;
function tappable(t) {
  for (let e = t; e && e.nodeType === 1 && e !== document.body; e = e.parentElement) {
    if (e.matches('input:not([type=checkbox]):not([type=radio]), textarea, select, canvas, .quiet')) return null;
    if (e.matches('button, a[href], [role=button], input') || getComputedStyle(e).cursor === 'pointer') return e.disabled ? null : e;
  }
  return null;
}
function uiTap(el) { sfx('ui'); }
addEventListener('pointerdown', () => { tapDown = tapN; }, true);
addEventListener('click', e => {
  const el = tappable(e.target); if (!el) return;
  const n = e.detail ? tapDown : tapN; // a keyboard click has no pointerdown
  setTimeout(() => { if (tapN === n && performance.now() - tapAt > 60) { tapAt = performance.now(); uiTap(el); } });
}, true);

// one hurt sound per hit, not one per shotgun pellet
function hurtSfx(who, name, at, opts = {}) {
  if (!ac) return;
  if (who._sndT > ac.currentTime - .07) return;
  who._sndT = ac.currentTime;
  sfx(name, { at, far: 30, ...opts });
}

// looping sounds: flamethrower, eradicator motor, heat ray
let flameHeld = 0, flameOn = false, flameLoop = null, flameGain = null, spinOsc = null, spinGain = null, spinBp = null, spinLfo = null;
let beamHeld = 0, beamOn = false, beamGain = null, frostHeld = 0, frostOn = false, frostGain = null;
function flameBuffer() { // fire loop
  const n = SR * 2, x = SR / 10, r = rng(99), raw = new Float32Array(n + x);
  let lo = 0, lo2 = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = r() * 2 - 1; lo += (w - lo) * .08; lo2 += (w - lo2) * .015;
    raw[i] = lo * 1.6 + lo2 * 3 + (r() < .0012 ? (r() * 2 - 1) * 1.5 : 0);
  }
  const buf = ac.createBuffer(1, n, SR), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = raw[i] * .5;
  for (let i = 0; i < x; i++) d[i] = (raw[i] * (i / x) + raw[n + i] * (1 - i / x)) * .5;
  return buf;
}
// every frame: start and stop the looping sounds
function soundTick(dt, live) {
  if (!ac || ac.state !== 'running') return;
  const t = ac.currentTime;
  flameHeld = live || inLobby ? flameHeld - dt : 0; // also plays in the armory
  const fOn = flameHeld > 0;
  if (fOn && !flameLoop) {
    flameLoop = ac.createBufferSource(); flameLoop.buffer = flameBuffer(); flameLoop.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    flameGain = ac.createGain(); flameGain.gain.value = 0;
    flameLoop.connect(lp).connect(flameGain).connect(bus); flameLoop.start();
  }
  if (fOn !== flameOn) { flameOn = fOn; sfx(fOn ? 'flameStart' : 'flameEnd'); flameGain?.gain.setTargetAtTime(fOn ? .45 : 0, t, fOn ? .04 : .08); }
  // eradicator motor
  const spin = live && gunSpin ? gunSpinV / 30 : inLobby && hf.spin ? hf.spinV / 30 : 0; // yours, or the armory's
  if (spin > 0 && !spinOsc) { // a whine plus rushing air, pulsing as the barrels go round
    spinOsc = ac.createOscillator(); spinOsc.type = 'triangle';
    const air = ac.createBufferSource(), nb = ac.createBuffer(1, SR, SR), nd = nb.getChannelData(0); for (let i = 0; i < SR; i++) nd[i] = Math.random() * 2 - 1; air.buffer = nb; air.loop = true;
    spinBp = ac.createBiquadFilter(); spinBp.type = 'bandpass'; spinBp.Q.value = 3;
    const og = ac.createGain(); og.gain.value = .5; const am = ac.createGain(); am.gain.value = .6;
    spinLfo = ac.createOscillator(); const depth = ac.createGain(); depth.gain.value = .4; spinLfo.connect(depth).connect(am.gain);
    spinGain = ac.createGain(); spinGain.gain.value = 0;
    spinOsc.connect(og).connect(am); air.connect(spinBp).connect(am); am.connect(spinGain).connect(bus);
    spinOsc.start(); air.start(); spinLfo.start();
  }
  if (spinOsc) {
    spinOsc.frequency.setTargetAtTime(160 + spin * 560, t, .06); spinBp.frequency.setTargetAtTime(500 + spin * 2200, t, .06);
    spinLfo.frequency.setTargetAtTime(3 + spin * 34, t, .06); spinGain.gain.setTargetAtTime(spin * .11, t, .05);
  }
  // heat ray hum
  beamHeld = live || inLobby ? beamHeld - dt : 0;
  const bOn = beamHeld > 0;
  if (bOn && !beamGain) {
    beamGain = ac.createGain(); beamGain.gain.value = 0;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.5;
    const lfo = ac.createOscillator(), depth = ac.createGain(); lfo.frequency.value = 11; depth.gain.value = 9;
    for (const [type, f] of [['sawtooth', 110], ['square', 221]]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; lfo.connect(depth).connect(o.frequency); o.connect(bp); o.start(); }
    bp.connect(beamGain).connect(bus); lfo.start();
  }
  if (bOn !== beamOn) { beamOn = bOn; sfx(bOn ? 'heatStart' : 'heatEnd'); beamGain?.gain.setTargetAtTime(bOn ? .1 : 0, t, bOn ? .03 : .06); }
  // frost wand: crackling ice
  frostHeld = live || inLobby ? frostHeld - dt : 0;
  const fzOn = frostHeld > 0;
  if (fzOn && !frostGain && BUF.iceLoop) {
    frostGain = ac.createGain(); frostGain.gain.value = 0;
    const ice = ac.createBufferSource(); ice.buffer = BUF.iceLoop.buf; ice.loop = true;
    ice.connect(frostGain).connect(bus); ice.start();
  }
  if (fzOn !== frostOn) { frostOn = fzOn; sfx(fzOn ? 'frostStart' : 'frostEnd'); frostGain?.gain.setTargetAtTime(fzOn ? BUF.iceLoop.v : 0, t, fzOn ? .03 : .06); }
}
function soundsOff() { flameHeld = 0; if (flameGain) flameGain.gain.value = 0; flameOn = false; if (spinGain) spinGain.gain.value = 0; beamHeld = 0; beamOn = false; if (beamGain) beamGain.gain.value = 0; frostHeld = 0; frostOn = false; if (frostGain) frostGain.gain.value = 0; }
