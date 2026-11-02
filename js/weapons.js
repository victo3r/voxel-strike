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
  // shoulder = a big gun carried on the shoulder, held near its front with the back end going over the shoulder
  { id: 'rocket', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, rocket: true, shoulder: true, dmg: 150, rate: 1.1, mag: 1, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, model: 'rocket' },
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

// gun models are voxel pixel art. Every size and spot in GUN_MODELS is in gun pixels, GPX world units each.
// Guns point down -z with the grip near the origin. The pieces are filled into a grid of pixels (later pieces paint over
// earlier ones), and only the outside of that grid is drawn, one little square per pixel with a touch of shading.
// A pixel turns black where the surface folds away round a corner, and on the darker side of a line where two colors meet,
// so the black outline is part of the pixel art. Anything 2 pixels thin is all outline, so parts that should show
// their color need to be 4 or more pixels across
const GPX = .01, GUN_DARK = 0x2c2c30;
const gunPal = [null], gunPalI = {}; // palette index -> { c: color, glow, lum }
function palIdx(col, glow = false) {
  const k = (glow ? 'g' : '') + col;
  if (gunPalI[k] === undefined) { const c = new THREE.Color(col); gunPalI[k] = gunPal.push({ c, glow, lum: .2126 * c.r + .7152 * c.g + .0722 * c.b }) - 1; }
  return gunPalI[k];
}
// each face: its normal, then two edges along it with a × b = normal, so the squares face outward
const VOX_FACES = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
];
// pieces = [w, h, d, palette index, x, y, z] boxes centered on x, y, z. Returns { lit, glow } geometries (either can be null)
function voxelGeos(pieces) {
  const boxes = pieces.map(([w, h, d, m, x, y, z]) => [Math.round(x - w / 2), Math.round(y - h / 2), Math.round(z - d / 2), Math.round(x + w / 2), Math.round(y + h / 2), Math.round(z + d / 2), m]);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[k] - 1); hi[k] = Math.max(hi[k], b[k + 3] + 1); }
  const [NX, NY, NZ] = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], cell = new Uint16Array(NX * NY * NZ);
  for (const [x0, y0, z0, x1, y1, z1, m] of boxes)
    for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cell[((z - lo[2]) * NY + (y - lo[1])) * NX + (x - lo[0])] = m;
  const at = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ ? 0 : cell[(z * NY + y) * NX + x];
  const out = { lit: [[], [], []], glow: [[], [], []] }; // positions, normals, colors
  const CORNER = [0, 1, 2, 0, 2, 3], ca = [0, 1, 1, 0], cb = [0, 0, 1, 1]; // the two triangles of a square, and each corner's steps along a and b
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const m = cell[(z * NY + y) * NX + x]; if (!m) continue;
    const P = gunPal[m];
    for (let f = 0; f < 6; f++) {
      const [n, a, b] = VOX_FACES[f];
      if (at(x + n[0], y + n[1], z + n[2])) continue;
      // the face carries on into a neighbour if that pixel is solid with nothing on top of it
      let black = false;
      for (let e = 0; e < 4 && !black; e++) {
        const t = e < 2 ? a : b, s = e & 1 ? -1 : 1;
        const ux = x + s * t[0], uy = y + s * t[1], uz = z + s * t[2], m2 = at(ux, uy, uz);
        if (!m2 || at(ux + n[0], uy + n[1], uz + n[2])) black = true; // an edge of the shape
        else if (m2 !== m) { const L2 = gunPal[m2].lum; if (P.lum < L2 || (P.lum === L2 && m < m2)) black = true; } // a color line, drawn on the darker side
      }
      let r = 0, g = 0, bl = 0;
      if (!black) {
        const h = Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791 ^ (f + 1) * 2654435761, 1597334677) >>> 0;
        const sh = P.glow ? 1 : .8 + (h % 1000) / 1000 * .2; // one shade per pixel, like a texture
        r = P.c.r * sh; g = P.c.g * sh; bl = P.c.b * sh;
      }
      const [pos, nor, col] = out[P.glow ? 'glow' : 'lit'];
      const ox = x + lo[0] + (n[0] > 0), oy = y + lo[1] + (n[1] > 0), oz = z + lo[2] + (n[2] > 0);
      for (let q = 0; q < 6; q++) {
        const k = CORNER[q], i = ca[k], j = cb[k];
        pos.push((ox + i * a[0] + j * b[0]) * GPX, (oy + i * a[1] + j * b[1]) * GPX, (oz + i * a[2] + j * b[2]) * GPX);
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

// each model returns, in gun pixels: muzzle [y, z], grip [y, z] (right hand), fore [y, z] (left hand, null on one-handed guns),
// bands = z spots for the gold upgrade bands and band = [width, height, y] for them
const GUN_MODELS = {
  voxel({ p, mat, dark, glow }) {
    const teal = glow(0x2ee6d6), grip = mat(0x303030);
    p(8, 6, 32, mat(0x6a6a6a), 0, 3, -16); p(8, 2, 32, mat(0x8e8e8e), 0, 7, -16); // slide and its lighter top
    for (const z of [-2, -5]) p(8, 5, 1, dark, 0, 3.5, z); // grip lines at the back of the slide
    p(8, 4, 26, dark, 0, -2, -13); // frame
    p(4, 4, 2, teal, 0, 3, -33); // emitter in the muzzle
    for (const z of [-7, -26]) p(10, 4, 4, teal, 0, 3, z); // teal cubes set into the sides
    p(4, 2, 2, dark, 0, 9, -2); p(2, 2, 2, dark, 0, 9, -30); // sights
    p(2, 2, 10, dark, 0, -9, -15); p(2, 4, 2, dark, 0, -6, -19); p(2, 4, 2, mat(0x666666), 0, -6, -13); // trigger guard and trigger
    p(8, 6, 8, grip, 0, -7, -7); p(8, 6, 8, grip, 0, -13, -5); p(8, 2, 8, dark, 0, -17, -5); // short grip under the back of the slide
    return { muzzle: [3, -34], grip: [-11, -6], fore: null, bands: [-13, -20], band: [10, 14, 2] };
  },
  shotgun({ p, mat, dark }) {
    const wood = mat(0x7a5232), dwood = mat(0x4e3420), steel = mat(0x4a4a4e);
    p(8, 10, 18, wood, 0, -1, 9); p(8, 4, 12, wood, 0, -8, 12); p(8, 16, 2, dwood, 0, -3, 19); // stock, its lower step, butt pad
    p(10, 10, 22, steel, 0, 1, -11); p(10, 4, 8, dark, 0, 2, -12); // receiver and ejection port
    p(6, 6, 52, dark, 0, 3, -48); p(6, 4, 36, steel, 0, -2, -40); // barrel, mag tube under it
    p(10, 8, 18, wood, 0, -3, -42); for (const z of [-37, -42, -47]) p(12, 8, 2, dwood, 0, -3, z); // pump and its ridges
    p(2, 2, 2, mat(0xdddddd), 0, 7, -72); p(8, 8, 2, dark, 0, 3, -75); // bead sight, muzzle ring
    p(8, 6, 6, wood, 0, -7, -3); p(8, 6, 6, wood, 0, -13, -1); // pistol grip
    p(2, 2, 10, dark, 0, -9, -11); p(2, 4, 2, dark, 0, -6, -15); p(2, 4, 2, mat(0x777777), 0, -6, -9); // guard and trigger
    return { muzzle: [3, -77], grip: [-10, -2], fore: [-5, -42], bands: [-6, -17], band: [12, 12, 1] };
  },
  ar({ p, mat, dark }) {
    const body = mat(0x3d4d3d), dk = mat(0x2c382c);
    p(8, 10, 16, dk, 0, 0, 10); p(8, 12, 2, dark, 0, -1, 19); p(4, 4, 2, dark, 0, 1, 1); // stock, butt, joint
    p(10, 10, 30, body, 0, 0, -15); // receiver
    p(6, 2, 26, dark, 0, 6, -15); p(4, 4, 4, dark, 0, 9, -4); // top rail, rear sight
    p(10, 8, 22, dk, 0, 0, -41); for (const z of [-36, -42, -48]) p(10, 2, 4, mat(0x111111), 0, 0, z); // handguard and its vents
    p(4, 4, 14, dark, 0, 1, -59); p(6, 6, 6, dark, 0, 1, -69); p(2, 6, 2, dark, 0, 7, -50); // barrel, muzzle brake, front sight
    p(8, 8, 6, dark, 0, -9, -20); p(8, 6, 6, dark, 0, -16, -22); // mag, curving forward
    p(8, 8, 6, dk, 0, -9, -3); p(8, 6, 6, dk, 0, -16, -1); // pistol grip
    p(2, 2, 10, dark, 0, -12, -11); p(2, 4, 2, mat(0x666666), 0, -7, -9); // guard and trigger
    return { muzzle: [1, -72], grip: [-12, -2], fore: [-5, -34], bands: [-10, -26], band: [12, 12, 0] };
  },
  sniper({ p, mat, dark, glow }) {
    const wood = mat(0x4a3220), act = mat(0x34343a), silver = mat(0x8a8a8a);
    p(8, 12, 20, wood, 0, -2, 10); p(8, 14, 2, mat(0x2e1f14), 0, -3, 21); p(6, 4, 12, wood, 0, 6, 8); // stock, butt, cheek rest
    p(8, 8, 36, act, 0, 0, -18); p(8, 6, 20, wood, 0, -7, -32); // action, forend
    p(4, 4, 56, dark, 0, 1, -64); p(6, 6, 10, dark, 0, 1, -97); // barrel, suppressor
    p(6, 6, 32, mat(0x2a2a2e), 0, 11, -20); p(8, 8, 4, dark, 0, 11, -2); p(8, 8, 4, dark, 0, 11, -38); // scope tube and bells
    p(6, 6, 2, glow(0x66ccff), 0, 11, -41); // lens
    p(4, 4, 4, dark, 0, 6, -10); p(4, 4, 4, dark, 0, 6, -28); // scope mounts
    p(8, 2, 2, silver, 8, 2, -6); p(4, 4, 4, silver, 14, 2, -6); // bolt handle and knob
    p(8, 10, 6, wood, 0, -9, -3); p(8, 6, 6, wood, 0, -17, -1); // pistol grip
    p(2, 2, 8, dark, 0, -11, -10); p(2, 6, 2, dark, 0, -7, -15); p(2, 4, 2, silver, 0, -6, -8); // guard and trigger
    return { muzzle: [1, -102], grip: [-14, -2], fore: [-7, -28], bands: [-14, -24], band: [10, 10, 0] };
  },
  eradicator({ p, mat, dark, sub, at }) {
    const steel = mat(0x7a7a7a), dk = mat(0x3c3c40), bar = mat(0x5a5a5e), gold = mat(0xc9a43a);
    p(18, 20, 26, steel, 0, 0, -11); p(20, 22, 2, dk, 0, 0, 3); // housing, back plate
    p(4, 4, 2, dk, 0, 12, -2); p(4, 4, 2, dk, 0, 12, -20); p(4, 4, 22, dk, 0, 16, -11); // carry handle
    p(10, 12, 14, mat(0x5a5a2a), -14, -3, -11); p(6, 4, 10, gold, -12, 5, -11); // ammo box and the belt feeding in
    const spin = sub(0, 0, -47), sp = at(spin);
    for (const [x, y] of [[6, 0], [-6, 0], [3, 5], [-3, 5], [3, -5], [-3, -5]]) { sp(4, 4, 46, bar, x, y, 0); sp(2, 2, 1, mat(0x111111), x, y, -22.5); } // barrels with dark bores
    sp(4, 4, 46, dk, 0, 0, 0); for (const z of [-12, 16]) sp(20, 20, 4, dk, 0, 0, z); // spindle and barrel rings
    p(8, 8, 6, dk, 0, -14, -2); p(8, 6, 6, dk, 0, -21, 0); // rear grip
    p(2, 2, 6, dark, 0, -16, -8); p(2, 6, 2, dark, 0, -13, -12); p(2, 4, 2, mat(0x999999), 0, -12, -7); // guard and trigger
    p(8, 14, 6, dk, 0, -17, -20); // front handle
    return { muzzle: [0, -72], grip: [-17, -1], fore: [-18, -20], bands: [-6, -14], band: [20, 22, 0], spin };
  },
  knife({ p, mat }) {
    const brown = mat(0x5a3a1a), dbrown = mat(0x3a2412), steel = mat(0x8a8f96), blade = mat(0xc4cad2);
    p(6, 8, 12, brown, 0, 0, 0); for (const z of [-3, 3]) p(8, 10, 2, dbrown, 0, 0, z); p(8, 10, 4, steel, 0, 0, 8); // handle, wraps, pommel
    p(6, 16, 4, steel, 0, 1, -8); // crossguard, running up and down like the blade
    p(4, 10, 18, blade, 0, 3, -19); p(4, 8, 4, blade, 0, 2, -30); p(4, 5, 4, blade, 0, .5, -34); // blade, stepping down to the tip
    p(4, 2, 26, mat(0xf2f5f8), 0, -1, -23); // bright sharp edge along the bottom
    p(4, 1, 12, mat(0x8a929c), 0, 4.5, -19); // fuller groove
    return { muzzle: [0, -36], grip: [0, 0], fore: null, bands: [0, 0], band: [10, 12, 0] };
  },
  flame({ p, mat, dark, glow }) {
    const grey = mat(0x5a5a5a), dk = mat(0x333333), red = mat(0xc43030);
    p(10, 10, 28, grey, 0, 0, -12); p(8, 8, 4, dk, 0, 0, 4); // body, rear cap
    p(12, 12, 14, dk, 0, 1, -33); for (const z of [-29, -33, -37]) p(14, 14, 2, mat(0x161616), 0, 1, z); // heat shroud and its ribs
    p(6, 6, 10, dark, 0, 1, -45); p(8, 8, 2, dark, 0, 1, -51); // nozzle
    p(2, 2, 10, dark, 0, -4, -45); p(4, 4, 2, glow(0xffaa33), 0, -5, -51); // pilot pipe and its flame
    p(12, 12, 18, red, 0, -11, -15); for (const z of [-9, -21]) p(14, 14, 2, dk, 0, -11, z); // fuel tank and straps
    p(4, 4, 2, mat(0xc9a43a), 0, -11, -25); // tank cap
    p(8, 8, 6, dk, 0, -9, 1); p(8, 6, 6, dk, 0, -16, 3); // rear grip
    p(2, 2, 4, dark, 0, -14, -4); p(2, 4, 2, mat(0x999999), 0, -7, -4); // guard and trigger
    p(8, 12, 6, dk, 0, -11, -33); // front handle
    return { muzzle: [1, -53], grip: [-12, 2], fore: [-12, -33], bands: [-3, -15], band: [12, 12, 1] };
  },
  // held near the front, with the long back end going over your shoulder
  rocket({ p, mat, dark, glow, sub, at }) {
    const olive = mat(0x66784c), dk = mat(0x3a4630), hole = mat(0x101010);
    p(16, 16, 84, olive, 0, 0, 12); // tube
    p(20, 20, 6, dk, 0, 0, -31); p(20, 20, 6, dk, 0, 0, 51); p(18, 18, 4, dark, 0, 0, 56); // front ring, rear ring, exhaust
    p(12, 12, 2, hole, 0, 0, -33); p(12, 12, 2, hole, 0, 0, 57); // dark tube mouths
    for (const x of [-9, 9]) p(2, 4, 56, mat(0xc9a43a), x, 0, 12); // yellow warning stripes
    p(6, 6, 12, dark, -7, 11, -16); p(4, 4, 2, glow(0xff5544), -7, 11, -23); // sight with a red lens
    p(12, 4, 16, mat(0x2a2a2a), 0, -10, 24); // shoulder pad under the back half
    p(8, 8, 6, dk, 0, -12, 0); p(8, 6, 6, dk, 0, -19, 2); // trigger grip
    p(2, 2, 8, dark, 0, -15, -7); p(2, 6, 2, dark, 0, -11, -11); p(2, 4, 2, mat(0x888888), 0, -10, -6); // guard and trigger
    p(8, 14, 6, dk, 0, -15, -20); // front grip
    const round = sub(0, 0, 0), r = at(round); // the loaded rocket, poking well out of the front
    r(8, 8, 12, mat(0xaa3333), 0, 0, -39); r(10, 10, 2, mat(0x2a2a2a), 0, 0, -46); r(6, 6, 4, mat(0xcc4433), 0, 0, -49); r(4, 4, 4, mat(0xe86a50), 0, 0, -53);
    return { muzzle: [0, -55], grip: [-14, 1], fore: [-15, -20], bands: [-10, -24], band: [20, 20, 0], round };
  },
  flare({ p, mat, dark, glow }) {
    const red = mat(0xc8402a), grip = mat(0x2e2e2e);
    p(12, 10, 28, red, 0, 3, -18); p(12, 2, 28, mat(0xe8684a), 0, 9, -18); // fat barrel and its lighter top
    p(16, 16, 4, dark, 0, 4, -33); p(8, 8, 2, glow(0xffaa33), 0, 4, -34); // muzzle ring with the flare inside
    p(10, 14, 8, mat(0x3a3a3a), 0, 3, 0); p(4, 6, 4, dark, 0, 13, 3); // breech and hammer
    p(8, 8, 8, grip, 0, -8, 1); p(8, 6, 8, grip, 0, -15, 3); p(8, 4, 8, grip, 0, -20, 5); // grip, raked back in steps
    p(2, 2, 10, dark, 0, -9, -8); p(2, 6, 2, dark, 0, -5, -12); p(2, 4, 2, mat(0x888888), 0, -5, -6); // guard and trigger
    return { muzzle: [4, -36], grip: [-12, 3], fore: null, bands: [-12, -22], band: [14, 16, 4] };
  },
};
// builds gun i's model into group g with `stars` gold upgrade bands: the same model in your hands, a bot's, and the armory.
// The geometry is made once per gun and star count and shared (meshes are marked userData.shared, so never dispose them).
// Returns muzzle, grip and fore in world units ([y, z]), plus spin (the eradicator's barrels) and round (the loaded rocket)
const gunGeoCache = {};
const gunLit = new THREE.MeshLambertMaterial({ vertexColors: true }), gunGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
function gunGeos(i, stars) {
  const main = [], subs = [];
  const c = { mat: col => palIdx(col), dark: palIdx(GUN_DARK), glow: col => palIdx(col, true) };
  c.p = (...a) => main.push(a);
  c.sub = (x, y, z) => { const s = { at: [x, y, z], list: [] }; subs.push(s); return s; };
  c.at = s => (...a) => s.list.push(a);
  const m = GUN_MODELS[BASE[i].id](c), [bw, bh, by] = m.band, gold = palIdx(0xffcc22);
  for (let s = 0; s < stars; s++) c.p(bw, bh, 6, gold, 0, by, m.bands[s]); // one gold band per upgrade
  const part = s => s && { at: s.at, geos: voxelGeos(s.list) };
  return { m, main: voxelGeos(main), spin: part(m.spin), round: part(m.round) };
}
function makeGun(i, g, stars) {
  const b = gunGeoCache[BASE[i].id + ':' + stars] ??= gunGeos(i, stars);
  const add = (parent, geos) => {
    for (const [geo, mat] of [[geos.lit, gunLit], [geos.glow, gunGlow]]) if (geo) { const m = new THREE.Mesh(geo, mat); m.userData.shared = true; parent.add(m); }
  };
  add(g, b.main);
  const sub = s => { if (!s) return null; const grp = new THREE.Group(); grp.position.set(...s.at.map(n => n * GPX)); add(grp, s.geos); g.add(grp); return grp; };
  const w = v => v && v.map(n => n * GPX);
  return { muzzle: w(b.m.muzzle), grip: w(b.m.grip), fore: w(b.m.fore), spin: sub(b.spin), round: sub(b.round) };
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
