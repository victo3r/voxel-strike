// character proportions: 1 pixel = 1/16 block, head 8x8x8, body 8x12x4, arms and legs 4x12x4
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
// light bouncing up off the grass, so faces pointing down (under the chin, arms, hands) aren't pitch black
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
function lInst(mat, list) { // one draw call for a whole list of [x, y, z, sx, sy, sz, tint?] boxes
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
const lBlocksView = (x, z) => Math.hypot(x, z) < 8.5 || (z > -4 && Math.abs(x) < 12); // keep the clearing and the line to the camera open
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
const trim = box(2.34, .08, 2.34, lam({ color: 0xffd23f, emissive: 0x6a4d00 })); trim.position.y = .45; lobbyScene.add(trim); // just under the top, so it shows as a gold band round the edge
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
for (let i = 0; i < 14; i++) {
  const a = Math.random() * Math.PI * 2, d = 1.8 + Math.random() * 3.8;
  const f = box(.14, .14, .14, lam({ color: [0xff4d6d, 0xffd23f, 0xb48cff, 0xffffff][i % 4] }));
  f.position.set(Math.cos(a) * d, .07, Math.sin(a) * d); lobbyScene.add(f);
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

// your character, built from your saved look (js/character.js). ◀ ▶ under it flips through the presets
let lookI = Math.max(0, PRESETS.findIndex(p => JSON.stringify(p.look) === JSON.stringify(prof.look)));
const hero = new THREE.Group(); hero.position.y = .5; lobbyScene.add(hero);
let torso, headPiv, armL, armR; // armL = the arm on the left of the screen when it faces you
function dressHero() {
  hero.clear();
  const ch = buildChar(prof.look ?? PRESETS[lookI].look, 1 / 16);
  hero.add(ch.g); torso = ch.body; headPiv = ch.headPiv; armL = ch.armR; armR = ch.armL;
  $('lookName').textContent = PRESETS[lookI].name;
}
function pickLook(step) {
  lookI = (lookI + step + PRESETS.length) % PRESETS.length;
  prof.look = PRESETS[lookI].look; saveProf(); dressHero(); sfx('ui');
}
$('lookPrev').onclick = () => pickLook(-1); $('lookNext').onclick = () => pickLook(1);
$('lookPick').addEventListener('pointerdown', e => e.stopPropagation()); // clicking the arrows shouldn't start spinning him
dressHero();

const REST = .45; // default 3/4 view
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

// frame the camera so the character sits in the middle of the #stage area, whatever the window size
function frameLobby() {
  const W = innerWidth, H = innerHeight, r = stage.getBoundingClientRect();
  const sw = r.width || W, sh = r.height || H, cx = r.left + sw / 2, cy = r.top + sh * .5;
  const tan = Math.tan(THREE.MathUtils.degToRad(lobbyCam.fov / 2));
  const visH = Math.max(3.6 / (sh / H * .9), 2.2 / (sw / W * .9) / (W / H)); // ~3.6 blocks tall in the stage
  const dist = Math.max(5, Math.min(20, visH / 2 / tan));
  lobbyCam.aspect = W / H;
  lobbyCam.position.set(0, 1.5 + dist * .14, dist); lobbyCam.lookAt(0, 1.4, 0);
  lobbyCam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); // slide the picture so the hero lands on the stage
  heroScreen.x = cx; heroScreen.y = cy;
}

function updateLobby(dt) {
  const t = performance.now() / 1000;
  if (dragX === null) {
    spin += spinV * dt; spinV *= Math.exp(-4 * dt);
    if (performance.now() - lastDrag > 2500) {
      const rest = REST + Math.round((spin - REST) / (Math.PI * 2)) * Math.PI * 2;
      spin += (rest - spin) * Math.min(1, dt * 1.5);
    }
  }
  hero.rotation.y = spin;
  armL.rotation.z = -.05 - Math.sin(t * 1.6) * .03; armR.rotation.z = .05 + Math.sin(t * 1.6) * .03;
  armL.rotation.x = Math.sin(t * 1.1) * .05; armR.rotation.x = -Math.sin(t * 1.1) * .05;
  torso.scale.z = 1 + Math.sin(t * 1.6) * .02;
  let rel = mNX * .9 - spin; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  headPiv.rotation.y += (Math.max(-.9, Math.min(.9, rel)) - headPiv.rotation.y) * Math.min(1, dt * 6);
  headPiv.rotation.x += (-mNY * .45 - headPiv.rotation.x) * Math.min(1, dt * 6);
  for (const f of flies) {
    f.m.position.set(f.x + Math.sin(t * f.s * .7 + f.p) * .6, f.y + Math.sin(t * f.s + f.p * 2) * .35, f.z + Math.cos(t * f.s * .5 + f.p) * .6);
    f.m.material.opacity = .2 + .8 * Math.max(0, Math.sin(t * f.s * 2 + f.p));
  }
  for (const r of lRays) r.material.opacity = .055 + Math.sin(t * .5 + r.position.x) * .02;
  for (const l of lamps) l.intensity = 5.5 + Math.sin(t * 9 + l.position.x) * .4 + Math.sin(t * 23) * .2;
  glowStrip.material.color.setHSL(.48, .85, .5 + Math.sin(t * 2) * .08);
  frameLobby();
}
