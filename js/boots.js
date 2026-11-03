// Boots you wear (armory WEAR page, BOOTS section). One pair on at a time. Each pair is bought once and then upgraded
// one star at a time (3 stars), like a gun. They work in every mode, and their effects stack with everything else
// (your armor's damage cut, your gun's mobility): percentages just add up.
// prof.boots: boot id -> stars you own. prof.bootUse: boot id -> the stars you wear when that's fewer than you own.
// prof.bootOn: the id of the pair you're wearing ('' = none).
// id = permanent name used in saves. Never rename or reuse one.
// unlock = account level you need, price = coins for the first star (upgrades cost UPG shares of it, like guns: armory.js)
// per star [★, ★★, ★★★]: spd = extra run speed, dmg = extra damage on every weapon, dr = share cut off every hit you take.
// dj = lets you jump a second time in the air
const BOOTS = [
  { id: 'warrior', name: 'Warrior Boots', unlock: 5, price: 80, dmg: [.06, .10, .14], dr: [.04, .06, .08] },
  { id: 'raider', name: 'Raider Boots', unlock: 7, price: 120, spd: [.08, .11, .14], dj: true },
];
const BOOT_I = Object.fromEntries(BOOTS.map((B, i) => [B.id, i]));
const bootOf = id => BOOTS[BOOT_I[id]] ?? null;
const bootStars = id => prof.boots?.[id] | 0; // 0 = not bought
// the stars you wear on a pair: all of them unless you picked fewer
const bootUse = id => { const st = bootStars(id), u = prof.bootUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
// the pair you're wearing and its stars, or null
const wornBoots = () => { const id = prof.bootOn; return id && bootStars(id) ? { id, st: bootUse(id) } : null; };
// what a pair does at st stars
const FX_NONE = { spd: 0, dmg: 0, dr: 0, dj: false };
function bootFx(b) {
  const B = b && bootOf(b.id); if (!B) return FX_NONE;
  const L = b.st - 1;
  return { spd: B.spd?.[L] ?? 0, dmg: B.dmg?.[L] ?? 0, dr: B.dr?.[L] ?? 0, dj: !!B.dj };
}
// yours, read live, so changing boots mid-match takes effect straight away
const youFx = () => bootFx(wornBoots());
const DJ_V = 8.5; // the second jump's upward speed (the first is 9)
// a bot's boots for the match: none (BOOT_BARE of the time) or any pair you own, at any stars up to the ones you wear on it.
// Never better than yours
const BOOT_BARE = .3;
function botBoots() {
  const mine = BOOTS.filter(B => bootStars(B.id));
  if (!mine.length || Math.random() < BOOT_BARE) return null;
  const B = mine[Math.random() * mine.length | 0];
  return { id: B.id, st: 1 + (Math.random() * bootUse(B.id) | 0) };
}

// ---- the model: voxel pixel art like the armor (armor.js), in armor pixels (half a skin pixel each), measured from the hip,
// where the leg pivots: the leg is x -4..4, y -24..0, z -4..4 (+z is the front, +x the character's left).
// s = 1 for the left leg, -1 for the right (the outside of the leg is +x on the left boot). Each boot wraps the bottom of the leg,
// standing a pixel off it, with a toe out the front and a dark sole. Higher stars look fancier
function bootPieces(id, st, s = 1) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a));
  const shell = (top, c, sole, toe) => {
    B(-5, 5, -24, top, -5, 5, c); B(-5, 5, -24, -20, 5, toe, c); // the boot and its toe
    B(-5, 5, -24, -21, -5, toe, sole);
  };
  if (id === 'raider') {
    // light running boots: slate with a teal tongue and a teal toe, and a white wing off the outside of the ankle.
    // Each star adds a feather to the wing, and the third star turns it gold
    const C = hex([74, 80, 98]), HI = hex([124, 132, 156]), TEAL = hex([38, 196, 184]), SOLE = hex([228, 228, 232]);
    shell(-14, C, SOLE, 8);
    B(-5, 5, -17, -14, -5, 5, HI); B(-6, 6, -16, -14, -6, 6, HI); // padded collar round the top
    B(-2, 2, -21, -15, 5, 6, TEAL); B(-5, 5, -21, -18, 6, 8, TEAL); // tongue and toe cap
    const wing = st >= 3 ? hex([236, 190, 60]) : hex([238, 240, 244]), wdk = st >= 3 ? hex([180, 128, 24]) : hex([176, 182, 196]);
    B(4, 7, -20, -20 + 3 * st, -4, -1, wdk); // the wing's root
    for (let k = 0; k < st; k++) B(5, 7, -20 + 3 * k, -17 + 3 * k, -7 - 2 * k, -1, k % 2 ? wdk : wing); // feathers, longer going up
  } else {
    // steel greaves up the shin with a red cuff. ★★ adds a raised plate down the shin, ★★★ a ridge on it and a gold cuff
    const C = hex([150, 156, 166]), HI = hex([204, 210, 220]), DK = hex([90, 96, 108]), SOLE = hex([52, 52, 58]);
    const CUFF = st >= 3 ? hex([226, 178, 40]) : hex([158, 34, 40]);
    shell(-10, C, SOLE, 9);
    B(-5, 5, -21, -18, 5, 9, DK); // toe cap
    B(-6, 6, -13, -10, -6, 6, CUFF); // the cuff
    B(-5, 5, -19, -16, -5, 5, DK); // a strap round the ankle
    if (st >= 2) B(-3, 3, -18, -13, 5, 7, HI); // shin plate
    if (st >= 3) B(-1, 1, -17, -13, 7, 8, DK); // its ridge
  }
  if (s < 0) for (const p of out) p[4] = -p[4];
  return out;
}
const bootGeoCache = {};
const bootGeo = (id, st, s, U) => bootGeoCache[id + ':' + st + ':' + s + ':' + U] ??= voxelGeos(bootPieces(id, st, s), U / ARMOR_PX).lit;
// puts boots b ({ id, st } or null) on a character from buildChar. Each boot rides on its leg, so it swings with it
function dressBoots(ch, b) {
  if (ch.boots) {
    for (const m of ch.boots.meshes) m.parent.remove(m);
    ch.mats.splice(ch.mats.indexOf(ch.boots.mat), 1); ch.boots.mat.dispose(); ch.boots = null;
  }
  if (!b || !bootOf(b.id)) return;
  const mat = armorMat(), meshes = [[ch.legL, 1], [ch.legR, -1]].map(([leg, s]) => { const m = new THREE.Mesh(bootGeo(b.id, b.st, s, ch.U), mat); leg.add(m); return m; });
  ch.mats.push(mat); ch.boots = { mat, meshes, key: b.id + b.st };
}
// both boots side by side, for the armory's spinning preview (the legs pivot 2 skin pixels either side of the middle)
function bootsModel(id, st, g) {
  for (const s of [1, -1]) { const m = new THREE.Mesh(bootGeo(id, st, s, 1 / 16), gunLit); m.position.x = s * 2 / 16; g.add(m); }
}
// icon: the left boot seen from the outside (so you see the wing), toe pointing right, 4 screen pixels per armor pixel,
// with the same black outline as the armor icons. Every star of a pair is drawn in the same frame
const bootSpriteCache = {};
function bootSprite(id, st) {
  const key = id + st; if (bootSpriteCache[key]) return bootSpriteCache[key];
  const frame = voxelGrid(bootPieces(id, 3)), { lo, NX, NY, NZ, at } = voxelGrid(bootPieces(id, st));
  const W = frame.NZ - 2, H = frame.NY - 2, K = 4, z0 = frame.lo[2] + 1, y1 = frame.lo[1] + frame.NY - 2;
  const dep = new Float32Array(W * H).fill(-99), col = new Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const z = z0 + c - lo[2], y = y1 - r - lo[1];
    for (let x = NX - 1; x >= 0; x--) { const m = at(x, y, z); if (m) { dep[r * W + c] = x; col[r * W + c] = gunPal[m].c; break; } }
  }
  const cv = document.createElement('canvas'); cv.width = (W + 2) * K; cv.height = (H + 2) * K;
  const g = cv.getContext('2d'), filled = (r, c) => r >= 0 && c >= 0 && r < H && c < W && dep[r * W + c] > -99;
  let dmax = 0; dep.forEach(d => dmax = Math.max(dmax, d));
  for (let r = -1; r <= H; r++) for (let c = -1; c <= W; c++) {
    const inside = r >= 0 && c >= 0 && r < H && c < W, i = r * W + c, d = inside ? dep[i] : -99;
    let black;
    if (d === -99) black = filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1);
    else black = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([a, b]) => filled(a, b) && dep[a * W + b] > d);
    if (d === -99 && !black) continue;
    if (black) g.fillStyle = '#000';
    else {
      const sh = Math.max(.6, 1 - (dmax - d) * .06), h = col[i].getHex();
      g.fillStyle = `rgb(${(h >> 16 & 255) * sh | 0},${(h >> 8 & 255) * sh | 0},${(h & 255) * sh | 0})`;
    }
    g.fillRect((c + 1) * K, (r + 1) * K, K, K);
  }
  return bootSpriteCache[key] = cv.toDataURL();
}
