// lobby scene
const lobbyScene = new THREE.Scene();
const lobbyCam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, .1, 300);
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#061a1e'); gr.addColorStop(.35, '#0f4d50'); gr.addColorStop(.55, '#22786a'); gr.addColorStop(.72, '#173f37'); gr.addColorStop(1, '#0e2a24');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  lobbyScene.background = t;
}
lobbyScene.fog = new THREE.Fog(0x173f37, 16, 62);
lobbyScene.add(new THREE.HemisphereLight(0xcff6e8, 0x1d2f1a, 1));
const lKey = new THREE.DirectionalLight(0xfff0d8, 1.6); lKey.position.set(-4, 8, 7); lobbyScene.add(lKey);
const lRim = new THREE.DirectionalLight(0x5ff5e6, 1.4); lRim.position.set(3, 4, -6); lobbyScene.add(lRim);
// bounce light so faces underneath aren't black
const lBounce = new THREE.DirectionalLight(0xd8e8c0, .8); lBounce.position.set(0, -6, 2); lobbyScene.add(lBounce);

const rgb = ([r, g, b], k = 0) => `rgb(${r + k | 0},${g + k | 0},${b + k | 0})`;
const dot = (g, col, x, y, w = 1, h = 1) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const fillN = (g, w, h, c, v) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dot(g, rgb(c, (Math.random() - .5) * v), x, y); };
function pixMat(w, h, draw, extra) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return lam({ map: t, ...extra });
}

