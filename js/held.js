// held weapons: one set of moves for every view (first person in weapons.js, bots and other players in deathmatch.js, the lobby)
const KICK = { shoulder: [.2, .1], heavy: [.1, .06], orb: [.1, .06], bow: [.06, .03], all: [.25, .08] }; // muzzle climb, slide back
const SWING = { arm: .65, lift: .35, wrist: .45, sweep: .35, push: .1 }; // arm and hand share a swing; the wind-up barely lifts the arm, so it stays out of your view
const THROW_T = .4, CATCH_T = .3; // the Boomerang's throw and catch
const kickFall = w => (w.melee ? 1 / swingT(w) : w.boomer ? 1 / THROW_T : w.scope ? 4 : 8) * (heavyKick(w) ? HEAVY.settle : 1);
const RL_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'mx', 'my', 'mz'];
const kickOf = w => w.beam ? 0 : w.flame ? .3 : 1; // a beam can't kick: its far end would jump
const heldIdle = a => !(a.sw || a.push || a.tw || a.wx || a.wy || a.wz || a.left || a.az || a.level || a.fb || a.fh || a.toss || a.tossR || a.dr || RL_KEYS.some(c => a[c]));
// the middle of a palm on the gun, in the gun's own frame
function palmAt(h, left) {
  if (!left && h.hand) return new THREE.Vector3().fromArray(h.hand).multiplyScalar(BOT_U); // a bow's drawing hand
  const S = left ? SH_L : SH_R, d = new THREE.Vector3().fromArray(left ? h.dL : h.dR), [n] = armAxes(d, left);
  return new THREE.Vector3(...S).addScaledVector(d, PALM_A).addScaledVector(n, ARM_HW + FIST_GAP + 1).sub(new THREE.Vector3(...h.T)).applyQuaternion(new THREE.Quaternion().fromArray(h.q).invert()).multiplyScalar(BOT_U);
}
// a weapon's moves at this moment: the arms swing at the shoulders, it turns in the hand, a reload moves it and the left hand
function heldAnim(w, st) {
  const o = { sw: 0, push: 0, tw: 0, wx: 0, wy: 0, wz: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, mx: 0, my: 0, mz: 0, left: 0, az: 0, level: st.level || 0, fb: 0, fh: 0, toss: 0, tossR: 0, dr: w.bow && w.charge ? Math.min(1, st.draw || 0) * BOW_PULL * GPX * (GUN_SCALE[w.id] || 1) : 0 }; // dr: how far a drawing hand has come back
  if (w.melee) {
    if (st.swing >= 0) w.sweep ? sweepPose(st.swing, st.sv | 0, o) : swingPose(st.swing, w.swings ? st.sv | 0 : 0, o);
    else if (st.insp >= 0) inspectPose(w, st.insp, o);
  } else if (w.boomer) {
    if (st.kick > 0) throwPose(1 - st.kick, o);
    if (st.ct > 0) catchPose(st.ct, o);
  } else if (st.kick > 0) {
    const [up, back] = KICK[w.hold] || KICK.all, k = st.kick * (heavyKick(w) ? HEAVY.lift : 1);
    o.wx = k * up * (1 - (st.ads || 0) * .85); o.z = k * back; // less muzzle climb while aiming
  }
  const ra = st.rl >= 0 ? reloadPose(w.id, st.rl) : null;
  if (ra) { for (const c of RL_KEYS) o[c] += ra[c]; o.az = ra.az; o.left = st.two ? Math.min(1, Math.max(0, -ra.ay / .3)) : ra.hand; }
  return o;
}
// a blade's swing (t 0 to 1): 0 cocked back and right, then a slash down to the left; a blade with `swings` mixes in
// 1 a backhand rising to the right, 2 a thrust and 3 a chop straight down with a twirl on the way up (each view gets v: yours, a bot's, online in state flags)
function swingPose(t, v, o) {
  const s = swingAt(t), c = Math.max(0, s), lift = s > 0 ? s : SWING.lift * s;
  if (v === 1) { o.sw = SWING.arm * .35 * lift; o.wx = SWING.wrist * .4 * s; o.wy = -SWING.sweep * 1.5 * s; o.wz = -.5 * c; o.push = SWING.push * c; }
  else if (v === 2) { o.sw = SWING.arm * .25 * lift; o.wx = -SWING.wrist * .5 * c; o.wy = .08 * s; o.z = s < 0 ? -.15 * s : -.12 * c; o.push = .3 * c; }
  else if (v === 3) { o.sw = SWING.arm * (s > 0 ? .9 * s : .7 * s); o.wx = -SWING.wrist * 1.5 * s; o.wy = -.1 * s; o.wz = Math.PI * 2 * inspK(t, .04, .3) + .45 * c; o.push = SWING.push * c; }
  else { o.sw = SWING.arm * lift; o.wx = -SWING.wrist * s; o.wy = SWING.sweep * s; o.push = SWING.push * c; }
}
// the scythe's sweep in both hands (t 0 to 1), its chest turning (tw) with it: cocked back to the right, one wide sweep across to the left with its edge leading, then back;
// v 0 comes down from high, v 1 rises from low to level, so no two running are alike
function sweepPose(t, v, o) {
  const a = inspK(t, 0, .25), b = inspK(t, .25, .6), k = 1 - inspK(t, .62, 1), [from, mid, to] = v ? [.45, .1, .1] : [-.3, .25, .35]; // v 1 from low up to level: higher, your arms came up over your view
  o.tw = (-.75 * a + 1.6 * b) * k; o.sw = (from * a * (1 - b) + mid * Math.sin(Math.PI * b) + to * b) * k;
  o.wy = (.12 * a - .3 * b) * k; o.push = .08 * Math.sin(Math.PI * b) * k;
}
// the Boomerang's throw (t 0 to 1): let go at once, high and out in front, the arm follows through down, then comes back; its catch (c 1 to 0): the hand gives with it
function throwPose(t, o) { const a = inspK(t, 0, .3), k = 1 - inspK(t, .3, 1), sw = (.55 * a - .2) * k; o.sw = sw; o.push = (.22 - .1 * a) * k; o.wx = -.9 * sw; o.wy = .1 * k; }
function catchPose(c, o) { const u = 1 - c, e = u < .25 ? inspK(u, 0, .25) : 1 - inspK(u, .25, 1); o.z += .1 * e; o.wx += .4 * e; }
const nextSwing = (v, n) => n > 1 ? ((v | 0) + 1 + Math.random() * (n - 1) | 0) % n : 0; // never the same twice running
const swingRate = (w, v) => w.swings ? [1, 1.07, .93, .97][v | 0] : 1; // each swing sounds a little different
// melee inspect (the aim key): turned to look at, then played with; a balisong flips shut and open (fb: the blade on its pin, fh: the bite handle on the tang)
const inspLen = w => w.tricks ? 3.8 : w.flip ? 2.4 : 1.9;
const inspK = (t, a, b) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); }; // 0 to 1 between a and b
function inspectPose(w, t, o) {
  const L = inspLen(w), up = inspK(t, 0, .3) * (1 - inspK(t, L - .35, L)), TAU = Math.PI * 2;
  if (w.hold === 'pole') { o.sw -= .3 * up; o.push += .06 * up; o.tw += (.45 * inspK(t, 0, .3) - .8 * inspK(t, .8, 1.2)) * (1 - inspK(t, L - .35, L)); return; } // both hands on it: up to show its blade, then turned across the other way
  o.wy += 1.2 * up; o.wx -= .15 * up; o.x -= .1 * up; o.y += .07 * up; o.z -= .04 * up; // up and across in front of you, its flat your way
  if (w.tricks) { // the balisong's flips, shut again and tossed end over end, caught, thrown open, then twirled twice
    o.fb = Math.PI * (inspK(t, .3, .68) - inspK(t, 1.12, 1.5) + inspK(t, 1.55, 1.8) - inspK(t, 2.78, 2.98));
    o.fh = Math.PI * (inspK(t, .36, .74) - inspK(t, .86, 1.08) + inspK(t, 1.6, 1.85) - inspK(t, 2.72, 2.88));
    const u = Math.min(1, Math.max(0, (t - 1.95) / .7)); o.toss = TOSS_UP * 4 * u * (1 - u); o.tossR = 2 * TAU * u;
    o.wz += 2 * TAU * inspK(t, 3.02, 3.42); // and twirled twice
  } else if (w.flip) {
    o.fb = Math.PI * (inspK(t, .3, .68) - inspK(t, 1.12, 1.5)); // the blade swings shut over the top, then back out
    o.fh = Math.PI * (inspK(t, .36, .74) - inspK(t, .86, 1.08)); // the bite handle laps round onto it, then out ahead to throw it open
    o.wz += TAU * inspK(t, 1.6, 1.95); // and a twirl
  } else o.wz += .9 * inspK(t, .3, .7) - 1.8 * inspK(t, .8, 1.2) + (.9 + TAU) * inspK(t, 1.3, 1.6); // one side, the other, a twirl
}
const INSPECT_SND = { pole: [[.85, 'flipSwish']], flip: [[.3, 'flipSwish'], [.7, 'flipShut'], [.87, 'flipSwish'], [1.12, 'flipSwish'], [1.47, 'flipShut'], [1.6, 'flipSwish']], any: [[1.3, 'flipSwish']],
  tricks: [[.3, 'flipSwish'], [.7, 'flipShut'], [.87, 'flipSwish'], [1.12, 'flipSwish'], [1.47, 'flipShut'], [1.55, 'flipSwish'], [1.82, 'flipShut'], [1.95, 'flipToss'], [2.63, 'flipCatch'], [2.72, 'flipSwish'], [2.96, 'flipShut'], [3.04, 'flipSwish'], [3.24, 'flipSwish']] };
