// one hotbar slot per category. You can own several guns in a category,
// but only the one in your loadout (picked in the armory, js/armory.js) is in your hotbar during a match.
const CATS = [['primary', 'PRIMARY'], ['backup', 'BACKUP'], ['melee', 'MELEE'], ['special', 'SPECIAL'], ['sniper', 'SNIPER'], ['premium', 'PREMIUM']];
const CAT_I = Object.fromEntries(CATS.map(([k], i) => [k, i]));
// id = permanent name used in saves and code. Never rename or reuse an id, or saved guns point at the wrong weapon.
//   (the list order and display names can change freely)
// start = starter weapon: everyone has it in deathmatch from day one, and it can't be upgraded
// free = you start zombie waves with it (zombie waves sells everything else in its own shop)
// inf = never runs out of ammo (just the knife)
// unlock = account level you need before you can buy it in the armory. price = its armory price in account coins
// mob = mobility: how fast you run while holding it, as a multiple of normal speed (1 if not set)
const BASE = [
  { id: 'voxel', name: 'Voxel Gun', cat: 'backup', start: true, free: true, dmg: 20, rate: .26, mag: 12, reload: 1.0, pellets: 1, spread: 0, auto: false, color: 0x444444, len: .3 },
  { id: 'shotgun', name: 'Shotgun', cat: 'primary', start: true, dmg: 10, rate: .75, mag: 6, reload: 1.6, pellets: 9, spread: .07, auto: false, color: 0x6b4a2b, len: .6 },
  { id: 'ar', name: 'Assault Rifle', cat: 'primary', start: true, dmg: 12, rate: .09, mag: 30, reload: 1.4, pellets: 1, spread: .006, auto: true, color: 0x2f3b2f, len: .55 },
  { id: 'sniper', name: 'Sniper Rifle', cat: 'sniper', start: true, dmg: 80, rate: 1.1, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x1a1a1a, len: .9, scope: true },
  { id: 'eradicator', name: 'Eradicator', cat: 'primary', unlock: 12, price: 450, dmg: 9, rate: .05, mag: 120, reload: 2.6, pellets: 1, spread: .012, auto: true, color: 0x777777, len: .7 },
  { id: 'knife', name: 'Combat Knife', cat: 'melee', start: true, free: true, inf: true, melee: true, mob: 1.2, dmg: 35, rate: .4, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xd8dde3, len: .3, model: 'knife' },
  // flamethrower: short cone that hits everything in front of you and sets it on fire. mag = fuel
  { id: 'flame', name: 'Flamethrower', cat: 'special', start: true, flame: true, dmg: 5, rate: .06, range: 7, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0x555555, len: .5, model: 'flame' },
  { id: 'rocket', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, rocket: true, dmg: 150, rate: 1.1, mag: 1, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, model: 'rocket' },
  // flare gun: burn = damage per quarter second, burnT = seconds
  { id: 'flare', name: 'Flare Gun', cat: 'premium', start: true, flare: true, dmg: 40, burn: 3, burnT: 3, rate: .4, mag: 1, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc8402a, len: .4, model: 'flare' },
];
const W_ID = Object.fromEntries(BASE.map((w, i) => [w.id, i]));
const gi = id => W_ID[id]; // weapon id -> its index in BASE/WEAPONS
// star upgrades: getting a gun gives ★, then two flat upgrades to ★★ and ★★★
// every star adds +25% damage and +25% mag size, and cuts reload time by 15%.
// One-shot guns (rocket launcher, flare gun) keep their single shot
const lvl = BASE.map(() => 0); // 0 = ★, 1 = ★★, 2 = ★★★
const WEAPONS = BASE.map(w => ({ ...w }));
const magAt = (b, L) => b.mag === 1 ? 1 : Math.round(b.mag * (1 + .25 * L));
function applyLvl(i) {
  const b = BASE[i], L = lvl[i];
  Object.assign(WEAPONS[i], { dmg: Math.round(b.dmg * (1 + .25 * L)), mag: magAt(b, L), reload: +(b.reload * (1 - .15 * L)).toFixed(2) });
}
// deathmatch: starters have no stars. Zombie waves: everything you buy in its shop can be starred
const upgradable = i => mode === 'zombies' ? !BASE[i].free : !BASE[i].start;
const stars = i => upgradable(i) ? '★'.repeat(lvl[i] + 1) + '☆'.repeat(2 - lvl[i]) : '';
let cur = gi('voxel'), cd = 0, reloading = 0, kick = 0, aiming = false, adsT = 0;
const ammo = WEAPONS.map(w => w.mag);
const resMax = i => BASE[i].inf ? Infinity : WEAPONS[i].mag * 4;
const reserve = WEAPONS.map(w => w.inf ? Infinity : 0);
const owned = WEAPONS.map(w => !!w.free); // zombie waves starts you with the voxel gun and knife; deathmatch gives you your account's guns
const slotOf = i => CAT_I[BASE[i].cat];
const slotGun = CATS.map(() => -1); // which weapon each hotbar slot holds (-1 = empty)
function resetSlots() { slotGun.fill(-1); BASE.forEach((w, i) => { if (w.free) slotGun[slotOf(i)] = i; }); }
resetSlots();
const hasGun = i => !!BASE[i].start || !!prof.guns[BASE[i].id]; // starters are free for everyone, the rest you buy in the armory
function loadoutGun(cat) { // the gun in your loadout for this category. Falls back to the starter if the save points at something you don't have
  const i = gi(prof.loadout[cat]);
  return i !== undefined && BASE[i].cat === cat && hasGun(i) ? i : BASE.findIndex(w => w.cat === cat && w.start);
}

