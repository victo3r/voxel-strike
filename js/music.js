// Music, made in code like the sound effects (no audio files).
// Each map has its own jungle track. The drums are one drum kit drawn sample by sample and mixed into a 2-bar breakbeat
// "recording", which then gets chopped, rearranged, stuttered and pitched bar by bar, the way jungle producers cut up sampled breaks.
// A Deathmatch lasts 4 minutes, and at BPM beats a minute that's exactly BPM bars, so every song lands on a bar line as the match ends.
// In a match the music is quiet with muffled drums, opens up with your kill streak and over the last bars, and hits hardest on the end screen.
// The lobby plays the maps' chords and pads without drums.

let musicVol = .6;
try { const v = parseFloat(localStorage.getItem('voxelstrike-music')); if (v >= 0 && v <= 1) musicVol = v; } catch {}
function setMusicVolume(v) {
  musicVol = v;
  if (MU) MU.master.gain.setTargetAtTime(v, ac.currentTime, .05);
  try { localStorage.setItem('voxelstrike-music', v); } catch {}
}
const mtof = m => 440 * 2 ** ((m - 69) / 12);

// chords are [bass note, [pad notes]] in MIDI numbers, two bars each, so a progression is one 8-bar phrase.
// bass = [16th step, interval above the root, length in 16ths] for each note in a bar
const SONGS = {
  forest: { // moonlit and atmospheric: D minor, dark slow pads, wind, a pluck melody with echoes
    bpm: 160,
    chords: [[38, [53, 57, 60, 64]], [34, [50, 53, 57, 60]], [43, [50, 53, 57, 58]], [33, [52, 55, 57, 61]]],
    pad: { cut: 1100, a: 1.4, v: 1 },
    kit: { kickD: .14, snare: 172, drive: 1.25, bright: .9, room: .3, ride: 1.1 },
    bass: [[0, 0, 10], [10, 0, 2], [12, 7, 4]],
    lead: true, amb: 'wind', hats: .6, reese: .7,
  },
  resort: { // liquid drum & bass: F major, bright, electric piano chords, a steel pan riff, waves washing in
    bpm: 168,
    chords: [[34, [50, 53, 57, 60]], [33, [52, 55, 57, 60]], [43, [53, 57, 58, 62]], [41, [55, 57, 60, 64]]],
    pad: { cut: 1800, a: .8, v: .75 },
    kit: { kickD: .12, snare: 205, drive: 1.15, bright: 1.15, room: .2, ride: .9 },
    bass: [[0, 0, 3], [3, 0, 1], [6, 7, 2], [8, 0, 2], [10, 12, 2], [14, 7, 2]],
    keys: true, steel: true, amb: 'waves', hats: 1, reese: .45,
  },
  yard: { // harder and punchier: A minor, drier breaks, rave stabs and a growling reese when it heats up
    bpm: 176,
    chords: [[33, [55, 59, 60, 64]], [33, [55, 59, 60, 64]], [41, [53, 57, 60, 64]], [43, [55, 59, 62, 64]]],
    pad: { cut: 900, a: .5, v: .7 },
    kit: { kickD: .11, snare: 192, drive: 1.75, bright: 1, room: .12, ride: .8 },
    bass: [[0, 0, 3], [3, 0, 3], [6, 12, 1], [7, 0, 3], [10, 7, 2], [12, 0, 2], [14, 12, 2]],
    stab: true, hats: .8, reese: 1,
  },
};
const LOBBY_SONGS = ['forest', 'resort', 'yard'];

// ---- what should be playing. The lobby, map menus and match code just say what they want; musicTick() does the rest ----
let muWant = { kind: 'lobby', id: 0, seed: 1 },muNow = null, muId = 0, muOld = [];
function musicLobby() { if (muWant.kind !== 'lobby') muWant = { kind: 'lobby', id: ++muId, seed: Math.random() * 1e9 | 0 }; }
// kind = 'dm' or 'zombies'. Every match gets a new seed, so the chops come out different each time
function musicMatch(map, kind) { muWant = { kind, song: SONGS[map] ? map : 'yard', id: ++muId, seed: Math.random() * 1e9 | 0 }; }
function musicEnd() { if (muNow && muNow.kind === 'dm') muNow.ended = true; }

