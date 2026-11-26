// the target range: a covered firing line, four lanes out to an earth bank, dummies to shoot (range.js runs them)
const RANGE_FL = 22; // the firing line; the lanes run off toward -z
startMap('range', {
  name: 'Target Range', size: 'small', half: 40, range: true,
  env: { sky: 0x8fd0f0, fog: 0x9fd6ee, fogNear: 45, fogFar: 150, hemiSky: 0xffffff, hemiGround: 0x5a6a3a, hemi: 1.1, sunColor: 0xfff4e0, sun: 1.3, sunDir: [-10, 20, 16] },
  pads: [],
  spawn: [0, RANGE_FL + 2.6],
  // [x, metres out, kind]: '' stands still, 'slide' runs side to side, 'armor' wears armor
  dummies: [[-10.5, 10], [-10.5, 25], [-10.5, 50], [-3.5, 15, 'slide'], [-3.5, 35, 'slide'], [3.5, 12, 'armor'], [3.5, 30], [10.5, 5], [9.3, 8], [11.7, 8]],
}, () => {
const G = 160, FL = RANGE_FL, X = 18, BACK = -36; // the side banks at ±X, the backstop at BACK
addGround(G, lam({ map: tex(g => noise(g, [92, 158, 62], 38), G * 2, G * 2) }));
addWall(0, -40, 80.3, .3); addWall(0, 40, 80.3, .3); addWall(-40, 0, .3, 80.3); addWall(40, 0, .3, 80.3);
const onGround = (k, o) => new THREE.MeshLambertMaterial({ ...o, polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -k });
const decal = (w, d, mat, x, z, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); add(m); return m; };
// the range floor, the pad under the roof, lane and distance lines
decal(2 * X, FL - BACK, onGround(2, { map: tex(g => noise(g, [156, 128, 88], 24), X, (FL - BACK) / 2) }), 0, (FL + BACK) / 2, .02);
decal(2 * X, 10.5, onGround(3, { map: tex(g => { noise(g, [150, 150, 146], 14); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 0, 1, 16); }, X, 5.25) }), 0, FL + 4.05, .03);
const paint = onGround(4, { color: 0xf2efe6 });
for (const x of [-14, -7, 0, 7, 14]) decal(.12, FL - BACK - 1, paint, x, (FL + BACK - 1) / 2, .04);
decal(28.12, .16, paint, 0, FL, .04);
for (const d of [10, 25, 50]) decal(28.12, .1, paint, 0, FL - d, .04);

