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
// hold = how it's carried: pistol, rifle, heavy, shoulder or melee (see HOLDS below)
const BASE = [
  { id: 'voxel', hold: 'pistol', name: 'Voxel Gun', cat: 'backup', start: true, free: true, dmg: 20, rate: .26, mag: 12, reload: 1.0, pellets: 1, spread: 0, auto: false, color: 0x444444, len: .3 },
  { id: 'shotgun', hold: 'rifle', name: 'Shotgun', cat: 'primary', start: true, dmg: 10, rate: .75, mag: 6, reload: 1.6, pellets: 9, spread: .07, auto: false, color: 0x6b4a2b, len: .6 },
  { id: 'ar', hold: 'rifle', name: 'Assault Rifle', cat: 'primary', start: true, dmg: 12, rate: .09, mag: 30, reload: 1.4, pellets: 1, spread: .006, auto: true, color: 0x2f3b2f, len: .55 },
  { id: 'sniper', hold: 'rifle', name: 'Sniper Rifle', cat: 'sniper', start: true, dmg: 80, rate: 1.1, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x1a1a1a, len: .9, scope: true },
  { id: 'eradicator', hold: 'heavy', name: 'Eradicator', cat: 'primary', unlock: 12, price: 450, dmg: 9, rate: .05, mag: 120, reload: 2.6, pellets: 1, spread: .012, auto: true, color: 0x777777, len: .7 },
  { id: 'knife', hold: 'melee', name: 'Combat Knife', cat: 'melee', start: true, free: true, inf: true, melee: true, mob: 1.2, dmg: 35, rate: .4, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xd8dde3, len: .3, model: 'knife' },
  // flamethrower: short cone that hits everything in front of you and sets it on fire. mag = fuel
  { id: 'flame', hold: 'rifle', name: 'Flamethrower', cat: 'special', start: true, flame: true, dmg: 5, rate: .06, range: 7, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0x555555, len: .5, model: 'flame' },
  { id: 'rocket', hold: 'shoulder', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, rocket: true, dmg: 150, rate: 1.1, mag: 1, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, model: 'rocket' },
  // flare gun: burn = damage per quarter second, burnT = seconds
  { id: 'flare', hold: 'pistol', name: 'Flare Gun', cat: 'premium', start: true, flare: true, dmg: 40, burn: 3, burnT: 3, rate: .4, mag: 1, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc8402a, len: .4, model: 'flare' },
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

// gun models are voxel pixel art. Every size and spot in GUN_MODELS is in gun pixels, GPX world units each (times GUN_SCALE).
// Guns point down -z with the grip near the origin. The pieces are filled into a grid of pixels (later pieces paint over
// earlier ones), and only the outside of that grid is drawn, one little square per pixel with a touch of shading.
// A pixel turns black where the surface folds away round an outside corner, so the black outline is part of the pixel art.
// Anything 2 pixels across is all outline, so a part that should show its color needs to be 3 or more pixels across
// (4 to show 2 rows of color). Glowing pixels (lenses, flames) are never black.
// Sizes should be whole pixels, and a box with an odd size should sit on a half pixel so it lines up with the grid
const GPX = .02, GUN_SCALE = { knife: .75 }, GUN_DARK = 0x4a4a52, GUN_STEEL = 0x62626a;
const gunPal = [null], gunPalI = {}; // palette index -> { c: color, glow }
function palIdx(col, glow = false) {
  const k = (glow ? 'g' : '') + col;
  if (gunPalI[k] === undefined) gunPalI[k] = gunPal.push({ c: new THREE.Color(col), glow }) - 1;
  return gunPalI[k];
}
// each face: its normal, then two edges along it with a × b = normal, so the squares face outward
const VOX_FACES = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
];
// fills pieces ([w, h, d, palette index, x, y, z] boxes centered on x, y, z) into a grid of pixels
function voxelGrid(pieces) {
  const boxes = pieces.map(([w, h, d, m, x, y, z]) => [Math.round(x - w / 2), Math.round(y - h / 2), Math.round(z - d / 2), Math.round(x + w / 2), Math.round(y + h / 2), Math.round(z + d / 2), m]);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[k] - 1); hi[k] = Math.max(hi[k], b[k + 3] + 1); }
  const [NX, NY, NZ] = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], cell = new Uint16Array(NX * NY * NZ);
  for (const [x0, y0, z0, x1, y1, z1, m] of boxes)
    for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cell[((z - lo[2]) * NY + (y - lo[1])) * NX + (x - lo[0])] = m;
  const at = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ ? 0 : cell[(z * NY + y) * NX + x];
  return { lo, NX, NY, NZ, cell, at };
}
// the drawn surface of a set of pieces, px = world units per gun pixel. Returns { lit, glow } geometries (either can be null)
function voxelGeos(pieces, px) {
  const { lo, NX, NY, NZ, cell, at } = voxelGrid(pieces);
  const out = { lit: [[], [], []], glow: [[], [], []] }; // positions, normals, colors
  const CORNER = [0, 1, 2, 0, 2, 3], ca = [0, 1, 1, 0], cb = [0, 0, 1, 1]; // the two triangles of a square, and each corner's steps along a and b
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const m = cell[(z * NY + y) * NX + x]; if (!m) continue;
    const P = gunPal[m];
    for (let f = 0; f < 6; f++) {
      const [n, a, b] = VOX_FACES[f];
      if (at(x + n[0], y + n[1], z + n[2])) continue;
      // black where the face runs off an edge of the shape (not in the corners where one part sits against another)
      let black = false;
      for (let e = 0; e < 4 && !black && !P.glow; e++) {
        const t = e < 2 ? a : b, s = e & 1 ? -1 : 1;
        const ux = x + s * t[0], uy = y + s * t[1], uz = z + s * t[2];
        if (!at(ux, uy, uz)) black = true;
      }
      let r = 0, g = 0, bl = 0;
      if (!black) {
        const h = Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791 ^ (f + 1) * 2654435761, 1597334677) >>> 0;
        const sh = P.glow ? 1 : .82 + (h % 1000) / 1000 * .18; // one shade per pixel, like a texture
        r = P.c.r * sh; g = P.c.g * sh; bl = P.c.b * sh;
      }
      const [pos, nor, col] = out[P.glow ? 'glow' : 'lit'];
      const ox = x + lo[0] + (n[0] > 0), oy = y + lo[1] + (n[1] > 0), oz = z + lo[2] + (n[2] > 0);
      for (let q = 0; q < 6; q++) {
        const k = CORNER[q], i = ca[k], j = cb[k];
        pos.push((ox + i * a[0] + j * b[0]) * px, (oy + i * a[1] + j * b[1]) * px, (oz + i * a[2] + j * b[2]) * px);
        nor.push(n[0], n[1], n[2]); col.push(r, g, bl);
      }
    }
  }
  const geo = ([pos, nor, col]) => {
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere(); return g;
  };
  return { lit: geo(out.lit), glow: geo(out.glow) };
}