// ---- drum kit, drawn sample by sample ----
function bq(type, f, q) { // a standard 2-pole filter, run one sample at a time
  const w = 6.2832 * f / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  else if (type === 'highpass') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
  b0 /= a0; b1 /= a0; b2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
function arr(sec, fill) { const a = new Float32Array(Math.ceil(sec * SR)); fill(a); let pk = 0; for (const v of a) pk = Math.max(pk, Math.abs(v)); if (pk) for (let i = 0; i < a.length; i++) a[i] /= pk; return a; }
function abuf(a) { const b = new AudioBuffer({ length: a.length, sampleRate: SR, numberOfChannels: 1 }); b.copyToChannel(a, 0); return b; }
const HATF = [205.3, 304.4, 369.6, 522.7, 540, 800]; // six detuned square waves: the classic way to fake cymbal metal

// a small room, run twice around the loop so the end of the break rings into its start
function room(x, size, damp) {
  const combs = [1116, 1188, 1277, 1356].map(d => ({ b: new Float32Array(Math.round(d * size)), i: 0, f: 0 }));
  const aps = [556, 441].map(d => ({ b: new Float32Array(d), i: 0 }));
  const out = new Float32Array(x.length);
  for (let pass = 0; pass < 2; pass++) for (let n = 0; n < x.length; n++) {
    const inp = x[n] * .25; let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = inp + c.f * .8; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i], v = -y + o; a.b[a.i] = y + o * .5; a.i = (a.i + 1) % a.b.length; y = v; }
    if (pass) out[n] = y;
  }
  return out;
}

function muKit(name) {
  if (MU.kits[name]) return MU.kits[name];
  const song = SONGS[name], K = song.kit, r = rng(song.bpm * 13 + 5), st = 60 / song.bpm / 4;
  // kick: a short pitch-dropping thump with a noise click on top, like a 70s funk kick, not a booming 808
  const kick = arr(.35, o => {
    const lp = bq('lowpass', 2500, .7); let ph = 0;
    for (let i = 0; i < o.length; i++) {
      const x = i / SR; ph += (46 + 130 * Math.exp(-x / .03) + 90 * Math.exp(-x / .005)) / SR;
      o[i] = Math.tanh((Math.sin(6.2832 * ph) * Math.exp(-x / K.kickD) * Math.min(1, x / .001) + lp(r() * 2 - 1) * Math.exp(-x / .004) * .7) * K.drive * 1.3);
    }
  });
  // snare: two drum-head tones, the wires rattling (noise), and the stick crack
  const snare = len => arr(.5 * len, o => {
    const hp = bq('highpass', 1000, .7), lp = bq('lowpass', 8500, .7), bp = bq('bandpass', 3500, .7);
    let p1 = 0, p2 = 0;
    for (let i = 0; i < o.length; i++) {
      const x = i / SR, w = r() * 2 - 1;
      p1 += (K.snare + 50 * Math.exp(-x / .008)) / SR; p2 += K.snare * 1.78 / SR;
      const body = Math.sin(6.2832 * p1) * Math.exp(-x / .05) * .9 + Math.sin(6.2832 * p2) * Math.exp(-x / .03) * .35;
      const wires = lp(hp(w)) * (Math.exp(-x / (.09 * len)) + .3 * Math.exp(-x / (.2 * len)));
      o[i] = Math.tanh((body + wires * 1.1 + bp(w) * Math.exp(-x / .005) * .8) * K.drive) * Math.min(1, x / .0007);
    }
  });
  const metal = (sec, dec, mul, bpF, hpF, nz) => arr(sec, o => {
    const bp = bq('bandpass', bpF, .9), hp = bq('highpass', hpF, .7), ph = HATF.map(() => r());
    for (let i = 0; i < o.length; i++) {
      const x = i / SR; let s = 0;
      for (let k = 0; k < 6; k++) { ph[k] = (ph[k] + HATF[k] * mul / SR) % 1; s += ph[k] < .5 ? 1 : -1; }
      o[i] = hp(bp(s / 6 + (r() * 2 - 1) * nz)) * Math.exp(-x / dec) * Math.min(1, x / .0005);
    }
  });
  const snA = snare(1), snB = snare(1.1), ghost = snare(.6);
  const hat = metal(.15, .025, K.bright, 10000, 7000, .3), ohat = metal(.6, .15, K.bright, 9000, 6500, .3);
  const ride = metal(1, .42, 1.45 * K.bright, 5500, 3500, .15), crash = metal(2.2, .65, .78 * K.bright, 6000, 2500, .6);

  // the break: 2 bars of an Amen-style pattern, played a little loose (swung offbeats, hits a hair late, uneven velocity)
  const L = Math.round(32 * st * SR), dry = new Float32Array(L);
  const put = (hit, step, v) => {
    const at = Math.round((step * st + (step % 2 ? st * .07 : 0) + r() * .003) * SR);
    v *= .88 + r() * .24;
    for (let k = 0; k < hit.length; k++) dry[(at + k) % L] += hit[k] * v;
  };
  [0, 2, 10, 11, 16, 18, 26, 29].forEach(s => put(kick, s, 1));
  [4, 12, 20, 28].forEach(s => put(r() < .5 ? snA : snB, s, .95));
  [7, 9, 15, 23, 25, 30].forEach(s => put(ghost, s, .32));
  for (let s = 0; s < 32; s += 2) put(ride, s, (s % 4 ? .2 : .3) * K.ride);
  for (let s = 1; s < 32; s += 2) put(hat, s, .1);
  const wet = room(dry, .5, .35), brk = new Float32Array(L);
  let lp = 0, pk = 0;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < L; i++) { // warm it up a little: soft saturation, top rolled off, a faint noise floor
    lp += (Math.tanh((dry[i] + wet[i] * K.room) * K.drive * .9) - lp) * .75;
    if (pass) { brk[i] = lp + (r() * 2 - 1) * .002; pk = Math.max(pk, Math.abs(brk[i])); }
  }
  for (let i = 0; i < L; i++) brk[i] *= .95 / pk;
  const rev = brk.slice().reverse();
  return MU.kits[name] = { brk: abuf(brk), rev: abuf(rev), dur: L / SR, hat: abuf(hat), ohat: abuf(ohat), crash: abuf(crash) };
}

