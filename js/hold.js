// how a character (a bot, or you in the armory) holds a weapon, worked out from its hold (see HOLDS in weapons.js).
// Everything here is in character pixels (one skin pixel, 32 to a character's height) in the character's own space:
// it faces +z, its right shoulder is on the -x side. Arms are straight Minecraft arms, so a fist can only be exactly
// one arm's length from its shoulder. The solver tries arm directions and body turns and keeps the pose that fits
// the hold's rules best with nothing poking through anything: no gun inside an arm or the body, no arm through the body,
// arms not crossing, and each fist stopping just outside the grip it holds.
const SH_R = [-6, 22, 0], SH_L = [6, 22, 0]; // shoulders (character.js buildChar)
const ARM_LEN = 10, ARM_R = 2.15, FIST_GAP = .2; // shoulder to the end of the fist, an arm's half-width (a bit over, for its corners), gap to the grip
const TORSO = [-4, 12, -2, 4, 24, 2], HEAD = [-4, 24, -4, 4, 32, 4], LEGS = [-4, 0, -2, 4, 12, 2]; // [x0, y0, z0, x1, y1, z1]
// per hold: right arm angles to try (yaw toward his middle, pitch up) and what it prefers
const HOLD_RULES = {
  pistol: { yaw: [.05, .4], pitch: [-.35, .1], want: { pitch: -.08, yaw: .15 } },
  melee: { yaw: [.05, .4], pitch: [-.35, .1], want: { pitch: -.1, yaw: .2 } },
  rifle: { yaw: [-.2, 1.2], pitch: [-.6, .5], turn: [0, 1.4], gunY: 24.5, want: { pitch: -.05 } },
  heavy: { yaw: [-.2, 1.2], pitch: [-1.2, -.2], turn: [0, 1.4], gunY: 16, maxY: 22, want: { pitch: -.75 } },
  shoulder: { yaw: [-.2, 1.2], pitch: [-.5, .5], turn: [0, 1.4], want: { pitch: 0 }, rest: 2.8 },
};
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const armDir = (yaw, pitch) => v3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); // yaw > 0 turns toward +x
const gunQ = (turn, pitch) => new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, Math.PI + turn, 0, 'YXZ')); // guns point down their -z
// distance from a point to a box (0 inside)
const boxDist = (b, x, y, z) => Math.hypot(Math.max(b[0] - x, 0, x - b[3]), Math.max(b[1] - y, 0, y - b[4]), Math.max(b[2] - z, 0, z - b[5]));
const inBox = (b, x, y, z, m = .15) => x > b[0] + m && x < b[3] - m && y > b[1] + m && y < b[4] - m && z > b[2] + m && z < b[5] - m;
// a straight arm from shoulder S along unit d: does it go through his body or head (turned by headYaw)?
function armHitsBody(S, d, headYaw) {
  const c = Math.cos(-headYaw), s = Math.sin(-headYaw);
  for (let a = 5; a <= ARM_LEN; a += 1) { // the first few pixels sit against his shoulder, like any Minecraft arm
    const x = S[0] + d.x * a, y = S[1] + d.y * a, z = S[2] + d.z * a;
    if (boxDist(TORSO, x, y, z) < ARM_R - .8 || boxDist(LEGS, x, y, z) < ARM_R - .8) return true;
    if (boxDist(HEAD, x * c + z * s, y, -x * s + z * c) < ARM_R - .3) return true;
  }
  return false;
}
// do two arms (shoulders S1, S2, directions d1, d2) run into each other?
function armsCross(d1, d2) {
  for (let a = 3; a <= ARM_LEN; a += 1) for (let b = 3; b <= ARM_LEN; b += 1) {
    const dx = SH_R[0] + d1.x * a - SH_L[0] - d2.x * b, dy = SH_R[1] + d1.y * a - SH_L[1] - d2.y * b, dz = SH_R[2] + d1.z * a - SH_L[2] - d2.z * b;
    if (dx * dx + dy * dy + dz * dz < (2 * ARM_R - .6) ** 2) return true;
  }
  return false;
}
// cells: the gun's outside pixels already moved into character space. How far the fist on an arm from shoulder S along d
// (fist end at S + d * ARM_LEN) is from the gun: positive = a gap, negative = the gun is inside the arm by that much.
// Also returns which pixel is nearest
function armGap(cells, S, d) {
  let gap = Infinity, near = -1;
  for (let k = 0; k < cells.length; k += 3) {
    const vx = cells[k] - S[0], vy = cells[k + 1] - S[1], vz = cells[k + 2] - S[2], a = vx * d.x + vy * d.y + vz * d.z;
    if (a < -2 || vx * vx + vy * vy + vz * vz - a * a >= ARM_R * ARM_R) continue;
    if (a - ARM_LEN < gap) { gap = a - ARM_LEN; near = k; }
  }
  return [gap, near];
}
const HOLD_V = 1; // bump when the solver changes, so saved poses are worked out again
const holdCache = {};
// the solved poses, worked out ahead of time so nothing has to be solved while you play. A pose whose key no longer matches its model
// (the model or the solver changed) is solved again in the browser and saved there; paste fresh ones in here when that happens
const HOLD_BAKED = {"voxel":{"key":"voxel:1:655","T":[-4.999,23.903,9.977],"q":[0,0.999,0,-0.05],"dR":[0.1,0,0.995],"dL":null,"turn":0.1},"shotgun":{"key":"shotgun:1:705","T":[0.327,24.462,8.584],"q":[0,0.846,0,-0.533],"dR":[0.603,-0.075,0.794],"dL":[0.167,0.209,0.964],"turn":1.125},"ar":{"key":"ar:1:721","T":[0.924,24.953,7.99],"q":[0,0.889,0,-0.457],"dR":[0.66,-0.1,0.745],"dL":[0.141,0.277,0.951],"turn":0.95},"sniper":{"key":"sniper:1:839","T":[0.276,24.183,8.628],"q":[0,0.853,0,-0.523],"dR":[0.596,-0.174,0.784],"dL":[0.061,0.086,0.994],"turn":1.1},"eradicator":{"key":"eradicator:1:887","T":[0.621,13.892,8.278],"q":[-0.016,0.773,-0.019,-0.634],"dR":[0.233,-0.735,0.637],"dL":[-0.464,-0.454,0.761],"turn":1.375},"knife":{"key":"knife:1:560","T":[-4.25,20.914,11.582],"q":[-0.009,0.989,-0.124,-0.074],"dR":[0.149,-0.1,0.984],"dL":null,"turn":0.15},"flame":{"key":"flame:1:805","T":[1.335,24.422,8.879],"q":[0,0.872,0,-0.49],"dR":[0.625,0,0.781],"dL":[0.135,0.275,0.952],"turn":1.025},"rocket":{"key":"rocket:1:930","T":[-0.354,25.732,7.289],"q":[0,0.9,0,-0.435],"dR":[0.641,-0.1,0.761],"dL":[-0.207,-0.013,0.978],"turn":0.9},"flare":{"key":"flare:1:578","T":[-4.86,23.402,11.367],"q":[0.001,0.999,0.019,-0.05],"dR":[0.1,-0.075,0.992],"dL":null,"turn":0.1}};
// a weapon's pose key: changes when its model or the solver does (spaces don't count, so line endings can't change it)
const holdSig = w => w.id + ':' + HOLD_V + ':' + GUN_MODELS[w.id].toString().replace(/\s/g, '').length;
function holdFor(i) {
  const w = BASE[i], key = holdSig(w);
  if (HOLD_BAKED[w.id]?.key === key) return holdCache[i] = HOLD_BAKED[w.id];
  if (holdCache[i]?.key === key) return holdCache[i];
  try { const s = JSON.parse(localStorage.getItem('vs_hold_' + w.id)); if (s?.key === key) return holdCache[i] = s; } catch { }
  const h = solveHoldPose(i); h.key = key;
  try { localStorage.setItem('vs_hold_' + w.id, JSON.stringify(h)); } catch { }
  return holdCache[i] = h;
}
function solveHoldPose(i) {
  const w = BASE[i], hold = holdOf(w), R = HOLD_RULES[hold], s = 1 / BOT_U; // world units -> character pixels
  const px = gunPx(i), mdl = gunPieces(i, 0).m, raw = gunCells(i), n = raw.length;
  const local = Float32Array.from(raw, v => v * s), pxs = px * s;
  // is pixel k (an index into cells) part of box b, give or take a pixel
  const inPart = (b, k, slack = 1.2) => Math.abs(local[k] - b[3] * pxs) <= (b[0] / 2 + slack) * pxs && Math.abs(local[k + 1] - b[4] * pxs) <= (b[1] / 2 + slack) * pxs && Math.abs(local[k + 2] - b[5] * pxs) <= (b[2] / 2 + slack) * pxs;
  const G = mdl.grip, F = mdl.fore, two = !!F && hold !== 'pistol' && hold !== 'melee', one = hold === 'pistol' || hold === 'melee';
  const cells = new Float32Array(n), q = new THREE.Quaternion(), tmp = v3(), T = v3();
  // spots the right arm can aim through: the grip's middle and lower down it, even just under it (a fist is far bigger than a grip,
  // so it still closes on the grip, and the gun's body and stock ride up above the arm instead of going into it)
  const aims = [0, -.25, -.5, -.75].map(f => v3(G[3], G[4] + f * G[1], G[5]).multiplyScalar(pxs));
  // spots through the fore the left arm can aim at: a 3x3x3 grid over it, so its fist can land anywhere on the fore's outside
  const foreAims = [];
  if (two) for (const fx of [-.4, 0, .4]) for (const fy of [-.4, 0, .4]) for (const fz of [-.4, 0, .4]) foreAims.push(v3(F[3] + fx * F[0], F[4] + fy * F[1], F[5] + fz * F[2]).multiplyScalar(pxs));
  const place = () => { for (let k = 0; k < n; k += 3) { tmp.set(local[k], local[k + 1], local[k + 2]).applyQuaternion(q).add(T); cells[k] = tmp.x; cells[k + 1] = tmp.y; cells[k + 2] = tmp.z; } };
  let best = null, bestC = Infinity;
  // one pose: the right arm at yaw/pitch, the gun turned by turn. tol = how far off touching the fore the left fist may be
  function tryPose(yaw, pitch, turn, tol) {
    const d = armDir(yaw, pitch), E = v3(...SH_R).addScaledVector(d, ARM_LEN + FIST_GAP);
    if (armHitsBody(SH_R, d, turn)) return;
    // melee: the knife sticks straight out of the fist, tipped up. Pistol: pointing where the arm points, a bit less up or down
    const gp = hold === 'melee' ? Math.asin(d.y) + .35 : hold === 'pistol' ? Math.asin(d.y) * .5 : hold === 'heavy' ? .05 : 0;
    q.copy(gunQ(turn, gp));
    const c0 = .6 * (pitch - R.want.pitch) ** 2 + (R.want.yaw !== undefined ? .6 * (yaw - R.want.yaw) ** 2 : 0) + .25 * turn * turn;
    if (c0 >= bestC) return;
    const hc = Math.cos(-turn), hs = Math.sin(-turn);
    for (const aim of aims) {
      // put the grip spot on the arm's line, then slide the gun along it until it's just clear of the fist
      T.copy(E).sub(tmp.copy(aim).applyQuaternion(q)); place();
      let [gap, near] = armGap(cells, SH_R, d);
      if (near < 0) continue;
      T.addScaledVector(d, FIST_GAP - gap); place();
      [gap, near] = armGap(cells, SH_R, d);
      if (near < 0 || Math.abs(gap - FIST_GAP) > .05 || !inPart(G, near)) continue; // the fist has to be on the grip, not some other part
      // nothing of the gun in his body or head (the head turns to look along the gun), and nothing in front of his face:
      // a gun goes under his chin or off to the right of his head, never across his eyes. Heavy guns stay low (maxY)
      let bad = false;
      for (let k = 0; k < n && !bad; k += 3) {
        const x = cells[k], y = cells[k + 1], z = cells[k + 2], hx = x * hc + z * hs, hz = -x * hs + z * hc;
        bad = inBox(TORSO, x, y, z) || inBox(LEGS, x, y, z) || inBox(HEAD, hx, y, hz, -.3) || (y > 23.6 && Math.abs(hx) < 4.3 && hz > 3) || (R.maxY && y > R.maxY);
      }
      if (bad) continue;
      let c = c0 + (aim === aims[0] ? 0 : .05);
      const mz = v3(0, mdl.muzzle[0] * pxs, mdl.muzzle[1] * pxs).applyQuaternion(q).add(T);
      if (R.gunY) c += .03 * (mz.y - R.gunY) ** 2;
      if (R.rest) { // a shoulder gun lies over his right shoulder: the tube's line passes just above it
        const o = v3().applyQuaternion(q).add(T), ax = v3(0, 0, 1).applyQuaternion(q), p = v3(SH_R[0], SH_R[1] + 2 + 4 * pxs, 0).sub(o);
        const off = p.sub(ax.multiplyScalar(p.dot(ax))).length(); // rest = how far off the shoulder the tube's line can pass
        if (off > R.rest) continue;
        c += .25 * off * off;
      }
      if (c >= bestC) continue;
      let dL = null;
      if (two) { // the left fist on the fore: a miss costs more the further it is from touching, no reach at all costs 4
        let lc = 4;
        for (const fa of foreAims) {
          const dd = tmp.copy(fa).applyQuaternion(q).add(T).sub(v3(...SH_L)).normalize();
          if (armHitsBody(SH_L, dd, turn) || armsCross(d, dd)) continue;
          const [g2, n2] = armGap(cells, SH_L, dd);
          if (n2 < 0 || g2 < FIST_GAP - .35 || g2 > FIST_GAP + tol || !inPart(F, n2)) continue;
          const e = 3 * Math.abs(g2 - FIST_GAP);
          if (e < lc) { lc = e; dL = dd.clone(); }
        }
        c += lc;
      }
      if (c < bestC) { bestC = c; best = { T: T.toArray(), q: q.toArray(), dR: d.toArray(), dL: dL && dL.toArray(), turn, a: [yaw, pitch, turn] }; }
    }
  }
  const range = (a, b, st) => { const o = []; for (let x = a; x <= b + 1e-6; x += st) o.push(x); return o; };
  // a coarse pass over everything, then a fine one round the best pose so the fists land right on their grips
  for (const yaw of range(...R.yaw, .1)) for (const pitch of range(...R.pitch, .1)) for (const turn of one ? [yaw] : range(...R.turn, .1)) tryPose(yaw, pitch, turn, 1.4);
  const coarse = best;
  if (coarse) {
    const [y0, p0, t0] = coarse.a; best = null; bestC = Infinity;
    for (const yaw of range(y0 - .1, y0 + .1, .025)) for (const pitch of range(p0 - .1, p0 + .1, .025)) for (const turn of one ? [yaw] : range(Math.max(0, t0 - .1), t0 + .1, .025)) tryPose(yaw, pitch, turn, .3);
    best ??= coarse;
  }
  if (best) delete best.a;
  return best ?? { T: [SH_R[0], 20, 10], q: gunQ(0, 0).toArray(), dR: [0, 0, 1], dL: null, turn: 0 };
}
// works out every weapon's hold ahead of time, one per idle moment, so nothing stalls the first time someone pulls one out
{
  const later = window.requestIdleCallback || (f => setTimeout(f, 50));
  let k = 0;
  const next = () => { if (k >= BASE.length) return; holdFor(k++); later(next); };
  later(next);
}
