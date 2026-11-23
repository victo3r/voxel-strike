// held weapons: one set of moves for every view (first person in weapons.js, bots and other players in deathmatch.js, the lobby)
const KICK = { shoulder: [.2, .1], heavy: [.1, .06], all: [.25, .08] }; // muzzle climb, slide back
const SWING = { arm: .65, lift: .35, wrist: .45, sweep: .35, push: .1 }; // arm and hand share a swing; the wind-up barely lifts the arm, so it stays out of your view
const kickFall = w => (w.melee ? 1 / swingT(w) : w.scope ? 4 : 8) * (heavyKick(w) ? HEAVY.settle : 1);
const RL_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'mx', 'my', 'mz'];
const kickOf = w => w.beam ? 0 : w.flame ? .3 : 1; // a beam can't kick: its far end would jump
const heldIdle = a => !(a.sw || a.push || a.wx || a.wy || a.wz || a.left || a.az || a.level || a.fb || a.fh || RL_KEYS.some(c => a[c]));
// the middle of a palm on the gun, in the gun's own frame
function palmAt(h, left) {
  const S = left ? SH_L : SH_R, d = new THREE.Vector3().fromArray(left ? h.dL : h.dR), [n] = armAxes(d, left);
  return new THREE.Vector3(...S).addScaledVector(d, PALM_A).addScaledVector(n, ARM_HW + FIST_GAP + 1).sub(new THREE.Vector3(...h.T)).applyQuaternion(new THREE.Quaternion().fromArray(h.q).invert()).multiplyScalar(BOT_U);
}
// a weapon's moves at this moment: the arms swing at the shoulders, it turns in the hand, a reload moves it and the left hand
function heldAnim(w, st) {
  const o = { sw: 0, push: 0, wx: 0, wy: 0, wz: 0, x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, mx: 0, my: 0, mz: 0, left: 0, az: 0, level: st.level || 0, fb: 0, fh: 0 };
  if (w.melee) {
    if (st.swing >= 0) { const s = swingAt(st.swing), c = Math.max(0, s); o.sw = SWING.arm * (s > 0 ? s : SWING.lift * s); o.wx = -SWING.wrist * s; o.wy = SWING.sweep * s; o.push = SWING.push * c; } // cocked back and right, then a slash down to the left
    else if (st.insp >= 0) inspectPose(w, st.insp, o);
  } else if (st.kick > 0) {
    const [up, back] = KICK[w.hold] || KICK.all, k = st.kick * (heavyKick(w) ? HEAVY.lift : 1);
    o.wx = k * up * (1 - (st.ads || 0) * .85); o.z = k * back; // less muzzle climb while aiming
  }
  const ra = st.rl >= 0 ? reloadPose(w.id, st.rl) : null;
  if (ra) { for (const c of RL_KEYS) o[c] += ra[c]; o.az = ra.az; o.left = st.two ? Math.min(1, Math.max(0, -ra.ay / .3)) : ra.hand; }
  return o;
}
// melee inspect (the aim key): turned to look at, then played with; a balisong flips shut and open (fb: the blade on its pin, fh: the bite handle on the tang)
const inspLen = w => w.flip ? 2.4 : 1.9;
const inspK = (t, a, b) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); }; // 0 to 1 between a and b
function inspectPose(w, t, o) {
  const L = inspLen(w), up = inspK(t, 0, .3) * (1 - inspK(t, L - .35, L)), TAU = Math.PI * 2;
  o.wy += 1.2 * up; o.wx -= .15 * up; o.x -= .1 * up; o.y += .07 * up; o.z -= .04 * up; // up and across in front of you, its flat your way
  if (w.flip) {
    o.fb = Math.PI * (inspK(t, .3, .68) - inspK(t, 1.12, 1.5)); // the blade swings shut over the top, then back out
    o.fh = Math.PI * (inspK(t, .36, .74) - inspK(t, .86, 1.08)); // the bite handle laps round onto it, then out ahead to throw it open
    o.wz += TAU * inspK(t, 1.6, 1.95); // and a twirl
  } else o.wz += .9 * inspK(t, .3, .7) - 1.8 * inspK(t, .8, 1.2) + (.9 + TAU) * inspK(t, 1.3, 1.6); // one side, the other, a twirl
}
const INSPECT_SND = { flip: [[.3, 'flipSwish'], [.7, 'flipShut'], [.87, 'flipSwish'], [1.12, 'flipSwish'], [1.47, 'flipShut'], [1.6, 'flipSwish']], any: [[1.3, 'flipSwish']] };
function inspSnd(w, t0, t1, at, v = .6) { for (const [t, n] of INSPECT_SND[w.flip ? 'flip' : 'any']) if (t > t0 && t <= t1) sfx(n, at ? { at, far: 16, v: .8 } : { v }); } // the cues it passed this frame
const flipShow = (f, a) => { if (f) { f[0].rotation.x = a ? a.fb : 0; if (f[1]) f[1].rotation.x = a ? a.fh : 0; } };
// turn a gun in the hand: q and p are its rotation and place, h the hand in the gun's own frame
const _hE = new THREE.Euler(), _hQ = new THREE.Quaternion(), _hV = new THREE.Vector3(), _hW = new THREE.Vector3();
function heldGun(q, p, q0, p0, a, h, s = 1, lift = 0) { // s: the gun's scale, lift: first person's resting wand tilt
  q.copy(q0).multiply(_hQ.setFromEuler(_hE.set(a.rx, a.ry, a.rz)));
  p.copy(p0).add(_hV.set(a.x, a.y, a.z).multiplyScalar(s).applyQuaternion(q0));
  _hQ.setFromEuler(_hE.set(a.wx + lift, a.wy, a.wz));
  p.add(_hV.copy(h).sub(_hW.copy(h).applyQuaternion(_hQ)).multiplyScalar(s).applyQuaternion(q)); q.multiply(_hQ);
}