// hotbar sprites: little pixel drawings on a 24x12 grid, [x, y, w, h, color], keyed by weapon id
const SPRITE_RECTS = {
  voxel: [[6, 3, 12, 3, '#666'], [6, 3, 12, 1, '#888'], [16, 2, 2, 1, '#222'], [7, 6, 4, 5, '#2a2a2a'], [11, 6, 3, 1, '#444'], [13, 6, 1, 2, '#444']],
  shotgun: [[0, 4, 6, 3, '#6b4a2b'], [0, 6, 2, 2, '#6b4a2b'], [5, 3, 7, 4, '#555'], [10, 4, 14, 2, '#333'], [13, 6, 6, 2, '#8a6a45'], [6, 7, 2, 3, '#3a2a1a']],
  ar: [[0, 4, 5, 3, '#2f3b2f'], [5, 3, 10, 3, '#3d4d3d'], [15, 4, 9, 1, '#222'], [9, 6, 3, 5, '#222'], [6, 6, 2, 3, '#222'], [8, 2, 4, 1, '#222']],
  sniper: [[0, 4, 6, 3, '#3a2a1a'], [6, 4, 8, 2, '#1a1a1a'], [14, 4, 10, 1, '#111'], [7, 1, 8, 2, '#333'], [14, 1, 1, 2, '#6cf'], [9, 3, 1, 1, '#111'], [12, 3, 1, 1, '#111'], [7, 6, 2, 3, '#111']],
  eradicator: [[3, 3, 9, 6, '#777'], [12, 3, 12, 1, '#555'], [12, 5, 12, 1, '#444'], [12, 7, 12, 1, '#555'], [19, 2, 2, 7, '#333'], [5, 1, 5, 2, '#333'], [1, 8, 5, 4, '#5a5a2a']],
  knife: [[1, 5, 7, 3, '#5a3a1a'], [2, 6, 5, 1, '#3a2a1a'], [8, 3, 2, 7, '#888'], [10, 4, 11, 3, '#d8dde3'], [10, 7, 10, 1, '#9aa3ad'], [21, 5, 2, 2, '#d8dde3'], [23, 6, 1, 1, '#d8dde3']],
  flame: [[1, 3, 5, 7, '#c33'], [2, 4, 1, 4, '#e66'], [6, 4, 10, 3, '#555'], [16, 4, 6, 2, '#333'], [22, 3, 2, 4, '#222'], [23, 1, 1, 2, '#fa3'], [9, 7, 2, 3, '#222'], [5, 9, 4, 1, '#222']],
  rocket: [[2, 3, 18, 5, '#4b5b3b'], [6, 3, 1, 5, '#333'], [15, 3, 1, 5, '#333'], [20, 4, 3, 3, '#a33'], [23, 5, 1, 1, '#a33'], [8, 8, 2, 3, '#222'], [12, 8, 2, 3, '#222'], [10, 1, 3, 2, '#222']],
  flare: [[4, 3, 14, 4, '#c8402a'], [4, 3, 14, 1, '#e8684a'], [17, 2, 5, 6, '#3a3a3a'], [21, 3, 1, 4, '#fa3'], [6, 7, 4, 5, '#2a2a2a'], [10, 7, 3, 1, '#444'], [12, 7, 1, 2, '#444']],
};
// drawn one pixel in from the edge, then every empty pixel touching the gun turns black: the same black edge the 3D models have
const SPRITES = BASE.map(w => SPRITE_RECTS[w.id]).map(rects => {
  const W = 26, H = 14, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); for (const [x, y, w, h, col] of rects) { g.fillStyle = col; g.fillRect(x + 1, y + 1, w, h); }
  const img = g.getImageData(0, 0, W, H), d = img.data, solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  const edge = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) edge.push(x, y);
  g.fillStyle = '#000'; for (let k = 0; k < edge.length; k += 2) g.fillRect(edge[k], edge[k + 1], 1, 1);
  return c.toDataURL();
});
function renderHotbar() {
  $('hotbar').innerHTML = CATS.map(([, label], s) => {
    const i = slotGun[s], key = nice(binds['slot' + (s + 1)][0] || binds['slot' + (s + 1)][1]);
    return `<div class="slot ${i === cur ? 'on' : ''} ${i < 0 ? 'empty' : ''}"><span class="k">${key === '—' ? '' : key}</span>` +
      `<span class="s">${i >= 0 ? stars(i) : ''}</span><img src="${i >= 0 ? SPRITES[i] : SPRITES[0]}"><span class="c">${label}</span></div>`;
  }).join('');
}

