// one hotbar slot per category
const CATS = [['primary', 'PRIMARY'], ['backup', 'BACKUP'], ['melee', 'MELEE'], ['special', 'SPECIAL'], ['sniper', 'SNIPER'], ['premium', 'PREMIUM']];
const CAT_I = Object.fromEntries(CATS.map(([k], i) => [k, i]));
// weapon stats (ids are used in saves, never rename them)
const BASE = [
  { id: 'voxel', hold: 'pistol', name: 'Voxel Gun', cat: 'backup', start: true, free: true, mob: 70, dmg: 20, rate: .26, mag: 12, reload: 1.0, pellets: 1, spread: 0, auto: false, color: 0x444444, len: .3 },
  { id: 'hitman', rar: 'rare', hold: 'pistol', name: 'Hitman', cat: 'backup', unlock: 3, price: 60, mob: 70, zoom: 2, quiet: true, dmg: 20, rate: .2, mag: 18, reload: 1.1, pellets: 1, spread: 0, auto: false, color: 0x2c2c30, len: .4 },
  { id: 'heatray', rar: 'rare', hold: 'rifle', name: 'Heat Ray Rifle', cat: 'special', unlock: 4, price: 100, mob: 60, beam: true, dmg: 6, rate: .05, range: 30, mag: 100, reload: 2.0, pellets: 1, spread: 0, auto: true, color: 0xb5652b, len: .7 },
  { id: 'shotgun', hold: 'rifle', name: 'Shotgun', cat: 'primary', start: true, mob: 60, action: 'PUMP ACTION', dmg: 10, rate: .75, mag: 6, reload: 1.6, pellets: 9, spread: .07, auto: false, color: 0x6b4a2b, len: .6 },
  { id: 'ar', hold: 'rifle', name: 'Assault Rifle', cat: 'primary', start: true, mob: 60, dmg: 12, rate: .09, mag: 30, reload: 1.4, pellets: 1, spread: .006, auto: true, color: 0x2f3b2f, len: .55 },
  { id: 'sniper', hold: 'rifle', name: 'Sniper Rifle', cat: 'sniper', start: true, mob: 55, action: 'BOLT ACTION', zoom: 5, dmg: 80, rate: 1.1, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x1a1a1a, len: .9, scope: true },
  { id: 'eradicator', rar: 'legend', hold: 'heavy', name: 'Eradicator', cat: 'primary', unlock: 12, price: 450, mob: 55, dmg: 9, rate: .05, mag: 120, reload: 2.6, pellets: 1, spread: .012, auto: true, color: 0x777777, len: .7 },
  { id: 'knife', hold: 'melee', name: 'Combat Knife', cat: 'melee', start: true, free: true, inf: true, melee: true, mob: 80, dmg: 35, rate: .4, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xd8dde3, len: .3, model: 'knife' },
  { id: 'flame', hold: 'rifle', name: 'Flamethrower', cat: 'special', start: true, mob: 60, flame: true, dmg: 5, rate: .06, range: 7, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0x555555, len: .5, model: 'flame' },
  { id: 'rocket', rar: 'rare', hold: 'shoulder', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, mob: 55, rocket: true, dmg: 150, rate: 1.1, mag: 1, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, model: 'rocket' },
  { id: 'flare', hold: 'pistol', name: 'Flare Gun', cat: 'premium', start: true, mob: 65, flare: true, dmg: 65, burn: 3, burnT: 3, rate: .4, mag: 1, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc8402a, len: .4, model: 'flare' },
  { id: 'thrasher', rar: 'rare', hold: 'rifle', name: 'Thrasher', cat: 'primary', unlock: 2, price: 50, mob: 60, zoom: 3, dmg: 12, rate: .08, mag: 35, reload: 1.5, pellets: 1, spread: .006, auto: true, color: 0x3c3c44, len: .6 },
  { id: 'semisniper', rar: 'rare', hold: 'rifle', name: 'Semi Auto Sniper Rifle', cat: 'sniper', unlock: 4, price: 100, mob: 55, zoom: 4, dmg: 60, rate: 1 / 1.8, mag: 10, reload: 1.8, pellets: 1, spread: 0, auto: false, color: 0x3e3f44, len: .9, scope: true },
  { id: 'herosword', rar: 'rare', hold: 'melee', name: 'Hero Sword', cat: 'melee', unlock: 5, price: 110, inf: true, melee: true, tilt: 1.1, mob: 75, dmg: 65, rate: .6, range: 3.2, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xc8873a, len: .4, model: 'herosword' },
  { id: 'shockbeam', rar: 'rare', hold: 'rifle', name: 'Shock Beam', cat: 'special', unlock: 8, price: 180, mob: 60, beam: true, shock: true, dmg: 9, rate: 1 / 15, range: 28, mag: 100, reload: 2.0, pellets: 1, spread: 0, auto: true, color: 0x2f4a66, len: .7 },
  { id: 'tigerbite', rar: 'epic', hold: 'rifle', name: 'Tigerbite', cat: 'sniper', unlock: 10, price: 300, mob: 55, zoom: 5, dmg: 110, rate: 1, mag: 6, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0xe07a1f, len: .9, scope: true },
  { id: 'trex', rar: 'epic', hold: 'rifle', name: 'T. REX', cat: 'primary', unlock: 14, price: 400, mob: 60, action: 'PUMP ACTION', dmg: 20, rate: 1 / 1.6, mag: 6, reload: 1.6, pellets: 6, spread: .06, auto: false, color: 0x4f6b34, len: .6 },
  { id: 'starsmasher', rar: 'legend', hold: 'rifle', name: 'Starsmasher', cat: 'primary', unlock: 30, price: 1150, mob: 60, zoom: 3, reticle: '255,215,90', starFx: true, dmg: 20, rate: .1, mag: 30, reload: 1.6, pellets: 1, spread: .005, auto: true, color: 0x24305a, len: .6 },
  { id: 'blazesaber', rar: 'legend', hold: 'melee', name: 'Blazesaber', cat: 'melee', unlock: 20, price: 750, inf: true, melee: true, tilt: 1.1, swing: 'saber', mob: 85, dmg: 60, rate: .55, range: 3.2, burn: 3, burnT: 2.5, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xff6a1a, len: .4, model: 'blazesaber' },
  { id: 'windsaber', rar: 'mythic', hold: 'melee', name: 'Windsaber', cat: 'melee', unlock: 40, price: 2000, inf: true, melee: true, tilt: 1.1, swing: 'saber', mob: 100, jump: [.25, .35, .45], dmg: 70, rate: .5, range: 3.4, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xe8f6ff, len: .4, model: 'windsaber' },
  { id: 'frostwand', rar: 'epic', hold: 'melee', name: 'Frost Wand', cat: 'special', unlock: 16, price: 460, mob: 65, beam: true, frost: true, wand: true, pool: true, dmg: 9, rate: 1 / 15, range: 26, mag: 240, reload: 3, pellets: 1, spread: 0, auto: true, color: 0x9fe8ff, len: .5 },
  { id: 'warhammer', rar: 'epic', hold: 'melee', name: 'War Hammer', cat: 'melee', unlock: 17, price: 490, inf: true, melee: true, tilt: 1.1, swing: 'hammer', hit: 'smash', knock: 1.5, mob: 65, dmg: 95, rate: .95, range: 3, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0x6a6e78, len: .4, model: 'warhammer' },
  { id: 'executioner', rar: 'epic', hold: 'pistol', name: 'Executioner', cat: 'backup', unlock: 14, price: 400, mob: 70, zoom: 4, reticle: '212,123,255', laser: true, dmg: 85, rate: 1 / 1.8, mag: 10, reload: 1.4, pellets: 1, spread: 0, auto: false, color: 0x5b3b8a, len: .4 },
  { id: 'crossbow', rar: 'rare', hold: 'rifle', name: 'Crossbow', cat: 'sniper', unlock: 7, price: 175, mob: 60, zoom: 3, scope: true, quiet: true, bow: true, headMul: 2.4, dmg: 85, rate: 1, mag: 1, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0x6b4a2b, len: .8 },
  { id: 'grenade', rar: 'epic', hold: 'rifle', name: 'Grenade Bouncer', cat: 'premium', unlock: 12, price: 350, mob: 60, grenade: true, dmg: 90, rate: .75, mag: 4, reload: 2.4, pellets: 1, spread: 0, auto: false, color: 0x3f7a3a, len: .7 },
];
const mobMul = w => 1 + ((w.mob ?? 60) - 60) / 100; // run speed multiplier from mobility
const autoFire = w => !!w.auto || w.rate < .25; // fast guns fire while the trigger is held
const W_ID = Object.fromEntries(BASE.map((w, i) => [w.id, i]));
const gi = id => W_ID[id];
const jumpOf = i => BASE[i].jump?.[lvl[i]] ?? 0; // extra jump height (Windsaber)
// star upgrades: worth buying, but higher-level guns still win
const lvl = BASE.map(() => 0); // 0 = ★, 1 = ★★, 2 = ★★★
const WEAPONS = BASE.map(w => ({ ...w }));
const STAR_DPS = b => b.rate < .15 ? .1 : b.rate < .5 ? .12 : .15, STAR_MAG = .2, STAR_RELOAD = .1, STAR_FAST = .15;
const magAt = (b, L) => b.mag === 1 ? 1 : Math.round(b.mag * (1 + STAR_MAG * L));
// a gun's stats at a star level
const statsAt = (i, L) => {
  const b = BASE[i], k = 1 + STAR_DPS(b) * L, fast = b.rate < STAR_FAST;
  return { ...b, dmg: fast ? b.dmg : Math.max(b.dmg + L, Math.round(b.dmg * k)), rate: fast ? +(b.rate / k).toFixed(4) : b.rate, mag: magAt(b, L), reload: +(b.reload * (1 - STAR_RELOAD * L)).toFixed(2) };
};
function applyLvl(i) { const s = statsAt(i, lvl[i]); Object.assign(WEAPONS[i], { dmg: s.dmg, rate: s.rate, mag: s.mag, reload: s.reload }); }
const upgradable = i => !BASE[i].start;
const stars = i => upgradable(i) ? starRow(lvl[i] + 1, lvl[i] + 1, 3) : '';
let cur = gi('voxel'), cd = 0, reloading = 0, kick = 0, aiming = false, adsT = 0;
// camera recoil per gun
const RECOIL = {
  voxel: { up: 1.4, side: .3, back: 1 }, hitman: { up: 1.1, side: .25, back: 1 }, executioner: { up: 1.8, side: .3, back: .9 }, flare: { up: 2, side: .35, back: .8 },
  ar: { up: .55, side: .25, back: 1 }, thrasher: { up: .5, side: .22, back: 1 }, eradicator: { up: .25, side: .2, back: 1.2 },
  shotgun: { up: 2.8, side: .5, back: .6 }, trex: { up: 3.2, side: .55, back: .55 }, starsmasher: { up: .6, side: .22, back: 1 }, rocket: { up: 2.6, side: .35, back: .5 },
  sniper: { up: 1.8, side: .2, back: .28 }, semisniper: { up: 1.3, side: .18, back: .4 }, tigerbite: { up: 1.9, side: .2, back: .32 }, crossbow: { up: 1.2, side: .15, back: .5 }, grenade: { up: 2.2, side: .35, back: .6 },
  heatray: { up: .05, side: .06, back: 2 }, shockbeam: { up: .06, side: .08, back: 2 }, frostwand: { up: .05, side: .06, back: 2 }, flame: { up: .04, side: .07, back: 2 },
};
const ADS_SOFT = .4, REC_RISE = 50, REC_BACK = 8, REC_MAX = 4;
const rec = { tp: 0, ty: 0, p: 0, y: 0 };
const ammo = WEAPONS.map(w => w.mag);
const resMax = i => BASE[i].inf ? Infinity : BASE[i].pool ? 0 : WEAPONS[i].mag * 4; // pool guns: no spare, the mag is all you get
const reserve = WEAPONS.map(w => w.inf ? Infinity : 0);
const owned = WEAPONS.map(w => !!w.free);
const slotOf = i => CAT_I[BASE[i].cat];
const slotGun = CATS.map(() => -1);
function resetSlots() { slotGun.fill(-1); BASE.forEach((w, i) => { if (w.free) slotGun[slotOf(i)] = i; }); }
resetSlots();
const hasGun = i => !!BASE[i].start || !!prof.guns[BASE[i].id];
function loadoutGun(cat) { // loadout gun, or the starter
  const i = gi(prof.loadout[cat]);
  return i !== undefined && BASE[i].cat === cat && hasGun(i) ? i : BASE.findIndex(w => w.cat === cat && w.start);
}

