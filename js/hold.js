// works out how bots and the armory character hold each gun
// (in character pixels, facing +z, right shoulder on -x)
const SH_R = [-6, 22, 0], SH_L = [6, 22, 0]; // shoulders
const ARM_LEN = 10, ARM_R = 2.15, FIST_GAP = .2;
const TORSO = [-4, 12, -2, 4, 24, 2], HEAD = [-4, 24, -4, 4, 32, 4], LEGS = [-4, 0, -2, 4, 12, 2]; // [x0, y0, z0, x1, y1, z1]
// right arm angles to try for each hold type
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
// does an arm go through the body or head?
function armHitsBody(S, d, headYaw) {
  const c = Math.cos(-headYaw), s = Math.sin(-headYaw);
  for (let a = 5; a <= ARM_LEN; a += 1) {
    const x = S[0] + d.x * a, y = S[1] + d.y * a, z = S[2] + d.z * a;
    if (boxDist(TORSO, x, y, z) < ARM_R - .8 || boxDist(LEGS, x, y, z) < ARM_R - .8) return true;
    if (boxDist(HEAD, x * c + z * s, y, -x * s + z * c) < ARM_R - .3) return true;
  }
  return false;
}
// do the two arms run into each other?
function armsCross(d1, d2) {
  for (let a = 3; a <= ARM_LEN; a += 1) for (let b = 3; b <= ARM_LEN; b += 1) {
    const dx = SH_R[0] + d1.x * a - SH_L[0] - d2.x * b, dy = SH_R[1] + d1.y * a - SH_L[1] - d2.y * b, dz = SH_R[2] + d1.z * a - SH_L[2] - d2.z * b;
    if (dx * dx + dy * dy + dz * dz < (2 * ARM_R - .6) ** 2) return true;
  }
  return false;
}
// gap between a fist and the gun (negative = inside), and the nearest pixel
function armGap(cells, S, d) {
  let gap = Infinity, near = -1;
  for (let k = 0; k < cells.length; k += 3) {
    const vx = cells[k] - S[0], vy = cells[k + 1] - S[1], vz = cells[k + 2] - S[2], a = vx * d.x + vy * d.y + vz * d.z;
    if (a < -2 || vx * vx + vy * vy + vz * vz - a * a >= ARM_R * ARM_R) continue;
    if (a - ARM_LEN < gap) { gap = a - ARM_LEN; near = k; }
  }
  return [gap, near];
}
const HOLD_V = 1; // bump when the solver changes
const holdCache = {};
// poses solved ahead of time
const HOLD_BAKED = {"voxel":{"T":[-4.999507225951752,23.962162162162162,9.971555726979133],"q":[-5.202002294619858e-19,0.9987502603949663,-1.0395333140070583e-17,-0.04997916927067831],"dR":[0.09983341664682815,4.163336342344337e-17,0.9950041652780258],"dL":null,"turn":0.1,"key":"voxel:1:782"},"hitman":{"T":[-4.999507225951752,23.962162162162162,9.971555726979133],"q":[-5.202002294619858e-19,0.9987502603949663,-1.0395333140070583e-17,-0.04997916927067831],"dR":[0.09983341664682815,4.163336342344337e-17,0.9950041652780258],"dL":null,"turn":0.1,"key":"hitman:1:1066"},"heatray":{"T":[0.6053638997664856,24.893515985821303,8.790000384259335],"q":[0,0.8775825618903728,0,-0.47942553860420295],"dR":[0.6021629944769967,-0.09983341664682821,0.7921066954666632],"dL":[-0.03936882929446331,0.04501276934877527,0.9982103715527791],"turn":0.9999999999999999,"key":"heatray:1:1361"},"shotgun":{"T":[0.7414040757299662,24.84083130162355,8.21933015558425],"q":[0,0.8525245220595059,0,-0.522687228930659],"dR":[0.6434125828796871,-0.04997916927067839,0.7638863337114382],"dL":[0.17098631358752847,0.18453966468265118,0.967837172630067],"turn":1.0999999999999999,"key":"shotgun:1:777"},"ar":{"T":[1.3228224711347876,25.079430110756284,7.609872020072989],"q":[0,0.8892927216231682,0,-0.4573384471789555],"dR":[0.6962204094818634,-0.09983341664682818,0.710851904647886],"dL":[0.23739131483980747,0.23994654515125505,0.9413134542269138],"turn":0.95,"key":"ar:1:765"},"sniper":{"T":[0.9392109096790309,25.16773037082086,7.972981681239201],"q":[0,0.9004471023526769,0,-0.4349655341112303],"dR":[0.6598225275935204,-0.09983341664682821,0.7447600425645288],"dL":[0.013349690767664407,0.14763307447729568,0.9889521025190193],"turn":0.8999999999999999,"key":"sniper:1:913"},"eradicator":{"T":[0.4971303175691239,13.66550922538754,8.199413312103236],"q":[-0.015863524429421214,0.7725934478102308,-0.01931886112569872,-0.6344087756314406],"dR":[0.2107384169986177,-0.7512804051402926,0.6254335076194388],"dL":[-0.4720789677123661,-0.4626611097190838,0.7503906621201604],"turn":1.3749999999999998,"key":"eradicator:1:924"},"knife":{"T":[-4.232427899449705,20.65283083589054,11.695302546018866],"q":[-0.009341841276862295,0.989408419118104,-0.12432425003286977,-0.07434508076219135],"dR":[0.14869156426260063,-0.09983341664682815,0.9838313410528056],"dL":null,"turn":0.15,"key":"knife:1:592"},"flame":{"T":[1.7396716553991445,24.497297297297298,8.555940976760082],"q":[0,0.8892927216231682,0,-0.4573384471789555],"dR":[0.6631354426633498,-3.469446951953614e-17,0.748499421966165],"dL":[0.16321637089707464,0.2759744123497839,0.9472056482091837],"turn":0.95,"key":"flame:1:828"},"rocket":{"T":[-0.410379544366693,26.005663933764627,7.166530858355576],"q":[0,0.9058136834259365,0,-0.423676257203938],"dR":[0.6440163796955248,-0.024997395914712395,0.7646031865493059],"dL":[-0.11320120798813117,0.0009228947893039295,0.9935716555816373],"turn":0.875,"key":"rocket:1:851"},"flare":{"T":[-4.855607873492845,23.46918590143899,11.405749405674307],"q":[0.0009370545160351008,0.9985747039691013,0.01872547014188566,-0.04997038412721173],"dR":[0.09955276675415414,-0.07492970727274233,0.9922070275903181],"dL":null,"turn":0.1,"key":"flare:1:657"},"thrasher":{"T":[1.3210638693194414,25.07752944960266,7.6455497617481765],"q":[0,0.8775825618903728,0,-0.47942553860420295],"dR":[0.6962204094818634,-0.09983341664682818,0.710851904647886],"dL":[0.2566386284485023,0.30697657738716577,0.9164616714973591],"turn":1,"key":"thrasher:1:1119"},"semisniper":{"T":[1.3147227972195066,25.359635674805208,7.601602126586256],"q":[0,0.8892927216231682,0,-0.4573384471789555],"dR":[0.6977490461889918,-0.07492970727274241,0.7124126665847352],"dL":[0.22191674244463033,0.24113664825064987,0.9447783212443043],"turn":0.95,"key":"semisniper:1:1066"},"herosword":{"T":[-4.081598513138786,21.78826105833551,12.693278982277036],"q":[-0.03592321526668972,0.875115517687344,-0.4780777862135337,-0.06575700447010883],"dR":[0.14869156426260063,-0.09983341664682815,0.9838313410528056],"dL":null,"turn":0.15,"key":"herosword:1:777"},"shockbeam":{"T":[0.6053638997664856,24.893515985821303,8.790000384259335],"q":[0,0.8775825618903728,0,-0.47942553860420295],"dR":[0.6021629944769967,-0.09983341664682821,0.7921066954666632],"dL":[-0.03936882929446331,0.04501276934877527,0.9982103715527791],"turn":0.9999999999999999,"key":"shockbeam:1:981"},"tigerbite":{"T":[1.3147227972195066,25.359635674805208,7.601602126586256],"q":[0,0.8892927216231682,0,-0.4573384471789555],"dR":[0.6977490461889918,-0.07492970727274241,0.7124126665847352],"dL":[0.22191674244463033,0.24113664825064987,0.9447783212443043],"turn":0.95,"key":"tigerbite:1:1198"},"trex":{"T":[0.7414040757299662,24.84083130162355,8.21933015558425],"q":[0,0.8525245220595059,0,-0.522687228930659],"dR":[0.6434125828796871,-0.04997916927067839,0.7638863337114382],"dL":[0.17098631358752847,0.18453966468265118,0.967837172630067],"turn":1.0999999999999999,"key":"trex:1:1009"},"starsmasher":{"T":[-0.10577427525981736,23.65614273945488,9.393873029130805],"q":[0,0.8109631195052179,0,-0.5850972729404621],"dR":[0.5186090492355624,-0.12467473338522775,0.8458728420432402],"dL":[0.14202883025113103,0.17730073727702525,0.9738543319914529],"turn":1.2499999999999998,"key":"starsmasher:1:1139"},"blazesaber":{"T":[-4.081598513138786,21.78826105833551,12.693278982277036],"q":[-0.03592321526668972,0.875115517687344,-0.4780777862135337,-0.06575700447010883],"dR":[0.14869156426260063,-0.09983341664682815,0.9838313410528056],"dL":null,"turn":0.15,"key":"blazesaber:1:562"},"windsaber":{"T":[-4.081598513138786,21.78826105833551,12.693278982277036],"q":[-0.03592321526668972,0.875115517687344,-0.4780777862135337,-0.06575700447010883],"dR":[0.14869156426260063,-0.09983341664682815,0.9838313410528056],"dL":null,"turn":0.15,"key":"windsaber:1:559"},"frostwand":{"T":[-4.090507976487995,20.902360636839504,12.634328702761298],"q":[-0.009341841276862295,0.989408419118104,-0.12432425003286977,-0.07434508076219135],"dR":[0.14869156426260063,-0.09983341664682815,0.9838313410528056],"dL":null,"turn":0.15,"key":"frostwand:1:726"},"warhammer":{"T":[-4.132081649301564,21.88635077246077,12.359252692366862],"q":[-0.03592321526668972,0.875115517687344,-0.4780777862135337,-0.06575700447010883],"dR":[0.14869156426260063,-0.09983341664682815,0.9838313410528056],"dL":null,"turn":0.15,"key":"warhammer:1:583"},"executioner":{"T":[-4.999507225951752,23.962162162162162,9.971555726979133],"q":[-5.202002294619858e-19,0.9987502603949663,-1.0395333140070583e-17,-0.04997916927067831],"dR":[0.09983341664682815,4.163336342344337e-17,0.9950041652780258],"dL":null,"turn":0.1,"key":"executioner:1:981"},"crossbow":{"T":[-0.12860926493907177,24.294974631509863,9.576481504001826],"q":[0,0.780706951132447,0,-0.6248973167276997],"dR":[0.5147039858746988,-0.17410813759359597,0.8395035219392396],"dL":[0.08877010624998354,0.11490500226463753,0.9894021976380132],"turn":1.3499999999999999,"key":"crossbow:1:968"},"grenade":{"T":[1.198154125165173,24.7815863095598,9.58715078467634],"q":[0,0.788456972239652,0,-0.6150899145057416],"dR":[0.5431551388071301,-0.04997916927067839,0.8381435305640796],"dL":[0.10179023887905875,0.024918622192072533,0.994493745348352],"turn":1.3249999999999995,"key":"grenade:1:808"}};
// pose key: changes when the gun model or the solver does
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
  const inPart = (b, k, slack = 1.2) => Math.abs(local[k] - b[3] * pxs) <= (b[0] / 2 + slack) * pxs && Math.abs(local[k + 1] - b[4] * pxs) <= (b[1] / 2 + slack) * pxs && Math.abs(local[k + 2] - b[5] * pxs) <= (b[2] / 2 + slack) * pxs;
  const G = mdl.grip, F = mdl.fore, two = !!F && hold !== 'pistol' && hold !== 'melee', one = hold === 'pistol' || hold === 'melee';
  const cells = new Float32Array(n), q = new THREE.Quaternion(), tmp = v3(), T = v3();
  // where the right fist can grab the grip
  const aims = [0, -.25, -.5, -.75].map(f => v3(G[3], G[4] + f * G[1], G[5]).multiplyScalar(pxs));
  // where the left fist can grab the front
  const foreAims = [];
  if (two) for (const fx of [-.4, 0, .4]) for (const fy of [-.4, 0, .4]) for (const fz of [-.4, 0, .4]) foreAims.push(v3(F[3] + fx * F[0], F[4] + fy * F[1], F[5] + fz * F[2]).multiplyScalar(pxs));
  const place = () => { for (let k = 0; k < n; k += 3) { tmp.set(local[k], local[k + 1], local[k + 2]).applyQuaternion(q).add(T); cells[k] = tmp.x; cells[k + 1] = tmp.y; cells[k + 2] = tmp.z; } };
  let best = null, bestC = Infinity;
  function tryPose(yaw, pitch, turn, tol) {
    const d = armDir(yaw, pitch), E = v3(...SH_R).addScaledVector(d, ARM_LEN + FIST_GAP);
    if (armHitsBody(SH_R, d, turn)) return;
    const gp = hold === 'melee' ? Math.asin(d.y) + (w.tilt ?? .35) : hold === 'pistol' ? Math.asin(d.y) * .5 : hold === 'heavy' ? .05 : 0;
    q.copy(gunQ(turn, gp));
    const c0 = .6 * (pitch - R.want.pitch) ** 2 + (R.want.yaw !== undefined ? .6 * (yaw - R.want.yaw) ** 2 : 0) + .25 * turn * turn;
    if (c0 >= bestC) return;
    const hc = Math.cos(-turn), hs = Math.sin(-turn);
    for (const aim of aims) {
      // slide the gun along the arm until it's just clear of the fist
      T.copy(E).sub(tmp.copy(aim).applyQuaternion(q)); place();
      let [gap, near] = armGap(cells, SH_R, d);
      if (near < 0) continue;
      T.addScaledVector(d, FIST_GAP - gap); place();
      [gap, near] = armGap(cells, SH_R, d);
      if (near < 0 || Math.abs(gap - FIST_GAP) > .05 || !inPart(G, near)) continue;
      // keep the gun out of the body and away from the face
      let bad = false;
      for (let k = 0; k < n && !bad; k += 3) {
        const x = cells[k], y = cells[k + 1], z = cells[k + 2], hx = x * hc + z * hs, hz = -x * hs + z * hc;
        bad = inBox(TORSO, x, y, z) || inBox(LEGS, x, y, z) || inBox(HEAD, hx, y, hz, -.3) || (y > 23.6 && Math.abs(hx) < 4.3 && hz > 3) || (R.maxY && y > R.maxY);
      }
      if (bad) continue;
      let c = c0 + (aim === aims[0] ? 0 : .05);
      const mz = v3(0, mdl.muzzle[0] * pxs, mdl.muzzle[1] * pxs).applyQuaternion(q).add(T);
      if (R.gunY) c += .03 * (mz.y - R.gunY) ** 2;
      if (R.rest) { // shoulder guns rest on the right shoulder
        const o = v3().applyQuaternion(q).add(T), ax = v3(0, 0, 1).applyQuaternion(q), p = v3(SH_R[0], SH_R[1] + 2 + 4 * pxs, 0).sub(o);
        const off = p.sub(ax.multiplyScalar(p.dot(ax))).length();
        if (off > R.rest) continue;
        c += .25 * off * off;
      }
      if (c >= bestC) continue;
      let dL = null;
      if (two) { // left fist on the front of the gun
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
  // coarse pass, then a fine one around the best pose
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
// solve any missing poses in idle time
{
  const later = window.requestIdleCallback || (f => setTimeout(f, 50));
  let k = 0;
  const next = () => { if (k >= BASE.length) return; holdFor(k++); later(next); };
  later(next);
}