// HOLDS: every weapon has a hold, and the hold decides how it's carried in first person, by bots and in the armory,
// so a new weapon only needs a hold and its grip (and fore) boxes to be held right:
//   pistol   one hand. The arm points straight out and the gun sits at the end of the fist
//   rifle    two hands, up at the shoulder: right fist on the grip, left fist on the fore (handguard, pump)
//   heavy    two hands, low at the hip (miniguns)
//   shoulder a big tube resting over the right shoulder, held by two grips near its front
//   melee    in one fist, sticking straight out of the end of it and tipped up a little
// Fists never go inside a weapon: they stop just outside the grip, so the weapon looks attached to the end of the hand.
// Two-handed holds turn the body sideways (like a real shooting stance) when that's what it takes for the left hand to reach.
//
// each model returns, in gun pixels: muzzle [y, z], grip = [w, h, d, x, y, z] the box the right fist holds,
// fore = the box the left fist holds (null on one-handed weapons), bands = z spots for the gold upgrade bands
// and band = [width, height, y] for them, plus spin (the eradicator's barrels) and round (the loaded rocket) sub-parts
const GUN_MODELS = {
  voxel({ p, mat, dark, glow }) {
    const teal = glow(0x2ee6d6), grip = mat(0x3a3a3e);
    p(4, 4, 16, mat(0x6a6a6a), 0, 2, -8); p(4, 1, 16, mat(0x8e8e8e), 0, 3.5, -8); // slide and its lighter top
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(2, 2, 1, teal, 0, 2, -15.5); // emitter in the muzzle
    for (const z of [-4, -7, -10]) p(4, 2, 2, teal, 0, 2, z); // teal cubes set into the sides
    p(2, 1, 1, dark, 0, 4.5, -1); p(1, 1, 1, dark, 0, 4.5, -15); // sights
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, grip, 0, -3.5, -3); p(4, 3, 4, grip, 0, -6.5, -2); p(4, 1, 4, dark, 0, -8.5, -2); // short grip under the back of the slide
    return { muzzle: [2, -17], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-11, -14], band: [6, 8, 1] };
  },
  shotgun({ p, mat, dark }) {
    const wood = mat(0x7a5232), dwood = mat(0x4e3420), steel = mat(0x4a4a4e);
    p(4, 5, 9, wood, 0, -.5, 4.5); p(4, 6, 1, dwood, 0, -1, 9.5); // stock and butt pad
    p(6, 5, 11, steel, 0, .5, -5.5); // receiver
    p(4, 4, 26, mat(GUN_STEEL), 0, 2, -24); p(4, 3, 18, steel, 0, -1.5, -20); // barrel, mag tube under it
    p(6, 4, 10, wood, 0, -1, -21); for (const z of [-17.5, -20.5, -23.5]) p(6, 4, 1, dwood, 0, -1, z); // pump and its grooves
    p(1, 1, 1, mat(0xdddddd), 0, 4.5, -36.5); p(4, 4, 1, dark, 0, 2, -37.5); // bead sight, dark muzzle end
    p(4, 3, 3, wood, 0, -3.5, -1.5); p(4, 3, 3, wood, 0, -6.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4.5); // guard and trigger
    return { muzzle: [2, -38], grip: [4, 6, 4, 0, -5, -1], fore: [6, 4, 10, 0, -1, -21], bands: [-3, -8], band: [8, 8, .5] };
  },
  ar({ p, mat, dark }) {
    const body = mat(0x5a705a), dk = mat(0x465846);
    p(4, 6, 8, dk, 0, 0, 4); p(4, 8, 1, dark, 0, -1, 8.5); // stock, butt
    p(6, 6, 15, body, 0, 0, -7.5); // receiver
    p(4, 1, 13, dark, 0, 3.5, -7.5); p(2, 2, 2, dark, 0, 5, -2); // top rail, rear sight
    p(6, 6, 11, dk, 0, 0, -20.5); for (const z of [-18, -21, -24]) p(6, 2, 2, mat(0x2a2a2e), 0, 0, z); // handguard and its vents
    p(4, 4, 8, mat(GUN_STEEL), 0, 1, -30); p(4, 4, 3, dark, 0, 1, -35.5); p(2, 3, 1, dark, 0, 4.5, -25.5); // barrel, muzzle brake, front sight
    p(4, 4, 4, dark, 0, -5, -10); p(4, 3, 4, dark, 0, -8.5, -11); // mag, curving forward
    p(4, 4, 4, dk, 0, -5, -2); p(4, 3, 4, dk, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -37], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 11, 0, 0, -20.5], bands: [-5, -11], band: [8, 8, 0] };
  },
  sniper({ p, mat, dark, glow }) {
    const wood = mat(0x5a3d26), act = mat(0x44444c), silver = mat(0x9a9a9a);
    p(4, 6, 10, wood, 0, -1, 5); p(4, 8, 1, mat(0x2e1f14), 0, -1, 10.5); p(4, 2, 6, wood, 0, 3, 4); // stock, butt, cheek rest
    p(4, 4, 18, act, 0, 0, -9); p(4, 3, 10, wood, 0, -3.5, -16); // action, forend
    p(4, 4, 28, mat(GUN_STEEL), 0, .5, -32); p(4, 4, 6, dark, 0, .5, -49); // barrel, suppressor
    p(4, 4, 16, mat(0x2a2a2e), 0, 6, -10); p(6, 6, 2, dark, 0, 6, -1); p(6, 6, 2, dark, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0x66ccff), 0, 6, -19.5); // lens
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    p(4, 2, 2, silver, 4, 1, -3); p(3, 3, 3, silver, 6.5, 1.5, -3.5); // bolt handle and knob
    p(4, 5, 4, wood, 0, -4.5, -2); p(4, 3, 4, wood, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -6); p(1, 3, 1, dark, 0, -3.5, -8.5); p(1, 2, 1, silver, 0, -3, -5.5); // guard and trigger
    return { muzzle: [.5, -52], grip: [4, 8, 5, 0, -6, -1.5], fore: [4, 3, 10, 0, -3.5, -16], bands: [-6, -12], band: [6, 6, 0] };
  },
  eradicator({ p, mat, dark, sub, at }) {
    const steel = mat(0x808084), dk = mat(0x48484e), bar = mat(0x66666b), gold = mat(0xc9a43a);
    p(10, 10, 14, steel, 0, 0, -5); p(12, 12, 2, dk, 0, 0, 3); // housing, back plate
    p(2, 2, 10, dk, 0, 8, -5); p(2, 2, 2, dk, 0, 6, -9); p(2, 2, 2, dk, 0, 6, -1); // carry handle
    p(6, 6, 8, mat(0x5a5a2a), -8, -2, -5); p(4, 2, 4, gold, -5, 2, -5); // ammo box and the belt feeding in
    const spin = sub(0, 0, -23, [.5, .5, 0]), sp = at(spin);
    for (const [x, y] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { sp(3, 3, 22, bar, x, y, 0); sp(1, 1, 1, mat(0x111111), x + .5, y + .5, -10.5); } // barrels with dark bores
    sp(2, 2, 18, dk, 0, 0, 1); for (const z of [-6, 6]) sp(9, 9, 2, dk, 0, 0, z); // spindle and barrel rings
    p(4, 2, 6, dk, 0, 3, 7); p(4, 2, 6, dk, 0, -5, 7); p(4, 10, 3, dk, 0, -1, 11.5); // D-shaped spade handle out the back
    p(1, 2, 1, mat(0x999999), 0, -1, 9.5); // trigger inside it
    p(4, 8, 4, dk, 0, -9, -8); // front handle
    return { muzzle: [0, -35], grip: [4, 10, 3, 0, -1, 11.5], fore: [2, 4, 10, 0, 7, -5], bands: [-2, -5], band: [12, 12, 0], spin }; // left hand on the carry handle
  },
  // edge along the bottom, straight spine along the top, the edge curving up to meet it at the tip
  knife({ p, mat }) {
    const brown = mat(0x5a3a1a), dbrown = mat(0x3a2412), steel = mat(0x8a8f96), blade = mat(0xc4cad2);
    p(4, 4, 8, brown, 0, 0, 0); for (const z of [-2.5, 2.5]) p(4, 4, 1, dbrown, 0, 0, z); // handle and its wraps
    p(6, 6, 2, steel, 0, 0, 5); // pommel
    p(4, 10, 2, steel, 0, 1, -5); // crossguard, running up and down like the blade
    p(2, 5, 14, blade, 0, 1.5, -13); p(2, 2, 13, mat(0xf2f5f8), 0, -1, -12.5); // blade, bright sharp edge along the bottom
    p(2, 1, 10, mat(0x9aa3ad), 0, 1.5, -12); // fuller groove
    p(2, 4, 2, blade, 0, 2, -21); p(2, 2, 2, blade, 0, 3, -23); // tip
    return { muzzle: [0, -24], grip: [6, 6, 10, 0, 0, 1], fore: null, bands: [-1.5, 1.5], band: [6, 6, 0] };
  },
  flame({ p, mat, dark, glow }) {
    const grey = mat(0x66666a), dk = mat(0x404044), red = mat(0xc43030);
    p(6, 6, 14, grey, 0, 0, -6); p(4, 4, 2, dk, 0, 0, 2); // body, rear cap
    p(8, 8, 7, dk, 0, 0, -16.5); for (const z of [-14.5, -16.5, -18.5]) p(8, 8, 1, mat(0x161616), 0, 0, z); // heat shroud and its ribs
    p(4, 4, 7, dark, 0, 0, -23.5); // nozzle
    p(2, 2, 6, dark, 0, -3, -23); p(2, 2, 2, glow(0xffaa33), 0, -3, -27); // pilot pipe and its flame
    p(6, 6, 10, red, 0, -6, -8); for (const z of [-4.5, -10.5]) p(8, 8, 1, dk, 0, -6, z); // fuel tank and straps
    p(4, 4, 1, mat(0xc9a43a), 0, -6, -13.5); // tank cap
    p(4, 5, 4, dk, 0, -5.5, 1); p(4, 3, 4, dk, 0, -9.5, 2); // rear grip
    p(1, 1, 2, dark, 0, -6.5, -2); p(1, 2, 1, mat(0x999999), 0, -4, -1.5); // guard and trigger
    p(4, 7, 4, dk, 0, -7.5, -16); // front handle
    return { muzzle: [0, -28], grip: [4, 8, 5, 0, -7, 1.5], fore: [8, 15, 7, 0, -3.5, -16.5], bands: [-7, -1], band: [8, 8, 0] }; // fore: the front handle and the shroud above it
  },
  // held by two grips near the front, with the long back end going over your shoulder
  rocket({ p, mat, dark, glow, sub, at }) {
    const olive = mat(0x6f8253), dk = mat(0x45533a), hole = mat(0x101010);
    p(8, 8, 52, olive, 0, 0, 4); // tube
    p(8, 8, 3, dk, 0, 0, -20.5); p(10, 10, 3, dk, 0, 0, 26.5); p(10, 10, 2, dark, 0, 0, 30); // front ring, rear ring, exhaust
    p(6, 6, 1, hole, 0, 0, -21.5); p(6, 6, 1, hole, 0, 0, 30.5); // dark tube mouths
    for (const x of [-3.5, 3.5]) p(1, 4, 36, mat(0xc9a43a), x, 0, 4); // yellow warning stripes
    p(4, 4, 6, dark, -3, 6, -12); p(2, 2, 1, glow(0xff5544), -3, 6, -15.5); // sight with a red lens
    p(6, 2, 12, mat(0x2a2a2a), 0, -5, 18); // shoulder pad under the back
    p(4, 5, 4, dk, 0, -6.5, -6); p(4, 3, 4, dk, 0, -10.5, -5); // trigger grip
    p(1, 1, 4, dark, 0, -7.5, -10); p(1, 2, 1, mat(0x888888), 0, -5, -9.5); // guard and trigger
    p(4, 8, 4, dk, 0, -8, -16); // front grip
    const round = sub(0, 0, 0), r = at(round); // the loaded rocket, poking well out of the front
    r(6, 6, 6, mat(0xaa3333), 0, 0, -25); r(4, 4, 3, mat(0xcc4433), 0, 0, -29.5); r(2, 2, 2, mat(0xe86a50), 0, 0, -32);
    return { muzzle: [0, -33], grip: [4, 8, 5, 0, -8, -5.5], fore: [4, 8, 4, 0, -8, -16], bands: [7, 10], band: [10, 10, 0], round };
  },
  flare({ p, mat, dark, glow }) {
    const red = mat(0xc8402a), grip = mat(0x3a3a3e);
    p(6, 6, 14, red, 0, 2, -9); p(6, 1, 14, mat(0xe8684a), 0, 4.5, -9); // fat barrel and its lighter top
    p(6, 6, 2, dark, 0, 2, -17); p(4, 4, 1, glow(0xffaa33), 0, 2, -17.5); // dark muzzle with the flare inside
    p(6, 8, 4, mat(0x3a3a3a), 0, 2, 0); p(2, 3, 2, dark, 0, 7.5, 2); // breech and hammer
    p(4, 4, 4, grip, 0, -4, 0); p(4, 3, 4, grip, 0, -7.5, 1); p(4, 2, 4, grip, 0, -10, 2); // grip, raked back in steps
    p(1, 1, 5, dark, 0, -4.5, -3.5); p(1, 3, 1, dark, 0, -2.5, -6.5); p(1, 2, 1, mat(0x888888), 0, -2, -3.5); // guard and trigger
    return { muzzle: [2, -18], grip: [4, 9, 5, 0, -6.5, .5], fore: null, bands: [-6, -11], band: [8, 8, 2] };
  },
};
// builds gun i's model into group g with `stars` gold upgrade bands: the same model in your hands, a bot's, and the armory.
// The geometry is made once per gun and star count and shared (meshes are marked userData.shared, so never dispose them).
// Returns, in world units: muzzle [y, z], grip and fore boxes (x, y, z center and half sizes, fore null on one-handed weapons),
// plus spin (the eradicator's barrels) and round (the loaded rocket)
const gunGeoCache = {};
// every gun pixel also glows a little in its own color, so the side away from the sun still shows its color against the black outline
const gunLit = new THREE.MeshLambertMaterial({ vertexColors: true }), gunGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
gunLit.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * .45;'); };
const gunPx = i => GPX * (GUN_SCALE[BASE[i].id] || 1);
function gunPieces(i, stars) { // runs gun i's model: its pieces, its sub-parts' pieces and what the model returned
  const main = [], subs = [];
  const c = { mat: col => palIdx(col), dark: palIdx(GUN_DARK), glow: col => palIdx(col, true) };
  c.p = (...a) => main.push(a);
  // a sub-part that moves on its own, with its pieces placed from x, y, z. off = where its pivot sits from there
  // (the eradicator's barrel cluster is 7 pixels across, so it spins about a half pixel)
  c.sub = (x, y, z, off = [0, 0, 0]) => { const s = { at: [x, y, z], off, list: [] }; subs.push(s); return s; };
  c.at = s => (...a) => s.list.push(a);
  const m = GUN_MODELS[BASE[i].id](c), [bw, bh, by] = m.band, gold = palIdx(0xffcc22);
  for (let s = 0; s < stars; s++) c.p(bw, bh, 2, gold, 0, by, m.bands[s]); // one gold band per upgrade
  return { m, main, subs };
}
function gunGeos(i, stars) {
  const { m, main } = gunPieces(i, stars), px = gunPx(i);
  const part = s => {
    if (!s) return null;
    const geos = voxelGeos(s.list, px);
    for (const g of [geos.lit, geos.glow]) if (g) { g.translate(-s.off[0] * px, -s.off[1] * px, -s.off[2] * px); g.computeBoundingSphere(); }
    return { at: s.at.map((v, k) => v + s.off[k]), geos };
  };
  return { m, main: voxelGeos(main, px), spin: part(m.spin), round: part(m.round) };
}
const gunBox = (b, px) => b && { c: [b[3] * px, b[4] * px, b[5] * px], h: [b[0] / 2 * px, b[1] / 2 * px, b[2] / 2 * px] };
function makeGun(i, g, stars) {
  const b = gunGeoCache[BASE[i].id + ':' + stars] ??= gunGeos(i, stars), px = gunPx(i);
  const add = (parent, geos) => {
    for (const [geo, mat] of [[geos.lit, gunLit], [geos.glow, gunGlow]]) if (geo) { const m = new THREE.Mesh(geo, mat); m.userData.shared = true; parent.add(m); }
  };
  add(g, b.main);
  const sub = s => { if (!s) return null; const grp = new THREE.Group(); grp.position.set(...s.at.map(n => n * px)); add(grp, s.geos); g.add(grp); return grp; };
  return { muzzle: b.m.muzzle.map(n => n * px), grip: gunBox(b.m.grip, px), fore: gunBox(b.m.fore, px), spin: sub(b.spin), round: sub(b.round) };
}
// the solid pixels on the outside of gun i (with no upgrade bands), as x, y, z centers in world units, for keeping arms out of it
const gunCellCache = {};
function gunCells(i) {
  if (gunCellCache[i]) return gunCellCache[i];
  const { main, subs } = gunPieces(i, 0), px = gunPx(i);
  for (const s of subs) for (const [w, h, d, m, x, y, z] of s.list) main.push([w, h, d, m, x + s.at[0], y + s.at[1], z + s.at[2]]);
  const { lo, NX, NY, NZ, at } = voxelGrid(main), out = [];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++)
    if (at(x, y, z) && (!at(x + 1, y, z) || !at(x - 1, y, z) || !at(x, y + 1, z) || !at(x, y - 1, z) || !at(x, y, z + 1) || !at(x, y, z - 1)))
      out.push((x + lo[0] + .5) * px, (y + lo[1] + .5) * px, (z + lo[2] + .5) * px);
  return gunCellCache[i] = new Float32Array(out);
}
// how far along dir (a unit vector) from point c a fist's end has to be so no part of the gun lies in an arm of radius r
// running from there along dir, plus a small gap: the fist stops just outside the gun instead of going into it
function fistOut(cells, c, dir, r, gap) {
  let t = 0;
  for (let k = 0; k < cells.length; k += 3) {
    const vx = cells[k] - c[0], vy = cells[k + 1] - c[1], vz = cells[k + 2] - c[2], a = vx * dir.x + vy * dir.y + vz * dir.z;
    if (a > t && vx * vx + vy * vy + vz * vz - a * a < r * r) t = a;
  }
  return t + gap;
}
const holdOf = w => w.hold;