function renderHotbar() {
  $('hotbar').innerHTML = CATS.map(([, label], s) => {
    const i = slotGun[s], key = nice(binds['slot' + (s + 1)][0] || binds['slot' + (s + 1)][1]);
    return `<div class="slot ${i === cur ? 'on' : ''} ${i < 0 ? 'empty' : ''}"><span class="k">${key === '-' ? '' : key}</span>` +
      `<span class="s">${i >= 0 ? stars(i) : ''}</span><img src="${i >= 0 ? SPRITES[i] : SPRITES[0]}"><span class="c">${label}</span></div>`;
  }).join('');
}

const vm = new THREE.Group(); camera.add(vm); vm.position.set(.32, -.3, -.55);
const FLASH_SPR = new THREE.SpriteMaterial({ depthWrite: false, fog: false, blending: THREE.AdditiveBlending, map: (() => { // muzzle flash: a hot core and four spikes
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5), r = Math.max(dx, dy), spike = Math.min(dx, dy) < 1 ? 8 : Math.abs(dx - dy) < 1 ? 4.5 : 2.5;
    if (r > spike) continue;
    g.fillStyle = r < 2 ? '#fffbe0' : r < 4 ? '#ffd24a' : '#ff8a1a'; g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
})() });
function makeFlash(size = .1, mat = FLASH_SPR) {
  const s = new THREE.Sprite(mat); s.scale.setScalar(size);
  s.onBeforeRender = () => { mat.rotation = Math.random() * Math.PI * 2; s.scale.setScalar(size * (.75 + Math.random() * .5)); };
  return s;
}
const flashMesh = makeFlash(.12, Object.assign(FLASH_SPR.clone(), { depthTest: false })); // yours draws over the barrel, which would hide it
flashMesh.renderOrder = 5;
const flashLight = new THREE.PointLight(0xffcc66, 0, 8);
let gunSpin = null, gunSpinV = 0;
let gunRound = null;
let gunHolo = null;
let gunMag = null, gunArmL = null, gunHand = null; // parts a reload moves
const vmRl = {};
// switching guns (lighter guns come up faster)
const drawT = w => Math.min(.4, Math.max(.2, .2 + (80 - (w.mob ?? 60)) * .008)), SWAP_DOWN = .35;
let gunShown = -1, swapOff = 0, swapDown = false, swapLen = .3;
// reload animations, as keyframes from 0 (start) to 1 (done)
const POSE_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'mx', 'my', 'mz', 'ay', 'az', 'hand'];
// box magazine swap
const magSwap = (roll, drop, lift = .2) => { const h = { rz: roll, rx: lift, y: .06, x: -.07 }; return [[0, {}], [.14, h], [.3, { ...h, my: -drop * .4, ay: -.15 }], [.42, { ...h, my: -drop, ay: -.42 }], [.56, { ...h, my: -drop * .35, ay: -.18 }], [.7, { ...h, y: .07 }], [.74, { ...h, y: .085 }], [.86, { rx: .05, z: .035 }], [.93, { z: -.01 }], [1, {}]]; };
// rounds pushed in one at a time
const dips = (h, n, t0, t1, d = .025) => Array.from({ length: n }, (_, i) => { const t = t0 + (t1 - t0) * i / n, w = (t1 - t0) / n; return [[t + w * .45, { ...h, y: (h.y || 0) - d, ay: -.05 }], [t + w * .9, h]]; }).flat();
const RELOAD_SWAP = { voxel: [.3, .36], hitman: [.3, .36], ar: [.3, .42], thrasher: [.3, .42], semisniper: [.3, .42], eradicator: [.36, .48], heatray: [.3, .42], flame: [.34, .46], executioner: [.3, .36], shockbeam: [.3, .42], tigerbite: [.3, .42], starsmasher: [.3, .42] };
const RELOAD_ANIM = (() => {
  const pistol = roll => { const h = { rx: .45, rz: roll, y: .07, x: -.06 }; return [[0, {}], [.16, h], [.3, { ...h, my: -.26 }], [.31, { ...h, my: -.45 }], [.46, { ...h, my: -.11, hand: 1 }], [.58, { ...h, my: -.09, hand: 1 }], [.66, { ...h, y: .03, hand: 1 }], [.72, { ...h, y: .045, hand: .7 }], [.8, { ...h, y: .02 }], [.86, { rx: .08, z: .04 }], [.93, { z: -.012 }], [1, {}]]; };
  const sg = { rz: -.5, rx: .28, y: -.04 }, bolt = { rz: .3, rx: .1, y: -.03, mz: .09, my: .02 }, box = { rz: -.4, ry: -.22, y: -.05 }, cell = { rx: .38, rz: -.25, y: .02 }, tank = { rz: -.5, rx: .18, y: -.02 };
  return {
    voxel: pistol(-.3), hitman: pistol(-.4), executioner: pistol(-.35), tigerbite: magSwap(-.35, .38, .16), ar: magSwap(-.4, .34), thrasher: magSwap(-.5, .38, .24), starsmasher: magSwap(-.45, .4, .22), semisniper: magSwap(-.35, .38, .16),
    shotgun: [[0, {}], [.1, sg], ...dips(sg, 4, .14, .74), [.8, { rx: .06 }], [.87, { rx: .05, mz: .09, az: .09 }], [.95, { z: -.012 }], [1, {}]],
    trex: [[0, {}], [.1, sg], ...dips(sg, 4, .14, .74), [.8, { rx: .06 }], [.87, { rx: .05, mz: .09, az: .09 }], [.95, { z: -.012 }], [1, {}]],
    sniper: [[0, {}], [.1, { rz: .3, rx: .1, y: -.03 }], [.22, bolt], ...dips(bolt, 3, .3, .72, .02), [.78, bolt], [.88, { rz: .3, rx: .1, y: -.03, z: -.012 }], [1, {}]],
    eradicator: [[0, {}], [.15, box], [.36, { ...box, my: -.36, ay: -.3 }], [.48, { ...box, my: -.48, ay: -.42 }], [.6, { ...box, my: -.36, ay: -.3 }], [.74, { ...box, y: -.04 }], [.78, { ...box, y: -.015 }], [.9, { y: -.02 }], [1, {}]],
    heatray: [[0, {}], [.14, cell], [.3, { ...cell, my: -.3, ay: -.3 }], [.42, { ...cell, my: -.42, ay: -.42 }], [.54, { ...cell, my: -.3, ay: -.3 }], [.68, cell], [.72, { ...cell, y: .04 }], [.86, { rx: .05, z: .02 }], [.93, { z: -.01 }], [1, {}]],
    shockbeam: [[0, {}], [.14, cell], [.3, { ...cell, my: -.3, ay: -.3 }], [.42, { ...cell, my: -.42, ay: -.42 }], [.54, { ...cell, my: -.3, ay: -.3 }], [.68, cell], [.72, { ...cell, y: .04 }], [.86, { rx: .05, z: .02 }], [.93, { z: -.01 }], [1, {}]],
    flame: [[0, {}], [.14, tank], [.34, { ...tank, my: -.38, ay: -.3 }], [.46, { ...tank, my: -.5, ay: -.42 }], [.58, { ...tank, my: -.38, ay: -.3 }], [.74, tank], [.8, { ...tank, rz: -.58 }], [.9, { rx: .05 }], [1, {}]],
    crossbow: [[0, {}], [.14, { rx: .4, y: -.06, z: .05 }], [.4, { rx: .46, y: -.08, z: .07 }], [.7, { rx: .4, y: -.06, z: .05 }], [.86, { rx: .04 }], [1, {}]],
    grenade: [[0, {}], [.1, { ...sg, mx: .08 }], ...dips({ ...sg, mx: .08 }, 4, .14, .74), [.8, { rx: .06 }], [.9, { z: -.012 }], [1, {}]],
    rocket: [[0, {}], [.14, { rx: -.32, y: -.1, z: .05 }], [.85, { rx: -.32, y: -.1, z: .05 }], [.94, { rx: .04 }], [1, {}]],
    flare: [[0, {}], [.18, { rx: -.75, y: .03 }], [.4, { rx: -.75, y: .03, my: -.4 }], [.52, { rx: -.75, y: .03, my: -.12, hand: 1 }], [.64, { rx: -.75, y: .03, hand: 1 }], [.72, { rx: -.75, y: .03 }], [.84, { rx: .12 }], [1, {}]],
  };
})();
function reloadPose(id, k) {
  const F = RELOAD_ANIM[id]; if (!F) return null;
  let i = 1; while (i < F.length - 1 && k > F[i][0]) i++;
  const [t0, a] = F[i - 1], [t1, b] = F[i], o = {};
  let u = t1 > t0 ? Math.min(1, Math.max(0, (k - t0) / (t1 - t0))) : 1; u = u * u * (3 - 2 * u);
  for (const c of POSE_KEYS) o[c] = (a[c] || 0) + ((b[c] || 0) - (a[c] || 0)) * u;
  return o;
}
// drop the old mag and show the new one partway through a reload
function reloadSwap(st, id, k, part, sc) {
  const S = RELOAD_SWAP[id], was = st.rk ?? -1; st.rk = k;
  if (!part || !S) return;
  if (k >= S[0] && was < S[0] && was >= 0) dropPart(part, sc);
  part.visible = !(k >= S[0] && k < S[1]);
}
// dropped mags: fall, lie on the ground a moment, shrink away
const drops = [], DROP_LIE = 2.5, _dp = new THREE.Vector3(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3();
function dropPart(part, sc, floor) {
  part.updateWorldMatrix(true, false);
  const c = part.clone(true); c.visible = true;
  part.matrixWorld.decompose(c.position, c.quaternion, c.scale);
  sc.add(c);
  const right = _dp.set(1, 0, 0).applyQuaternion(c.quaternion);
  drops.push({ m: c, sc, s: c.scale.x, v: new THREE.Vector3(right.x * .6, -.5, right.z * .6), spin: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 4 - 2, Math.random() * 6 - 3),
    floor: floor ?? (sc === scene ? groundAt(c.position.x, c.position.z, .05, c.position.y) : 0), lie: 0 });
}
function dropTick(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i], m = d.m;
    if (d.lie > 0) {
      if ((d.lie += dt) > DROP_LIE) { const k = 1 - (d.lie - DROP_LIE) / .3; if (k <= 0) { d.sc.remove(m); drops.splice(i, 1); continue; } m.scale.setScalar(d.s * k); }
      continue;
    }
    d.v.y -= 18 * dt; m.position.addScaledVector(d.v, dt);
    m.rotation.x += d.spin.x * dt; m.rotation.y += d.spin.y * dt; m.rotation.z += d.spin.z * dt;
    if (m.position.y <= d.floor + .02) { m.position.y = d.floor + .02; d.lie = 1e-6; }
  }
}
function clearDrops(sc) { for (let i = drops.length - 1; i >= 0; i--) if (!sc || drops[i].sc === sc) { drops[i].sc.remove(drops[i].m); drops.splice(i, 1); } }
// middle of a gun part, for hands that hold it
function partMid(part) {
  if (part.userData.mid) return part.userData.mid;
  const b = new THREE.Box3();
  for (const m of part.children) if (m.geometry) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); }
  part.userData.half = b.isEmpty() ? [0, 0, 0] : b.getSize(new THREE.Vector3()).multiplyScalar(.5).toArray();
  return part.userData.mid = b.isEmpty() ? new THREE.Vector3() : b.getCenter(new THREE.Vector3());
}
const partBounds = part => { const m = partMid(part); return { c: [part.position.x + m.x, part.position.y + m.y, part.position.z + m.z], h: part.userData.half }; };