// ---- shared output, made once sound is allowed ----
let MU = null;
function muInit() {
  const master = ac.createGain(); master.gain.value = musicVol;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = .01; comp.release.value = .25;
  master.connect(comp).connect(ac.destination);
  // a long, dark hall for the pads: noise that gets duller as it dies away
  const n = ac.sampleRate * 3, ir = ac.createBuffer(2, n, ac.sampleRate), r = rng(31);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let l = 0; for (let i = 0; i < n; i++) { l += (r() * 2 - 1 - l) * (.6 - .5 * i / n); d[i] = l * (1 - i / n) ** 2.2 * Math.min(1, i / 600); } }
  const verb = ac.createConvolver(); verb.buffer = ir;
  const verbIn = ac.createGain(); verbIn.gain.value = .5; verbIn.connect(verb).connect(master);
  const nb = ac.createBuffer(1, SR * 4, SR), nd = nb.getChannelData(0), r2 = rng(77);
  for (let i = 0; i < nd.length; i++) nd[i] = r2() * 2 - 1;
  MU = { master, verbIn, noise: nb, kits: {} };
}

// one playing song (or the lobby). Each has its own output so the old one can fade out under the new one
function muStart(w) {
  const now = ac.currentTime, S = { ...w, bar: 0, I: 0, nodes: [], fresh: true };
  const lobby = w.kind === 'lobby';
  S.bpm = lobby ? 84 : SONGS[w.song].bpm; S.st = 60 / S.bpm / 4; S.barDur = S.st * 16; S.nextT = now + .1;
  S.out = ac.createGain(); S.out.gain.value = 0; S.out.connect(MU.master);
  S.wet = ac.createGain(); S.wet.gain.value = 0; S.wet.connect(MU.verbIn);
  // echo for the melody: three 16ths, fading and getting duller each repeat
  S.dly = ac.createDelay(2); S.dly.delayTime.value = S.st * 3;
  const fb = ac.createGain(), dl = ac.createBiquadFilter(), dOut = ac.createGain();
  fb.gain.value = .38; dl.type = 'lowpass'; dl.frequency.value = 2200; dOut.gain.value = .5;
  S.dly.connect(dl).connect(fb).connect(S.dly); dl.connect(dOut); dOut.connect(S.out); dOut.connect(S.wet);
  const send = (g, to, v) => { const s = ac.createGain(); s.gain.value = v; g.connect(s).connect(to); };
  const bus = (v, wet = 0, dly = 0) => { const g = ac.createGain(); g.gain.value = v; g.connect(S.out); if (wet) send(g, S.wet, wet); if (dly) send(g, S.dly, dly); return g; };
  S.pad = bus(.9, .55); S.bass = bus(1); S.keys = bus(.7, .3, .25); S.lead = bus(.6, .35, .55); S.stab = bus(.45, .5, .2); S.steel = bus(.6, .3, .3);
  S.reese = bus(0, .05);
  // drums: a lowpass filter that's nearly closed when things are calm (muffled, like it's in the next room) and opens up as it heats up
  S.drums = ac.createGain(); S.drums.gain.value = .5;
  S.dlp = ac.createBiquadFilter(); S.dlp.type = 'lowpass'; S.dlp.frequency.value = 450; S.dlp.Q.value = .8;
  S.dg = ac.createGain(); S.dg.gain.value = 0;
  S.drums.connect(S.dlp).connect(S.dg).connect(S.out); send(S.dg, S.wet, .08);
  if (!lobby) { S.kit = muKit(w.song); if (SONGS[w.song].amb) muAmb(S, SONGS[w.song].amb); }
  return S;
}
function muLevel(S, v, t, tc) { S.out.gain.setTargetAtTime(v, t, tc); S.wet.gain.setTargetAtTime(v, t, tc); }
function muFade(S) {
  const t = ac.currentTime;
  for (const g of [S.out.gain, S.wet.gain]) { if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t); else g.cancelScheduledValues(t); g.setTargetAtTime(0, t, .5); }
  S.kill = t + 5; muOld.push(S);
}