const wood = surf(lam({ map: tex(g => { noise(g, [128, 92, 58], 20); g.fillStyle = 'rgba(50,28,12,.35)'; for (const y of [3, 7, 11, 15]) g.fillRect(0, y, 16, 1); }) }), 'wood');
const beam = surf(lam({ map: tex(g => noise(g, [96, 66, 40], 18)) }), 'wood');
const dirt = surf(lam({ map: tex(g => { noise(g, [128, 98, 64], 26); g.fillStyle = 'rgba(60,40,20,.3)'; for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }) }), 'dirt');
const bags = surf(lam({ map: tex(g => { noise(g, [176, 156, 112], 14); g.fillStyle = 'rgba(70,55,30,.4)'; for (const y of [0, 8]) g.fillRect(0, y, 16, 1); for (const [x, y] of [[0, 1], [8, 9]]) g.fillRect(x, y, 1, 7); }) }), 'dirt');
// the shelter over the firing line
const roofM = lam({ map: tex(g => { noise(g, [126, 52, 42], 16); g.fillStyle = 'rgba(0,0,0,.22)'; for (const x of [0, 8]) g.fillRect(x, 0, 1, 16); }) });
for (const x of [-17, -7, 7, 17]) for (const z of [FL + .4, FL + 8.6]) addBlock(x, z, .3, .3, 4.3, beam);
for (const z of [FL + .4, FL + 8.6]) { const b = box(34.6, .26, .34, beam); b.position.set(0, 4.17, z); add(b); solidBox(0, 4.17, z, 34.6, .26, .34, 'wood'); }
const roof = box(36.4, .24, 10.2, roofM); roof.position.set(0, 4.42, FL + 4.5); add(roof); building.cover.push(roof); solidBox(0, 4.42, FL + 4.5, 36.4, .24, 10.2, 'metal');
addSlab(0, FL + 9.1, 36.4, .3, 0, 4.3, wood);
// a counter for each lane
for (const x of [-10.5, -3.5, 3.5, 10.5]) {
  addSlab(x, FL - .35, 3.2, .8, 0, .95, wood);
  const tray = detail(box(.5, .12, .34, lam({ color: 0x4a5a3a }))); tray.position.set(x + .9, 1.01, FL - .35); add(tray);
}
// distance boards down the side, in pixel figures
const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 5: '111100111001111', M: '1000111011101011000110001' };
function boardTex(text) {
  const ws = [...text].map(ch => ch === 'M' ? 5 : 3), w = ws.reduce((a, b) => a + b + 1, 3), c = document.createElement('canvas'); c.width = w; c.height = 9;
  const g = c.getContext('2d'); g.fillStyle = '#e8c23a'; g.fillRect(0, 0, w, 9); g.fillStyle = '#1c1a16';
  let x = 2; [...text].forEach((ch, i) => { const f = DIG[ch], cw = ws[i]; for (let k = 0; k < f.length; k++) if (f[k] === '1') g.fillRect(x + k % cw, 2 + (k / cw | 0), 1, 1); x += cw + 1; });
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return [t, w];
}
for (const d of [10, 25, 50]) for (const s of [-1, 1]) {
  const [t, w] = boardTex(d + 'M'), bw = w * .1, g = new THREE.Group(); g.position.set(s * (X - 1.6), 0, FL - d); add(g);
  for (const o of [-.3, .3]) { const p = box(.12, 1.9, .12, beam); p.position.set(o * bw, .95, -.05); g.add(p); solidBox(g.position.x + o * bw, .95, g.position.z - .05, .12, 1.9, .12, 'wood'); }
  const back = box(bw + .1, 1, .06, beam); back.position.y = 1.9; g.add(back); solidBox(g.position.x, 1.9, g.position.z, bw + .1, 1, .06, 'wood');
  const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, .9), new THREE.MeshLambertMaterial({ map: t })); face.position.set(0, 1.9, .035); g.add(face);
}
// the backstop and the banks along the sides
addSlab(0, BACK - 2, 2 * X + 4, 4, 0, 5, dirt, true, 2);
addSlab(0, BACK - 5.5, 2 * X + 4, 3, 0, 7, dirt, true, 2);
for (const s of [-1, 1]) addSlab(s * (X + 1), (FL - 2 + BACK) / 2, 2, FL - 2 - BACK, 0, 2.2, dirt, true, 2);
for (let x = -X + .6; x < X; x += 1.2) addSlab(x, BACK + .3, 1.1, .6, 0, .5 + (Math.round(x * 3) % 2 ? .45 : 0), bags, true, 1); // sandbags at its foot
// paper targets pinned to the bank
const ringTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 7.6) continue; g.fillStyle = d < 1.8 ? '#d8282a' : Math.floor((7.6 - d) / 1.5) % 2 ? '#1c1c1c' : '#efe9da'; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const paper = new THREE.MeshLambertMaterial({ map: ringTex, transparent: true, alphaTest: .5 });
for (const x of [-10.5, -3.5, 3.5, 10.5]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), paper); p.position.set(x, 2.6, BACK + .02); add(p); }
// where the dummies stand: a post to lean on, or a rail to run along
for (const [x, d, kind] of MAPS.range.dummies) {
  const z = FL - d;
  if (kind === 'slide') {
    for (const o of [-.22, .22]) { const r = box(6.4, .08, .1, lam({ color: 0x6a6e74 })); r.position.set(x, .04, z + o); add(r); solidBox(x, .04, z + o, 6.4, .08, .1, 'metal'); }
    for (const e of [-3.2, 3.2]) { const st = box(.2, .3, .6, beam); st.position.set(x + e, .15, z); add(st); solidBox(x + e, .15, z, .2, .3, .6, 'wood'); }
  } else {
    const p = box(.16, 2.5, .16, beam); p.position.set(x, 1.25, z - .32); add(p); solidBox(x, 1.25, z - .32, .16, 2.5, .16, 'wood');
    const base = box(1, .08, 1, beam); base.position.set(x, .04, z); add(base); solidBox(x, .04, z, 1, .08, 1, 'wood');
  }
}