// voxel models: boxes filled into a pixel grid, edges drawn black
const GPX = .02, GUN_SCALE = { knife: .75, herosword: .75, blazesaber: .75, windsaber: .75, warhammer: .65, frostwand: .6, grenade: .85 }, GUN_DARK = 0x4a4a52, GUN_STEEL = 0x62626a;
const gunPal = [null], gunPalI = {};
function palIdx(col, glow = false) {
  const k = (glow ? 'g' : '') + col;
  if (gunPalI[k] === undefined) gunPalI[k] = gunPal.push({ c: new THREE.Color(col), glow }) - 1;
  return gunPalI[k];
}
const VOX_FACES = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
];
const VOX_RING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
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
// turn a model's pixels into geometry
function voxelGeos(pieces, px) {
  const { lo, NX, NY, NZ, cell, at } = voxelGrid(pieces);
  const out = { lit: [[], [], []], glow: [[], [], []] };
  const CORNER = [0, 1, 2, 0, 2, 3], ca = [0, 1, 1, 0], cb = [0, 0, 1, 1];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const m = cell[(z * NY + y) * NX + x]; if (!m) continue;
    const P = gunPal[m];
    for (let f = 0; f < 6; f++) {
      const [n, a, b] = VOX_FACES[f];
      if (at(x + n[0], y + n[1], z + n[2])) continue;
      // black outline wherever the surface turns an outside corner
      let black = false;
      for (let e = 0; e < 8 && !black && !P.glow; e++) {
        const sa = VOX_RING[e][0], sb = VOX_RING[e][1];
        if (!at(x + sa * a[0] + sb * b[0], y + sa * a[1] + sb * b[1], z + sa * a[2] + sb * b[2])) black = true;
      }
      let r = 0, g = 0, bl = 0;
      if (!black) {
        const h = Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791 ^ (f + 1) * 2654435761, 1597334677) >>> 0;
        const sh = P.glow ? 1 : .82 + (h % 1000) / 1000 * .18;
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

// gun models (grip and fore are where the hands go)
const GUN_MODELS = {
  voxel({ p, mat, dark, glow, sub, at }) {
    const teal = glow(0x2ee6d6), grip = mat(0x3a3a3e);
    p(4, 4, 16, mat(0x6a6a6a), 0, 2, -8); p(4, 1, 16, mat(0x8e8e8e), 0, 3.5, -8); // slide and its lighter top
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(2, 2, 1, teal, 0, 2, -15.5); // emitter in the muzzle
    for (const z of [-4, -7, -10]) p(4, 2, 2, teal, 0, 2, z); // teal cubes set into the sides
    p(2, 1, 1, dark, 0, 4.5, -1); p(1, 1, 1, dark, 0, 4.5, -15); // sights
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, grip, 0, -3.5, -3); p(4, 3, 4, grip, 0, -6.5, -2); // short grip under the back of the slide
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, teal, 0, -5, -2); // its power cell: the floor plate, and the glowing cell up inside the grip
    return { muzzle: [2, -17], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-11, -14], band: [6, 8, 1], mag };
  },
  shotgun({ p, mat, dark, sub, at }) {
    const wood = mat(0x7a5232), dwood = mat(0x4e3420), steel = mat(0x4a4a4e);
    p(4, 5, 9, wood, 0, -.5, 4.5); p(4, 6, 1, dwood, 0, -1, 9.5); // stock and butt pad
    p(6, 5, 11, steel, 0, .5, -5.5); // receiver
    p(4, 4, 26, mat(GUN_STEEL), 0, 2, -24); p(4, 3, 18, steel, 0, -1.5, -20); // barrel, mag tube under it
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 4, 10, wood, 0, -1, -21); for (const z of [-17.5, -20.5, -23.5]) mg(6, 4, 1, dwood, 0, -1, z); // pump and its grooves (racked at the end of a reload)
    p(1, 1, 1, mat(0xdddddd), 0, 4.5, -36.5); p(4, 4, 1, dark, 0, 2, -37.5); // bead sight, dark muzzle end
    p(4, 3, 3, wood, 0, -3.5, -1.5); p(4, 3, 3, wood, 0, -6.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4.5); // guard and trigger
    return { muzzle: [2, -38], grip: [4, 6, 4, 0, -5, -1], fore: [6, 4, 10, 0, -1, -21], bands: [-3, -8], band: [8, 8, .5], mag };
  },
  ar({ p, mat, dark, sub, at }) {
    const body = mat(0x5a705a), dk = mat(0x465846);
    p(4, 6, 8, dk, 0, 0, 4); p(4, 8, 1, dark, 0, -1, 8.5); // stock, butt
    p(6, 6, 15, body, 0, 0, -7.5); // receiver
    p(4, 1, 13, dark, 0, 3.5, -7.5); p(2, 2, 2, dark, 0, 5, -2); // top rail, rear sight
    p(6, 6, 11, dk, 0, 0, -20.5); for (const z of [-18, -21, -24]) p(6, 2, 2, mat(0x2a2a2e), 0, 0, z); // handguard and its vents
    p(4, 4, 8, mat(GUN_STEEL), 0, 1, -30); p(4, 4, 3, dark, 0, 1, -35.5); p(2, 3, 1, dark, 0, 4.5, -25.5); // barrel, muzzle brake, front sight
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 4, dark, 0, -5, -10); mg(4, 3, 4, dark, 0, -8.5, -11); // mag, curving forward
    p(4, 4, 4, dk, 0, -5, -2); p(4, 3, 4, dk, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -37], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 11, 0, 0, -20.5], bands: [-5, -11], band: [8, 8, 0], mag };
  },
  sniper({ p, mat, dark, glow, sub, at }) {
    const wood = mat(0x5a3d26), act = mat(0x44444c), silver = mat(0x9a9a9a);
    p(4, 6, 10, wood, 0, -1, 5); p(4, 8, 1, mat(0x2e1f14), 0, -1, 10.5); p(4, 2, 6, wood, 0, 3, 4); // stock, butt, cheek rest
    p(4, 4, 18, act, 0, 0, -9); p(4, 3, 10, wood, 0, -3.5, -16); // action, forend
    p(4, 4, 28, mat(GUN_STEEL), 0, .5, -32); p(4, 4, 6, dark, 0, .5, -49); // barrel, suppressor
    p(4, 4, 16, mat(0x2a2a2e), 0, 6, -10); p(6, 6, 2, dark, 0, 6, -1); p(6, 6, 2, dark, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0x66ccff), 0, 6, -19.5); // lens
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 2, 2, silver, 4, 1, -3); mg(3, 3, 3, silver, 6.5, 1.5, -3.5); // bolt handle and knob (worked back and forward to reload)
    p(4, 5, 4, wood, 0, -4.5, -2); p(4, 3, 4, wood, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -6); p(1, 3, 1, dark, 0, -3.5, -8.5); p(1, 2, 1, silver, 0, -3, -5.5); // guard and trigger
    return { muzzle: [.5, -52], grip: [4, 8, 5, 0, -6, -1.5], fore: [4, 3, 10, 0, -3.5, -16], bands: [-6, -12], band: [6, 6, 0], mag };
  },
  eradicator({ p, mat, dark, sub, at }) {
    const steel = mat(0x808084), dk = mat(0x48484e), bar = mat(0x66666b), gold = mat(0xc9a43a);
    p(10, 10, 14, steel, 0, 0, -5); p(12, 12, 2, dk, 0, 0, 3); // housing, back plate
    p(2, 2, 10, dk, 0, 8, -5); p(2, 2, 2, dk, 0, 6, -9); p(2, 2, 2, dk, 0, 6, -1); // carry handle
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 6, 8, mat(0x5a5a2a), -8, -2, -5); mg(4, 2, 4, gold, -5, 2, -5); // ammo box and the belt feeding in
    const spin = sub(0, 0, -23, [.5, .5, 0]), sp = at(spin);
    for (const [x, y] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { sp(3, 3, 22, bar, x, y, 0); sp(1, 1, 1, mat(0x111111), x + .5, y + .5, -10.5); } // barrels with dark bores
    sp(2, 2, 18, dk, 0, 0, 1); for (const z of [-6, 6]) sp(9, 9, 2, dk, 0, 0, z); // spindle and barrel rings
    p(4, 2, 6, dk, 0, 3, 7); p(4, 2, 6, dk, 0, -5, 7); p(4, 10, 3, dk, 0, -1, 11.5); // D-shaped spade handle out the back
    p(1, 2, 1, mat(0x999999), 0, -1, 9.5); // trigger inside it
    p(4, 8, 4, dk, 0, -9, -8); // front handle
    return { muzzle: [0, -35], grip: [4, 10, 3, 0, -1, 11.5], fore: [2, 4, 10, 0, 7, -5], bands: [-2, -5], band: [12, 12, 0], spin, mag }; // left hand on the carry handle
  },
  knife({ p, mat }) {
    const brown = mat(0x5a3a1a), dbrown = mat(0x3a2412), steel = mat(0x8a8f96), blade = mat(0xc4cad2);
    p(4, 4, 8, brown, 0, 1, 0); for (const z of [-2.5, 2.5]) p(4, 4, 1, dbrown, 0, 1, z); // handle and its wraps, a pixel up so it lines up with the blade
    p(6, 6, 2, steel, 0, 1, 5); // pommel
    p(4, 10, 2, steel, 0, 1, -5); // crossguard, running up and down like the blade
    p(2, 5, 14, blade, 0, 1.5, -13); p(2, 2, 13, mat(0xf2f5f8), 0, -1, -12.5); // blade, bright sharp edge along the bottom
    p(2, 1, 10, mat(0x9aa3ad), 0, 1.5, -12); // fuller groove
    p(2, 4, 2, blade, 0, 2, -21); p(2, 2, 2, blade, 0, 3, -23); // tip
    return { muzzle: [0, -24], grip: [6, 6, 10, 0, 1, 1], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  flame({ p, mat, dark, glow, sub, at }) {
    const grey = mat(0x66666a), dk = mat(0x404044), red = mat(0xc43030);
    p(6, 6, 14, grey, 0, 0, -6); p(4, 4, 2, dk, 0, 0, 2); // body, rear cap
    p(8, 8, 7, dk, 0, 0, -16.5); for (const z of [-14.5, -16.5, -18.5]) p(8, 8, 1, mat(0x161616), 0, 0, z); // heat shroud and its ribs
    p(4, 4, 7, dark, 0, 0, -23.5); // nozzle
    p(2, 2, 6, dark, 0, -3, -23); p(2, 2, 2, glow(0xffaa33), 0, -3, -27); // pilot pipe and its flame
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 6, 10, red, 0, -6, -8); for (const z of [-4.5, -10.5]) mg(8, 8, 1, dk, 0, -6, z); // fuel tank and straps
    mg(4, 4, 1, mat(0xc9a43a), 0, -6, -13.5); // tank cap
    p(4, 5, 4, dk, 0, -5.5, 1); p(4, 3, 4, dk, 0, -9.5, 2); // rear grip
    p(1, 1, 2, dark, 0, -6.5, -2); p(1, 2, 1, mat(0x999999), 0, -4, -1.5); // guard and trigger
    p(4, 7, 4, dk, 0, -7.5, -16); // front handle
    return { muzzle: [0, -28], grip: [4, 8, 5, 0, -7, 1.5], fore: [8, 15, 7, 0, -3.5, -16.5], bands: [-7, -1], band: [8, 8, 0], mag }; // fore: the front handle and the shroud above it
  },
  rocket({ p, mat, dark, glow, sub, at }) {
    const olive = mat(0x6f8253), dk = mat(0x45533a), hole = mat(0x101010);
    p(8, 8, 52, olive, 0, 0, 4); // tube
    p(8, 8, 3, dk, 0, 0, -20.5); p(10, 10, 3, dk, 0, 0, 26.5); p(10, 10, 2, dark, 0, 0, 30); // front ring, rear ring, exhaust
    p(6, 6, 1, hole, 0, 0, -21.5); p(6, 6, 1, hole, 0, 0, 30.5); // dark tube mouths
    for (const x of [-3.5, 3.5]) p(1, 4, 36, mat(0xc9a43a), x, 0, 4); // yellow warning stripes
    p(6, 2, 12, mat(0x2a2a2a), 0, -5, 18); // shoulder pad under the back
    p(4, 5, 4, dk, 0, -6.5, -6); p(4, 3, 4, dk, 0, -10.5, -5); // trigger grip
    p(1, 1, 4, dark, 0, -7.5, -10); p(1, 2, 1, mat(0x888888), 0, -5, -9.5); // guard and trigger
    p(4, 8, 4, dk, 0, -8, -16); // front grip
    const round = sub(0, 0, 0), r = at(round); // the loaded rocket, poking well out of the front
    r(6, 6, 6, mat(0xaa3333), 0, 0, -25); r(4, 4, 3, mat(0xcc4433), 0, 0, -29.5); r(2, 2, 2, mat(0xe86a50), 0, 0, -32);
    return { muzzle: [0, -33], grip: [4, 8, 5, 0, -8, -5.5], fore: [4, 8, 4, 0, -8, -16], bands: [7, 10], band: [10, 10, 0], round };
  },
  crossbow({ p, mat, dark, glow, sub, at }) {
    const wood = mat(0x6b4a2b), dk = mat(0x47301c), limb = mat(0x5c5c66), str = mat(0xe8e2d0);
    p(4, 6, 10, wood, 0, -1, 7); p(4, 8, 2, dk, 0, -1, 13); // stock and butt
    p(4, 4, 30, wood, 0, 0, -13); p(2, 1, 22, dk, 0, 2.5, -15); // rail and its groove
    p(20, 2, 2, limb, 0, 1, -27); for (const s of [-1, 1]) { p(2, 2, 4, limb, s * 11, 1, -25); p(2, 2, 2, limb, s * 13, 1, -22); } // bow, its tips swept back
    for (let k = 0; k < 12; k++) for (const s of [-1, 1]) p(1, 1, 2, str, s * (12.5 - k), 2.5, Math.round(-21 + k * 1.45)); // string
    p(6, 2, 2, dark, 0, -3, -27); // stirrup
    p(2, 2, 10, mat(0x2a2a2e), 0, 7, -12); p(2, 2, 1, glow(0x66ccff), 0, 7, -17.5); p(1, 5, 2, dark, 1.5, 4.5, -10); // little scope on a mount
    const round = sub(0, 0, 0), r = at(round); // the loaded bolt
    r(2, 1, 20, mat(0xc9a46a), 0, 3.5, -14); r(2, 2, 2, mat(GUN_STEEL), 0, 4, -25); r(4, 1, 2, mat(0xc8402a), 0, 4.5, -5);
    p(4, 6, 4, wood, 0, -5, 0); p(4, 3, 4, wood, 0, -9.5, 1); // grip
    p(1, 1, 4, dark, .5, -6.5, -4); p(1, 3, 1, mat(0x888888), .5, -3.5, -3.5); // guard and trigger
    return { muzzle: [4, -27], grip: [4, 8, 5, 0, -6, 0], fore: [4, 4, 10, 0, -1, -17], bands: [-6, -12], band: [6, 6, 0], round };
  },

  grenade({ p, mat, dark, glow, sub, at }) {
    const green = mat(0x3f7a3a), dk = mat(0x2a3d28), yel = mat(0xffc933), hole = mat(0x101010);
    p(6, 6, 18, green, 0, 1, -19); for (const z of [-14, -24]) p(8, 8, 2, yel, 0, 1, z); // fat barrel and its bouncy stripes
    p(8, 8, 2, dk, 0, 1, -29); p(4, 4, 1, hole, 0, 1, -30.5); // muzzle
    const spin = sub(0, -1, -5), sp = at(spin); // the drum
    sp(10, 10, 10, dk, 0, 0, 0); sp(2, 1, 4, yel, 0, 5.5, 0); sp(1, 2, 4, yel, -5.5, 0, 0); sp(2, 1, 4, yel, 0, -5.5, 0);
    p(4, 6, 10, dk, 0, 0, 5); p(4, 8, 2, green, 0, 0, 11); // stock and butt
    p(4, 6, 4, dk, 0, -6, 4); p(4, 3, 4, dk, 0, -10.5, 5); // grip
    p(2, 1, 4, dark, 0, -9.5, 0); p(1, 3, 1, mat(0x888888), .5, -7.5, -1.5); // guard and trigger
    p(4, 7, 4, dk, 0, -5.5, -18); // front grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(1, 6, 6, mat(0x555a55), 5.5, -1, -5); // loading gate, swung open to reload
    return { muzzle: [1, -31], grip: [4, 8, 5, 0, -7, 4], fore: [4, 7, 4, 0, -5.5, -18], bands: [-17, -20], band: [8, 8, 1], spin, mag };
  },

  flare({ p, mat, dark, glow, sub, at }) {
    const red = mat(0xc8402a), grip = mat(0x3a3a3e);
    p(6, 6, 14, red, 0, 2, -9); p(6, 1, 14, mat(0xe8684a), 0, 4.5, -9); // fat barrel and its lighter top
    p(6, 6, 2, dark, 0, 2, -17); // dark muzzle
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 1, glow(0xffaa33), 0, 2, -17.5); // the flare inside it (gone once fired, back when it's reloaded)
    p(6, 8, 4, mat(0x3a3a3a), 0, 2, 0); p(2, 3, 2, dark, 0, 7.5, 2); // breech and hammer
    p(4, 4, 4, grip, 0, -4, 0); p(4, 3, 4, grip, 0, -7.5, 1); p(4, 2, 4, grip, 0, -10, 2); // grip, raked back in steps
    p(1, 1, 5, dark, 0, -4.5, -3.5); p(1, 3, 1, dark, 0, -2.5, -6.5); p(1, 2, 1, mat(0x888888), 0, -2, -3.5); // guard and trigger
    return { muzzle: [2, -18], grip: [4, 9, 5, 0, -6.5, .5], fore: null, bands: [-6, -11], band: [8, 8, 2], mag };
  },
  hitman({ p, mat, dark, glow, sub, at }) {
    const slide = mat(0x3a3a40), grip = mat(0x2e2e33), can = mat(0x26262b), ring = mat(0x45454c);
    p(4, 4, 14, slide, 0, 2, -7); p(4, 1, 14, mat(0x55555d), 0, 3.5, -7); // slide and its lighter top
    for (const z of [-1.5, -3.5]) p(4, 2, 1, dark, 0, 2.5, z); // grip serrations at the back of the slide
    p(4, 2, 12, dark, 0, -1, -6); // frame
    p(6, 6, 18, can, 0, 2, -23); for (const z of [-16.5, -23, -29.5]) p(6, 6, 1, ring, 0, 2, z); // suppressor and its rings
    p(2, 2, 1, mat(0x0c0c0c), 0, 2, -32.5); // its bore
    p(6, 1, 4, dark, 0, 4.5, -6); // holo sight: mount, then an open window framed by two posts and a hood
    for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 7, -6);
    p(6, 1, 2, dark, 0, 9.5, -6);
    p(1, 1, 1, glow(0xff3333), .5, 5.5, -4.5); // the emitter that throws the reticle
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, grip, 0, -3.5, -3); p(4, 3, 4, grip, 0, -6.5, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, mat(0x8a8a90), 0, -5, -2); // its magazine: the floor plate, and the steel body up inside the grip
    return { muzzle: [2, -34], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-11, -13], band: [6, 8, 1], holo: [7, -6], mag };
  },
  thrasher({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x3c3c44), dk = mat(0x2b2b31), acc = mat(0xe0632a), vent = mat(0x141418);
    p(4, 6, 9, dk, 0, 0, 4.5); p(4, 8, 1, dark, 0, -1, 9.5); p(4, 1, 7, acc, 0, .5, 4.5); // stock, butt, stripe
    p(6, 6, 16, body, 0, 0, -8); p(6, 1, 12, acc, 0, -.5, -8); // receiver and its stripe
    p(4, 1, 14, dark, 0, 3.5, -8); // top rail
    p(6, 1, 4, dark, 0, 4.5, -10); // holo sight: mount, two posts and a hood, open in the middle
    for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 7, -10);
    p(6, 1, 2, dark, 0, 9.5, -10);
    p(1, 1, 1, glow(0xff3333), .5, 5.5, -8.5); // the emitter that throws the reticle
    p(6, 6, 10, dk, 0, 0, -21); for (const z of [-18, -21, -24]) p(6, 2, 1, vent, 0, 0, z); // handguard and its vents
    p(4, 4, 6, mat(GUN_STEEL), 0, 1, -29); // barrel
    p(6, 6, 4, dk, 0, 1, -34); p(6, 2, 1, vent, 0, 1, -33.5); // muzzle brake and its port
    for (const y of [-1.5, 3.5]) p(4, 1, 2, dark, 0, y, -37); // its teeth
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, dark, 0, -7, -10.5); mg(4, 1, 5, acc, 0, -8.5, -10.5); // straight box mag with an orange band
    p(4, 4, 4, dk, 0, -5, -2); p(4, 3, 4, dk, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -38], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 10, 0, 0, -21], bands: [-3, -14], band: [8, 8, 0], holo: [7, -10], mag };
  },
  semisniper({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x3e3f44), tan = mat(0xb39a6b), dtan = mat(0x8a744c), vent = mat(0x1a1a1e);
    p(4, 6, 10, tan, 0, -1, 5); p(4, 8, 1, dark, 0, -1, 10.5); p(4, 2, 6, dtan, 0, 3, 4); // stock, butt pad, cheek riser
    p(6, 6, 16, body, 0, 0, -8); p(4, 1, 16, dark, 0, 3.5, -8); // receiver and top rail
    p(3, 3, 3, mat(0x9a9a9a), 4.5, 1, -4); // charging handle on the right
    p(4, 4, 16, mat(0x2a2a2e), 0, 6, -10); p(6, 6, 2, dark, 0, 6, -1); p(6, 6, 2, dark, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0x6bff9a), 0, 6, -19.5); // lens
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    p(6, 6, 12, tan, 0, 0, -22); for (const z of [-19, -22, -25]) p(6, 2, 1, vent, 0, 0, z); // handguard and its vents
    p(4, 4, 14, mat(GUN_STEEL), 0, 1, -35); // barrel
    p(6, 6, 4, body, 0, 1, -44); p(6, 2, 1, vent, 0, 1, -43.5); // muzzle brake and its port
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, dark, 0, -7, -11); mg(4, 1, 5, dtan, 0, -8.5, -11); // straight box mag with a tan band
    p(4, 4, 4, dtan, 0, -5, -2); p(4, 3, 4, dtan, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -46], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 12, 0, 0, -22], bands: [-6, -15], band: [8, 8, 0], mag };
  },
  // a magnifying glass on top focuses sunlight into the beam
  herosword({ p, mat, glow }) {
    const bronze = mat(0xc8873a), dbronze = mat(0x8a5a24), lbronze = mat(0xeab36a), wrap = mat(0x4a2c18), gem = glow(0x38d8ff);
    p(4, 4, 16, wrap, 0, 1, 4); for (const z of [-1.5, 2.5, 6.5, 10.5]) p(4, 4, 1, mat(0x2e1a0e), 0, 1, z); // long grip and its wraps
    p(6, 6, 4, dbronze, 0, 1, 14); p(8, 2, 2, gem, 0, 1, 14); // pommel, a gem showing on both sides
    p(4, 18, 3, bronze, 0, 1, -5.5); p(4, 2, 3, lbronze, 0, 11, -5.5); p(4, 2, 3, lbronze, 0, -9, -5.5); // crossguard and its bright tips
    p(6, 4, 4, dbronze, 0, 1, -5.5); p(8, 2, 2, gem, 0, 1, -5.5); // the setting in the middle, and its gem
    p(2, 6, 28, bronze, 0, 1, -21); p(2, 1, 28, lbronze, 0, 4.5, -21); p(2, 1, 28, lbronze, 0, -2.5, -21); // blade and its bright edges
    p(2, 2, 22, dbronze, 0, 1, -19); // fuller
    p(2, 4, 2, bronze, 0, 1, -36); p(2, 2, 2, lbronze, 0, 1, -38); // tip
    return { muzzle: [1, -39], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  trex({ p, mat, dark, glow, sub, at }) {
    const scale = mat(0x4f6b34), dscale = mat(0x3a5226), belly = mat(0xc9b98a), bone = mat(0xece3c8), steel = mat(0x4a4a4e);
    p(4, 6, 9, scale, 0, -.5, 4.5); p(4, 7, 1, dark, 0, -1, 9.5); for (const z of [2, 5, 8]) p(4, 1, 1, dscale, 0, 1.5, z); // stock, butt pad, scale stripes
    p(6, 6, 12, scale, 0, .5, -6); p(6, 1, 12, belly, 0, -1.5, -6); // receiver and its pale belly
    for (const z of [-2, -6, -10]) p(4, 3, 3, bone, 0, 5, z); // back plates
    p(4, 4, 24, mat(GUN_STEEL), 0, 2, -24); p(4, 3, 16, steel, 0, -1.5, -20); // barrel, mag tube under it
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 4, 10, dscale, 0, -1, -21); for (const z of [-17.5, -20.5, -23.5]) mg(6, 4, 1, dark, 0, -1, z); // pump and its grooves
    p(6, 4, 4, scale, 0, 2.5, -37); for (const z of [-38, -36]) p(6, 1, 1, bone, 0, 2.5, z); // a jaw round the muzzle, with teeth
    p(6, 1, 1, glow(0xffcc33), 0, 3.5, -36); // and an eye
    p(4, 3, 3, dscale, 0, -3.5, -1.5); p(4, 3, 3, dscale, 0, -6.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4.5); // guard and trigger
    return { muzzle: [2, -40], grip: [4, 6, 4, 0, -5, -1], fore: [6, 4, 10, 0, -1, -21], bands: [-3, -8], band: [8, 8, .5], mag };
  },
  starsmasher({ p, mat, dark, glow, sub, at }) {
    const navy = mat(0x24305a), dnavy = mat(0x18203e), gold = mat(0xe8b84a), star = glow(0xffe68a), vent = mat(0x10142a);
    p(4, 5, 10, dnavy, 0, .5, 5); p(4, 8, 1, dark, 0, -1, 10.5); p(4, 3, 6, navy, 0, 4, 4); // stock, butt, cheek rest
    p(6, 6, 26, navy, 0, 1, -12); p(6, 1, 26, gold, 0, -.5, -12); // the tall upper receiver and its gold stripe
    p(6, 3, 12, dnavy, 0, -3.5, -6); // lower receiver
    for (const z of [-14, -17, -20, -23]) p(6, 1, 2, vent, 0, 2.5, z); // side rail slots
    p(6, 1, 3, star, 0, 1.5, -7); p(6, 3, 1, star, 0, 1.5, -7); // a glowing star on each side
    p(4, 1, 28, dark, 0, 4.5, -13); // top rail
    p(6, 1, 4, dark, 0, 5.5, -6); for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 8, -6); p(6, 1, 2, dark, 0, 10.5, -6); // holo sight
    p(1, 1, 1, glow(0xffd24a), .5, 6.5, -4.5); // its emitter
    p(4, 4, 8, mat(GUN_STEEL), 0, 2, -29); // barrel
    p(6, 6, 4, dnavy, 0, 2, -35); p(6, 6, 1, gold, 0, 2, -34.5); // flash hider and its gold ring
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, dark, 0, -8, -8); mg(4, 1, 5, gold, 0, -10.5, -8); // mag with a gold band
    p(4, 4, 4, dnavy, 0, -7, 0); p(4, 3, 4, dnavy, 0, -10.5, 1); // pistol grip
    p(1, 1, 4, dark, 0, -8.5, -4); p(1, 2, 1, mat(0x666666), 0, -6, -3.5); // guard and trigger
    return { muzzle: [2, -38], grip: [4, 7, 5, 0, -8.5, .5], fore: [6, 6, 10, 0, 1, -18], bands: [-15.5, -18.5], band: [8, 8, 1], holo: [7, -6], mag };
  },
  blazesaber({ p, mat, glow }) {
    const metal = mat(0x8a8d94), dmetal = mat(0x45474e), red = mat(0xb8322a), blade = glow(0xff6a1a), core = glow(0xffd38a);
    p(4, 4, 16, metal, 0, 1, 4); for (const z of [-1.5, 1.5, 4.5, 7.5]) p(4, 4, 1, dmetal, 0, 1, z); // hilt and its grip rings
    p(6, 6, 3, dmetal, 0, 1, 13.5); p(6, 6, 1, red, 0, 1, 12.5); // pommel and a red ring
    p(6, 6, 4, metal, 0, 1, -6); p(6, 1, 4, red, 0, 1, -6); // emitter, a red stripe round it
    p(4, 4, 34, blade, 0, 1, -25); p(4, 2, 34, core, 0, 1, -25); p(2, 4, 34, core, 0, 1, -25); // blade and its hot core
    p(2, 2, 2, core, 0, 1, -43); // tip
    return { muzzle: [1, -44], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  windsaber({ p, mat, glow }) {
    const white = mat(0xe4e8ee), silver = mat(0xa8b0ba), teal = mat(0x3ab8c8), blade = glow(0xc8f0ff), core = glow(0xffffff);
    p(4, 4, 16, white, 0, 1, 4); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, silver, 0, 1, z); // hilt and its rings
    p(6, 6, 3, silver, 0, 1, 13.5); p(6, 6, 1, teal, 0, 1, 12.5); // pommel and a teal ring
    p(6, 6, 4, white, 0, 1, -6); p(6, 1, 4, teal, 0, 1, -6); // emitter and its teal band
    p(4, 4, 34, blade, 0, 1, -25); p(4, 2, 34, core, 0, 1, -25); p(2, 4, 34, core, 0, 1, -25); // white blade, pale blue edges
    p(2, 2, 2, core, 0, 1, -43); // tip
    return { muzzle: [1, -44], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  frostwand({ p, mat, dark, glow, sub, at }) {
    const shaft = mat(0xe8eef4), dshaft = mat(0xa9b8c8), wrap = mat(0x2f4f86), dwrap = mat(0x1e3560), gold = mat(0xc9a24a), ice = glow(0x9fe8ff), core = glow(0xe8fbff);
    p(4, 4, 12, wrap, 0, 0, 2); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, dwrap, 0, 0, z); // handle and its wraps
    p(6, 6, 3, dshaft, 0, 0, 9.5); // pommel
    p(6, 6, 2, gold, 0, 0, -5); // gold collar
    p(4, 4, 18, shaft, 0, 0, -15); for (const z of [-10, -18]) p(4, 4, 1, dshaft, 0, 0, z); // the shaft and its rings
    p(6, 6, 4, ice, 0, 0, -26); p(4, 4, 4, ice, 0, 0, -30); p(2, 2, 2, core, 0, 0, -33); // an ice crystal on the tip
    for (const [x, y] of [[3, 2], [-3, -2], [-2, 3], [2, -3]]) p(2, 2, 3, ice, x, y, -25.5); // little shards round it
    p(4, 4, 2, ice, 0, 0, 12); // a frost charge in the pommel
    return { muzzle: [0, -35], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-9, -12], band: [6, 6, 0] };
  },
  warhammer({ p, mat, glow }) {
    const steel = mat(0x8a8e98), dsteel = mat(0x5a5e68), wood = mat(0x6a4428), wrap = mat(0x3a2414), gold = mat(0xd8a838);
    p(4, 4, 22, wood, 0, 1, 1); for (const z of [3.5, 6.5, 9.5]) p(4, 4, 1, wrap, 0, 1, z); // long handle, a wrapped grip
    p(6, 6, 3, dsteel, 0, 1, 13.5); // pommel
    p(6, 6, 3, gold, 0, 1, -11.5); // gold collar under the head
    p(8, 16, 10, steel, 0, 1, -18); p(8, 16, 2, dsteel, 0, 1, -18); // the head, a dark band round it
    p(4, 2, 4, dsteel, 0, 10, -18); p(6, 2, 8, dsteel, 0, -8, -18); // a stub on top, a flat face below
    p(4, 4, 6, steel, 0, 1, -26); // and a point out the front
    return { muzzle: [1, -29], grip: [6, 6, 18, 0, 1, 6], fore: null, bands: [-6.5, -9.5], band: [6, 6, 1] };
  },
  shockbeam({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x2f4a66), dbody = mat(0x1f3044), coil = mat(0xd9a62a), zap = glow(0x8fe9ff), steel = mat(0x6e6e74);
    p(4, 6, 8, dbody, 0, -.5, 4); p(4, 8, 1, dark, 0, -1, 8.5); // stock and butt
    p(6, 6, 16, body, 0, 0, -8); p(6, 1, 16, mat(0x46688a), 0, 2.5, -8); // body and its lighter top
    p(2, 4, 2, coil, 0, 5, -5); p(2, 4, 2, coil, 0, 5, -11); p(4, 4, 4, zap, 0, 8, -8); // coil posts and the glowing orb they hold
    p(4, 4, 14, steel, 0, .5, -23); for (const z of [-18, -20, -22, -24, -26]) p(6, 6, 1, coil, 0, .5, z); // barrel wound with copper coils
    p(2, 2, 4, steel, 0, 3.5, -31); p(2, 2, 4, steel, 0, -2.5, -31); p(2, 4, 1, zap, 0, .5, -32.5); // two prongs and the spark between them
    p(4, 4, 4, dbody, 0, -4.5, -1); p(4, 3, 4, dbody, 0, -7.5, 0); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -5); p(1, 2, 1, mat(0x888888), 0, -3.5, -4.5); // guard and trigger
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 5, 4, mat(0x2a2a30), 0, -5.5, -9); mg(4, 2, 2, zap, 0, -5.5, -9); // battery with a glowing window
    p(6, 4, 6, dark, 0, -5, -14); // front handle
    return { muzzle: [.5, -33], grip: [4, 7, 4, 0, -6, -.5], fore: [6, 4, 6, 0, -5, -14], bands: [-6, -10], band: [8, 7, -.5], mag };
  },
  tigerbite({ p, mat, dark, glow, sub, at }) {
    const orange = mat(0xe07a1f), dorange = mat(0xa8520f), black = mat(0x1c1a18), cream = mat(0xf0e2c4);
    p(4, 6, 10, orange, 0, -1, 5); for (const z of [2.5, 6.5]) p(4, 4, 1, black, 0, 0, z); p(4, 8, 1, black, 0, -1, 10.5); // striped stock and butt pad
    p(4, 2, 6, cream, 0, 3, 4); // cheek rest, the tiger's pale belly
    p(6, 6, 16, orange, 0, 0, -8); for (const z of [-2.5, -6.5, -10.5, -14.5]) p(6, 4, 1, black, 0, 1, z); // receiver and its stripes
    p(4, 1, 16, dark, 0, 3.5, -8); // top rail
    p(4, 4, 16, black, 0, 6, -10); p(6, 6, 2, dorange, 0, 6, -1); p(6, 6, 2, dorange, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0xffc531), 0, 6, -19.5); // amber lens, like an eye
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    p(6, 6, 12, orange, 0, 0, -22); for (const z of [-18.5, -22.5, -26.5]) p(6, 4, 1, black, 0, -1, z); // handguard and its stripes
    p(4, 4, 14, mat(GUN_STEEL), 0, 1, -35); // barrel
    p(6, 6, 4, black, 0, 1, -44); p(6, 2, 1, cream, 0, -1, -45.5); // muzzle and its bared teeth
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, black, 0, -7, -11); mg(4, 1, 5, orange, 0, -8.5, -11); // box mag with an orange band
    p(4, 4, 4, dorange, 0, -5, -2); p(4, 3, 4, dorange, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -46], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 12, 0, 0, -22], bands: [-6, -15], band: [8, 8, 0], mag };
  },
  executioner({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x2a2233), plate = mat(0x5b3b8a), lplate = mat(0x9a6be0), las = glow(0xd47bff);
    p(4, 4, 18, body, 0, 2, -9); p(6, 3, 10, plate, 0, 2.5, -9); p(4, 1, 18, lplate, 0, 4.5, -9); // slide, purple side plates, bright top
    for (const z of [-6, -9, -12]) p(6, 1, 1, las, 0, 2, z); // glowing slits in the plates
    p(2, 1, 6, plate, 0, 5.5, -15); // low fin ahead of the sight
    p(6, 1, 4, plate, 0, 5.5, -7); // purple holo sight: mount, posts, hood
    for (const x of [-2.5, 2.5]) p(1, 4, 2, plate, x, 8, -7);
    p(6, 1, 2, plate, 0, 10.5, -7);
    p(1, 1, 1, las, .5, 6.5, -5.5); // the emitter
    p(6, 6, 4, plate, 0, 2, -20); p(2, 2, 1, las, 0, 2, -22.5); // emitter and its lens
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, body, 0, -3.5, -3); p(4, 3, 4, body, 0, -6.5, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, las, 0, -5, -2); // power cell glowing up inside the grip
    return { muzzle: [2, -23], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-15, -17], band: [6, 6, 2], holo: [8, -7], mag };
  },
  heatray({ p, mat, dark, glow, sub, at }) {
    const cop = mat(0xb5652b), dcop = mat(0x7e4220), brass = mat(0xc9a43a), steel = mat(0x6e6e74), wood = mat(0x5a3a22);
    p(4, 6, 8, wood, 0, -.5, 4); p(4, 8, 1, mat(0x3a2414), 0, -1, 8.5); // stock and butt
    p(6, 6, 16, cop, 0, 0, -8); p(6, 1, 16, mat(0xd98a4a), 0, 2.5, -8); // body and its lighter top
    for (const z of [-2.5, -13.5]) p(6, 6, 1, dcop, 0, 0, z); // rivet bands
    p(2, 2, 2, dark, 0, 4, -6); p(2, 2, 2, dark, 0, 4, -10); // posts holding the lens up
    for (const z of [-3.5, -12.5]) p(10, 2, 1, brass, 0, 5, z); // lens frame: front and back
    for (const x of [-4.5, 4.5]) p(1, 2, 8, brass, x, 5, -8); // and its sides
    p(8, 1, 8, mat(0xbfe3ee), 0, 5.5, -8); // the magnifying glass
    p(2, 1, 2, glow(0xfff2a8), 0, 5.5, -8); // the spot where it gathers the sunlight
    p(2, 1, 4, glow(0xffd27a), 0, 3.5, -8); // the focused light it pours into the body
    p(4, 4, 14, steel, 0, .5, -23); for (const z of [-18.5, -22, -25.5]) p(8, 8, 1, cop, 0, .5, z); // barrel and its fins
    p(4, 4, 2, dark, 0, .5, -31); p(2, 2, 1, glow(0xffb347), 0, .5, -32.5); // emitter and its glowing tip
    p(4, 4, 4, dcop, 0, -4.5, -1); p(4, 3, 4, dcop, 0, -7.5, 0); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -5); p(1, 2, 1, mat(0x888888), 0, -3.5, -4.5); // guard and trigger
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 5, 4, mat(0x3a3a3a), 0, -5.5, -9); mg(4, 2, 2, glow(0xffd23f), 0, -5.5, -9); // heat cell, with a window glowing out of both sides (spent ones are pulled and swapped)
    p(6, 4, 6, dark, 0, -5, -14); // front handle under the barrel's root
    return { muzzle: [.5, -33], grip: [4, 7, 4, 0, -6, -.5], fore: [6, 4, 6, 0, -5, -14], bands: [-6, -10], band: [8, 7, -.5], mag };
  },
};
// shared gun geometry (never dispose meshes marked shared)
const gunGeoCache = {};
// a little glow so the shady side still shows its color
const gunLit = new THREE.MeshLambertMaterial({ vertexColors: true }), gunGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
gunLit.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * .45;'); };
const gunPx = i => GPX * (GUN_SCALE[BASE[i].id] || 1);
function gunPieces(i, stars) {
  const main = [], subs = [];
  const c = { mat: col => palIdx(col), dark: palIdx(GUN_DARK), glow: col => palIdx(col, true) };
  c.p = (...a) => main.push(a);
  // a part that moves on its own (barrels, mag, rocket)
  c.sub = (x, y, z, off = [0, 0, 0]) => { const s = { at: [x, y, z], off, list: [] }; subs.push(s); return s; };
  c.at = s => (...a) => s.list.push(a);
  const m = GUN_MODELS[BASE[i].id](c), [bw, bh, by] = m.band, gold = palIdx(0xffcc22);
  for (let s = 0; s < stars; s++) c.p(bw, bh, 2, gold, 0, by, m.bands[s]); // one gold band per upgrade
  return { m, main, subs };
}
// hotbar and armory sprites, drawn from the 3D model
const spriteCol = new THREE.Color();
function gunSprite(i) {
  const { main, subs } = gunPieces(i, 0);
  for (const s of subs) for (const [w, h, d, m, x, y, z] of s.list) main.push([w, h, d, m, x + s.at[0], y + s.at[1], z + s.at[2]]);
  const { lo, NX, NY, NZ, at } = voxelGrid(main), px = [];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = NX - 1; x >= 0; x--) {
    const m = at(x, y, z); if (!m) continue;
    const P = gunPal[m];
    let col = '#000';
    if (P.glow || (at(x, y + 1, z) && at(x, y - 1, z) && at(x, y, z + 1) && at(x, y, z - 1))) {
      const h = Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791 ^ 2654435761, 1597334677) >>> 0;
      col = spriteCol.copy(P.c).multiplyScalar(P.glow ? 1 : .82 + (h % 1000) / 1000 * .18).getStyle();
    }
    const sx = NZ - 1 - z, sy = NY - 1 - y;
    px.push(sx, sy, col);
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    break;
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, W = Math.max(w, 2 * h), H = Math.max(h, Math.ceil(W / 2));
  const ox = ((W - w) >> 1) - x0, oy = ((H - h) >> 1) - y0;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (let k = 0; k < px.length; k += 3) { g.fillStyle = px[k + 2]; g.fillRect(px[k] + ox, px[k + 1] + oy, 1, 1); }
  return c.toDataURL();
}
function gunGeos(i, stars) {
  const { m, main } = gunPieces(i, stars), px = gunPx(i);
  const part = s => {
    if (!s) return null;
    const geos = voxelGeos(s.list, px);
    for (const g of [geos.lit, geos.glow]) if (g) { g.translate(-s.off[0] * px, -s.off[1] * px, -s.off[2] * px); g.computeBoundingSphere(); }
    return { at: s.at.map((v, k) => v + s.off[k]), geos };
  };
  return { m, main: voxelGeos(main, px), spin: part(m.spin), round: part(m.round), mag: part(m.mag) };
}
const SPRITES = BASE.map((w, i) => gunSprite(i));
const gunBox = (b, px) => b && { c: [b[3] * px, b[4] * px, b[5] * px], h: [b[0] / 2 * px, b[1] / 2 * px, b[2] / 2 * px] };
function makeGun(i, g, stars) {
  const b = gunGeoCache[BASE[i].id + ':' + stars] ??= gunGeos(i, stars), px = gunPx(i);
  const add = (parent, geos) => {
    for (const [geo, mat] of [[geos.lit, gunLit], [geos.glow, gunGlow]]) if (geo) { const m = new THREE.Mesh(geo, mat); m.userData.shared = true; parent.add(m); }
  };
  add(g, b.main);
  const sub = s => { if (!s) return null; const grp = new THREE.Group(); grp.position.set(...s.at.map(n => n * px)); add(grp, s.geos); g.add(grp); return grp; };
  return { muzzle: b.m.muzzle.map(n => n * px), grip: gunBox(b.m.grip, px), fore: gunBox(b.m.fore, px), spin: sub(b.spin), round: sub(b.round), mag: sub(b.mag), holo: b.m.holo && b.m.holo.map(n => n * px) };
}
// the gun's outer pixels, for keeping arms out of it
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
// push a fist out until it's just outside the gun
function fistOut(cells, c, dir, r, gap) {
  let t = 0;
  for (let k = 0; k < cells.length; k += 3) {
    const vx = cells[k] - c[0], vy = cells[k + 1] - c[1], vz = cells[k + 2] - c[2], a = vx * dir.x + vy * dir.y + vz * dir.z;
    if (a > t && vx * vx + vy * vy + vz * vz - a * a < r * r) t = a;
  }
  return t + gap;
}
const holdOf = w => w.hold;
// knife swing for characters: raise, chop down, come back
const KNIFE_SWING = .36; // seconds
const swingAt = t => { const e = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  t = Math.min(1, Math.max(0, t)); return t < .3 ? -.55 * e(t / .3) : t < .55 ? -.55 + 1.3 * e((t - .3) / .25) : .75 * (1 - e((t - .55) / .45)); };