const vm = new THREE.Group(); camera.add(vm); vm.position.set(.32, -.3, -.55);
const flashMesh = box(.14, .14, .14, new THREE.MeshBasicMaterial({ color: 0xffdd55 }));
const flashLight = new THREE.PointLight(0xffcc66, 0, 8);
let gunSpin = null, gunSpinV = 0; // the eradicator's barrel cluster, and how fast it's spinning
let gunRound = null; // the rocket sitting in the launcher's tube, hidden while it's empty

// gun models are pixel art: every size and spot in GUN_MODELS is in gun pixels (GPX world units each).
// Guns point down -z with the grip near the origin. Every piece gets one texel of shading per pixel and a black edge
const GPX = .02, EDGE = .007;
const EDGE_MAT = new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.BackSide });
let gunShade = null; // light grey speckle multiplied over every piece's color
const shadeTex = () => gunShade ??= tex(g => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 228 + Math.random() * 27 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
});
// a box whose texture is stretched so one texel covers one gun pixel on every face (BoxGeometry face order: +x, -x, +y, -y, +z, -z)
function pixBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w * GPX, h * GPX, d * GPX), uv = geo.attributes.uv;
  const sz = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]], ox = Math.random() * 16 | 0, oy = Math.random() * 16 | 0;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, (uv.getX(i) * sz[f][0] + ox) / 16, (uv.getY(i) * sz[f][1] + oy) / 16); }
  return geo;
}
function piece(parent, w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(pixBox(w, h, d), mat);
  m.position.set(x * GPX, y * GPX, z * GPX); m.userData.dim = [w, h, d]; parent.add(m); return m;
}
function mergeGeos(geos) {
  const pos = [], nor = [], uv = [], idx = []; let n = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + n);
    n += g.attributes.position.count; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx); return out;
}
// melts a group's pieces into one mesh per material, plus one inside-out black shell per piece for the edges,
// so a whole gun is a handful of draw calls
function bake(root) {
  const byMat = new Map(), edges = [], e = 2 * EDGE;
  for (const m of [...root.children]) {
    if (!m.isMesh || !m.userData.dim) continue;
    m.updateMatrix();
    const [w, h, d] = m.userData.dim;
    edges.push(new THREE.BoxGeometry(w * GPX + e, h * GPX + e, d * GPX + e).applyMatrix4(m.matrix));
    if (!byMat.has(m.material)) byMat.set(m.material, []);
    byMat.get(m.material).push(m.geometry.applyMatrix4(m.matrix));
    root.remove(m);
  }
  for (const [mat, geos] of byMat) root.add(new THREE.Mesh(mergeGeos(geos), mat));
  if (edges.length) root.add(new THREE.Mesh(mergeGeos(edges), EDGE_MAT));
}

