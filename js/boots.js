// boots, stats per star (ids are used in saves, don't rename them)
const BOOTS = [
  { id: 'warrior', rar: 'rare', name: 'Warrior Boots', unlock: 5, price: 80, dmg: [.06, .10, .14], dr: [.04, .06, .08] },
  { id: 'raider', rar: 'rare', name: 'Raider Boots', unlock: 7, price: 120, spd: [.08, .11, .14], dj: true },
];
const BOOT_I = Object.fromEntries(BOOTS.map((B, i) => [B.id, i]));
const bootOf = id => BOOTS[BOOT_I[id]] ?? null;
const bootStars = id => prof.boots?.[id] | 0; // 0 = not bought
const bootUse = id => { const st = bootStars(id), u = prof.bootUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornBoots = () => { const id = prof.bootOn; return id && bootStars(id) ? { id, st: bootUse(id) } : null; };
const FX_NONE = { spd: 0, dmg: 0, dr: 0, dj: false };
function bootFx(b) {
  const B = b && bootOf(b.id); if (!B) return FX_NONE;
  const L = b.st - 1;
  return { spd: B.spd?.[L] ?? 0, dmg: B.dmg?.[L] ?? 0, dr: B.dr?.[L] ?? 0, dj: !!B.dj };
}
// bots get random boots, never better than yours
const BOOT_BARE = .3;
function botBoots() {
  if (Math.random() < BOOT_BARE) return null;
  const B = BOOTS[Math.random() * BOOTS.length | 0];
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
  const top = id === 'raider' ? -14 : -10, floor = id === 'raider' ? -22 : -21;
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
// boot icons, the left boot from the side
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