const lCube = new THREE.BoxGeometry(1, 1, 1);
const lGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), lam({ map: tex(g => {
  noise(g, [86, 150, 56], 30); g.fillStyle = 'rgba(25,70,20,.35)';
  for (let i = 0; i < 10; i++) g.fillRect(Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2);
}, 100, 100) }));
lGround.rotation.x = -Math.PI / 2; lobbyScene.add(lGround);
const lBark = pixMat(8, 16, g => { fillN(g, 8, 16, [92, 66, 42], 24); for (const x of [1, 4, 6]) for (let y = 0; y < 16; y++) if (Math.random() < .8) dot(g, rgb([62, 43, 27], (Math.random() - .5) * 18), x, y); });
const lLeaf = pixMat(16, 16, g => { fillN(g, 16, 16, [72, 142, 52], 34); for (let i = 0; i < 14; i++) dot(g, 'rgba(10,40,10,.45)', Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); });
function lInst(mat, list) { // one draw call for a list of boxes
  const m = new THREE.InstancedMesh(lCube, mat, list.length), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((p, i) => {
    o.position.set(p[0], p[1], p[2]); o.scale.set(p[3], p[4], p[5]); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
    if (p[6] !== undefined) m.setColorAt(i, c.set(p[6]));
  });
  lobbyScene.add(m);
}
const L_OAK = [0xffffff, 0xe2f5d0, 0xcfe8b8, 0xbad9a8], L_PINE = [0x8fb59a, 0x7fa58c, 0x9cc4a3];
const lPick = a => a[Math.random() * a.length | 0];
const lTrunks = [], lLeaves = [], lSpots = [];
const lFree = (x, z, gap) => lSpots.every(([a, b]) => (a - x) ** 2 + (b - z) ** 2 > gap * gap);
const lBlocksView = (x, z) => Math.hypot(x, z) < 8.5 || (z > -4 && Math.abs(x) < 12); // keep the view to the camera clear
function lForestTree(x, z) {
  if (Math.random() < .3) {
    const h = 2 + Math.random() * 1.5, layers = 3 + (Math.random() * 2 | 0), col = lPick(L_PINE);
    lTrunks.push([x, (h + layers) / 2, z, .8, h + layers, .8]);
    for (let k = 0; k < layers; k++) { const s = 4 - k * (3 / layers); lLeaves.push([x, h + .6 + k * 1.1, z, s, 1.2, s, col]); }
    lLeaves.push([x, h + .6 + layers * 1.1, z, .7, .8, .7, col]);
  } else {
    const big = Math.random() < .35, h = 3.5 + Math.random() * 4 + (big ? 2 : 0), w = big ? 1.4 : 1, s = (big ? 5.5 : 4) + Math.random(), col = lPick(L_OAK);
    lTrunks.push([x, (h + 1) / 2, z, w, h + 1, w]);
    lLeaves.push([x, h + .9, z, s, 2.6, s, col]);
    lLeaves.push([x, h + 2.8, z, s * .6, 1.4, s * .6, col]);
    if (Math.random() < .5) lLeaves.push([x + (Math.random() - .5) * s * .5, h - .3, z + (Math.random() - .5) * s * .5, s * .55, 1.2, s * .55, col]);
  }
}
for (let tries = 0, k = 0; k < 240 && tries < 6000; tries++) {
  const x = (Math.random() - .5) * 150, z = 25 - Math.random() * 105;
  if (lBlocksView(x, z) || !lFree(x, z, 2.6)) continue;
  lSpots.push([x, z]); lForestTree(x, z); k++;
}
const lBushes = [];
for (let tries = 0, k = 0; k < 70 && tries < 3000; tries++) {
  const a = Math.random() * Math.PI * 2, d = 6.5 + Math.random() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
  if ((z > -3 && Math.abs(x) < 9) || !lFree(x, z, 1.6)) continue;
  const s = .9 + Math.random() * .9; lBushes.push([x, s * .4, z, s * 1.3, s * .8, s * 1.1, lPick(L_OAK)]); k++;
}
lInst(lBark, lTrunks); lInst(lLeaf, lLeaves); lInst(lLeaf, lBushes);
const lLog = box(3.6, .7, .7, lBark); lLog.position.set(-6.2, .35, -6.5); lLog.rotation.y = .5; lobbyScene.add(lLog);
const lStem = lam({ color: 0xeee3cf }), lCap = lam({ color: 0xd8322e });
for (let i = 0; i < 7; i++) {
  const a = -Math.PI * (.1 + Math.random() * .8), d = 5 + Math.random() * 2.5, x = Math.cos(a) * d, z = Math.sin(a) * d - 1;
  const st = box(.12, .22, .12, lStem); st.position.set(x, .11, z); lobbyScene.add(st);
  const cp = box(.34, .14, .34, lCap); cp.position.set(x, .28, z); lobbyScene.add(cp);
}
const lRays = [];
for (const [x, z, r] of [[-7, -14, .3], [3, -18, .25], [11, -12, .35], [-15, -22, .28]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 26), new THREE.MeshBasicMaterial({ color: 0xc8ffe8, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.set(x, 9, z); m.rotation.z = r; lRays.push(m); lobbyScene.add(m);
}

const pedTop = stoneMat(2, 2), pedSide = stoneMat(2, .5);
const ped = new THREE.Mesh(new THREE.BoxGeometry(2.2, .5, 2.2), [pedSide, pedSide, pedTop, pedTop, pedSide, pedSide]);
ped.position.y = .25; lobbyScene.add(ped);
const trim = box(2.34, .08, 2.34, lam({ color: 0xffd23f, emissive: 0x6a4d00 })); trim.position.y = .45; lobbyScene.add(trim); // gold trim
const glowStrip = box(2.3, .06, 2.3, new THREE.MeshBasicMaterial({ color: 0x3ff0e0 })); glowStrip.position.y = .06; lobbyScene.add(glowStrip);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(.42, 20), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .35 }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = .505; lobbyScene.add(shadow);

for (const [x, y, z, r] of [[-3.2, .5, -2.4, .2], [-4.2, .5, -1.5, -.3], [-3.5, 1.5, -2.1, .6], [3.8, .5, -2.8, .4]]) {
  const c = box(1, 1, 1, crateMat(1)); c.position.set(x, y, z); c.rotation.y = r; lobbyScene.add(c);
}
function lTree(x, z, h) {
  const t = box(1, h, 1, barkMat); t.position.set(x, h / 2, z); lobbyScene.add(t);
  const l1 = box(3, 2, 3, leafMat); l1.position.set(x, h + .5, z); lobbyScene.add(l1);
  const l2 = box(1.6, 1, 1.6, leafMat); l2.position.set(x, h + 2, z); lobbyScene.add(l2);
}
lTree(-4.6, -4.2, 3); lTree(4.9, -3.2, 2);
const lamps = [];
for (const x of [-3.1, 3.1]) {
  const post = box(.16, 2.2, .16, lam({ color: 0x2b2f33 })); post.position.set(x, 1.1, -1.8); lobbyScene.add(post);
  const lan = box(.38, .42, .38, lam({ color: 0xffc66b, emissive: 0xffa53a })); lan.position.set(x, 2.35, -1.8); lobbyScene.add(lan);
  const cap = box(.5, .08, .5, lam({ color: 0x2b2f33 })); cap.position.set(x, 2.6, -1.8); lobbyScene.add(cap);
  const pl = new THREE.PointLight(0xffb45a, 6, 7); pl.position.set(x, 2.3, -1.4); lobbyScene.add(pl);
  lamps.push(pl);
}
// flowers
const FLOWER_COLS = [[0xff4d6d, 0xffd23f], [0xffd23f, 0xc0641a], [0xb48cff, 0xfff0a0], [0xffffff, 0xffc82e], [0xff8a3d, 0x7a3a10]];
const lStemMat = lam({ color: 0x3f8f3a }), lLeafMat2 = lam({ color: 0x4fa844 });
const flowerMats = new Map(), fMat = c => { if (!flowerMats.has(c)) flowerMats.set(c, lam({ color: c })); return flowerMats.get(c); };
function lFlower(x, z, tulip, [petal, mid]) {
  const g = new THREE.Group(), h = (tulip ? .38 : .3) * (.8 + Math.random() * .4);
  const head = new THREE.Group(); head.position.y = h;
  const part = (to, w, ht, d, m, px, py, pz) => { const b = box(w, ht, d, m); b.position.set(px, py, pz); to.add(b); return b; };
  part(g, .035, h, .035, lStemMat, 0, h / 2, 0);
  for (const s of Math.random() < .5 ? [1] : [1, -1]) part(g, .12, .025, .05, lLeafMat2, s * .06, h * (.25 + Math.random() * .2), 0).rotation.z = s * .5;
  const pm = fMat(petal);
  if (tulip) {
    for (const [px, pz] of [[.045, 0], [-.045, 0], [0, .045], [0, -.045]]) part(head, px ? .035 : .1, .12, pz ? .035 : .1, pm, px, .06, pz);
    part(head, .06, .07, .06, fMat(mid), 0, .035, 0);
  } else {
    part(head, .07, .04, .07, fMat(mid), 0, .015, 0);
    for (const [px, pz] of [[.075, 0], [-.075, 0], [0, .075], [0, -.075]]) part(head, px ? .08 : .065, .025, pz ? .08 : .065, pm, px, 0, pz);
    head.rotation.x = .35 + Math.random() * .3; // tipped toward the camera
  }
  g.add(head);
  g.position.set(x, 0, z); g.scale.setScalar(1.25); g.rotation.y = tulip ? Math.random() * 6.3 : (Math.random() - .5) * .8;
  lobbyScene.add(g);
}
for (let c = 0; c < 6; c++) {
  const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 3.4, cx = Math.cos(a) * d, cz = Math.sin(a) * d;
  const col = FLOWER_COLS[c % FLOWER_COLS.length], tulip = c % 3 === 1;
  for (let k = 0, n = 2 + (Math.random() * 3 | 0); k < n; k++) lFlower(cx + (Math.random() - .5) * .7, cz + (Math.random() - .5) * .7, tulip, col);
}

const flies = [];
for (let i = 0; i < 45; i++) {
  const s = .07 + Math.random() * .07;
  const m = box(s, s, s, new THREE.MeshBasicMaterial({ color: i % 4 ? 0xd8ff6a : 0xffe27a, transparent: true, fog: false }));
  const x = (Math.random() - .5) * 36, y = .3 + Math.random() * 3.5, z = 3 - Math.random() * 26;
  m.position.set(x, y, z); lobbyScene.add(m);
  flies.push({ m, x, y, z, p: Math.random() * 6.3, s: .4 + Math.random() * .8 });
}
{
  const pts = [];
  for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI - Math.PI, e = .25 + Math.random() * 1.1; pts.push(Math.cos(a) * 110 * Math.cos(e), 110 * Math.sin(e), Math.sin(a) * 110 * Math.cos(e)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  lobbyScene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: .8 })));
}