// your first-person arms, in your own skin
const ARM_U = .0325, UP_V = new THREE.Vector3(0, 1, 0);
let armGeos = null;
const armMats = {};
function vmArm(left, box, dir, low = 0, at = null) { // at: fist this far out along the arm, instead of just clear of the gun
  armGeos ??= [partBox(4, 12, 4, 40, 16, ARM_U), partBox(4, 12, 4, 32, 48, ARM_U)];
  const L = prof.look ?? PRESETS[0].look, k = JSON.stringify(L);
  const mat = armMats[k] ??= lam({ map: skinTexture(L) });
  dir.normalize();
  const c = [box.c[0], box.c[1] - low * box.h[1], box.c[2]], t = at ?? fistOut(gunCells(cur), c, dir, 2.2 * ARM_U, .006);
  const piv = new THREE.Group(); piv.position.set(...c).addScaledVector(dir, t); piv.quaternion.setFromUnitVectors(UP_V, dir);
  for (let s = 0; s < 3; s++) { // extra length so the arm's end never shows
    const m = new THREE.Mesh(armGeos[left ? 1 : 0], mat); m.position.y = (6 + s * 12) * ARM_U; m.userData.shared = true; piv.add(m);
  }
  vm.add(piv);
  return piv;
}
// arm directions per hold
const X_V = new THREE.Vector3(1, 0, 0), meleeUp = w => w.tilt ? 1.2 : .22; // how far first person tips a melee weapon up
const VM_ARMS = {
  pistol: [[.15, -.2, 1, .3]], rifle: [[.2, -.25, 1, .5], [-.35, -.3, 1, .6]], heavy: [[.25, -.25, 1, .4], [-.4, -.3, 1, .3]],
  shoulder: [[.2, -.25, 1, .5], [-.35, -.3, 1, .5]], melee: [[.15, -.15, 1, 0]],
};
function buildGun() {
  vm.traverse(o => { if (o.geometry && o !== flashMesh && !o.userData.shared) o.geometry.dispose(); });
  vm.clear(); flashMesh.visible = false;
  const { muzzle: [my, mz], grip, fore, spin, round, mag, holo } = makeGun(cur, vm, lvl[cur]), arms = VM_ARMS[holdOf(BASE[cur])];
  gunSpin = spin; gunRound = round; gunHolo = holo; gunMag = mag; gunShown = cur; drawCross(BASE[cur]);
  const hand = WEAPONS[cur].tilt ? { ...grip, c: [grip.c[0], grip.c[1], grip.c[2] - 5 * gunPx(cur)] } : grip; // a sword's fist goes up under the guard
  if (WEAPONS[cur].tilt) vmArm(false, hand, new THREE.Vector3(.35, -.3, .9).applyAxisAngle(X_V, -meleeUp(WEAPONS[cur])), 0, .04); // a sword stands up: the arm comes in from the bottom right, the handle just in front of the fist
  else vmArm(false, grip, new THREE.Vector3(...arms[0]), arms[0][3]);
  gunArmL = fore && arms[1] ? vmArm(true, fore, new THREE.Vector3(...arms[1]), arms[1][3]) : null;
  // one-handed guns: the left hand only shows up to reload
  gunHand = !gunArmL && mag && !WEAPONS[cur].melee ? vmArm(true, partBounds(mag),new THREE.Vector3(-.3, -1, .45), 1) : null;
  if (gunHand) gunHand.visible = false;
  for (const o of [gunMag, gunArmL, gunHand]) if (o) o.userData.rest = o.position.clone();
  vmRl.rk = -1;
  if (WEAPONS[cur].melee) return;
  flashMesh.position.set(0, my, mz - .015); flashLight.position.copy(flashMesh.position); vm.add(flashMesh, flashLight); // the flash sits just past the muzzle, or the gun hides it
}
function cycle(d) { let s = slotOf(cur); do s = (s + d + CATS.length) % CATS.length; while (slotGun[s] < 0); equip(slotGun[s]); }
function selectSlot(s) {
  if (slotGun[s] < 0) return;
  if (slotOf(cur) === s && mode === 'zombies') { // zombie waves: press again to flip between guns
    const list = BASE.map((w, i) => i).filter(i => owned[i] && slotOf(i) === s);
    if (list.length > 1) equip(list[(list.indexOf(cur) + 1) % list.length]);
    return;
  }
  equip(slotGun[s]);
}
function equip(i) {
  if (i === cur || !WEAPONS[i] || !owned[i]) return;
  cur = i; slotGun[slotOf(i)] = i; cancelReload(); swapLen = drawT(WEAPONS[i]); swapDown = true;
  cd = Math.max(cd, swapLen * (SWAP_DOWN * (1 - swapOff) + 1 - SWAP_DOWN)); renderHotbar(); sfx('equip');
}
function swapTick(dt) {
  if (swapDown) { swapOff += dt / (swapLen * SWAP_DOWN); if (swapOff >= 1) { swapOff = 1; swapDown = false; if (gunShown !== cur) buildGun(); } }
  else if (swapOff > 0) swapOff = Math.max(0, swapOff - dt / (swapLen * (1 - SWAP_DOWN)));
  return swapOff;
}
const dry = () => sfx('dry');
// reload sound speeds up with faster reloads
let reloadSnd = null;
function reload() {
  const w = WEAPONS[cur]; if (w.melee || w.pool || reloading > 0 || ammo[cur] === w.mag || swapOff > 0) return;
  if (!reserve[cur]) { dry(); return; }
  reloading = w.reload; reloadSnd = sfx('r_' + w.id, { rate: BASE[cur].reload / w.reload });
}
function cancelReload() { reloading = 0; stopSfx(reloadSnd); reloadSnd = null; }
buildGun();
// build gun models in idle time so nothing stalls later
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