// wind through the trees, or waves washing in: filtered noise that slowly swells
function muAmb(S, kind) {
  const src = ac.createBufferSource(); src.buffer = MU.noise; src.loop = true;
  const f = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
  if (kind === 'wind') { f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 1.2; lfo.frequency.value = .05; lg.gain.value = 300; lfo.connect(lg).connect(f.frequency); g.gain.value = .07; }
  else { f.type = 'lowpass'; f.frequency.value = 500; lfo.frequency.value = .085; lg.gain.value = .035; g.gain.value = .045; lfo.connect(lg).connect(g.gain); }
  src.connect(f).connect(g).connect(S.out);
  src.start(); lfo.start(); S.nodes.push(src, lfo);
}

// ---- instruments, played live ----
function env(p, t, a, hold, rel, v) { p.setValueAtTime(0, t); p.linearRampToValueAtTime(v, t + a); p.setValueAtTime(v, t + Math.max(a, hold)); p.linearRampToValueAtTime(0, t + Math.max(a, hold) + rel); }
function osc(type, f, t, end, det = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.start(t); o.stop(end); return o; }
// pad: two slightly detuned saws per note through a soft lowpass that slowly breathes open
function pad(S, t, notes, dur, P) {
  const lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.Q.value = .5; lp.frequency.setValueAtTime(P.cut * .7, t); lp.frequency.linearRampToValueAtTime(P.cut * 1.25, t + dur);
  env(g.gain, t, P.a, dur, 1.6, 1);
  lp.connect(g).connect(S.pad);
  notes.forEach((m, i) => [-9, 9].forEach((d, k) => {
    const o = osc('sawtooth', mtof(m), t, t + dur + 1.8, d + (i % 2 ? 3 : -3)), og = ac.createGain(), pn = ac.createStereoPanner();
    og.gain.value = .045 * P.v; pn.pan.value = k ? .35 : -.35;
    o.connect(og).connect(pn).connect(lp);
  }));
}
// sub bass: a sine, plus a soft triangle an octave up so you can still hear the bassline on laptop speakers
function sub(S, t, m, dur, v = 1, a = .006) {
  const f = mtof(m), g = ac.createGain(), g2 = ac.createGain(), lp = ac.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 700; g2.gain.value = .35;
  osc('sine', f, t, t + dur + .1).connect(g); osc('triangle', f * 2, t, t + dur + .1).connect(g2).connect(lp).connect(g);
  env(g.gain, t, a, dur, .06, .26 * v);
  g.connect(S.bass);
}
// reese: two detuned saws an octave over the sub, with the filter sweeping open and shut. The growl when things heat up
function reese(S, t, m, dur) {
  const f = mtof(m + 12), lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.Q.value = 3;
  lp.frequency.setValueAtTime(260, t); lp.frequency.linearRampToValueAtTime(1000, t + dur * .5); lp.frequency.linearRampToValueAtTime(300, t + dur);
  env(g.gain, t, .02, dur - .05, .05, .13);
  osc('sawtooth', f, t, t + dur + .1, -14).connect(lp); osc('sawtooth', f, t, t + dur + .1, 14).connect(lp);
  lp.connect(g).connect(S.reese);
}
// electric piano: a sine bent by another sine at the same pitch, which starts bright and mellows out. Warm, not a bell
function key(S, t, m, v, d = 1.4) {
  const f = mtof(m), c = osc('sine', f, t, t + d * 2), mo = osc('sine', f, t, t + d * 2), mg = ac.createGain(), g = ac.createGain();
  mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * .15, t + .35);
  mo.connect(mg).connect(c.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.setTargetAtTime(0, t + .004, d * .35);
  c.connect(g).connect(S.keys);
}
// pluck: a saw with its filter snapping shut, so it's soft and woody, then echoes
function pluck(S, t, m, v) {
  const lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(300, t + .3);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.setTargetAtTime(0, t + .004, .18);
  osc('sawtooth', mtof(m), t, t + 1.2).connect(lp).connect(g).connect(S.lead);
}
// steel pan: the note plus its octave, twelfth and double octave (how pans are tuned). The high ones die away fast,
// so it pings on the hit and then rings warm instead of glassy. Each note starts a hair sharp and settles (the pan's "boing"),
// and a second copy a few cents off makes it shimmer
const PAN_PARTS = [[1, 1, .5], [1.0035, .3, .45], [2, .5, .22], [3, .2, .1], [4.02, .07, .05]]; // [pitch ratio, level, how fast it dies]
function steel(S, t, m, v) {
  const f = mtof(m), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
  lp.connect(S.steel);
  for (const [k, a, d] of PAN_PARTS) {
    const o = osc('sine', f * k * 1.01, t, t + 2), g = ac.createGain();
    o.frequency.setValueAtTime(f * k * 1.01, t); o.frequency.exponentialRampToValueAtTime(f * k, t + .035);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + .003); g.gain.setTargetAtTime(0, t + .003, d);
    o.connect(g).connect(lp);
  }
}
// a calypso riff over the chords. The rhythm and note shapes are picked once per phrase (r = the phrase's random numbers),
// so bars 5-8 answer bars 1-4. The notes come from the chord, so the same shape follows the chords round.
// The last bar of the phrase ends on a quick roll, like pan players do on a held note
const PAN_RHYTHMS = [[0, 3, 6, 8, 10, 12], [0, 3, 6, 10, 12, 14], [0, 2, 4, 7, 10], [0, 6, 8, 11, 14], [2, 4, 6, 10, 12]];
function steelBar(S, t, ch, r, inPh, v) {
  const order = [0, 1, 2, 3].map(() => r() * PAN_RHYTHMS.length | 0), shapes = [0, 1, 2, 3].map(() => Array.from({ length: 6 }, () => r() * 5 | 0));
  const notes = [...ch[1].map(m => m + 12), ch[1][0] + 24], k = inPh & 3, st = S.st;
  const steps = PAN_RHYTHMS[order[k]], sh = shapes[k];
  steps.forEach((s, i) => { if (!(inPh === 7 && s >= 12)) steel(S, t + s * st, notes[sh[i % sh.length]], v * (s % 4 ? .8 : 1)); });
  if (inPh === 7) for (let i = 0; i < 6; i++) steel(S, t + (12 + i * .5) * st, notes[4], v * (.55 + i * .07));
}
// rave stab: a whole chord hit short and sharp
function stab(S, t, notes, v) {
  const lp = ac.createBiquadFilter(), g = ac.createGain();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(700, t + .15);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .003); g.gain.setTargetAtTime(0, t + .003, .09);
  notes.forEach((m, i) => osc('sawtooth', mtof(m + 12), t, t + .8, i % 2 ? 6 : -6).connect(lp));
  lp.connect(g).connect(S.stab);
}
function muHit(S, buf, at, v) { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf; g.gain.value = v; s.connect(g).connect(S.drums); s.start(at); }