// your character, arrows flip through the looks
if (!prof.look) prof.look = { ...PRESETS[0].look };
const lookKey = l => JSON.stringify(Object.keys(l).sort().filter(k => l[k] != null && l[k] !== false).map(k => [k, l[k]]));
const isPreset = l => PRESETS.some(p => lookKey(p.look) === lookKey(l));
// your look without a drawn skin (what CrazyGames players see you in)
const lookBase = () => { const { px, ...b } = prof.look; return b; };
const lookChoices = () => [...PRESETS, ...(prof.myLook && !isPreset(prof.myLook) ? [{ name: 'CUSTOM', look: prof.myLook }] : []),
  ...(prof.draws || []).map((d, i) => ({ name: d.n, look: { ...lookBase(), px: d.px }, drawn: i }))];
const lookIndex = () => { const k = lookKey(prof.look); return lookChoices().findIndex(p => lookKey(p.look) === k); };
const hero = new THREE.Group(); hero.position.y = .5; lobbyScene.add(hero);
let heroCh, torso, headPiv, armL, armR; // armL is on the left of the screen
// armory: he holds the picked gun and fidgets with it
const holdG = new THREE.Group();
let holdKey = '', holdK = 0, pose = null;
const GUN_S = 1 / 16 / BOT_U; // bot-sized gun
const DOWN = new THREE.Vector3(0, -1, 0);
const SHR = new THREE.Vector3(...SH_R).divideScalar(16), SHL = new THREE.Vector3(...SH_L).divideScalar(16);
const armTo = (sh, p, out) => out.setFromUnitVectors(DOWN, _av.copy(p).sub(sh).normalize());
const _av = new THREE.Vector3();
function heroGun(i) {
  const key = i < 0 ? '' : i + ':' + gunUse(i);
  if (key === holdKey) return;
  holdKey = key;
  holdG.clear();
  heroFireStop();
  if (i < 0) { pose = null; hf.i = -1; return; }
  const g = new THREE.Group();
  const parts = makeGun(i, g, Math.max(0, gunUse(i) - 1));
  g.scale.setScalar(GUN_S);
  const st = statsAt(i, Math.max(0, gunUse(i) - 1));
  Object.assign(hf, { i, st, g, ammo: st.mag, rl: 0, cd: 0, kick: 0, flash: 0, held: false, auto: 0, mag: parts.mag, magAt: parts.mag && parts.mag.position.clone(), spin: parts.spin, spinV: 0, round: parts.round, rs: { rk: -1 } });
  hf.flashM = makeFlash(.1); hf.flashM.position.set(0, parts.muzzle[0], parts.muzzle[1] - .03); hf.flashM.visible = false; g.add(hf.flashM);
  const h = holdFor(i), fist = (S, d) => S.clone().addScaledVector(new THREE.Vector3().fromArray(d), ARM_LEN / 16);
  const kind = holdOf(BASE[i]);
  pose = { pos: new THREE.Vector3().fromArray(h.T).divideScalar(16), q: new THREE.Quaternion().fromArray(h.q), fR: fist(SHR, h.dR), fL: h.dL && fist(SHL, h.dL), turn: h.turn, sh: kind === 'shoulder', hv: kind === 'heavy' };
  holdG.add(g);
  fid = { k: 'heft', t0: performance.now() / 1000 + .3 };
}
// ---- armory SHOOT and RELOAD buttons (just for show)
const hf = { i: -1, rs: { rk: -1 } };
const heroFx = [], fxGeo = new THREE.BoxGeometry(1, 1, 1);
const TRACER_MAT = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: .9, depthWrite: false });
const FX_MATS = { rocket: new THREE.MeshBasicMaterial({ color: 0xffa040 }), flare: new THREE.MeshBasicMaterial({ color: 0xff5a3a }),
  beam: new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: .75, depthWrite: false }),
  shock: new THREE.MeshBasicMaterial({ color: 0x6fdcff, transparent: true, opacity: .8, depthWrite: false }), frost: new THREE.MeshBasicMaterial({ color: 0xc8f4ff, transparent: true, opacity: .8, depthWrite: false }), laser: new THREE.MeshBasicMaterial({ color: 0xd47bff }) };