// each model returns, in gun pixels: muzzle [y, z], grip [y, z] (right hand), fore [y, z] (left hand, null on one-handed guns),
// bands = z spots for the gold upgrade bands and band = [width, height, y] for them
const GUN_MODELS = {
  voxel({ p, mat, dark, glow }) {
    const teal = glow(0x2ee6d6), grip = mat(0x2c2c2c);
    p(4, 3, 16, mat(0x6a6a6a), 0, 1.5, -8); // slide
    p(4, 1, 16, mat(0x8e8e8e), 0, 3.5, -8); // its lighter top
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(2, 2, 1, teal, 0, 1.5, -16.5); // emitter in the muzzle
    for (const z of [-4, -7, -10]) p(5, 1, 1, teal, 0, 1.5, z); // teal cubes down the sides
    p(2, 1, 1, dark, 0, 4.5, -1); p(1, 1, 1, dark, 0, 4.5, -15); // sights
    p(1, 1, 4, dark, 0, -4.5, -4.5); p(1, 2, 1, dark, 0, -3, -7); // trigger guard
    p(1, 2, 1, mat(0x555555), 0, -3, -4); // trigger
    p(4, 3, 4, grip, 0, -3.5, 0); p(4, 3, 4, grip, 0, -6.5, 1); p(4, 2, 4, grip, 0, -9, 2); // grip, raked back in steps
    p(4, 1, 5, dark, 0, -10.5, 2.5); // base of the grip
    return { muzzle: [1.5, -17], grip: [-6, 1], fore: null, bands: [-5, -11], band: [5, 7, 1] };
  },
  shotgun({ p, mat, dark }) {
    const wood = mat(0x7a5232), dwood = mat(0x4e3420), steel = mat(0x4a4a4a);
    p(4, 5, 9, wood, 0, -.5, 4.5); p(4, 6, 1, dwood, 0, -1, 9.5); // stock and butt pad
    p(5, 5, 11, steel, 0, .5, -5.5); // receiver
    p(3, 3, 26, dark, 0, 1.5, -24); // barrel
    p(3, 2, 18, steel, 0, -1, -20); // mag tube
    p(5, 4, 9, wood, 0, -1.5, -21); // pump
    for (const z of [-19, -21, -23]) p(6, 1, 1, dwood, 0, -1.5, z); // pump grooves
    p(1, 1, 1, mat(0xdddddd), 0, 3.5, -36); // bead sight
    p(4, 4, 1, dark, 0, 1.5, -37.5); // muzzle ring
    p(4, 3, 3, wood, 0, -3.5, -1.5); p(4, 3, 3, wood, 0, -6.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4); // guard and trigger
    return { muzzle: [1.5, -38], grip: [-5, -1], fore: [-2.5, -21], bands: [-3, -8], band: [6, 6, .5] };
  },
  ar({ p, mat, dark }) {
    const body = mat(0x3d4d3d), dk = mat(0x2a352a);
    p(4, 5, 8, dk, 0, 0, 5); p(4, 6, 1, dark, 0, -.5, 9.5); p(2, 2, 1, dark, 0, .5, .5); // stock, butt, joint
    p(5, 5, 15, body, 0, 0, -7.5); // receiver
    p(3, 1, 13, dark, 0, 3, -7.5); p(2, 2, 2, dark, 0, 4.5, -2); // top rail, rear sight
    p(5, 4, 11, dk, 0, 0, -20.5); // handguard
    for (const z of [-18, -21, -24]) p(6, 1, 2, mat(0x111111), 0, 0, z); // vents
    p(2, 2, 7, dark, 0, .5, -29.5); p(3, 3, 3, dark, 0, .5, -34.5); // barrel, muzzle brake
    p(1, 3, 1, dark, 0, 3.5, -25); // front sight post
    p(4, 4, 3, dark, 0, -4.5, -10); p(4, 3, 3, dark, 0, -8, -11); // mag, curving forward
    p(4, 4, 3, dk, 0, -4.5, -1.5); p(4, 3, 3, dk, 0, -8, -.5); // pistol grip
    p(1, 1, 5, dark, 0, -6, -5.5); p(1, 2, 1, mat(0x666666), 0, -3.5, -4); // guard and trigger
    return { muzzle: [.5, -36], grip: [-6, -1], fore: [-3, -21], bands: [-5, -11], band: [6, 6, 0] };
  },
  sniper({ p, mat, dark, glow }) {
    const wood = mat(0x4a3220), blk = mat(0x1a1a1a), silver = mat(0x8a8a8a);
    p(4, 6, 10, wood, 0, -1, 5); p(4, 7, 1, mat(0x2e1f14), 0, -1.5, 10.5); p(3, 2, 6, wood, 0, 3, 4); // stock, butt, cheek rest
    p(4, 4, 18, blk, 0, 0, -9); // action
    p(4, 3, 10, wood, 0, -3.5, -16); // forend
    p(2, 2, 28, dark, 0, .5, -32); p(3, 3, 5, dark, 0, .5, -48.5); // barrel, suppressor
    p(3, 3, 16, mat(0x2a2a2a), 0, 5.5, -10); // scope tube
    p(4, 4, 2, dark, 0, 5.5, -1); p(4, 4, 2, dark, 0, 5.5, -19); // scope bells
    p(3, 3, 1, glow(0x66ccff), 0, 5.5, -20.5); // lens
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -14); // scope mounts
    p(4, 1, 1, silver, 4, 1, -3); p(2, 2, 2, silver, 7, 1, -3); // bolt handle and knob
    p(4, 5, 3, wood, 0, -4.5, -1.5); p(4, 3, 3, wood, 0, -8.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -5); p(1, 3, 1, dark, 0, -3.5, -7.5); p(1, 2, 1, silver, 0, -3, -4); // guard and trigger
    return { muzzle: [.5, -51], grip: [-7, -1], fore: [-6, -16], bands: [-6, -12], band: [5, 5, 0] };
  },
  eradicator({ p, mat, dark, sub, at }) {
    const steel = mat(0x777777), dk = mat(0x3a3a3a);
    p(9, 9, 13, steel, 0, 0, -5.5); p(10, 10, 1, dk, 0, 0, 1.5); // housing, back plate
    p(2, 1, 10, dk, 0, 7.5, -5.5); p(2, 2.5, 1, dk, 0, 5.75, -1); p(2, 2.5, 1, dk, 0, 5.75, -10); // carry handle
    p(5, 6, 7, mat(0x5a5a2a), -7, -1.5, -5.5); p(3, 1, 2, mat(0xc9a43a), -6, 2, -5.5); // ammo box and belt
    const spin = sub(0, 0, -23.5), sp = at(spin);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; sp(1.5, 1.5, 23, dark, Math.cos(a) * 2.25, Math.sin(a) * 2.25, 0); }
    sp(2, 2, 23, dk, 0, 0, 0); for (const z of [-6, 8]) sp(7, 7, 1.5, dk, 0, 0, z); // spindle and barrel rings
    p(4, 4, 3, dk, 0, -6.5, -1); p(4, 3, 3, dk, 0, -10, 0); // rear grip
    p(1, 1, 3, dark, 0, -8, -4.5); p(1, 3, 1, dark, 0, -6, -6.5); p(1, 2, 1, mat(0x999999), 0, -5.5, -3.5); // guard and trigger
    p(3, 7, 3, dk, 0, -8, -10); // front handle
    return { muzzle: [0, -36], grip: [-8, 0], fore: [-9, -10], bands: [-3, -8], band: [10, 10, 0], spin };
  },
  knife({ p, mat }) {
    const brown = mat(0x5a3a1a), dbrown = mat(0x3a2412), steel = mat(0x8a8f96), blade = mat(0xc8ced6), edge = mat(0xf0f4f8);
    p(3, 4, 8, brown, 0, 0, 0); p(4, 5, 1, dbrown, 0, 0, 1.5); p(4, 5, 1, dbrown, 0, 0, -1.5); // handle and wraps
    p(4, 5, 2, steel, 0, 0, 5); // pommel
    p(3, 10, 2, steel, 0, .5, -5); // crossguard, sticking out above and below like the blade's edges
    p(1, 4, 14, blade, 0, 1, -13); p(1, 1, 13, edge, 0, -1.5, -12.5); // blade, sharp edge along the bottom
    p(1.4, 1, 10, mat(0x9aa3ad), 0, 1.5, -12); // fuller groove
    p(1, 3, 2, blade, 0, 1.5, -21); p(1, 1, 2, blade, 0, 2.5, -23); // tip
    return { muzzle: [0, -24], grip: [0, 0], fore: null, bands: [-2.5, 2.5], band: [4, 6, 0] };
  },
  flame({ p, mat, dark, glow }) {
    const grey = mat(0x5a5a5a), dk = mat(0x333333), red = mat(0xc43030);
    p(5, 5, 14, grey, 0, 0, -6); p(4, 4, 2, dk, 0, 0, 2); // body, rear cap
    p(6, 6, 7, dk, 0, .5, -16.5); for (const z of [-15, -17, -19]) p(7, 1, 1, mat(0x111111), 0, .5, z); // heat shroud and its ribs
    p(3, 3, 5, dark, 0, .5, -22.5); p(4, 4, 1, dark, 0, .5, -25.5); // nozzle
    p(1, 1, 1, glow(0xffaa33), 0, -2, -25.5); // pilot flame
    p(6, 6, 9, red, 0, -5.5, -7.5); for (const z of [-5, -10]) p(7, 7, 1, dk, 0, -5.5, z); // fuel tank and straps
    p(2, 2, 1, mat(0xc9a43a), 0, -5.5, -12.5); // tank cap
    p(4, 4, 3, dk, 0, -4.5, .5); p(4, 3, 3, dk, 0, -8, 1.5); // rear grip
    p(1, 1, 2, dark, 0, -7, -2); p(1, 2, 1, mat(0x999999), 0, -3.5, -2); // guard and trigger
    p(3, 6, 3, dk, 0, -5.5, -16.5); // front handle
    return { muzzle: [.5, -26], grip: [-6, 1], fore: [-6, -16.5], bands: [-4, -9], band: [6, 6, .5] };
  },
  rocket({ p, mat, dark, glow, sub, at }) {
    const olive = mat(0x66784c), dk = mat(0x3a4630);
    p(8, 8, 40, olive, 0, 0, -18); // tube
    p(10, 10, 3, dk, 0, 0, -38.5); p(10, 10, 3, dk, 0, 0, 2.5); // front and rear rings
    p(6, 6, 1, mat(0x101010), 0, 0, -40.25); // dark tube mouth
    p(1, 2, 26, mat(0xc9a43a), 4.5, 0, -18); // yellow warning stripe
    p(3, 3, 6, dark, -3, 5.5, -14); p(2, 2, 1, glow(0xff5544), -3, 5.5, -17.5); // sight with a red lens
    p(4, 4, 3, dark, 0, -6, -5); p(4, 3, 3, dark, 0, -9.5, -4); // rear grip
    p(1, 1, 4, dark, 0, -7.5, -8.5); p(1, 3, 1, dark, 0, -5.5, -11); p(1, 2, 1, mat(0x888888), 0, -5, -7.5); // guard and trigger
    p(3, 7, 3, dark, 0, -7.5, -24); // front grip
    const round = sub(0, 0, 0), r = at(round); // the loaded rocket, poking well out of the front
    r(4, 4, 7, mat(0xaa3333), 0, 0, -41.5); r(5, 5, 1, mat(0x2a2a2a), 0, 0, -42.5); r(2, 2, 3, mat(0xdd5544), 0, 0, -46.5);
    return { muzzle: [0, -48], grip: [-8, -4], fore: [-9, -24], bands: [-9, -28], band: [9, 9, 0], round };
  },
  flare({ p, mat, dark, glow }) {
    const red = mat(0xc8402a), grip = mat(0x2a2a2a);
    p(6, 5, 14, red, 0, 1.5, -9); p(6, 1, 14, mat(0xe8684a), 0, 4.5, -9); // fat barrel and its lighter top
    p(8, 8, 2, dark, 0, 2, -16.5); p(4, 4, 1, glow(0xffaa33), 0, 2, -17.75); // muzzle ring with the flare inside
    p(5, 7, 4, mat(0x3a3a3a), 0, 1.5, 0); p(2, 3, 2, dark, 0, 6.5, 2); // breech and hammer
    p(4, 4, 4, grip, 0, -4, .5); p(4, 3, 4, grip, 0, -7.5, 1.5); p(4, 2, 4, grip, 0, -10, 2.5); // grip, raked back in steps
    p(1, 1, 5, dark, 0, -4.5, -4); p(1, 3, 1, dark, 0, -2.5, -7); p(1, 2, 1, mat(0x888888), 0, -2, -3.5); // guard and trigger
    return { muzzle: [2, -18], grip: [-6, 1.5], fore: null, bands: [-6, -11], band: [7, 7, 1.5] };
  },
};
// builds gun i's model into group g with `stars` gold upgrade bands: the same model in your hands, a bot's, and the armory.
// Returns muzzle, grip and fore in world units ([y, z]), plus spin (the eradicator's barrels) and round (the loaded rocket)
const gunMats = {};
const gunMat = col => gunMats[col] ??= lam({ color: col, map: shadeTex() });
function makeGun(i, g, stars) {
  const c = { mat: gunMat, dark: gunMat(0x1e1e1e), glow: col => gunMats['g' + col] ??= new THREE.MeshBasicMaterial({ color: col }) };
  c.p = (...a) => piece(g, ...a);
  c.at = parent => (...a) => piece(parent, ...a);
  c.sub = (x, y, z) => { const s = new THREE.Group(); s.position.set(x * GPX, y * GPX, z * GPX); g.add(s); return s; };
  const m = GUN_MODELS[BASE[i].id](c);
  const gold = gunMats.gold ??= lam({ color: 0xffcc22, emissive: 0x553300, map: shadeTex() }), [bw, bh, by] = m.band;
  for (let s = 0; s < stars; s++) c.p(bw, bh, 2, gold, 0, by, m.bands[s]); // one gold band per upgrade
  for (const s of [g, m.spin, m.round]) if (s) bake(s);
  const w = v => v && v.map(n => n * GPX);
  return { muzzle: w(m.muzzle), grip: w(m.grip), fore: w(m.fore), spin: m.spin ?? null, round: m.round ?? null };
}