// ---- chopping the break ----
// plan one bar as a list of slices: at = where in the bar (16ths), len = how long (16ths), s = which 16th of the 2-bar break to play,
// rate = speed (pitch), rev = play it backwards. heat 0 = the break mostly as recorded, 1 = cut up hard
function muPlan(r, b, heat, fill) {
  const base = (b & 1) * 16, sl = [];
  for (let i = 0; i < 16; i++) sl.push(base + i);
  const p = .06 + .5 * heat;
  for (let k = 0; k < 4; k++) if (r() < p * .5) { const sb = r() * 8 | 0; for (let j = 0; j < 4; j++) sl[k * 4 + j] = sb * 4 + j; } // swap in a different beat
  if (heat > .45) for (let e = 0; e < 8; e++) if (r() < (heat - .45) * .45) { const se = r() * 16 | 0; sl[e * 2] = se * 2; sl[e * 2 + 1] = se * 2 + 1; } // shuffle 8ths around
  if (r() < p * .5) { const i = 1 + (r() * 13 | 0); sl[i] = sl[i - 1]; } // a 16th stutters
  const ev = sl.map((s, i) => ({ at: i, len: 1, s, rate: 1, v: 1 }));
  if (r() < p * .2) { const k = 1 + (r() * 3 | 0), rt = r() < .5 ? .84 : 1.19; for (let j = 0; j < 4; j++) ev[k * 4 + j].rate = rt; } // a beat pitched down or up
  if (fill) { // the last beat becomes a snare roll speeding up, or a backwards snare sucking into the next bar
    ev.length = 12;
    const sn = r() < .5 ? 4 : 12;
    if (r() < .3 && heat < .7) ev.push({ at: 12, len: 2, s: sl[12], rate: 1, v: 1 }, { at: 14, len: 2, s: sn, rev: true, rate: 1, v: .9 });
    else {
      ev.push({ at: 12, len: 1, s: sn, rate: 1, v: .8 }, { at: 13, len: 1, s: sn, rate: 1, v: .85 });
      for (let k = 0; k < 4; k++) ev.push({ at: 14 + k * .5, len: .5, s: sn, rate: 1 + k * .06, v: .8 + k * .07 });
    }
  }
  const out = []; // join slices that just carry on through the break, so they play as one piece
  for (const e of ev) {
    const q = out[out.length - 1];
    if (q && !q.rev && !e.rev && q.rate === 1 && e.rate === 1 && q.v === e.v && e.s === q.s + q.len && e.at === q.at + q.len) q.len += e.len;
    else out.push({ ...e });
  }
  return out;
}
function muSlice(S, t, e) {
  const K = S.kit, st = S.st, dur = e.len * st, at = t + e.at * st, take = dur * e.rate;
  let off = e.rev ? K.dur - e.s * st - take : e.s * st;
  off = Math.max(0, Math.min(K.dur - take, off));
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = e.rev ? K.rev : K.brk; src.playbackRate.value = e.rate;
  g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(e.v, at + .002); g.gain.setValueAtTime(e.v, at + dur - .004); g.gain.linearRampToValueAtTime(0, at + dur);
  src.connect(g).connect(S.drums); src.start(at, off, take + .01); src.stop(at + dur + .01);
}