const heroCan = () => armOpen && inLobby && armPage === 'weapons' && hf.i >= 0 && holdK > .9;
function heroFireStop() {
  hf.held = hf.pend = false; if (hf.beamM) hf.beamM.visible = false;
}
// held before the gun is out, it fires once it is
function heroTrigger(down) {
  if (!down) { heroFireStop(); return; }
  if (!armOpen || !inLobby || armPage !== 'weapons') return;
  hf.held = true; hf.pend = true;
  if (heroCan()) { hf.pend = false; if (!autoFire(hf.st)) heroShot(); }
}
function heroReload() {
  const w = hf.st; if (!heroCan() || !w || w.melee || hf.rl > 0) return;
  heroFireStop(); hf.rl = w.reload;
  sfx('r_' + w.id, { v: .7, rate: BASE[hf.i].reload / w.reload });
}
const _hm = new THREE.Vector3(), _hd = new THREE.Vector3(), _hq = new THREE.Quaternion();
function heroShot() {
  const w = hf.st;
  if (hf.rl > 0 || hf.cd > 0) return;
  if (!w.inf && hf.ammo <= 0) { if (!hf.held || !autoFire(w)) sfx('dry', { v: .6 }); hf.auto = .25; return; }
  hf.cd = w.rate; if (!w.inf) hf.ammo--;
  hf.kick = w.beam ? 0 : w.flame ? .06 : 1; // a beam can't kick: its far end would jump
  if (w.melee) { sfx(w.swing || 'swing', { v: .7 }); return; }
  hf.flashM.getWorldPosition(_hm); hf.g.getWorldQuaternion(_hq); _hd.set(0, 0, -1).applyQuaternion(_hq);
  if (w.flame) {
    flameHeld = .12;
    for (let k = 0; k < 2; k++) {
      const m = new THREE.Mesh(flameGeo, flameMats[Math.random() * 3 | 0]); m.position.copy(_hm); m.scale.setScalar(.6); lobbyScene.add(m);
      heroFx.push({ m, v: _hd.clone().multiplyScalar(6).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5)), life: .4, grow: 2 });
    }
    return;
  }
  if (w.beam) {
    if (w.frost) frostHeld = .12; else beamHeld = .12;
    hf.beamM ??= new THREE.Mesh(fxGeo, FX_MATS.beam); hf.beamM.material = w.frost ? FX_MATS.frost : w.shock ? FX_MATS.shock : FX_MATS.beam; lobbyScene.add(hf.beamM);
    if (w.shock && Math.random() < .25) sfx('zap', { v: .4 });
    hf.beamOn = .08; return;
  }
  sfx(w.id, { v: .5 }); hf.flash = .05;
  if (w.starFx) starPuff(hf.flashM, lobbyScene, .8);
  if (hf.spin) hf.spinV = 30;
  const n = w.pellets > 1 ? 5 : 1, mat = w.rocket || w.grenade ? FX_MATS.rocket : w.flare ? FX_MATS.flare : w.laser ? FX_MATS.laser : TRACER_MAT, thick = w.rocket || w.grenade ? .09 : w.flare ? .06 : w.laser ? .04 : .02;
  for (let k = 0; k < n; k++) {
    const d = _hd.clone(); if (n > 1) d.add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(w.spread * 3)).normalize();
    const len = w.rocket || w.flare || w.grenade ? .6 : 3, m = new THREE.Mesh(fxGeo, mat);
    m.scale.set(thick, thick, len); m.position.copy(_hm).addScaledVector(d, len / 2); m.lookAt(_hm.clone().addScaledVector(d, 10)); lobbyScene.add(m);
    heroFx.push({ m, v: d.multiplyScalar(w.rocket || w.grenade ? 25 : w.flare ? 30 : 90), life: w.rocket || w.flare || w.grenade ? .8 : .12 });
  }
}
function heroTick(dt) {
  for (let k = heroFx.length - 1; k >= 0; k--) {
    const f = heroFx[k]; f.life -= dt; f.m.position.addScaledVector(f.v, dt); if (f.grow) f.m.scale.multiplyScalar(1 + f.grow * dt);
    if (f.life <= 0) { lobbyScene.remove(f.m); heroFx.splice(k, 1); }
  }
  if (hf.i < 0) return;
  const w = hf.st;
  const can = heroCan();
  if (!armOpen || !inLobby || armPage !== 'weapons') heroFireStop();
  hf.cd -= dt; hf.kick = Math.max(0, hf.kick - dt * (w.melee ? 1 / KNIFE_SWING : w.scope ? 4 : 8)); hf.flash -= dt;
  if (can && hf.held && (autoFire(w) || hf.pend)) { hf.pend = false; heroShot(); }
  if (hf.rl > 0 && (hf.rl -= dt) <= 0) { hf.rl = 0; hf.ammo = w.mag; }
  if (hf.auto > 0 && (hf.auto -= dt) <= 0 && !w.inf && hf.ammo <= 0) heroReload();
  hf.flashM.visible = hf.flash > 0;
  if (hf.spin) { hf.spin.rotation.z += hf.spinV * dt; hf.spinV = Math.max(0, hf.spinV - dt * 25); }
  if (hf.round) hf.round.visible = hf.ammo > 0 || (hf.rl > 0 && hf.rl / w.reload < .4);
  if (w.flare && hf.mag) hf.mag.visible = hf.ammo > 0 || (hf.rl > 0 && hf.rl / w.reload < .6);
  if (hf.beamM) {
    hf.beamOn -= dt; hf.beamM.visible = hf.held && hf.beamOn > 0;
    if (hf.beamM.visible) { hf.flashM.getWorldPosition(_hm); hf.g.getWorldQuaternion(_hq); _hd.set(0, 0, -1).applyQuaternion(_hq);
      const L = w.range || 30; hf.beamM.scale.set(.05, .05, L); hf.beamM.position.copy(_hm).addScaledVector(_hd, L / 2); hf.beamM.lookAt(_hm.addScaledVector(_hd, L)); }
  }
}
$('heroShoot').innerHTML = ico('aim'); $('heroReload').innerHTML = ico('reload');
$('heroShoot').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); $('heroShoot').setPointerCapture(e.pointerId); heroTrigger(true); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('heroShoot').addEventListener(ev, () => heroTrigger(false));
$('heroReload').addEventListener('pointerdown', e => { e.stopPropagation(); heroReload(); });
// fidgets with the gun every few seconds
const FIDGETS = ['look', 'lower', 'shake', 'heft', 'look', 'shake', 'lower', 'heft'], FID_T = { look: 2, lower: 2.8, shake: 1, heft: .9 };
let fid = null, fidN = 0, fidNext = 0;
const SH_MID = new THREE.Vector3(0, SH_R[1] / 16, 0), X_AX = new THREE.Vector3(1, 0, 0), _wq = new THREE.Quaternion(), _fr = new THREE.Vector3();
const smooth = x => x * x * (3 - 2 * x);
function fidgetAt(t, sh, hv) {
  const o = { low: 0, roll: 0, wy: 0, wz: 0 };
  if (hf.held || hf.rl > 0 || hf.kick > 0) { fid = null; fidNext = t + 2.5; return o; } // no fidgets while shooting
  if (!fid && t >= fidNext) fid = { k: FIDGETS[fidN++ % FIDGETS.length], t0: t };
  if (!fid) return o;
  const p = (t - fid.t0) / FID_T[fid.k], big = sh || hv ? .55 : 1;
  if (p >= 1) { fid = null; fidNext = t + 1.6 + (fidN % 3) * .6; return o; }
  if (p <= 0) return o;
  const env = Math.sin(p * Math.PI);
  if (fid.k === 'look') o.roll = sh ? 0 : .4 * env * env;
  else if (fid.k === 'lower') o.low = .65 * big * (p < .22 ? smooth(p / .22) : p > .72 ? smooth((1 - p) / .28) : 1);
  else if (fid.k === 'shake') { o.wy = .07 * big * env * Math.sin(p * Math.PI * 10); o.wz = .05 * big * env * Math.sin(p * Math.PI * 8 + 1); }
  else o.low = .1 * big * Math.sin(p * Math.PI * 2) ** 2 * (1 - .4 * p);
  return o;
}
// ease between guns
const hPos = new THREE.Vector3(-.4, .6, .2), hQ = new THREE.Quaternion(), hFR = new THREE.Vector3(-.4, .8, .3), hFL = new THREE.Vector3(.4, .8, .3);
let hLK = 0, hTurn = 0;
const LOW_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), new THREE.Vector3(.3, -1, .3).normalize()), LOW_P = new THREE.Vector3(-.4, .6, .2);
const _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _l = new THREE.Vector3(), sway = new THREE.Quaternion(), _e = new THREE.Euler();
const _lq = new THREE.Quaternion(), _tq = new THREE.Quaternion(), _aq = new THREE.Quaternion(), _ax = new THREE.Vector3();
const _hv2 = new THREE.Vector3(), _rq2 = new THREE.Quaternion(), _q0i = new THREE.Quaternion(), _q1 = new THREE.Quaternion(), _re2 = new THREE.Euler();
function dressHero() {
  if (heroCh) heroCh.dispose();
  hero.clear();
  heroCh = buildChar(prof.look, 1 / 16, true);
  dressArmor(heroCh, heroArmorN = wornArmor());
  dressBoots(heroCh, heroBootsB = wornBoots());
  dressHat(heroCh, heroHatH = wornHat());
  hero.add(heroCh.g); torso = heroCh.body; headPiv = heroCh.headPiv; armL = heroCh.armR; armR = heroCh.armL;
  heroCh.g.add(holdG);
}
// gear he wears: yours, or what you're looking at
let heroArmorN = 0;
function heroArmor(n) { if (heroCh && n !== heroArmorN) { dressArmor(heroCh, heroArmorN = n); } }
let heroBootsB = null;
const bootKey = b => b ? b.id + b.st : '';
function heroBoots(b) { if (heroCh && bootKey(b) !== bootKey(heroBootsB)) dressBoots(heroCh, heroBootsB = b); }
let heroHatH = null;
function heroHat(h) { if (heroCh && bootKey(h) !== bootKey(heroHatH)) dressHat(heroCh, heroHatH = h); }
function wearLook(i) {
  const p = lookChoices()[i]; if (!p || i === lookIndex()) return;
  prof.look = { ...p.look }; saveProf(); dressHero(); sfx('equip');
}
dressHero();

