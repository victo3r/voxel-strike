// Armor you wear: one item, Basic Armor, bought once in the armory (WEAR page) and then upgraded one star at a time.
// Each star is a different chestplate. prof.armor = how many stars you have (0 = none, 1 = Wooden ... 8 = Champion).
// It's worn in every bot match (not zombie waves, which has its own shop armor). Bots wear the same tier you do.
// hp = the armor bar you spawn with: it takes damage before your health.
// dr = share of every hit it takes off before anything else (so Ruby: a 50 hit does 46, and the armor bar soaks that first).
// unlock = account level you need for that star, price = coins for that star (the first star is buying it)
// shape = how the chestplate is built (see armorPieces): t = how far the plates stand off the chest, yb = where the plate ends at the bottom,
//   pad = shoulder pads [outer x, top y, bottom of the side plate], layer = a second plate on the pads, pecs = raised chest plates,
//   gem = size of the chest gem, shards = crystals on each pad, tas = where the plates over the hips end, spine = a ridge down the back
const ARMOR_TIERS = [
  { id: 'wood', name: 'Wooden', hp: 50, dr: 0, unlock: 2, price: 10, c: [150, 104, 58], hi: [190, 144, 90], dk: [98, 64, 32],
    shape: { t: 2, yb: -8 } },
  { id: 'steel', name: 'Steel', hp: 75, dr: 0, unlock: 5, price: 40, c: [158, 164, 174], hi: [212, 218, 226], dk: [96, 102, 112],
    shape: { t: 2, yb: -10, pad: [14, 15] } },
  { id: 'gold', name: 'Gold', hp: 100, dr: 0, unlock: 9, price: 100, c: [226, 178, 40], hi: [255, 226, 110], dk: [158, 112, 16],
    shape: { t: 3, yb: -11, pad: [16, 16], pecs: true } },
  { id: 'amethyst', name: 'Amethyst', hp: 100, dr: .04, unlock: 14, price: 200, c: [146, 88, 206], hi: [198, 152, 246], dk: [88, 46, 144], gem: [238, 218, 255],
    shape: { t: 3, yb: -11, pad: [17, 16, 8], pecs: true, gem: 6, shards: 1 } },
  { id: 'ruby', name: 'Ruby', hp: 100, dr: .08, unlock: 20, price: 320, c: [196, 38, 58], hi: [244, 104, 114], dk: [122, 16, 34], gem: [255, 198, 202],
    shape: { t: 3, yb: -11, pad: [18, 17, 7], layer: true, pecs: true, gem: 6, shards: 1, tas: -15 } },
  { id: 'emerald', name: 'Emerald', hp: 100, dr: .12, unlock: 27, price: 450, c: [36, 164, 86], hi: [110, 226, 150], dk: [16, 102, 50], gem: [206, 255, 224],
    shape: { t: 4, yb: -11, pad: [18, 17, 6], layer: true, pecs: true, gem: 8, shards: 2, tas: -15 } },
  { id: 'diamond', name: 'Diamond', hp: 100, dr: .16, unlock: 35, price: 600, c: [86, 206, 222], hi: [180, 246, 252], dk: [34, 142, 164], gem: [246, 255, 255],
    shape: { t: 4, yb: -11, pad: [19, 18, 5], layer: true, pecs: true, gem: 8, shards: 3, tas: -16, spine: true } },
  { id: 'champion', name: 'Champion', hp: 100, dr: .2, unlock: 50, price: 1000, c: [50, 50, 58], hi: [92, 92, 104], dk: [24, 24, 30], champ: true,
    shape: { t: 4, yb: -11, pad: [19, 19, 4], layer: true, pecs: true, gem: 8, shards: 3, tas: -16, spine: true } },
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
// the body is x -8..8 (+x is the character's left), y -12..12, z -4..4 (+z is the front). The arms hang at x 8..16,
// the head sits on top at y 12+ over x -8..8, so the shoulder pads start at x 8 and the plates stay below the head.
// Parts that should show their color are 3+ pixels across (2 is all outline).
const rgbHex = a => a.reduce((h, v) => h * 256 + Math.max(0, Math.min(255, Math.round(v))), 0);
function armorPieces(n, team = null) {
  const T = armorOf(n), S = T.shape, out = [], hex = a => palIdx(rgbHex(a));
  const C = hex(T.c), HI = hex(T.hi), DK = hex(T.dk), MID = hex(mixC(T.c, T.dk, .5));
  const gemC = T.gem ? hex(T.c.map((v, k) => (v + T.gem[k]) / 2)) : HI, gemL = T.gem ? hex(T.gem) : HI;
  const B = (x0, x1, y0, y1, z0, z1, m) => out.push([x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
  const M = (x0, x1, y0, y1, z0, z1, m) => { B(x0, x1, y0, y1, z0, z1, m); B(-x1, -x0, y0, y1, z0, z1, m); };
  const zf = 4 + S.t, yb = S.yb, champGems = [GEMS.am, GEMS.ru, GEMS.em, GEMS.di].map(hex);

  // the shell round the chest, darker along its bottom
  B(-9, 9, yb, 13, -zf, zf, C);
  B(-9, 9, yb, yb + 1, -zf, zf, DK);
  if (T.id === 'wood') { // planks with dark seams, and two leather straps over the shoulders
    for (let y = yb + 4; y < 12; y += 4) B(-9, 9, y, y + 1, -zf, zf, MID);
    M(3, 6, yb, 13, -zf, zf, hex([92, 60, 34]));
    M(3, 6, 5, 7, zf - 1, zf, hex([150, 150, 156]));
  }
  if (T.id === 'steel') { // overlapping bands, rivets in the corners
    for (const y of [-6, -1, 4]) B(-9, 9, y, y + 1, -zf, zf, MID);
    for (const y of [-9, 9]) M(6, 7, y, y + 1, zf - 1, zf, HI);
  }
  // the belt stands out from the plate. In team matches it's the team's color, so you can tell sides apart
  const beltC = team ? hex(team) : DK;
  if (T.id !== 'wood') B(-9, 9, yb, yb + 3, -zf - 1, zf + 1, beltC);
  else B(-9, 9, yb, yb + 2, -zf, zf, team ? beltC : hex([92, 60, 34]));
  // raised chest plates, with a lighter top edge
  if (S.pecs) {
    M(1, 8, 1, 10, zf, zf + 1, C); M(1, 8, 9, 10, zf, zf + 1, HI);
  }
  // the chest gem: one gem in its tier's color (Champion: a square of all four), standing out from the chest plates
  if (S.gem) {
    const g = S.gem / 2, y0 = 10 - S.gem; // its top lines up with the top of the chest plates
    if (T.champ) [[-g, 0, y0 + g], [0, g, y0 + g], [-g, 0, y0], [0, g, y0]].forEach(([x0, x1, y], k) => B(x0, x1, y, y + g, zf, zf + 2, champGems[k]));
    else { B(-g, g, y0, 10, zf, zf + 2, gemC); B(-g, -g + 2, 8, 10, zf + 1, zf + 2, gemL); }
  } else if (T.id === 'gold') B(-2, 2, 4, 8, zf, zf + 2, HI);
  // buckle
  const buck = T.champ ? champGems[0] : T.gem ? gemC : HI;
  if (T.id !== 'wood') B(-2, 2, yb, yb + 3, zf + 1, zf + 2, buck);
  // plates hanging over the hips, front and back
  if (S.tas) for (const s of [1, -1]) {
    const [z0, z1] = s > 0 ? [4, zf] : [-zf, -4];
    M(1, 8, S.tas, yb, z0, z1, C); M(1, 8, S.tas, S.tas + 1, z0, z1, DK);
  }
  // a ridge down the back
  if (S.spine) B(-2, 2, yb + 3, 12, -zf - 2, -zf, HI);
  // shoulder pads over the tops of the arms, then a plate down the outside of the arm, a second plate on top, and crystals
  if (S.pad) {
    const [x1, y1, lip] = S.pad;
    M(8, x1, 12, y1, -6, 6, C); M(8, x1, y1 - 1, y1, -6, 6, HI); M(8, x1, 12, 13, -6, 6, DK);
    if (lip) { M(16, x1, lip, 13, -6, 6, C); M(16, x1, lip, lip + 1, -6, 6, DK); }
    let top = y1;
    if (S.layer) { M(10, x1 - 1, y1, y1 + 2, -4, 4, C); M(10, x1 - 1, y1 + 1, y1 + 2, -4, 4, HI); top += 2; }
    for (let k = 0; k < (S.shards ?? 0); k++) {
      const x = 10 + k * 3, h = k === 1 ? 5 : 3, col = T.champ ? champGems[k % 4] : gemC;
      B(x, x + 3, top, top + h, -2, 1, col); B(-x - 3, -x, top, top + h, -2, 1, T.champ ? champGems[(k + 3) % 4] : col);
    }
  }
  return out;
}
const ARMOR_PX = 2; // armor pixels per skin pixel
const armorGeoCache = {};
function armorGeo(n, team, U) {
  const k = n + ':' + (team ?? '') + ':' + U;
  return armorGeoCache[k] ??= voxelGeos(armorPieces(n, team), U / ARMOR_PX).lit;
}
// its own material per character, so it flashes when they're hurt and fades with their ghost. Lit like the guns
const armorMat = () => { const m = new THREE.MeshLambertMaterial({ vertexColors: true }); m.onBeforeCompile = gunLit.onBeforeCompile; return m; };
// puts armor tier n on a character from buildChar (0 takes it off). It rides on the body, so it moves with it.
// team = the team color for the belt, in team matches
function dressArmor(ch, n, team = null) {
  if (ch.armor) {
    ch.armor.mesh.parent.remove(ch.armor.mesh);
    ch.mats.splice(ch.mats.indexOf(ch.armor.mat), 1); ch.armor.mat.dispose(); ch.armor = null;
  }
  if (!n) return;
  const mat = armorMat(), mesh = new THREE.Mesh(armorGeo(n, team, ch.U), mat);
  ch.body.add(mesh); ch.mats.push(mat); ch.armor = { n, mat, mesh };
}
// the chestplate on its own, for the spinning preview in the armory (geometry is shared, nothing to free)
function armorModel(n, g) { g.add(new THREE.Mesh(armorGeo(n, null, 1 / 16), gunLit)); }

// ---- icons: the chestplate seen from the front, every tier in the same frame (so the bigger ones look bigger),
// drawn 4 screen pixels per armor pixel, with a black outline round it and where a raised part stands in front of another
const armorSpriteCache = [];
function armorSprite(k) { // k = tier index (0 = Wooden)
  if (armorSpriteCache[k]) return armorSpriteCache[k];
  const { lo, NX, NY, NZ, at } = voxelGrid(armorPieces(k + 1));
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