// your first-person arms: the arm from your own skin, fist on the grip, running back off the bottom of the screen.
// Two-handed guns get your left arm too, reaching for the front grip
const ARM_U = .0325, UP_V = new THREE.Vector3(0, 1, 0);
let armGeos = null;
const armMats = {};
function vmArm(left, y, z, dir) {
  armGeos ??= [partBox(4, 12, 4, 40, 16, ARM_U), partBox(4, 12, 4, 32, 48, ARM_U)];
  const L = prof.look ?? PRESETS[0].look, k = JSON.stringify(L);
  const mat = armMats[k] ??= lam({ map: skinTexture(L) });
  const piv = new THREE.Group(); piv.position.set(0, y, z); piv.quaternion.setFromUnitVectors(UP_V, dir.normalize());
  for (let s = 0; s < 2; s++) { // a second length behind the arm, so its end never shows on screen
    const m = new THREE.Mesh(armGeos[left ? 1 : 0], mat); m.position.y = (6 + s * 12) * ARM_U; m.userData.shared = true; piv.add(m);
  }
  vm.add(piv);
}
function buildGun() {
  vm.traverse(o => { if (o.geometry && o !== flashMesh && !o.userData.shared) o.geometry.dispose(); });
  vm.clear(); flashMesh.visible = false;
  const { muzzle: [my, mz], grip, fore, spin, round } = makeGun(cur, vm, lvl[cur]);
  gunSpin = spin; gunRound = round;
  vmArm(false, grip[0], grip[1], new THREE.Vector3(.3, -.55, 1));
  if (fore) vmArm(true, fore[0], fore[1], new THREE.Vector3(-.75, -.6, 1));
  if (WEAPONS[cur].melee) return;
  flashMesh.position.set(0, my, mz - .04); flashLight.position.copy(flashMesh.position); vm.add(flashMesh, flashLight);
}
function cycle(d) { let s = slotOf(cur); do s = (s + d + CATS.length) % CATS.length; while (slotGun[s] < 0); equip(slotGun[s]); }
function selectSlot(s) {
  if (slotGun[s] < 0) return;
  if (slotOf(cur) === s && mode === 'zombies') { // zombie waves only (it has no loadouts): press the slot again to flip between guns you bought in it
    const list = BASE.map((w, i) => i).filter(i => owned[i] && slotOf(i) === s);
    if (list.length > 1) equip(list[(list.indexOf(cur) + 1) % list.length]);
    return;
  }
  equip(slotGun[s]);
}
function equip(i) {
  if (i === cur || !WEAPONS[i] || !owned[i]) return;
  cur = i; slotGun[slotOf(i)] = i; cancelReload(); cd = .2; buildGun(); renderHotbar(); sfx('equip');
}
const dry = () => sfx('dry');
// each gun has its own reload sound, timed to its base reload. Upgraded guns reload faster, so the sound plays faster to match
let reloadSnd = null;
function reload() {
  const w = WEAPONS[cur]; if (w.melee || reloading > 0 || ammo[cur] === w.mag) return;
  if (!reserve[cur]) { dry(); return; }
  reloading = w.reload; reloadSnd = sfx('r_' + w.id, { rate: BASE[cur].reload / w.reload });
}
function cancelReload() { reloading = 0; stopSfx(reloadSnd); reloadSnd = null; }
buildGun();

const parts = [], pGeo = new THREE.BoxGeometry(.08, .08, .08), pMats = {};
function burst(p, color, n) {
  pMats[color] ??= new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(pGeo, pMats[color]); m.position.copy(p); scene.add(m);
    parts.push({ m, v: new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 4, (Math.random() - .5) * 4), life: .6 });
  }
}