// ---- customizer
const CLOTH = [0xf0f0f0, 0x9a9aa2, 0x55606a, 0x33363d, 0x1c1c20, 0xb8342c, 0x8a2e2e, 0xd4577a, 0xe07a2c, 0xe8c33a,
  0x4f8a5a, 0x2a5a3a, 0x1c9e98, 0x3d5a8c, 0x2c3e80, 0x6a4fb0, 0x5a3a24, 0x4b4033];
const hexCss = n => '#' + n.toString(16).padStart(6, '0');
const C_ROWS = [
  { label: 'SKIN', key: 'skin', swatch: SKIN_TONES.map((c, i) => [i, `rgb(${c})`]) },
  { label: 'EYES', key: 'eyes', swatch: Object.entries(EYE_COLS).map(([k, c]) => [k, `rgb(${c})`]) },
  { label: 'EYE SIZE', key: 'bigEyes', opts: [[false, 'NORMAL'], [true, 'BIG']], off: (v, L) => v && !bigEyesFit(L) },
  { label: 'BROWS', key: 'brows', opts: [['none', 'NONE'], ['soft', 'SOFT'], ['full', 'FULL']], get: browsOf },
  { label: 'MOUTH', key: 'mouth', opts: [['small', 'SMALL'], ['wide', 'WIDE']], get: mouthOf },
  { label: 'HAIR', key: 'hair', cycle: [['short', 'SHORT'], ['buzz', 'BUZZ'], ['side', 'SIDE PART'], ['curly', 'CURLY'], ['long', 'LONG'], ['bob', 'BOB']] },
  { label: 'HAIR COLOR', key: 'hairC', swatch: Object.entries(HAIR_COLS).map(([k, c]) => [k, `rgb(${c})`]) },
  { label: 'TOP', key: 'top', cycle: [['tee', 'T-SHIRT'], ['long', 'LONG SLEEVE'], ['tank', 'TANK TOP'], ['hoodie', 'HOODIE'], ['jacket', 'JACKET']] },
  { label: 'TOP COLOR', key: 'topC', cloth: 0x1c9e98 },
  { label: 'SHIRT', key: 'top2', cloth: 0xe6e6e6, show: L => L.top === 'jacket' },
  { label: 'STRINGS', key: 'top2', cloth: 0xe6e6e6, show: L => L.top === 'hoodie' },
  { label: 'BOTTOM', key: 'bottom', opts: [['pants', 'PANTS'], ['shorts', 'SHORTS']] },
  { label: 'BOTTOM COLOR', key: 'bottomC', cloth: 0x2c3e80 },
  { label: 'SHOES', key: 'shoes', cycle: [['sneakers', 'SNEAKERS'], ['boots', 'BOOTS'], ['plain', 'PLAIN']] },
  { label: 'SHOE COLOR', key: 'shoeC', cloth: 0x3a3a40 },
  { label: 'EXTRA', key: 'extra', cycle: [[null, 'NONE'], ['glasses', 'GLASSES'], ['stubble', 'STUBBLE'], ['beard', 'BEARD'], ['freckles', 'FRECKLES'], ['headband', 'HEADBAND'], ['badge', 'BADGE']] },
  { label: 'BAND COLOR', key: 'bandC', cloth: 0xd23a3a, show: L => L.extra === 'headband', get: L => L.bandC ?? L.top2 },
];
const DEFAULTS = { girl: false, skin: 2, eyes: 'blue', bigEyes: false, hair: 'short', hairC: 'dark', top: 'tee', bottom: 'pants', shoes: 'plain', extra: null };
const custVal = (row, L) => (row.get ? row.get(L) : L[row.key]) ?? row.cloth ?? DEFAULTS[row.key];
const enc = v => encodeURIComponent(JSON.stringify(v));
function renderCust() {
  const L = prof.look;
  $('custRows').innerHTML = C_ROWS.filter(r => !r.show || r.show(L)).map(r => {
    const v = custVal(r, L), i = C_ROWS.indexOf(r);
    let ctl;
    if (r.opts) ctl = r.opts.map(([o, n]) => `<button data-r="${i}" data-v="${enc(o)}" class="${o === v ? 'sel' : ''}" ${r.off?.(o, L) ? 'disabled title="Needs a hairstyle that leaves the brow row clear, and no glasses"' : ''}>${n}</button>`).join('');
    else if (r.cycle) ctl = `<button data-r="${i}" data-step="-1">${ico('left')}</button><span class="cyc">${(r.cycle.find(([o]) => o === v) ?? r.cycle[0])[1]}</span><button data-r="${i}" data-step="1">${ico('right')}</button>`;
    else {
      const list = r.swatch ?? CLOTH.map(c => [c, hexCss(c)]), mine = list.some(([o]) => o === v);
      ctl = list.map(([o, css]) => `<button class="sw${o === v ? ' sel' : ''}" data-r="${i}" data-v="${enc(o)}" style="background:${css}"></button>`).join('')
        + (r.swatch ? '' : `<button class="cpb${mine ? '' : ' sel'}" data-r="${i}" data-cp="1" style="--c:${hexCss(v)}" title="Any color"></button>`);
    }
    return `<span class="ck">${r.label}</span><div class="cv">${ctl}</div>`;
  }).join('');
}
function setLook(row, v, redraw = true) {
  prof.look = { ...prof.look, [row.key]: v };
  prof.myLook = { ...prof.look };
  saveProf(); dressHero();
  if (redraw) { renderCust(); sfx('ui'); }
}
$('custRows').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  const row = C_ROWS[+b.dataset.r];
  if (b.dataset.cp) colorPick(b, custVal(row, prof.look), c => { setLook(row, c, false); b.style.setProperty('--c', hexCss(c)); }, renderCust);
  else if (b.dataset.step) {
    const k = row.cycle.findIndex(([o]) => o === custVal(row, prof.look)), n = row.cycle.length;
    setLook(row, row.cycle[(Math.max(0, k) + +b.dataset.step + n) % n][0]);
  } else setLook(row, JSON.parse(decodeURIComponent(b.dataset.v)));
});
$('custRand').onclick = () => {
  const L = randomLook(String(Math.random()), CLOTH[Math.random() * CLOTH.length | 0]);
  prof.look = L; prof.myLook = { ...L }; saveProf(); dressHero(); renderCust(); sfx('ui');
};
const custOpen = () => $('custPanel').style.display === 'flex';
function showCust(on) {
  if (on && prof.look.px) { prof.look = lookBase(); saveProf(); dressHero(); }
  $('custPanel').style.display = on ? 'flex' : 'none';
  $('lobbyUI').style.display = on ? 'none' : '';
  $('lobby').classList.toggle('cust', on);
  if (on) renderCust();
  sfx('ui');
}
function custClose() { showCust(false); armPage = 'wear'; wearCat = 'skins'; openArmory(); }
$('custDone').onclick = custClose;
addEventListener('keydown', e => { if (e.code === 'Escape' && inLobby && custOpen()) { e.stopImmediatePropagation(); custClose(); } }); // stop the armory closing too

