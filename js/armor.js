// Armor you wear: one item, Basic Armor, bought once in the armory (WEAR page) and then upgraded one star at a time.
// Each star is a different chestplate. prof.armor = how many stars you have (0 = none, 1 = Wooden ... 8 = Champion).
// It's worn in every bot match (not zombie waves, which has its own shop armor). Bots wear the same tier you do.
// hp = the armor bar you spawn with: it takes damage before your health.
// dr = share of every hit it takes off before anything else (so Ruby: a 50 hit does 46, and the armor bar soaks that first).
// unlock = account level you need for that star, price = coins for that star (the first star is buying it)
// shape = how the chestplate is built (see armorPieces): t = how far the plates stand off the chest, yb = where the plate ends at the bottom
//   (the body runs y -12..12, so Wooden only covers the upper chest and each star reaches a bit lower),
//   pad = shoulder pads [how far past the outside of the arm, how far down the arm], layer = a second plate on the pads,
//   pecs = raised chest plates, gem = size of the chest gem, shards = crystals on each pad,
//   tas = how far the plates over the hips hang below the plate, spine = a ridge down the back
const ARMOR_TIERS = [
  { id: 'wood', name: 'Wooden', hp: 50, dr: 0, unlock: 2, price: 10, c: [150, 104, 58], hi: [190, 144, 90], dk: [98, 64, 32],
    shape: { t: 2, yb: 3, pad: [1, 3] } },
  { id: 'steel', name: 'Steel', hp: 75, dr: 0, unlock: 5, price: 40, c: [158, 164, 174], hi: [212, 218, 226], dk: [96, 102, 112],
    shape: { t: 2, yb: 1, pad: [1, 4] } },
  { id: 'gold', name: 'Gold', hp: 100, dr: 0, unlock: 9, price: 100, c: [226, 178, 40], hi: [255, 226, 110], dk: [158, 112, 16],
    shape: { t: 3, yb: -1, pad: [1, 5], pecs: true } },
  { id: 'amethyst', name: 'Amethyst', hp: 100, dr: .04, unlock: 14, price: 200, c: [146, 88, 206], hi: [198, 152, 246], dk: [88, 46, 144], gem: [238, 218, 255],
    shape: { t: 3, yb: -3, pad: [2, 6], pecs: true, gem: 6, shards: 1 } },
  { id: 'ruby', name: 'Ruby', hp: 100, dr: .08, unlock: 20, price: 320, c: [196, 38, 58], hi: [244, 104, 114], dk: [122, 16, 34], gem: [255, 198, 202],
    shape: { t: 3, yb: -4, pad: [2, 7], layer: true, pecs: true, gem: 6, shards: 1, tas: 3 } },
  { id: 'emerald', name: 'Emerald', hp: 100, dr: .12, unlock: 27, price: 450, c: [36, 164, 86], hi: [110, 226, 150], dk: [16, 102, 50], gem: [206, 255, 224],
    shape: { t: 4, yb: -5, pad: [2, 8], layer: true, pecs: true, gem: 8, shards: 2, tas: 3 } },
  { id: 'diamond', name: 'Diamond', hp: 100, dr: .16, unlock: 35, price: 600, c: [86, 206, 222], hi: [180, 246, 252], dk: [34, 142, 164], gem: [246, 255, 255],
    shape: { t: 4, yb: -6, pad: [2, 9], layer: true, pecs: true, gem: 8, shards: 2, tas: 4, spine: true } },
  { id: 'champion', name: 'Champion', hp: 100, dr: .2, unlock: 50, price: 1000, c: [50, 50, 58], hi: [92, 92, 104], dk: [24, 24, 30], champ: true,
    shape: { t: 4, yb: -6, pad: [2, 9], layer: true, pecs: true, gem: 8, shards: 2, tas: 4, spine: true } },
];
const ARMOR_MAX = ARMOR_TIERS.length;
const ARMOR_ITEM = 'Basic Armor';
// the four gems set into Champion armor
const GEMS = { am: [178, 122, 238], ru: [228, 58, 76], em: [58, 204, 112], di: [134, 234, 246] };
const armorOf = n => ARMOR_TIERS[n - 1] ?? null;
const armorStars = n => '★'.repeat(n) + '☆'.repeat(ARMOR_MAX - n);
// the tier worn in this match: yours in bot matches, none in zombie waves
const matchArmor = () => pvp() ? Math.min(ARMOR_MAX, prof.armor | 0) : 0;
// puts on (or takes off) the armor for this match: full armor bar and its damage cut
function wearArmor() {
  const T = armorOf(matchArmor());
  P.maxArmor = T ? T.hp : 0; P.dr = T ? T.dr : 0; P.armor = P.maxArmor;
}