function inspSnd(w, t0, t1, at, v = .6) { for (const [t, n] of INSPECT_SND[w.tricks ? 'tricks' : w.flip ? 'flip' : w.hold === 'pole' ? 'pole' : 'any']) if (t > t0 && t <= t1) sfx(n, at ? { at, far: 16, v: .8 } : { v }); } // the cues it passed this frame
const flipShow = (f, a) => { if (f) { f[0].rotation.x = a ? a.fb : 0; if (f[1]) f[1].rotation.x = a ? a.fh : 0; } };
// a tossed blade leaves the hand: up, end over end about its middle (`toss`: where that is, model pixels [y, z]); each view calls this after placing the hands so they stay put
const TOSS_UP = .2, _tsQ = new THREE.Quaternion(), _tsC = new THREE.Vector3(), _tsV = new THREE.Vector3(), _tsX = new THREE.Vector3(1, 0, 0);
function heldToss(q, p, a, w, s = 1) {
  if (!a || !(a.toss || a.tossR) || !w.toss) return false;
  const px = GPX * (GUN_SCALE[w.id] || 1);
  p.add(_tsV.set(0, a.toss, 0).multiplyScalar(s).applyQuaternion(q));
  _tsC.set(0, w.toss[0] * px, w.toss[1] * px); _tsQ.setFromAxisAngle(_tsX, a.tossR);
  p.add(_tsV.copy(_tsC).sub(_tsC.applyQuaternion(_tsQ)).multiplyScalar(s).applyQuaternion(q)); q.multiply(_tsQ);
  return true;
}
// someone else's blade (a bot's, another player's, the lobby's): a fist can't turn it like a wrist, so while it's played with it slides just clear of the fist
const CLR_DT = .05, CLR_GAP = .35, CLR_FAR = 6, CLR_FRONT = .8, CLR_DIRS = [[0, 1, 0], [1, 0, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [0, 1, 1], [0, 1, -1], [1, 0, 1], [1, 0, -1]].map(v => v.map(x => x / Math.hypot(...v)));
const clrCache = {}, _clQ = new THREE.Quaternion(), _clP = new THREE.Vector3(), _clV = new THREE.Vector3(), _clR = new THREE.Quaternion(), _clH = new THREE.Quaternion(), _clX = new THREE.Vector3(1, 0, 0);
function bladeClear(i) {
  if (i in clrCache) return clrCache[i];
  const w = BASE[i]; if (!w.melee || w.hold === 'pole') return clrCache[i] = null; // a blade in both hands stays in them
  const h = holdFor(i), u = BOT_U, q = new THREE.Quaternion().fromArray(h.q), T = new THREE.Vector3().fromArray(h.T), S = new THREE.Vector3(...SH_R), d0 = new THREE.Vector3().fromArray(h.dR);
  const hP = palmAt(h, false), px = gunPx(i), { m: mdl, main, subs } = gunPieces(i, 0), fl = mdl.flips || [];
  const cellsOf = (list, at) => { // a part's outer pixels, in the blade's frame
    const { lo, NX, NY, NZ, at: on } = voxelGrid(list), out = [];
    for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++)
      if (on(x, y, z) && (!on(x + 1, y, z) || !on(x - 1, y, z) || !on(x, y + 1, z) || !on(x, y - 1, z) || !on(x, y, z + 1) || !on(x, y, z - 1))) out.push(new THREE.Vector3(x + lo[0] + .5 + at[0], y + lo[1] + .5 + at[1], z + lo[2] + .5 + at[2]).multiplyScalar(px));
    return out;
  };
  const body = cellsOf([...main, ...subs.filter(s => !fl.includes(s)).flatMap(s => s.list.map(([a, b, c, m, x, y, z]) => [a, b, c, m, x + s.at[0], y + s.at[1], z + s.at[2]]))], [0, 0, 0]);
  const blade = fl[0] && cellsOf(fl[0].list, fl[0].at), bite = fl[1] && cellsOf(fl[1].list, fl[1].at), piv = s => new THREE.Vector3(...s.at.map((v, k) => (v + s.off[k]) * px));
  const O0 = fl[0] && piv(fl[0]), O1 = fl[1] && piv(fl[1]), L = inspLen(w), N = Math.ceil(L / CLR_DT) + 1, X = new THREE.Vector3();
  const all = new Float32Array((body.length + (blade ? blade.length : 0) + (bite ? bite.length : 0)) * 3);
  const pose = t => { // the blade's pixels around the arm, in the arm's own axes
    const a = heldAnim(w, { insp: Math.min(L, Math.max(0, t)), swing: -1, rl: -1 });
    _clQ.identity(); _clP.set(0, 0, 0); heldGun(_clQ, _clP, Q_ID, V_0, a, hP, 1); heldToss(_clQ, _clP, a, w, 1);
    const d = _clV.set(a.x, a.y, a.z).applyQuaternion(q).divideScalar(u).addScaledVector(d0, ARM_LEN).normalize().clone(), [n, m] = armAxes(d, false);
    let c = 0;
    const put = () => { X.applyQuaternion(_clQ).add(_clP).applyQuaternion(q).divideScalar(u).add(T).sub(S); all[c++] = X.dot(d); all[c++] = X.dot(n); all[c++] = X.dot(m); };
    for (const V of body) { X.copy(V); put(); }
    if (blade) {
      _clR.setFromAxisAngle(_clX, a.fb); _clH.setFromAxisAngle(_clX, a.fh);
      for (const V of blade) { X.copy(V).sub(O0).applyQuaternion(_clR).add(O0); put(); }
      if (bite) for (const V of bite) { X.copy(V).sub(O1).applyQuaternion(_clH).add(O1).sub(O0).applyQuaternion(_clR).add(O0); put(); }
    }
    return { d, n, m, c, fb: a.fb, fh: a.fh, q: _clQ.clone() };
  };
  const speed = t => { const a = pose(t), b = pose(t + .01); return Math.max(2 * Math.acos(Math.min(1, Math.abs(a.q.dot(b.q)))), Math.abs(b.fb - a.fb), Math.abs(b.fh - a.fh)) / .01; }; // how fast it turns, rad/s
  // as close as it sits at rest, or the gap, whichever is less (so nothing moves the moment it starts)
  let near = Infinity; const r0 = pose(0);
  for (let j = 0; j < r0.c; j += 3) near = Math.min(near, Math.max(-2 - all[j], all[j] - ARM_LEN, Math.abs(all[j + 1]) - ARM_HW, Math.abs(all[j + 2]) - ARM_HW));
  const G = Math.max(0, Math.min(CLR_GAP, near - .02)), lo = [-2, -ARM_HW - G, -ARM_HW - G], hi = [ARM_LEN + G, ARM_HW + G, ARM_HW + G];
  const hitOf = (P, t, D) => { // how much further along D it has to go to be out (0: it is)
    let far = 0;
    for (let j = 0; j < P.length; j += 3) {
      const x = P[j] + t * D[0], y = P[j + 1] + t * D[1], z = P[j + 2] + t * D[2];
      if (x <= lo[0] || x >= hi[0] || y <= lo[1] || y >= hi[1] || z <= lo[2] || z >= hi[2]) continue;
      let e = Infinity;
      if (D[0]) e = Math.min(e, ((D[0] > 0 ? hi[0] : lo[0]) - x) / D[0]);
      if (D[1]) e = Math.min(e, ((D[1] > 0 ? hi[1] : lo[1]) - y) / D[1]);
      if (D[2]) e = Math.min(e, ((D[2] > 0 ? hi[2] : lo[2]) - z) / D[2]);
      if (e > far) far = e;
    }
    return far;
  };
  // worked out a moment at a time as it plays, so nothing stalls
  const c = { L, N, off: [], pick: [], frames: [], k: 0 }, W5 = [1, 2, 3, 2, 1], inv = q.clone().invert(), _s = new THREE.Vector3(), _e = new THREE.Vector3();
  const fin = x => {
    _s.set(0, 0, 0); let ws = 0;
    for (let y = -2; y <= 2; y++) { const v = c.pick[Math.min(c.k - 1, Math.max(0, x + y))]; _s.addScaledVector(v, W5[y + 2]); ws += W5[y + 2]; }
    _s.divideScalar(ws); const F = c.frames[x];
    for (const f of [1, .5, 0]) { // eased in and out where that still keeps it clear
      _e.copy(c.pick[x]).lerp(_s, f);
      const t = _e.length(); if (!hitOf(F.P, t, t ? [_e.dot(F.d) / t, _e.dot(F.n) / t, _e.dot(F.m) / t] : [1, 0, 0])) break;
    }
    c.off[x] = x && x < N - 1 ? _e.clone().applyQuaternion(inv).multiplyScalar(u) : new THREE.Vector3(); c.frames[x] = null; // nothing at rest
  };
  c.step = () => {
    const k = c.k++, t0 = k * CLR_DT, P = [], fast = k && k < N - 1 && speed(t0) > 15; // a spin or a toss: clear of where it's about to go too, so it doesn't jerk about
    let d, n, m;
    for (let s = fast ? -3 : 0; s <= (fast ? 3 : 0); s++) {
      const r = pose(t0 + s * CLR_DT / 2); if (!s) ({ d, n, m } = r);
      for (let j = 0; j < r.c; j += 3) if (all[j] > lo[0] - CLR_FAR && all[j] < hi[0] + CLR_FAR && Math.abs(all[j + 1]) < hi[1] + CLR_FAR && Math.abs(all[j + 2]) < hi[2] + CLR_FAR) P.push(all[j], all[j + 1], all[j + 2]); // only pixels near the arm
    }
    const F = { d, n, m, P: Float32Array.from(P) }, prev = k ? c.pick[k - 1] : _e.set(0, 0, 0);
    let best = Infinity, pick = null, pe = Infinity;
    for (const D of CLR_DIRS) { // the least it has to go each way, close to where it just was
      let t = 0, ok = false;
      for (let r = 0; r < 5 && !ok && t < Math.min(2 * best + .5, CLR_FAR); r++) { const f = hitOf(F.P, t, D); if (f) t += f + .01; else ok = true; }
      if (!ok) continue;
      const v = d.clone().multiplyScalar(t * D[0]).addScaledVector(n, t * D[1]).addScaledVector(m, t * D[2]), e = (t + (D[0] === 1 ? 0 : CLR_FRONT)) ** 2 + 3 * v.distanceToSquared(prev); // past the fist if it can
      best = Math.min(best, t); if (e < pe) { pe = e; pick = v; }
      if (!t) break; // already clear
    }
    c.pick[k] = pick || new THREE.Vector3(); c.frames[k] = F;
    if (k >= 2) fin(k - 2);
    if (k === N - 1) for (let x = Math.max(0, N - 2); x < N; x++) fin(x);
  };
  return clrCache[i] = c;
}
function bladeClearAt(c, t, out) { // how far it slides at this moment of the inspect (as heldAnim's x, y, z)
  if (!c || !(t >= 0) || t >= c.L) return out.set(0, 0, 0);
  const k = t / CLR_DT, j = Math.min(c.N - 2, k | 0);
  while (c.off.length < j + 2 && c.k < c.N) c.step();
  return out.copy(c.off[j]).lerp(c.off[j + 1], Math.min(1, k - j));
}
// turn a gun in the hand: q and p are its rotation and place, h the hand in the gun's own frame
const _hE = new THREE.Euler(), _hQ = new THREE.Quaternion(), _hV = new THREE.Vector3(), _hW = new THREE.Vector3();
function heldGun(q, p, q0, p0, a, h, s = 1, lift = 0) { // s: the gun's scale, lift: first person's resting wand tilt
  q.copy(q0).multiply(_hQ.setFromEuler(_hE.set(a.rx, a.ry, a.rz)));
  p.copy(p0).add(_hV.set(a.x, a.y, a.z).multiplyScalar(s).applyQuaternion(q0));
  _hQ.setFromEuler(_hE.set(a.wx + lift, a.wy, a.wz));
  p.add(_hV.copy(h).sub(_hW.copy(h).applyQuaternion(_hQ)).multiplyScalar(s).applyQuaternion(q)); q.multiply(_hQ);
}