// your first-person arms: the arm from your own skin, its fist just outside the grip, running back off the bottom of the screen.
// Two-handed weapons get your left arm too, on the fore
const ARM_U = .0325, UP_V = new THREE.Vector3(0, 1, 0);
let armGeos = null;
const armMats = {};
function vmArm(left, box, dir, low = 0) { // low: aim that far down the box (0 = its middle, 1 = its bottom)
  armGeos ??= [partBox(4, 12, 4, 40, 16, ARM_U), partBox(4, 12, 4, 32, 48, ARM_U)];
  const L = prof.look ?? PRESETS[0].look, k = JSON.stringify(L);
  const mat = armMats[k] ??= lam({ map: skinTexture(L) });
  dir.normalize();
  const c = [box.c[0], box.c[1] - low * box.h[1], box.c[2]], t = fistOut(gunCells(cur), c, dir, 2.2 * ARM_U, .006);
  const piv = new THREE.Group(); piv.position.set(...c).addScaledVector(dir, t); piv.quaternion.setFromUnitVectors(UP_V, dir);
  const worn = matchArmor(); // your armor's bracer and shoulder guard, on the arm you can see
  for (let s = 0; s < 3; s++) { // more lengths behind the arm, so its end never shows on screen
    const m = new THREE.Mesh(armGeos[left ? 1 : 0], mat); m.position.y = (6 + s * 12) * ARM_U; m.userData.shared = true; piv.add(m);
    if (worn && !s) { const a = new THREE.Mesh(armorGeo(left ? 'armL' : 'armR', ARM_U), armMats['armor' + worn] ??= armorMat(worn, null)); a.userData.shared = true; m.add(a); }
  }
  vm.add(piv);
}
// which way each first-person arm runs from its fist, per hold: back toward you and down off the screen,
// so the fist faces forward into the grip instead of pushing up under the gun
// [x, y, z, low]: the direction, and how far down the grip the fist lands (low on the grip keeps the arm under a stock)
const VM_ARMS = {
  pistol: [[.15, -.2, 1, .3]], rifle: [[.2, -.25, 1, .5], [-.35, -.3, 1, .6]], heavy: [[.25, -.25, 1, .4], [-.4, -.3, 1, .3]],
  shoulder: [[.2, -.25, 1, .5], [-.35, -.3, 1, .5]], melee: [[.15, -.15, 1, 0]],
};
function buildGun() {
  vm.traverse(o => { if (o.geometry && o !== flashMesh && !o.userData.shared) o.geometry.dispose(); });
  vm.clear(); flashMesh.visible = false;
  const { muzzle: [my, mz], grip, fore, spin, round } = makeGun(cur, vm, lvl[cur]), arms = VM_ARMS[holdOf(BASE[cur])];
  gunSpin = spin; gunRound = round;
  vmArm(false, grip, new THREE.Vector3(...arms[0]), arms[0][3]);
  if (fore && arms[1]) vmArm(true, fore, new THREE.Vector3(...arms[1]), arms[1][3]);
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
// build every gun's plain model ahead of time, one per idle moment, so the first bot to pull one out doesn't stall a frame
{
  const later = window.requestIdleCallback || (f => setTimeout(f, 50));
  let k = 0;
  const next = () => { if (k >= BASE.length) return; gunGeoCache[BASE[k].id + ':0'] ??= gunGeos(k, 0); k++; later(next); };
  later(next);
}

const parts = [], pGeo = new THREE.BoxGeometry(.08, .08, .08), pMats = {};
function burst(p, color, n) {
  pMats[color] ??= new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(pGeo, pMats[color]); m.position.copy(p); scene.add(m);
    parts.push({ m, v: new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 4, (Math.random() - .5) * 4), life: .6 });
  }
}