const REST = .45;
const ARM_REST = 1.45; // armory view angle
let wasArm = false;
let spin = REST, spinV = 0, dragX = null, lastDrag = -1e9, mNX = 0, mNY = 0;
const heroScreen = { x: innerWidth * .7, y: innerHeight / 2 };
const stage = $('stage');
stage.addEventListener('pointerdown', e => { dragX = e.clientX; spinV = 0; stage.setPointerCapture(e.pointerId); });
const endDrag = () => { if (dragX !== null) { dragX = null; lastDrag = performance.now(); } };
stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);
addEventListener('pointermove', e => {
  if (!inLobby) return;
  mNX = Math.max(-1, Math.min(1, (e.clientX - heroScreen.x) / (innerWidth * .4)));
  mNY = Math.max(-1, Math.min(1, (heroScreen.y - e.clientY) / (innerHeight * .4)));
  if (dragX !== null) { const d = (e.clientX - dragX) * .012; spin += d; spinV = d * 30; dragX = e.clientX; }
});

// keep the character centered in the stage area
let frameCur = null;
const _fc = new THREE.Vector3(), _fs = new THREE.Vector3();
function frameLobby(dt = 0) {
  const W = innerWidth, H = innerHeight, r = stage.getBoundingClientRect();
  let left = r.left, sw = r.width || W;
  const sh = r.height || H;
  if (armOpen && W > 700) {
    const a = $('armory').getBoundingClientRect().right - 40; if (a > left) { sw = r.right - a; left = a; }
    const c = $('armAct').getBoundingClientRect(); if (c.width) sw = Math.max(sw * .5, sw - c.width * .55);
  }
  const tan = Math.tan(THREE.MathUtils.degToRad(lobbyCam.fov / 2));
  const visH = Math.max(3.6 / (sh / H * .9), 2.2 / (sw / W * .9) / (W / H));
  const want = { cx: left + sw / 2, cy: r.top + sh * .5, dist: Math.max(5, Math.min(20, visH / 2 / tan)), lx: 0, ly: 1.4, lz: 0 };
  const fb = drawFocus(); // drawing: zoom on the part
  if (fb) { fb.getCenter(_fc); fb.getSize(_fs); want.dist = Math.max(2, Math.max(_fs.y * 3 / (sh / H), _fs.x * 1.7 / (sw / W) / (W / H)) / 2 / tan); want.lx = _fc.x; want.ly = _fc.y; want.lz = _fc.z; }
  if (!frameCur || !dt) frameCur = want;
  else { const k = 1 - Math.exp(-dt * 7); for (const key in want) frameCur[key] += (want[key] - frameCur[key]) * k; }
  const { cx, cy, dist, lx, ly, lz } = frameCur;
  lobbyCam.aspect = W / H;
  lobbyCam.position.set(lx, ly + .1 + dist * .14, lz + dist); lobbyCam.lookAt(lx, ly, lz);
  lobbyCam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
  heroScreen.x = cx; heroScreen.y = cy;
}

