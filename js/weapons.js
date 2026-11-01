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
const BASE = [
  { id: 'voxel', name: 'Voxel Gun', cat: 'backup', start: true, free: true, dmg: 20, rate: .26, mag: 12, reload: 1.0, pellets: 1, spread: 0, auto: false, color: 0x444444, len: .3 },
  { id: 'shotgun', name: 'Shotgun', cat: 'primary', start: true, dmg: 10, rate: .75, mag: 6, reload: 1.6, pellets: 9, spread: .07, auto: false, color: 0x6b4a2b, len: .6 },
  { id: 'ar', name: 'Assault Rifle', cat: 'primary', start: true, dmg: 12, rate: .09, mag: 30, reload: 1.4, pellets: 1, spread: .006, auto: true, color: 0x2f3b2f, len: .55 },
  { id: 'sniper', name: 'Sniper Rifle', cat: 'sniper', start: true, dmg: 80, rate: 1.1, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x1a1a1a, len: .9, scope: true },
  { id: 'eradicator', name: 'Eradicator', cat: 'primary', unlock: 12, price: 450, dmg: 9, rate: .05, mag: 120, reload: 2.6, pellets: 1, spread: .012, auto: true, color: 0x777777, len: .7 },
  { id: 'knife', name: 'Combat Knife', cat: 'melee', start: true, free: true, inf: true, melee: true, dmg: 35, rate: .4, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xd8dde3, len: .3, model: 'knife' },
  // flamethrower: short cone that hits everything in front of you and sets it on fire. mag = fuel
  { id: 'flame', name: 'Flamethrower', cat: 'special', start: true, flame: true, dmg: 5, rate: .06, range: 7, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0x555555, len: .5, model: 'flame' },
  { id: 'rocket', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, rocket: true, dmg: 150, rate: 1.1, mag: 4, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, model: 'rocket' },
  // flare gun: burn = damage per quarter second, burnT = seconds
  { id: 'flare', name: 'Flare Gun', cat: 'premium', start: true, flare: true, dmg: 40, burn: 3, burnT: 3, rate: .4, mag: 1, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc8402a, len: .4, model: 'flare' },
];
const W_ID = Object.fromEntries(BASE.map((w, i) => [w.id, i]));
const gi = id => W_ID[id]; // weapon id -> its index in BASE/WEAPONS
// star upgrades: getting a gun gives ★, then two flat upgrades to ★★ and ★★★
// every star adds +25% damage and +25% mag size, and cuts reload time by 15%
const lvl = BASE.map(() => 0); // 0 = ★, 1 = ★★, 2 = ★★★
const WEAPONS = BASE.map(w => ({ ...w }));
function applyLvl(i) {
  const b = BASE[i], L = lvl[i];
  Object.assign(WEAPONS[i], { dmg: Math.round(b.dmg * (1 + .25 * L)), mag: Math.round(b.mag * (1 + .25 * L)), reload: +(b.reload * (1 - .15 * L)).toFixed(2) });
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
const SPRITES = BASE.map(w => SPRITE_RECTS[w.id]).map(rects => {
  const c = document.createElement('canvas'); c.width = 24; c.height = 12;
  const g = c.getContext('2d'); for (const [x, y, w, h, col] of rects) { g.fillStyle = col; g.fillRect(x, y, w, h); }
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
let into = vm; // the group the gun models below are being built into (your viewmodel, or a bot's hands)
function place(mesh, x, y, z) { mesh.position.set(x, y, z); into.add(mesh); return mesh; }
let gunSpin = null, gunSpinV = 0; // the eradicator's barrel cluster, and how fast it's spinning
// gun models: guns point down -z, the hand sits near z = 0. Each one returns where its muzzle is,
// plus where the gold upgrade bands go (z spots and the band's width/height).
// A piece with no material (c.skin on a bot, which holds the gun with its own arms) is left out
const P_ = (w, h, d, mat, x, y, z) => mat ? place(box(w, h, d, mat), x, y, z) : new THREE.Object3D();
const GUN_MODELS = {
  voxel(c) {
    P_(.08, .07, .3, c.mat(0x666666), 0, .02, -.15); // slide
    P_(.081, .015, .3, c.mat(0x8a8a8a), 0, .05, -.15);
    P_(.075, .045, .26, c.dark, 0, -.035, -.13); // frame
    P_(.04, .04, .02, c.glow(0x2ee6d6), 0, .02, -.305); // teal emitter in the muzzle
    for (const z of [-.08, -.14, -.2]) P_(.085, .025, .025, c.glow(0x2ee6d6), 0, .02, z); // teal cubes down the side
    P_(.03, .02, .02, c.dark, 0, .065, -.03); P_(.02, .02, .02, c.dark, 0, .065, -.28); // sights
    P_(.02, .045, .07, c.dark, 0, -.075, -.1); // trigger guard
    P_(.07, .17, .08, c.dark, 0, -.11, -.01).rotation.x = .2; // grip
    P_(.14, .14, .14, c.skin, 0, -.15, .02);
    return { muzzle: [.02, -.32], bands: [-.11, -.22], band: [.09, .11] };
  },
  shotgun(c) {
    const wood = c.mat(0x7a5232), steel = c.mat(0x4a4a4a);
    P_(.08, .09, .14, wood, 0, -.04, .04); // stock
    P_(.1, .1, .2, steel, 0, 0, -.12); // receiver
    P_(.05, .05, .52, c.dark, 0, .025, -.46); // barrel
    P_(.045, .045, .38, steel, 0, -.03, -.41); // mag tube
    P_(.085, .075, .18, wood, 0, -.035, -.42); // pump
    for (const z of [-.37, -.42, -.47]) P_(.087, .01, .02, c.mat(0x4e3420), 0, -.035, z); // pump grooves
    P_(.02, .02, .02, c.mat(0xd8d8d8), 0, .06, -.7); // bead sight
    P_(.06, .04, .02, c.dark, 0, .025, -.72); // muzzle ring
    P_(.07, .14, .08, wood, 0, -.1, -.06).rotation.x = .3; // grip
    P_(.14, .14, .14, c.skin, 0, -.14, 0);
    return { muzzle: [.025, -.74], bands: [-.08, -.17], band: [.11, .11] };
  },
  ar(c) {
    const body = c.mat(0x3d4d3d), dk = c.mat(0x2a352a);
    P_(.07, .1, .16, dk, 0, -.02, .07); // stock
    P_(.09, .1, .3, body, 0, 0, -.15); // receiver
    P_(.04, .03, .26, c.dark, 0, .065, -.15); // top rail
    for (const z of [-.06, -.12, -.18, -.24]) P_(.045, .012, .02, c.mat(0x111111), 0, .082, z);
    P_(.08, .08, .22, dk, 0, -.005, -.41); // handguard
    for (const z of [-.34, -.41, -.48]) P_(.082, .02, .03, c.dark, 0, .005, z); // vents
    P_(.035, .035, .14, c.dark, 0, .01, -.59); // barrel
    P_(.05, .05, .05, c.dark, 0, .01, -.68); // muzzle brake
    P_(.02, .06, .02, c.dark, 0, .06, -.5); // front sight post
    P_(.06, .16, .08, c.dark, 0, -.12, -.2).rotation.x = .25; // mag
    P_(.07, .15, .08, dk, 0, -.1, -.02).rotation.x = .3; // grip
    P_(.14, .14, .14, c.skin, 0, -.14, .02);
    return { muzzle: [.01, -.71], bands: [-.09, -.21], band: [.1, .11] };
  },
  sniper(c) {
    const wood = c.mat(0x4a3220), blk = c.mat(0x1a1a1a);
    P_(.08, .11, .2, wood, 0, -.03, .06); // stock
    P_(.06, .03, .1, wood, 0, .04, .05); // cheek rest
    P_(.085, .08, .36, blk, 0, 0, -.21); // body
    P_(.08, .05, .2, wood, 0, -.06, -.33); // forend
    P_(.035, .035, .56, c.dark, 0, .01, -.66); // barrel
    P_(.055, .055, .07, c.dark, 0, .01, -.96); // suppressor tip
    P_(.065, .065, .32, c.mat(0x2a2a2a), 0, .1, -.2); // scope tube
    P_(.08, .08, .04, c.dark, 0, .1, -.05); P_(.08, .08, .04, c.dark, 0, .1, -.37); // scope bells
    P_(.06, .06, .01, c.glow(0x66ccff), 0, .1, -.392); // lens
    P_(.03, .05, .03, c.dark, 0, .055, -.1); P_(.03, .05, .03, c.dark, 0, .055, -.3); // mounts
    P_(.06, .02, .02, c.mat(0x888888), .06, .02, -.05); // bolt handle
    P_(.07, .15, .08, wood, 0, -.1, -.02).rotation.x = .3; // grip
    P_(.14, .14, .14, c.skin, 0, -.14, .02);
    return { muzzle: [.01, -1], bands: [-.15, -.27], band: [.095, .09] };
  },
  eradicator(c) {
    const steel = c.mat(0x777777), dk = c.mat(0x3a3a3a);
    P_(.17, .17, .26, steel, 0, 0, -.1); // housing
    P_(.04, .05, .2, dk, 0, .12, -.12); // carry handle
    P_(.04, .03, .03, dk, 0, .09, -.03); P_(.04, .03, .03, dk, 0, .09, -.21);
    P_(.1, .13, .15, c.mat(0x5a5a2a), -.13, -.03, -.08); // ammo box
    P_(.03, .03, .1, c.mat(0xc9a43a), -.08, .02, -.16); // belt
    const spin = c.spin = new THREE.Group(); spin.position.set(0, 0, -.47); into.add(spin);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2, b = box(.03, .03, .46, c.dark);
      b.position.set(Math.cos(a) * .045, Math.sin(a) * .045, 0); spin.add(b);
    }
    for (const z of [-.12, .16]) { const r = box(.14, .14, .03, dk); r.position.z = z; spin.add(r); }
    P_(.06, .06, .06, dk, 0, 0, -.25); // spindle
    P_(.07, .16, .08, dk, 0, -.15, -.02).rotation.x = .3; // grip
    P_(.15, .15, .15, c.skin, 0, -.18, .02);
    return { muzzle: [0, -.72], bands: [-.06, -.16], band: [.18, .18] };
  },
  rocket(c) {
    const olive = c.mat(0x66784c), dk = c.mat(0x3a4630);
    P_(.17, .17, .8, olive, 0, 0, -.4); // tube
    P_(.21, .21, .08, dk, 0, 0, -.8); // front flare
    P_(.2, .2, .06, dk, 0, 0, .0); // rear ring
    P_(.12, .12, .02, c.dark, 0, 0, -.841); // tube mouth
    P_(.09, .09, .06, c.mat(0xaa3333), 0, 0, -.83); P_(.05, .05, .04, c.mat(0xcc4444), 0, 0, -.865); // rocket tip
    P_(.03, .02, .5, c.mat(0xc9a43a), 0, -.089, -.4); // yellow warning stripe
    P_(.06, .07, .14, c.dark, -.04, .13, -.3); P_(.05, .05, .01, c.glow(0xff5544), -.04, .135, -.371); // sight + red lens
    P_(.07, .14, .08, c.dark, 0, -.15, -.45).rotation.x = .2; // front grip
    P_(.08, .18, .1, c.dark, 0, -.14, -.08).rotation.x = .25; // grip
    P_(.15, .15, .15, c.skin, 0, -.18, -.02);
    return { muzzle: [0, -.9], bands: [-.18, -.52], band: [.18, .18] };
  },
};
// builds gun i's model into group g with `stars` gold upgrade bands, the same model in your hands and a bot's.
// hand = false leaves the hand cube out. Returns { muzzle: [y, z], spin } (spin = the eradicator's barrels)
const gunMats = {};
function makeGun(i, g, stars, hand = true) {
  const w = WEAPONS[i]; into = g;
  const mat = col => gunMats[col] ??= lam({ color: col });
  const glow = col => gunMats['g' + col] ??= new THREE.MeshBasicMaterial({ color: col });
  const dark = mat(0x1e1e1e), skin = hand ? mat(0xe0ac7a) : null, gold = gunMats.gold ??= lam({ color: 0xffcc22, emissive: 0x553300 });
  let out;
  const custom = GUN_MODELS[w.id];
  if (custom) {
    const c = { dark, skin, mat, glow, spin: null };
    const { muzzle, bands, band: [bw, bh] } = custom(c);
    for (let s = 0; s < stars; s++) P_(bw, bh, .035, gold, 0, 0, bands[s]); // one gold band per upgrade
    out = { muzzle, spin: c.spin };
  } else if (w.model === 'knife') { // handle, guard, blade pointing forward
    P_(.05, .07, .16, mat(0x5a3a1a), 0, 0, -.02);
    P_(.14, .03, .04, mat(0x888888), 0, 0, -.12);
    P_(.025, .08, .32, gunMats.blade ??= lam({ color: w.color, emissive: 0x222222 }), 0, .005, -.3);
    P_(.14, .14, .14, skin, 0, -.03, 0);
    out = { muzzle: [0, -.42], spin: null };
  } else {
    const thick = w.model === 'flare' ? .12 : .1;
    P_(thick, thick + .02, w.len, mat(w.color), 0, 0, -w.len / 2);
    if (w.model !== 'flare') P_(.05, .05, .2, dark, 0, .02, -w.len - .1); // barrel (the flare gun's fat muzzle is its own barrel)
    if (w.model === 'flare') { // fat dark muzzle with the glowing flare sitting inside it
      P_(.17, .17, .1, dark, 0, .01, -w.len - .02);
      P_(.08, .08, .02, glow(0xffaa33), 0, .01, -w.len - .075);
    }
    P_(.08, .18, .1, dark, 0, -.12, -.06).rotation.x = .25; // grip
    P_(.15, .15, .15, skin, 0, -.16, .02); // hand
    if (w.model === 'flame') { // red fuel tank under the gun and a little pilot flame at the tip
      P_(.13, .2, .22, mat(0xcc3333), 0, -.15, -.32);
      P_(.04, .04, .04, glow(0xffaa33), 0, .06, -w.len - .2);
    }
    for (let s = 0; s < stars; s++) P_(thick + .01, thick + .03, .04, gold, 0, 0, -w.len * (.35 + s * .3));
    out = { muzzle: [.02, -w.len - .21], spin: null };
  }
  into = vm;
  return out;
}
function buildGun() {
  vm.clear(); flashMesh.visible = false;
  const { muzzle: [my, mz], spin } = makeGun(cur, vm, lvl[cur]);
  gunSpin = spin;
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
