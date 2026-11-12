// boots, stats per star (ids are used in saves, don't rename them)
const BOOTS = [
  { id: 'warrior', rar: 'rare', name: 'Warrior Boots', unlock: 5, price: 80, dmg: [.06, .10, .14], dr: [.04, .06, .08] },
  { id: 'raider', rar: 'rare', name: 'Raider Boots', unlock: 7, price: 120, spd: [.08, .11, .14], dj: true },
  { id: 'ironclad', rar: 'epic', name: 'Ironclad Boots', unlock: 16, price: 240, dr: [.05, .07, .09], heavy: [.3, .45, .6] },
  { id: 'arcane', rar: 'epic', name: 'Arcane Boots', unlock: 19, price: 280, spd: [.04, .06, .08], rl: [.1, .15, .2] },
];
const BOOT_I = Object.fromEntries(BOOTS.map((B, i) => [B.id, i]));
const bootOf = id => BOOTS[BOOT_I[id]] ?? null;
const bootStars = id => prof.boots?.[id] | 0; // 0 = not bought
const bootUse = id => { const st = bootStars(id), u = prof.bootUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornBoots = () => { const id = prof.bootOn; return id && bootStars(id) ? { id, st: bootUse(id) } : null; };
const FX_NONE = { spd: 0, dmg: 0, dr: 0, dj: false, rl: 0, heavy: 0 };
function bootFx(b) {
  const B = b && bootOf(b.id); if (!B) return FX_NONE;
  const L = b.st - 1;
  return { spd: B.spd?.[L] ?? 0, dmg: B.dmg?.[L] ?? 0, dr: B.dr?.[L] ?? 0, dj: !!B.dj, rl: B.rl?.[L] ?? 0, heavy: B.heavy?.[L] ?? 0 };
}
// bots get random boots, only ones your level unlocks, never better than yours
const BOOT_BARE = .3;
function botBoots() {
  const list = BOOTS.filter(B => bootStars(B.id) || prof.lv >= B.unlock);
  if (!list.length || Math.random() < BOOT_BARE) return null;
  const B = list[Math.random() * list.length | 0];
  return { id: B.id, st: 1 + (Math.random() * Math.max(1, bootStars(B.id)) | 0) };
}

// ---- boot model (s = 1 for the left leg, -1 for the right)
// keep the inside edge at x = -5 or the two boots touch
function bootPieces(id, st, s = 1) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a));
  const shell = (top, c, sole, toe) => {
    B(-5, 5, -24, top, -5, 5, c); B(-5, 5, -24, -20, 5, toe, c);
    B(-5, 5, -24, -21, -5, toe, sole);
  };
  if (id === 'raider') {
    // high-tops with a wing, one feather per star, gold at 3 stars
    const C = hex([56, 62, 78]), HI = hex([92, 102, 124]), TEAL = st >= 3 ? hex([240, 196, 64]) : hex([34, 200, 186]), SOLE = hex([236, 236, 240]);
    B(-5, 5, -24, -14, -5, 5, C); B(-5, 5, -24, -19, 5, 8, C);
    B(-5, 5, -24, -22, -5, 8, SOLE); B(-5, 5, -22, -21, -5, 8, TEAL);
    B(-5, 5, -21, -19, 7, 8, HI);
    // painted flat, a raised 1 pixel detail would be all outline
    for (const y of [-19, -17, -15]) B(-2, 2, y, y + 1, 4, 5, SOLE); // laces
    B(-5, 5, -15, -14, -5, 5, TEAL); B(-2, 2, -15, -12, 3, 5, TEAL); B(-2, 2, -16, -12, -5, -3, TEAL);
    [[2, 5], [0, 3], [-2, 1], [-4, -1]].forEach(([z0, z1], k) => B(4, 5, -21 + k, -20 + k, z0, z1, TEAL));
    const W = st >= 3 ? hex([240, 196, 64]) : hex([240, 242, 246]), WD = st >= 3 ? hex([178, 128, 26]) : hex([168, 176, 192]);
    B(5, 7, -18, -14, -4, -1, WD);
    for (let k = 0; k < st; k++) { // feathers
      const y = -16 + 2 * k, back = -8 - 2 * k;
      B(5, 7, y, y + 1, back, -1, WD); B(5, 7, y + 1, y + 2, back, -1, W); B(5, 7, y, y + 2, back, back + 1, WD);
    }
  } else if (id === 'ironclad') {
    // heavy iron sabatons with a thick sole, bronze trim, gold at 3 stars
    const C = hex([78, 82, 92]), HI = hex([128, 134, 146]), DK = hex([44, 46, 54]), SOLE = hex([30, 30, 34]);
    const TRIM = st >= 3 ? hex([226, 178, 40]) : hex([150, 110, 60]);
    B(-5, 6, -24, -11, -6, 6, C); B(-5, 6, -24, -18, 6, 10, C);
    B(-5, 6, -24, -22, -6, 10, SOLE);
    B(-5, 6, -22, -19, 9, 10, HI); // toe cap
    for (const y of [-20, -16]) B(-5, 6, y, y + 1, -6, 6, DK); // bands
    B(-5, 7, -14, -11, -7, 7, C); B(-5, 7, -12, -11, -7, 7, TRIM); // cuff
    if (st >= 2) { B(-3, 3, -19, -13, 6, 8, HI); B(-3, 3, -19, -18, 6, 8, TRIM); } // shin plate
    if (st >= 3) B(5, 6, -21, -19, -3, 3, TRIM); // a buckle on the side
  } else if (id === 'arcane') {
    // soft midnight boots with a folded cuff, a gold clasp at 2 stars, bright gold at 3
    const C = hex([44, 52, 120]), HI = hex([82, 96, 176]), DK = hex([26, 30, 76]), SOLE = hex([30, 24, 50]);
    const TRIM = st >= 3 ? hex([255, 214, 90]) : hex([196, 150, 60]);
    B(-5, 5, -24, -15, -5, 5, C); B(-5, 5, -24, -20, 5, 9, C); B(-4, 4, -24, -21, 9, 10, C); // a rounded toe
    B(-5, 5, -24, -22, -5, 9, SOLE); B(-4, 4, -24, -22, 9, 10, SOLE);
    B(-5, 5, -21, -20, 8, 9, DK); // a seam over the toes
    B(-5, 6, -17, -14, -6, 6, HI); B(-5, 6, -17, -16, -6, 6, TRIM); // folded cuff with a gold edge
    if (st >= 2) B(4, 5, -21, -18, -2, 2, TRIM); // a gold clasp on the side
  } else {
    // steel greaves, fancier with each star
    const C = hex([150, 156, 166]), HI = hex([204, 210, 220]), DK = hex([90, 96, 108]), SOLE = hex([52, 52, 58]);
    const CUFF = st >= 3 ? hex([226, 178, 40]) : hex([158, 34, 40]);
    shell(-10, C, SOLE, 9);
    B(-5, 5, -21, -18, 5, 9, DK);
    B(-5, 6, -13, -10, -6, 6, CUFF);
    B(-5, 5, -19, -16, -5, 5, DK);
    if (st >= 2) B(-3, 3, -18, -13, 5, 7, HI);
    if (st >= 3) B(-1, 1, -17, -13, 7, 8, DK);
  }
  // hollow inside so it looks wearable in the armory
  const [top, floor] = { raider: [-14, -22], ironclad: [-11, -22], arcane: [-14, -22] }[id] ?? [-10, -21];
  B(-4, 4, floor, top, -4, 4, 0); B(-4, 4, floor, floor + 1, -4, 4, hex([40, 40, 46]));
  if (s < 0) for (const p of out) p[4] = -p[4];
  return out;
}
const bootGeoCache = {};
const bootGeo = (id, st, s, U) => bootGeoCache[id + ':' + st + ':' + s + ':' + U] ??= voxelGeos(bootPieces(id, st, s), U / ARMOR_PX).lit;
// put boots on a character (null takes them off)
function dressBoots(ch, b) {
  if (ch.boots) {
    for (const m of ch.boots.meshes) m.parent.remove(m);
    ch.mats.splice(ch.mats.indexOf(ch.boots.mat), 1); ch.boots.mat.dispose(); ch.boots = null;
  }
  if (!b || !bootOf(b.id)) return;
  const mat = armorMat(), meshes = [[ch.legL, 1], [ch.legR, -1]].map(([leg, s]) => { const m = new THREE.Mesh(bootGeo(b.id, b.st, s, ch.U), mat); leg.add(m); return m; });
  ch.mats.push(mat); ch.boots = { mat, meshes, key: b.id + b.st };
}
// armory preview
function bootsModel(id, st, g) {
  for (const s of [1, -1]) { const m = new THREE.Mesh(bootGeo(id, st, s, 1 / 16), gunLit); m.position.x = s * 2 / 16; m.rotation.z = s * LEG_SPREAD; g.add(m); }
}
// boots pictures, at their 3-star size
const bootPic = (id, st) => modelPic('boots:' + id + st, g => bootsModel(id, st, g), { yaw: .6, tilt: .3, w: 200, h: 180, ref: ['boots:' + id, g => bootsModel(id, 3, g)] });
