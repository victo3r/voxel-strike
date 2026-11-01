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
  { id: 'voxel', name: 'Voxel Gun', cat: 'backup', start: true, free: true, dmg: 34, rate: .22, mag: 12, reload: 1.0, pellets: 1, spread: 0, auto: false, color: 0x444444, len: .3, vol: .25, cut: 2200 },
  { id: 'shotgun', name: 'Shotgun', cat: 'primary', start: true, dmg: 16, rate: .75, mag: 6, reload: 1.6, pellets: 9, spread: .07, auto: false, color: 0x6b4a2b, len: .6, vol: .45, cut: 900 },
  { id: 'ar', name: 'Assault Rifle', cat: 'primary', start: true, dmg: 22, rate: .09, mag: 30, reload: 1.4, pellets: 1, spread: .006, auto: true, color: 0x2f3b2f, len: .55, vol: .2, cut: 2600 },
  { id: 'sniper', name: 'Sniper Rifle', cat: 'sniper', start: true, dmg: 150, rate: 1.1, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x1a1a1a, len: .9, vol: .5, cut: 3200, scope: true },
  { id: 'eradicator', name: 'Eradicator', cat: 'primary', unlock: 12, price: 450, dmg: 14, rate: .05, mag: 120, reload: 2.6, pellets: 1, spread: .012, auto: true, color: 0x777777, len: .7, vol: .18, cut: 2000 },
  { id: 'knife', name: 'Combat Knife', cat: 'melee', start: true, free: true, inf: true, melee: true, dmg: 60, rate: .4, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xd8dde3, len: .3, vol: .1, cut: 3500, model: 'knife' },
  // flamethrower: short cone that hits everything in front of you and sets it on fire. mag = fuel
  { id: 'flame', name: 'Flamethrower', cat: 'special', start: true, flame: true, dmg: 9, rate: .06, range: 7, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0x555555, len: .5, vol: .05, cut: 600, model: 'flame' },
  { id: 'rocket', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, rocket: true, dmg: 220, rate: 1.1, mag: 4, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, vol: .4, cut: 700, model: 'rocket' },
  // flare gun: burn = damage per quarter second, burnT = seconds
  { id: 'flare', name: 'Flare Gun', cat: 'premium', start: true, flare: true, dmg: 45, burn: 4, burnT: 3, rate: .4, mag: 1, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc8402a, len: .4, vol: .3, cut: 1400, model: 'flare' },
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
function place(mesh, x, y, z) { mesh.position.set(x, y, z); vm.add(mesh); return mesh; }
function buildGun() {
  const w = WEAPONS[cur]; vm.clear();
  const m = lam({ color: w.color }), dark = lam({ color: 0x1e1e1e }), skin = lam({ color: 0xe0ac7a });
  flashMesh.visible = false;
  if (w.model === 'knife') { // handle, guard, blade pointing forward
    place(box(.05, .07, .16, lam({ color: 0x5a3a1a })), 0, 0, -.02);
    place(box(.14, .03, .04, lam({ color: 0x888888 })), 0, 0, -.12);
    place(box(.025, .08, .32, lam({ color: w.color, emissive: 0x222222 })), 0, .005, -.3);
    place(box(.14, .14, .14, skin), 0, -.03, 0);
    return;
  }
  const thick = w.model === 'rocket' ? .17 : w.model === 'flare' ? .12 : .1;
  place(box(thick, thick + .02, w.len, m), 0, 0, -w.len / 2);
  place(box(.05, .05, .2, dark), 0, .02, -w.len - .1).visible = w.model !== 'rocket' && w.model !== 'flare'; // barrel (rocket tube and flare gun are their own barrels)
  if (w.model === 'flare') { // fat dark muzzle with the glowing flare sitting inside it
    place(box(.17, .17, .1, dark), 0, .01, -w.len - .02);
    place(box(.08, .08, .02, new THREE.MeshBasicMaterial({ color: 0xffaa33 })), 0, .01, -w.len - .075);
  }
  place(box(.08, .18, .1, dark), 0, -.12, -.06).rotation.x = .25; // grip
  place(box(.15, .15, .15, skin), 0, -.16, .02); // hand
  if (w.model === 'flame') { // red fuel tank under the gun and a little pilot flame at the tip
    place(box(.13, .2, .22, lam({ color: 0xcc3333 })), 0, -.15, -.32);
    place(box(.04, .04, .04, new THREE.MeshBasicMaterial({ color: 0xffaa33 })), 0, .06, -w.len - .2);
  }
  if (w.model === 'rocket') { // rocket poking out the front of the tube
    place(box(.1, .1, .1, lam({ color: 0xaa3333 })), 0, 0, -w.len - .03);
    place(box(.06, .06, .1, dark), 0, .12, -.3); // sight
  }
  flashMesh.position.set(0, .02, -w.len - .25);
  flashLight.position.copy(flashMesh.position);
  vm.add(flashMesh, flashLight);
  const gold = lam({ color: 0xffcc22, emissive: 0x553300 }); // one gold band per upgrade
  for (let s = 0; s < lvl[cur]; s++) place(box(thick + .01, thick + .03, .04, gold), 0, 0, -w.len * (.35 + s * .3));
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
  cur = i; slotGun[slotOf(i)] = i; reloading = 0; cd = .2; buildGun(); renderHotbar(); beep(600, .05);
}
const dry = () => beep(150, .05, 'square', .08);
function reload() { const w = WEAPONS[cur]; if (w.melee || reloading > 0 || ammo[cur] === w.mag) return; if (!reserve[cur]) { dry(); return; } reloading = w.reload; beep(300, .08); }
buildGun();

const parts = [], pGeo = new THREE.BoxGeometry(.08, .08, .08), pMats = {};
function burst(p, color, n) {
  pMats[color] ??= new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(pGeo, pMats[color]); m.position.copy(p); scene.add(m);
    parts.push({ m, v: new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 4, (Math.random() - .5) * 4), life: .6 });
  }
}
