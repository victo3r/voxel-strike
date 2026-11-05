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
// youFx (what you're wearing, boots and hat together) is in js/hats.js
const DJ_V = 8.5; // the second jump's upward speed (the first is 9)
// a bot's boots for the match: none (BOOT_BARE of the time) or any pair in the game: at ★ if you don't own it, else at any stars
// up to the ones you own on it (worn or not). So you meet every pair, but never one better than yours
const BOOT_BARE = .3;
function botBoots() {
  if (Math.random() < BOOT_BARE) return null;
  const B = BOOTS[Math.random() * BOOTS.length | 0];
  return { id: B.id, st: 1 + (Math.random() * Math.max(1, bootStars(B.id)) | 0) };
}

// ---- the model: voxel pixel art like the armor (armor.js), in armor pixels (half a skin pixel each), measured from the hip,
// where the leg pivots: the leg is x -4..4, y -24..0, z -4..4 (+z is the front, +x the character's left).
// s = 1 for the left leg, -1 for the right (the outside of the leg is +x on the left boot). Each boot wraps the bottom of the leg,
// standing a pixel off it, with a toe out the front and a sole. Higher stars look fancier.
// The inside of a boot (-x) never goes past x = -5: the legs tilt apart (LEG_SPREAD), and anything wider there would touch the other boot
function bootPieces(id, st, s = 1) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a));
  const shell = (top, c, sole, toe) => {
    B(-5, 5, -24, top, -5, 5, c); B(-5, 5, -24, -20, 5, toe, c); // the boot and its toe
    B(-5, 5, -24, -21, -5, toe, sole);
  };
  if (id === 'raider') {
    // high-top runners: charcoal, a thick white sole with a teal stripe along it, white laces, a teal collar, tongue and heel tab,
    // a teal speed stripe slanting back along the outside, and a wing off the outside of the ankle.
    // Each star adds a feather to the wing, each one longer than the one below; at ★★★ the wing turns gold
    const C = hex([56, 62, 78]), HI = hex([92, 102, 124]), TEAL = hex([34, 200, 186]), SOLE = hex([236, 236, 240]);
    B(-5, 5, -24, -14, -5, 5, C); B(-5, 5, -24, -19, 5, 8, C); // upper and toe box
    B(-5, 5, -24, -22, -5, 8, SOLE); B(-5, 5, -22, -21, -5, 8, TEAL); // sole, and the stripe along its top
    B(-5, 5, -21, -19, 7, 8, HI); // toe cap
    // laces and the stripe are painted into the boot's surface: raised a single pixel, they'd be all outline (black)
    for (const y of [-19, -17, -15]) B(-2, 2, y, y + 1, 4, 5, SOLE); // laces
    B(-5, 5, -15, -14, -5, 5, TEAL); B(-2, 2, -15, -12, 3, 5, TEAL); B(-2, 2, -16, -12, -5, -3, TEAL); // collar, tongue, heel tab
    [[2, 5], [0, 3], [-2, 1], [-4, -1]].forEach(([z0, z1], k) => B(4, 5, -21 + k, -20 + k, z0, z1, TEAL)); // speed stripe up the outside
    const W = st >= 3 ? hex([240, 196, 64]) : hex([240, 242, 246]), WD = st >= 3 ? hex([178, 128, 26]) : hex([168, 176, 192]);
    B(5, 7, -18, -14, -4, -1, WD); // the wing's root
    for (let k = 0; k < st; k++) { // feathers: two pixels tall (light on top, shaded under), swept back, a darker tip
      const y = -16 + 2 * k, back = -8 - 2 * k;
      B(5, 7, y, y + 1, back, -1, WD); B(5, 7, y + 1, y + 2, back, -1, W); B(5, 7, y, y + 2, back, back + 1, WD);
    }
  } else {
    // steel greaves up the shin with a red cuff. ★★ adds a raised plate down the shin, ★★★ a ridge on it and a gold cuff
    const C = hex([150, 156, 166]), HI = hex([204, 210, 220]), DK = hex([90, 96, 108]), SOLE = hex([52, 52, 58]);
    const CUFF = st >= 3 ? hex([226, 178, 40]) : hex([158, 34, 40]);
    shell(-10, C, SOLE, 9);
    B(-5, 5, -21, -18, 5, 9, DK); // toe cap
    B(-5, 6, -13, -10, -6, 6, CUFF); // the cuff (flush on the inside, see above)
    B(-5, 5, -19, -16, -5, 5, DK); // a strap round the ankle
    if (st >= 2) B(-3, 3, -18, -13, 5, 7, HI); // shin plate
    if (st >= 3) B(-1, 1, -17, -13, 7, 8, DK); // its ridge
  }
  // the leg's room: hollow from the insole up to the top, a pixel of shell all round, a dark insole at the bottom. On a character the
  // leg fills it; in the armory you see into it, so a boot looks like something you can put a foot in
  const top = id === 'raider' ? -14 : -10, floor = id === 'raider' ? -22 : -21;
  B(-4, 4, floor, top, -4, 4, 0); B(-4, 4, floor, floor + 1, -4, 4, hex([40, 40, 46]));
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
// both boots side by side, for the armory's spinning preview: where they'd be on the legs, which pivot 2 skin pixels either side
// of the middle and tilt apart (the boot model's origin is the hip, so turning it turns it about the hip)
function bootsModel(id, st, g) {
  for (const s of [1, -1]) { const m = new THREE.Mesh(bootGeo(id, st, s, 1 / 16), gunLit); m.position.x = s * 2 / 16; m.rotation.z = s * LEG_SPREAD; g.add(m); }
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