const rnd = seeded(2718);
// trees and bushes round it all, clear of the range and the shelter
const clear = (x, z, r) => !(Math.abs(x) < X + 3 + r && z > BACK - 9 - r && z < FL + 11 + r);
function scatter(n, r, R) { const out = []; while (out.length < n) { const x = (rnd() * 2 - 1) * R, z = (rnd() * 2 - 1) * R; if (clear(x, z, r)) out.push([x, z]); } return out; }
const trunks = [], leaves = [], near = (x, z) => Math.max(Math.abs(x), Math.abs(z)) < 44; // near ones sit square with hitboxes, far ones turn
for (const [x, z] of [...scatter(50, 1.6, 45), ...scatter(70, 1.6, 120)]) {
  const s = .8 + rnd() * .7, h = 2.6 * s, turn = rnd() * Math.PI, ry = near(x, z) ? 0 : turn, c = LEAF_TINTS[rnd() * LEAF_TINTS.length | 0];
  const t = [x, h / 2, z, .6 * s, h, .6 * s, ry, 0xffffff], l = [[x, h + 1 * s, z, 2.8 * s, 2.4 * s, 2.8 * s, ry, c], [x, h + 2.6 * s, z, 1.7 * s, 1.2 * s, 1.7 * s, ry, c]];
  trunks.push(t); leaves.push(...l);
  if (near(x, z)) { boxSolids([t], 'wood'); boxSolids(l, 'grass'); }
}
instanced(unit, barkMat, trunks); instanced(unit, leafMat, leaves);
const bushes = scatter(40, 1.2, 60).map(([x, z]) => { const w = 1.2 + rnd(), h = .8 + rnd() * .5, d = w * (.8 + rnd() * .4), turn = rnd() * Math.PI; return [x, h / 2, z, w, h, d, near(x, z) ? 0 : turn, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]; });
instanced(unit, leafMat, bushes); boxSolids(bushes.filter(([x, , z]) => near(x, z)), 'grass');
grassTufts([...scatter(500, .3, 60).map(([x, z]) => [x, 0, z]),
  ...Array.from({ length: 90 }, () => [(rnd() < .5 ? -1 : 1) * (X + .3 + rnd() * 1.4), 2.2, BACK + rnd() * (FL - 2 - BACK)])] // and on top of the banks
  .map(([x, y, z]) => { const s = .8 + rnd() * .6; return [x, y, z, 1.1 * s, 1 * s, 1, rnd() * Math.PI, LEAF_TINTS[rnd() * LEAF_TINTS.length | 0]]; }));
addSky(seeded(909), [-14, 18, 30], 14, 45, 140, 38, 52);
{ // far off: low hills all round, and a snowy range rising behind the targets
  const fr = seeded(1909), F = MAPS.range.env.fog;
  farRange(114, fr, { lo: 3, hi: 10, mat: farMat(0x5f8a4a, F, .58) });
  farRange(130, fr, { lo: 9, hi: 20, peaks: 3, peak: 14, mat: farMat(0x6f86a6, F, .46), snow: farMat(0xffffff, F, .22), snowAt: 21, where: a => .5 + .5 * Math.max(0, -Math.sin(a)) });
}
});