// how hot the music should be, 0-1 (-1 = drums out)
function muHeat(S, left) {
  if (S.kind === 'dm') {
    const s = youRec?.streak || 0;
    let I = s >= 10 ? 1 : s >= 5 ? .8 : s >= 3 ? .6 : s >= 2 ? .4 : 0;
    if (left <= 8) I = Math.max(I, .3 + (8 - left) / 8 * .7); // the last 8 bars build up to the end
    return I;
  }
  if (dead || shopOpen) return -1; // zombie waves: drums drop out on the shop and death screens
  return zombies.some(z => z.type === 'boss' && !z.dead) ? .85 : Math.min(.35, wave * .03);
}

// schedule one bar of a map song, starting at audio time t
function muBar(S, t) {
  if (S.kind === 'lobby') return muLobbyBar(S, t);
  const song = SONGS[S.song], st = S.st, now = ac.currentTime;
  let b = S.bar, left = Infinity, stage = 'play';
  if (S.kind === 'dm') {
    if (!S.ended && !matchOver) {
      left = Math.round((matchT - (t - now)) / S.barDur); // bars left in the match, counting this one
      S.total ??= left; // how many bars this match lasts (a 4 minute one is song.bpm bars, blitz is shorter), so every match starts at its intro
      if (left <= 0) S.ended = true; else b = Math.max(0, S.total - left);
    }
    if (S.ended) { S.post = (S.post ?? -1) + 1; stage = S.post < 8 ? 'drop' : 'after'; b = song.bpm + S.post; }
    else if (b < 4) stage = 'intro'; else if (left <= 8) stage = 'build';
  } else if (b < 4) stage = 'intro';
  const r = rng(S.seed + b * 7919);
  const I = stage === 'drop' ? 1 : muHeat(S, left);
  S.I = I > S.I ? I : S.I + (Math.max(0, I) - S.I) * .5; // heats up right away, cools down over a couple of bars
  const heat = stage === 'after' ? 0 : S.I, ph = b >> 3, inPh = b & 7, drop = stage === 'drop';
  const brk = stage === 'play' && ph % 6 === 4 && inPh < 4 && heat < .5; // a breakdown now and then: drums out for 4 bars
  const quiet = I < 0 || stage === 'after';
  // volume: quiet by default, louder with heat, swelling over the last 4 bars, loudest on the end screen
  let lv = S.kind === 'zombies' ? .3 + .35 * heat : .28 + .42 * heat;
  if (stage === 'build' && left <= 4) lv += (5 - left) * .07;
  if (drop) lv = 1; else if (stage === 'after') lv = .4;
  muLevel(S, lv, t, drop && S.post === 0 ? .2 : .8);
  const dOn = !quiet && !brk && !(stage === 'intro' && b < 2);
  S.dg.gain.setTargetAtTime(dOn ? (drop ? 1 : .6 + .4 * heat) : 0, t, dOn ? .3 : .5);
  S.dlp.frequency.setTargetAtTime(drop ? 16000 : 450 * 30 ** Math.min(1, heat / .85), t, .4);
  const rz = drop ? 1 : quiet ? 0 : Math.min(1, Math.max(0, (heat - .35) / .5));
  S.reese.gain.setTargetAtTime(rz * song.reese, t, .5);

  if (dOn) {
    const fill = drop ? S.post === 7 : left === 1 || (inPh === 7 && r() < .35 + .6 * heat) || (inPh === 3 && heat > .6 && r() < .4);
    for (const e of muPlan(r, b, heat, fill)) muSlice(S, t, e);
    if (heat > .3) { // extra hats on top
      for (let i = 0; i < 16; i++) { const v = [0, .2, .5, .2][i & 3]; if (v && r() > .12) muHit(S, S.kit.hat, t + (i + (i & 1) * .07) * st, v * song.hats * .7); }
      if (r() < .4) muHit(S, S.kit.ohat, t + 14 * st, .35 * song.hats);
    }
    if ((drop && S.post === 0) || (inPh === 0 && heat > .55) || (stage === 'play' && ph % 6 === 4 && inPh === 4)) muHit(S, S.kit.crash, t, .55);
  }
  if (drop && S.post === 0) { // the end screen lands: a sub drop under the crash
    const o = osc('sine', 90, t, t + 1.1), g = ac.createGain();
    o.frequency.exponentialRampToValueAtTime(32, t + .9); env(g.gain, t, .005, .3, .7, .45); o.connect(g).connect(S.bass);
  }

  const ch = song.chords[(b >> 1) % song.chords.length], root = ch[0];
  if (!(b & 1) || S.fresh) pad(S, t, ch[1], S.barDur * (b & 1 ? 1 : 2), song.pad);
  S.fresh = false;
  if (!quiet) {
    if (stage === 'intro') sub(S, t, root, S.barDur * .95, .8, .05);
    else for (const [s, iv, len] of song.bass) sub(S, t + s * st, root + iv, len * st * .92);
    if (rz > 0) reese(S, t, root, S.barDur);
  }
  const pr = rng(S.seed + ph * 131); // the riffs stay the same through a phrase, so they sound like a part instead of random notes
  if (song.keys && !(stage === 'intro' && b < 2)) {
    const hits = [[0], [0, 6], [0, 10], [0, 3, 10]][pr() * 4 | 0];
    for (const s of quiet ? [0] : hits) ch[1].forEach((m, i) => key(S, t + s * st + i * .012, m + 12, s ? .035 : .05, s ? .8 : 1.6));
  }
  if (song.steel && !quiet && stage !== 'intro' && (ph % 2 === 0 || heat > .5)) steelBar(S, t, ch, pr, inPh, .075);
  if (song.lead && !quiet && stage !== 'intro' && (ph % 2 || heat > .5)) {
    const steps = [[0, 6, 10], [3, 8, 14], [0, 3, 6, 12], [2, 10]][pr() * 4 | 0], idx = steps.map(() => pr() * 4 | 0);
    steps.forEach((s, i) => pluck(S, t + s * st, ch[1][idx[i]] + 12, .07));
  }
  if (song.stab && !quiet && (heat > .4 || drop)) {
    const steps = [[0, 6, 10], [3, 10], [0, 7], [0, 3, 6]][pr() * 4 | 0];
    for (const s of steps) stab(S, t + s * st, ch[1], .06);
  }
}