function updateLobby(dt) {
  const t = performance.now() / 1000;
  if (armOpen !== wasArm) { wasArm = armOpen; lastDrag = -1e9; }
  if (dragX === null) {
    spin += spinV * dt; spinV *= Math.exp(-4 * dt);
    if (performance.now() - lastDrag > 2500 && !drawOpen()) { // stays where you turned it while drawing
      const base = armOpen && holdKey ? ARM_REST - hTurn : REST, rest = base + Math.round((spin - base) / (Math.PI * 2)) * Math.PI * 2;
      spin += (rest - spin) * Math.min(1, dt * (armOpen ? 3 : 1.5));
    }
  }
  if (drawOpen() && dr.turn !== null && dragX === null) spin += (dr.turn - spin) * Math.min(1, dt * 10);
  hero.rotation.y = spin;
  const idle = drawOpen() ? 0 : 1; // arms hold still while you paint
  armL.rotation.set(idle * Math.sin(t * 1.1) * .05, 0, -.05 - idle * Math.sin(t * 1.6) * .03);
  armR.rotation.set(-idle * Math.sin(t * 1.1) * .05, 0, .05 + idle * Math.sin(t * 1.6) * .03);
  // armory: arms up holding the gun
  holdK += ((armOpen && holdKey ? 1 : 0) - holdK) * Math.min(1, dt * 9);
  const e = holdK * holdK * (3 - 2 * holdK);
  if (pose) {
    const k = Math.min(1, dt * 12);
    hPos.lerp(pose.pos, k); hQ.slerp(pose.q, k); hFR.lerp(pose.fR, k); hTurn += (pose.turn - hTurn) * k;
    if (pose.fL) hFL.lerp(pose.fL, k);
    hLK += ((pose.fL ? 1 : 0) - hLK) * k;
    const sh = !!pose.sh, a = sh ? .35 : 1, f = fidgetAt(t, sh, pose.hv);
    sway.setFromEuler(_e.set(a * (.025 * Math.sin(t * .9 + 1) + .01 * Math.sin(t * 2.3)),
      a * (.04 * Math.sin(t * .7) + .015 * Math.sin(t * 1.9)) + f.wy, a * .03 * Math.sin(t * .5) + f.wz, 'YXZ'));
    _lq.setFromAxisAngle(_ax.set(0, 0, -1).applyQuaternion(hQ), f.roll);
    const tq = _tq.copy(sway).multiply(_lq);
    _wq.setFromAxisAngle(X_AX, f.low);
    const down = v => v.sub(SH_MID).applyQuaternion(_wq).add(SH_MID);
    const gp = down(_p.copy(hPos).sub(hFR).applyQuaternion(tq).add(hFR));
    down(_l.copy(hFL).sub(hFR).applyQuaternion(tq).add(hFR)); down(_fr.copy(hFR));
    const q0 = _q.copy(_wq).multiply(tq).multiply(hQ);
    // kick or reload animation
    const w = hf.i >= 0 && hf.st, ra = w && hf.rl > 0 ? reloadPose(w.id, 1 - hf.rl / w.reload) : null, kk = hf.kick || 0;
    let leftK = hLK;
    reloadSwap(hf.rs, w ? w.id : '', ra ? 1 - hf.rl / w.reload : -1, hf.mag, lobbyScene, .5);
    if (hf.mag) hf.mag.position.copy(hf.magAt).add(_hv2.set(ra ? ra.mx : 0, ra ? ra.my : 0, ra ? ra.mz : 0));
    if (ra || kk > 0) {
      // the knife chops instead
      const melee = w.melee, chop = melee && kk > 0 ? swingAt(1 - kk) : 0;
      const rq = _rq2.setFromEuler(_re2.set((ra ? ra.rx : 0) + (melee ? -chop * .8 : kk * .25), ra ? ra.ry : 0, ra ? ra.rz : 0));
      const off = _hv2.set(ra ? ra.x : 0, ra ? ra.y : 0, (ra ? ra.z : 0) + (melee ? 0 : kk * .04)).multiplyScalar(GUN_S).applyQuaternion(q0);
      const q0i = _q0i.copy(q0).invert(), q1 = _q1.copy(q0).multiply(rq), move = v => v.sub(gp).applyQuaternion(q0i).applyQuaternion(rq).applyQuaternion(q0).add(gp).add(off);
      move(_l); move(_fr); gp.add(off); q0.copy(q1);
      if (chop) {
        _wq.setFromAxisAngle(X_AX, chop * .9); const sw = v => v.sub(SHR).applyQuaternion(_wq).add(SHR);
        sw(gp); sw(_fr); sw(_l); q0.premultiply(_wq);
      }
      if (ra && hf.mag) {
        const toPart = pose.fL ? Math.min(1, Math.max(0, -ra.ay / .3)) : ra.hand;
        _hv2.copy(partMid(hf.mag)).add(hf.mag.position).multiplyScalar(GUN_S).applyQuaternion(q0).add(gp);
        if (pose.fL) _l.lerp(_hv2, toPart); else { _l.copy(_hv2); leftK = Math.max(hLK, toPart); }
      }
    }
    armL.quaternion.slerp(armTo(SHR, _fr, _aq), e); armR.quaternion.slerp(armTo(SHL, _l, _aq), e * leftK);
    holdG.quaternion.copy(LOW_Q).slerp(q0, e);
    holdG.position.copy(LOW_P).lerp(gp, e);
  }
  holdG.visible = e > .01; holdG.scale.setScalar(Math.min(1, e * 2.5));
  torso.scale.z = 1 + Math.sin(t * 1.6) * .02;
  // legs: idle sway and the odd step
  const shift = Math.sin(t * .8) * .035, rock = Math.sin(t * .6) * .03, sp = (t + 3) % 7, lift = sp < .7 ? Math.sin(sp / .7 * Math.PI) * .3 : 0, left = ((t + 3) / 7 | 0) % 2;
  heroCh.legR.rotation.set(rock - (left ? 0 : lift), 0, -LEG_SPREAD + shift);
  heroCh.legL.rotation.set(-rock - (left ? lift : 0), 0, LEG_SPREAD + shift);
  let rel = mNX * .9 - spin; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  // head follows the cursor without flipping
  const away = Math.abs(rel), look = drawOpen() ? 0 : away < 1.2 ? 1 : Math.max(0, 1 - (away - 1.2) / 1.4);
  headPiv.rotation.y += (Math.sign(rel) * Math.min(.9, away) * look - headPiv.rotation.y) * Math.min(1, dt * 6);
  headPiv.rotation.x += (-mNY * .45 * look - headPiv.rotation.x) * Math.min(1, dt * 6);
  for (const f of flies) {
    f.m.position.set(f.x + Math.sin(t * f.s * .7 + f.p) * .6, f.y + Math.sin(t * f.s + f.p * 2) * .35, f.z + Math.cos(t * f.s * .5 + f.p) * .6);
    f.m.material.opacity = .2 + .8 * Math.max(0, Math.sin(t * f.s * 2 + f.p));
  }
  for (const r of lRays) r.material.opacity = .055 + Math.sin(t * .5 + r.position.x) * .02;
  for (const l of lamps) l.intensity = 5.5 + Math.sin(t * 9 + l.position.x) * .4 + Math.sin(t * 23) * .2;
  glowStrip.material.color.setHSL(.48, .85, .5 + Math.sin(t * 2) * .08);
  heroTick(dt);
  frameLobby(dt);
  if (armOpen) placeAct();
}
