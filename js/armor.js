// armor tiers, one per star (hp = armor bar, dr = damage cut per hit)
const ARMOR_TIERS = [
  { id: 'wood', name: 'Wooden', hp: 40, dr: 0, unlock: 2, price: 10, c: [150, 104, 58], hi: [190, 144, 90], dk: [98, 64, 32],
    shape: { t: 2, yb: 3, pad: [1, 3] } },
  { id: 'steel', name: 'Steel', hp: 60, dr: 0, unlock: 5, price: 40, c: [158, 164, 174], hi: [212, 218, 226], dk: [96, 102, 112],
    shape: { t: 2, yb: 1, pad: [1, 4] } },
  { id: 'gold', rar: 'rare', name: 'Gold', hp: 80, dr: 0, unlock: 9, price: 100, c: [226, 178, 40], hi: [255, 226, 110], dk: [158, 112, 16],
    shape: { t: 3, yb: -1, pad: [1, 5], pecs: true } },
  { id: 'amethyst', rar: 'rare', name: 'Amethyst', hp: 100, dr: 0, unlock: 14, price: 200, c: [146, 88, 206], hi: [198, 152, 246], dk: [88, 46, 144], gem: [238, 218, 255],
    shape: { t: 3, yb: -3, pad: [2, 6], pecs: true, gem: 6, shards: 1 } },
  { id: 'ruby', rar: 'epic', name: 'Ruby', hp: 100, dr: .04, unlock: 20, price: 320, c: [196, 38, 58], hi: [244, 104, 114], dk: [122, 16, 34], gem: [255, 198, 202],
    shape: { t: 3, yb: -4, pad: [2, 7], layer: true, pecs: true, gem: 6, shards: 1, tas: 3 } },
  { id: 'emerald', rar: 'epic', name: 'Emerald', hp: 100, dr: .08, unlock: 27, price: 450, c: [36, 164, 86], hi: [110, 226, 150], dk: [16, 102, 50], gem: [206, 255, 224],
    shape: { t: 4, yb: -5, pad: [2, 8], layer: true, pecs: true, gem: 8, shards: 2, tas: 3 } },
  { id: 'diamond', rar: 'legend', name: 'Diamond', hp: 100, dr: .12, unlock: 35, price: 600, c: [86, 206, 222], hi: [180, 246, 252], dk: [34, 142, 164], gem: [246, 255, 255],
    shape: { t: 4, yb: -6, pad: [2, 9], layer: true, pecs: true, gem: 8, shards: 2, tas: 4, spine: true } },
  { id: 'champion', rar: 'legend', name: 'Champion', hp: 100, dr: .16, unlock: 50, price: 1000, c: [50, 50, 58], hi: [92, 92, 104], dk: [24, 24, 30], champ: true,
    shape: { t: 4, yb: -6, pad: [2, 9], layer: true, pecs: true, gem: 8, shards: 2, tas: 4, spine: true } },
];
const ARMOR_MAX = ARMOR_TIERS.length;
const ARMOR_ITEM = 'Basic Armor';
// gems on Champion armor
const GEMS = { am: [178, 122, 238], ru: [228, 58, 76], em: [58, 204, 112], di: [134, 234, 246] };
const armorOf = n => ARMOR_TIERS[n - 1] ?? null;
const armorStars = n => starRow(n, n, ARMOR_MAX);
// the armor you picked to wear, your best by default
const wornArmor = () => { const n = Math.min(ARMOR_MAX, prof.armor | 0), u = prof.armorUse | 0; return u ? Math.min(u, n) : n; };
const matchArmor = () => wornArmor();
// bots get random armor up to your best tier
const BOT_BARE = .15;
const botArmor = () => { const n = Math.max(1, Math.min(ARMOR_MAX, prof.armor | 0)); return Math.random() >= BOT_BARE ? 1 + (Math.random() * n | 0) : 0; };
function wearArmor() {
  const T = armorOf(matchArmor());
  P.maxArmor = T ? T.hp : 0; P.dr = T ? T.dr : 0; P.armor = P.maxArmor;
}