// the lobby: each map's chords and pad sound in turn, 8 slow bars each, with electric piano and the pluck melody. No drums
function muLobbyBar(S, t) {
  const b = S.bar, song = SONGS[LOBBY_SONGS[(b >> 3) % 3]], ch = song.chords[(b & 7) >> 1], st = S.st, pr = rng(S.seed + (b >> 3) * 17);
  muLevel(S, .7, t, 1.2);
  if (!(b & 1)) { pad(S, t, ch[1], S.barDur * 2, song.pad); sub(S, t, ch[0], S.barDur * 2 - .15, .5, .4); }
  const up = b & 1 ? [...ch[1]].reverse() : ch[1]; // a slow broken chord, up one bar and back down the next
  up.forEach((m, i) => key(S, t + (b & 1 ? 4 : 0) * st + i * 2 * st, m + 12, .03, 2));
  if (song.steel) { if ((b & 7) >= 2) steelBar(S, t, ch, pr, b & 7, .045); } // the resort's turn: steel pan instead of the pluck
  else if ((b & 7) >= 4) {
    const steps = [[0, 6, 10], [4, 10], [0, 3, 8]][pr() * 3 | 0], idx = steps.map(() => pr() * 4 | 0);
    steps.forEach((s, i) => pluck(S, t + s * st, ch[1][idx[i]] + 12, .05));
  }
}

// called every frame from the main loop
let muIdle = 0;
function musicTick() {
  if (!ac || ac.state !== 'running') return;
  if (!MU) muInit();
  if (!muNow || muNow.id !== muWant.id) { if (muNow) muFade(muNow); muNow = muStart(muWant); }
  const now = ac.currentTime, S = muNow;
  if (S.nextT < now) S.nextT = now + .05; // the tab was hidden: carry on from now instead of rushing to catch up
  while (S.nextT < now + .2) { muBar(S, S.nextT); S.nextT += S.barDur; S.bar++; }
  for (let i = muOld.length - 1; i >= 0; i--) {
    const o = muOld[i]; if (now < o.kill) continue;
    o.nodes.forEach(n => { try { n.stop(); } catch {} }); o.out.disconnect(); o.wet.disconnect(); muOld.splice(i, 1);
  }
  // while you're in the lobby, build the maps' drum kits one at a time so starting a match doesn't stutter
  if (S.kind === 'lobby' && ++muIdle % 30 === 0) { const n = LOBBY_SONGS.find(k => !MU.kits[k]); if (n) muKit(n); }
}