// ---- the chestplate model: voxel pixel art built the same way as the guns (weapons.js voxelGeos), so it has the same
// black outline. Sizes are in armor pixels, half a skin pixel each, measured from the middle of the body:
// the body is x -8..8 (+x is the character's left), y -12..12, z -4..4 (+z is the front). The neck is x -4..4, y 12..14,
// the head sits on it at y 14+. The arms hang at x 8..16, so the chestplate stays inside x -8..8: a front plate and a back plate
// joined over the shoulders beside the neck, open down the sides where the arms are. The shoulder pads ride on the arms.
// Parts that should show their color are 3+ pixels across (2 is all outline).
const rgbHex = a => a.reduce((h, v) => h * 256 + Math.max(0, Math.min(255, Math.round(v))), 0);
// how far the neckline dips below the top of the plate, by column from the middle out (0 = the two middle columns)
const NECK_FRONT = [4, 4, 4, 3, 2, 1, 0, 0], NECK_BACK = [2, 2, 2, 1, 0, 0, 0, 0];
const armorCols = T => {
  const hex = a => palIdx(rgbHex(a));
  return { hex, C: hex(T.c), HI: hex(T.hi), DK: hex(T.dk), MID: hex(mixC(T.c, T.dk, .5)),
    gemC: T.gem ? hex(T.c.map((v, k) => (v + T.gem[k]) / 2)) : hex(T.hi), gemL: T.gem ? hex(T.gem) : hex(T.hi),
    champGems: [GEMS.am, GEMS.ru, GEMS.em, GEMS.di].map(hex) };
};
const pieceBox = out => (x0, x1, y0, y1, z0, z1, m) => out.push([x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
// the chestplate (rides on the body)
function armorPieces(n, team = null) {
  const T = armorOf(n), S = T.shape, out = [];
  const { hex, C, HI, DK, MID, gemC, gemL, champGems } = armorCols(T);
  const B = pieceBox(out);
  const M = (x0, x1, y0, y1, z0, z1, m) => { B(x0, x1, y0, y1, z0, z1, m); B(-x1, -x0, y0, y1, z0, z1, m); };
  const zf = 4 + S.t, yb = S.yb;
  const FB = (x0, x1, y0, y1, m, d = 0) => { B(x0, x1, y0, y1, 4, zf + d, m); B(x0, x1, y0, y1, -zf - d, -4, m); }; // front and back plates

  // front and back plates, darker along the bottom, joined over the shoulders beside the neck
  FB(-8, 8, yb, 13, C); FB(-8, 8, yb, yb + 1, DK);
  M(5, 8, 12, 13, -4, 4, C);
  if (T.id === 'wood') { // planks with dark seams, and two leather straps over the shoulders
    for (let y = yb + 4; y < 12; y += 4) FB(-8, 8, y, y + 1, MID);
    const leather = hex([92, 60, 34]);
    for (const x of [5, -7]) { FB(x, x + 2, yb, 13, leather); B(x, x + 2, 12, 13, -4, 4, leather); }
    M(5, 7, 6, 8, zf - 1, zf, hex([150, 150, 156]));
  }
  if (T.id === 'steel') { // overlapping bands, rivets in the corners
    for (let y = yb + 4; y < 11; y += 4) FB(-8, 8, y, y + 1, MID);
    for (const y of [yb + 3, 10]) M(6, 7, y, y + 1, zf - 1, zf, HI);
  }
  // the belt stands out from the plate. In team matches it's the team's color, so you can tell sides apart
  const beltC = team ? hex(team) : DK;
  if (T.id !== 'wood') FB(-8, 8, yb, yb + 3, beltC, 1);
  else FB(-8, 8, yb, yb + 2, team ? beltC : hex([92, 60, 34]));
  // raised chest plates, with a lighter top edge
  if (S.pecs) {
    M(1, 8, 1, 9, zf, zf + 1, C); M(1, 8, 8, 9, zf, zf + 1, HI);
  }
  // the chest gem: one gem in its tier's color (Champion: a square of all four), standing out from the chest plates
  if (S.gem) {
    const g = S.gem / 2, y0 = 9 - S.gem; // its top lines up with the top of the chest plates
    if (T.champ) [[-g, 0, y0 + g], [0, g, y0 + g], [-g, 0, y0], [0, g, y0]].forEach(([x0, x1, y], k) => B(x0, x1, y, y + g, zf, zf + 2, champGems[k]));
    else { B(-g, g, y0, 9, zf, zf + 2, gemC); B(-g, -g + 2, 7, 9, zf + 1, zf + 2, gemL); }
  } else if (T.id === 'gold') B(-2, 2, 4, 8, zf, zf + 2, HI);
  // buckle
  const buck = T.champ ? champGems[0] : T.gem ? gemC : HI;
  if (T.id !== 'wood') B(-2, 2, yb, yb + 3, zf + 1, zf + 2, buck);
  // plates hanging over the hips, front and back
  if (S.tas) for (const s of [1, -1]) {
    const [z0, z1] = s > 0 ? [4, zf] : [-zf, -4];
    const y0 = yb - S.tas;
    M(1, 8, y0, yb, z0, z1, C); M(1, 8, y0, y0 + 1, z0, z1, DK);
  }
  // a ridge down the back
  if (S.spine) B(-2, 2, yb + 3, 12, -zf - 2, -zf, HI);
  // the neckline: cut down from the top of each plate, deeper at the front, and nothing over the neck itself
  NECK_FRONT.forEach((d, a) => { if (d) for (const x of [a, -a - 1]) B(x, x + 1, 13 - d, 13, 4, zf + 3, 0); });
  NECK_BACK.forEach((d, a) => { if (d) for (const x of [a, -a - 1]) B(x, x + 1, 13 - d, 13, -zf - 3, -4, 0); });
  return out;
}
// one shoulder pad (rides on its arm), s = 1 for the character's left arm (+x), -1 for the right. Same armor pixels as the chest:
// it caps the top of the arm and hangs down its front, back and outside, open on the side against the body.
// Higher stars hang further down the arm, and add a second plate on top and crystals
function armorPadPieces(n, s) {
  const T = armorOf(n), S = T.shape, out = [];
  const { C, HI, DK, MID, gemC, champGems } = armorCols(T);
  const B = pieceBox(out);
  const [ex, len] = S.pad, x1 = 16 + ex, y1 = T.id === 'wood' ? 14 : 15, ylo = 12 - len, zp = 4 + Math.max(1, S.t - 1);
  const ring = (y0, y1, m) => { B(8, x1, y0, y1, 4, zp, m); B(8, x1, y0, y1, -zp, -4, m); B(16, x1, y0, y1, -zp, zp, m); }; // front, back, outside
  B(8, x1, 12, y1, -zp, zp, C); B(8, x1, y1 - 1, y1, -zp, zp, HI);
  ring(ylo, 12, C); ring(ylo, ylo + 1, DK);
  if (T.id === 'wood') ring(ylo + 2, ylo + 3, MID); // a plank seam
  if (T.id === 'steel') B(x1 - 1, x1, 9, 10, -1, 1, HI); // a rivet on the outside
  if (len >= 7) ring(12 - Math.ceil(len / 2), 13 - Math.ceil(len / 2), MID); // the long pads are two plates, one over the other
  let top = y1;
  if (S.layer) { B(10, x1 - 1, y1, y1 + 2, -4, 4, C); top += 2; }
  for (let k = 0; k < (S.shards ?? 0); k++) {
    const x = 10 + k * 3, h = k === 1 ? 3 : 2, col = T.champ ? champGems[(s > 0 ? k : k + 3) % 4] : gemC;
    B(x, x + 3, top, top + h, -2, 1, col);
  }
  if (s < 0) for (const p of out) p[4] = -p[4];
  return out;
}
// the whole set at once, for the armory's spinning preview and its icon
const armorAllPieces = n => [...armorPieces(n), ...armorPadPieces(n, 1), ...armorPadPieces(n, -1)];
const ARMOR_PX = 2; // armor pixels per skin pixel
const armorGeoCache = {};
// part: 'body' (the chestplate), 'L'/'R' (a shoulder pad) or 'all'
function armorGeo(n, team, U, part = 'body') {
  const k = n + ':' + part + ':' + (part === 'body' ? team ?? '' : '') + ':' + U;
  const pieces = part === 'body' ? armorPieces(n, team) : part === 'all' ? armorAllPieces(n) : armorPadPieces(n, part === 'L' ? 1 : -1);
  return armorGeoCache[k] ??= voxelGeos(pieces, U / ARMOR_PX).lit;
}
// its own material per character, so it flashes when they're hurt and fades with their ghost. Lit like the guns
const armorMat = () => { const m = new THREE.MeshLambertMaterial({ vertexColors: true }); m.onBeforeCompile = gunLit.onBeforeCompile; return m; };
// puts armor tier n on a character from buildChar (0 takes it off). The chestplate rides on the body and each pad on its arm,
// so the pads swing with the arms. team = the team color for the belt, in team matches
function dressArmor(ch, n, team = null) {
  if (ch.armor) {
    for (const m of ch.armor.meshes) m.parent.remove(m);
    ch.mats.splice(ch.mats.indexOf(ch.armor.mat), 1); ch.armor.mat.dispose(); ch.armor = null;
  }
  if (!n) return;
  const mat = armorMat(), U = ch.U, mesh = (part, parent, x, y) => {
    const m = new THREE.Mesh(armorGeo(n, team, U, part), mat); m.position.set(x * U, y * U, 0); parent.add(m); return m;
  };
  // the pad geometry is measured from the middle of the body (18 up); each arm pivots at (+-6, 22)
  const meshes = [mesh('body', ch.body, 0, 0), mesh('L', ch.armL, -6, -4), mesh('R', ch.armR, 6, -4)];
  ch.mats.push(mat); ch.armor = { n, mat, meshes };
}
// the chestplate and pads on their own, for the spinning preview in the armory (geometry is shared, nothing to free)
function armorModel(n, g) { g.add(new THREE.Mesh(armorGeo(n, null, 1 / 16, 'all'), gunLit)); }

// ---- icons: the chestplate seen from the front, every tier in the same frame (so the bigger ones look bigger),
// drawn 4 screen pixels per armor pixel, with a black outline round it and where a raised part stands in front of another
const armorSpriteCache = [];
function armorSprite(k) { // k = tier index (0 = Wooden)
  if (armorSpriteCache[k]) return armorSpriteCache[k];
  const { lo, NX, NY, NZ, at } = voxelGrid(armorAllPieces(k + 1));
  const W = 42, H = 38, X0 = -21, YT = 21, K = 4; // frame: x -21..21, y 21 down to -17 (Champion just fits)
  const dep = new Float32Array(W * H).fill(-99), col = new Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const x = X0 + c - lo[0], y = YT - r - lo[1];
    for (let z = NZ - 1; z >= 0; z--) { const m = at(x, y, z); if (m) { dep[r * W + c] = z; col[r * W + c] = gunPal[m].c; break; } }
  }
  const cv = document.createElement('canvas'); cv.width = W * K; cv.height = H * K;
  const g = cv.getContext('2d'), filled = (r, c) => r >= 0 && c >= 0 && r < H && c < W && dep[r * W + c] > -99;
  let zmax = 0; dep.forEach(d => zmax = Math.max(zmax, d));
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = r * W + c, d = dep[i];
    let black;
    if (d === -99) black = filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1);
    else black = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([a, b]) => filled(a, b) && dep[a * W + b] > d);
    if (d === -99 && !black) continue;
    if (black) g.fillStyle = '#000';
    else {
      const sh = Math.max(.6, 1 - (zmax - d) * .06), h = col[i].getHex();
      g.fillStyle = `rgb(${(h >> 16 & 255) * sh | 0},${(h >> 8 & 255) * sh | 0},${(h & 255) * sh | 0})`;
    }
    g.fillRect(c * K, r * K, K, K);
  }
  return armorSpriteCache[k] = cv.toDataURL();
}