// ---- chestplate model (units are half skin pixels from the body's middle)
const rgbHex = a => a.reduce((h, v) => h * 256 + Math.max(0, Math.min(255, Math.round(v))), 0);
// neckline depth per column, from the middle out
const NECK_FRONT = [4, 4, 4, 3, 2, 1, 0, 0], NECK_BACK = [2, 2, 2, 1, 0, 0, 0, 0];
const armorCols = T => {
  const hex = a => palIdx(rgbHex(a));
  return { hex, C: hex(T.c), HI: hex(T.hi), DK: hex(T.dk), MID: hex(mixC(T.c, T.dk, .5)),
    gemC: T.gem ? hex(T.c.map((v, k) => (v + T.gem[k]) / 2)) : hex(T.hi), gemL: T.gem ? hex(T.gem) : hex(T.hi),
    champGems: [GEMS.am, GEMS.ru, GEMS.em, GEMS.di].map(hex) };
};
const pieceBox = out => (x0, x1, y0, y1, z0, z1, m) => out.push([x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
// the chestplate
function armorPieces(n, team = null) {
  const T = armorOf(n), S = T.shape, out = [];
  const { hex, C, HI, DK, MID, gemC, gemL, champGems } = armorCols(T);
  const B = pieceBox(out);
  const M = (x0, x1, y0, y1, z0, z1, m) => { B(x0, x1, y0, y1, z0, z1, m); B(-x1, -x0, y0, y1, z0, z1, m); };
  const zf = 4 + S.t, yb = S.yb;
  const FB = (x0, x1, y0, y1, m, d = 0) => { B(x0, x1, y0, y1, 4, zf + d, m); B(x0, x1, y0, y1, -zf - d, -4, m); }; // front and back plates

  // front and back plates
  FB(-8, 8, yb, 13, C); FB(-8, 8, yb, yb + 1, DK);
  M(5, 8, 12, 13, -4, 4, C);
  if (T.id === 'wood') { // planks and leather straps
    for (let y = yb + 4; y < 12; y += 4) FB(-8, 8, y, y + 1, MID);
    const leather = hex([92, 60, 34]);
    for (const x of [5, -7]) { FB(x, x + 2, yb, 13, leather); B(x, x + 2, 12, 13, -4, 4, leather); }
    M(5, 7, 6, 8, zf - 1, zf, hex([150, 150, 156]));
  }
  if (T.id === 'steel') { // bands and rivets
    for (let y = yb + 4; y < 11; y += 4) FB(-8, 8, y, y + 1, MID);
    for (const y of [yb + 3, 10]) M(6, 7, y, y + 1, zf - 1, zf, HI);
  }
  // belt, in the team color during team matches
  const beltC = team ? hex(team) : DK;
  if (T.id !== 'wood') FB(-8, 8, yb, yb + 3, beltC, 1);
  else FB(-8, 8, yb, yb + 2, team ? beltC : hex([92, 60, 34]));
  // chest plates
  if (S.pecs) {
    M(1, 8, 1, 9, zf, zf + 1, C); M(1, 8, 8, 9, zf, zf + 1, HI);
  }
  // chest gem (Champion gets all four)
  if (S.gem) {
    const g = S.gem / 2, y0 = 9 - S.gem;
    if (T.champ) [[-g, 0, y0 + g], [0, g, y0 + g], [-g, 0, y0], [0, g, y0]].forEach(([x0, x1, y], k) => B(x0, x1, y, y + g, zf, zf + 2, champGems[k]));
    else { B(-g, g, y0, 9, zf, zf + 2, gemC); B(-g, -g + 2, 7, 9, zf + 1, zf + 2, gemL); }
  } else if (T.id === 'gold') B(-2, 2, 4, 8, zf, zf + 2, HI);
  // buckle
  const buck = T.champ ? champGems[0] : T.gem ? gemC : HI;
  if (T.id !== 'wood') B(-2, 2, yb, yb + 3, zf + 1, zf + 2, buck);
  // hip plates
  if (S.tas) for (const s of [1, -1]) {
    const [z0, z1] = s > 0 ? [4, zf] : [-zf, -4];
    const y0 = yb - S.tas;
    M(1, 8, y0, yb, z0, z1, C); M(1, 8, y0, y0 + 1, z0, z1, DK);
  }
  // back ridge
  if (S.spine) B(-2, 2, yb + 3, 12, -zf - 2, -zf, HI);
  // cut out the neckline
  NECK_FRONT.forEach((d, a) => { if (d) for (const x of [a, -a - 1]) B(x, x + 1, 13 - d, 13, 4, zf + 3, 0); });
  NECK_BACK.forEach((d, a) => { if (d) for (const x of [a, -a - 1]) B(x, x + 1, 13 - d, 13, -zf - 3, -4, 0); });
  return out;
}
// one shoulder pad (s = 1 for the left arm, -1 for the right)
function armorPadPieces(n, s) {
  const T = armorOf(n), S = T.shape, out = [];
  const { C, HI, DK, MID, gemC, champGems } = armorCols(T);
  const B = pieceBox(out);
  const [ex, len] = S.pad, x1 = 16 + ex, y1 = T.id === 'wood' ? 14 : 15, ylo = 12 - len, zp = 4 + Math.max(1, S.t - 1);
  const ring = (y0, y1, m) => { B(8, x1, y0, y1, 4, zp, m); B(8, x1, y0, y1, -zp, -4, m); B(16, x1, y0, y1, -zp, zp, m); };
  B(8, x1, 12, y1, -zp, zp, C); B(8, x1, y1 - 1, y1, -zp, zp, HI);
  ring(ylo, 12, C); ring(ylo, ylo + 1, DK);
  if (T.id === 'wood') ring(ylo + 2, ylo + 3, MID);
  if (T.id === 'steel') B(x1 - 1, x1, 9, 10, -1, 1, HI);
  if (len >= 7) ring(12 - Math.ceil(len / 2), 13 - Math.ceil(len / 2), MID); // long pads look like two plates
  let top = y1;
  if (S.layer) { B(10, x1 - 1, y1, y1 + 2, -4, 4, C); top += 2; }
  for (let k = 0; k < (S.shards ?? 0); k++) {
    const x = 10 + k * 3, h = k === 1 ? 3 : 2, col = T.champ ? champGems[(s > 0 ? k : k + 3) % 4] : gemC;
    B(x, x + 3, top, top + h, -2, 1, col);
  }
  if (s < 0) for (const p of out) p[4] = -p[4];
  return out;
}
// the whole set, for the armory preview and icon
const armorAllPieces = n => [...armorPieces(n), ...armorPadPieces(n, 1), ...armorPadPieces(n, -1)];
const ARMOR_PX = 2; // armor pixels per skin pixel
const armorGeoCache = {};
// part: 'body', 'L', 'R' or 'all'
function armorGeo(n, team, U, part = 'body') {
  const k = n + ':' + part + ':' + (part === 'body' ? team ?? '' : '') + ':' + U;
  const pieces = part === 'body' ? armorPieces(n, team) : part === 'all' ? armorAllPieces(n) : armorPadPieces(n, part === 'L' ? 1 : -1);
  return armorGeoCache[k] ??= voxelGeos(pieces, U / ARMOR_PX).lit;
}
// one material per character so it can flash and fade with them
const armorMat = () => { const m = new THREE.MeshLambertMaterial({ vertexColors: true }); m.onBeforeCompile = gunLit.onBeforeCompile; return m; };
// put armor on a character (0 takes it off)
function dressArmor(ch, n, team = null) {
  if (ch.armor) {
    for (const m of ch.armor.meshes) m.parent.remove(m);
    ch.mats.splice(ch.mats.indexOf(ch.armor.mat), 1); ch.armor.mat.dispose(); ch.armor = null;
  }
  if (!n) return;
  const mat = armorMat(), U = ch.U, mesh = (part, parent, x, y) => {
    const m = new THREE.Mesh(armorGeo(n, team, U, part), mat); m.position.set(x * U, y * U, 0); parent.add(m); return m;
  };
  // pads ride on the arms so they swing with them
  const meshes = [mesh('body', ch.body, 0, 0), mesh('L', ch.armL, -6, -4), mesh('R', ch.armR, 6, -4)];
  ch.mats.push(mat); ch.armor = { n, mat, meshes };
}
// armory preview
function armorModel(n, g) { g.add(new THREE.Mesh(armorGeo(n, null, 1 / 16, 'all'), gunLit)); }

// ---- armor icons, all tiers in the same frame
const armorSpriteCache = [];
function armorSprite(k) { // k = tier index (0 = Wooden)
  if (armorSpriteCache[k]) return armorSpriteCache[k];
  const { lo, NX, NY, NZ, at } = voxelGrid(armorAllPieces(k + 1));
  const W = 42, H = 38, X0 = -21, YT = 21, K = 4; // Champion just fits
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
