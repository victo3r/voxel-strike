// Armor you wear: bought once in the armory (WEAR page), then upgraded one star at a time.
// Each star is a different armor. prof.armor = how many stars you have (0 = none, 1 = Wooden ... 8 = Champion).
// It's worn in every bot match (not zombie waves, which has its own shop armor). Bots wear the same tier you do.
// hp = the armor bar you spawn with: it takes damage before your health.
// dr = share of every hit it takes off before anything else (so Ruby: a 50 hit does 46, and the armor bar soaks that first).
// unlock = account level you need for that star, price = coins for that star (the first star is buying it)
const ARMOR_TIERS = [
  { id: 'wood', name: 'Wooden', hp: 50, dr: 0, unlock: 2, price: 10, c: [150, 104, 58], hi: [190, 144, 90], dk: [98, 64, 32] },
  { id: 'steel', name: 'Steel', hp: 75, dr: 0, unlock: 5, price: 40, c: [158, 164, 174], hi: [212, 218, 226], dk: [96, 102, 112] },
  { id: 'gold', name: 'Gold', hp: 100, dr: 0, unlock: 9, price: 100, c: [226, 178, 40], hi: [255, 226, 110], dk: [158, 112, 16] },
  { id: 'amethyst', name: 'Amethyst', hp: 100, dr: .04, unlock: 14, price: 200, c: [146, 88, 206], hi: [198, 152, 246], dk: [88, 46, 144], gem: [238, 218, 255] },
  { id: 'ruby', name: 'Ruby', hp: 100, dr: .08, unlock: 20, price: 320, c: [196, 38, 58], hi: [244, 104, 114], dk: [122, 16, 34], gem: [255, 198, 202] },
  { id: 'emerald', name: 'Emerald', hp: 100, dr: .12, unlock: 27, price: 450, c: [36, 164, 86], hi: [110, 226, 150], dk: [16, 102, 50], gem: [206, 255, 224] },
  { id: 'diamond', name: 'Diamond', hp: 100, dr: .16, unlock: 35, price: 600, c: [86, 206, 222], hi: [180, 246, 252], dk: [34, 142, 164], gem: [246, 255, 255] },
  { id: 'champion', name: 'Champion', hp: 100, dr: .2, unlock: 50, price: 1000, c: [50, 50, 58], hi: [90, 90, 102], dk: [20, 20, 26], champ: true },
];
const ARMOR_MAX = ARMOR_TIERS.length;
// the four gems set into Champion armor
const GEMS = { am: [178, 122, 238], ru: [228, 58, 76], em: [58, 204, 112], di: [134, 234, 246] };
const armorOf = n => ARMOR_TIERS[n - 1] ?? null;
const armorName = n => n ? armorOf(n).name + ' Armor' : 'Armor';
const armorStars = n => '★'.repeat(n) + '☆'.repeat(ARMOR_MAX - n);
// the tier worn in this match: yours in bot matches, none in zombie waves
const matchArmor = () => pvp() ? Math.min(ARMOR_MAX, prof.armor | 0) : 0;
// puts on (or takes off) the armor for this match: full armor bar and its damage cut
function wearArmor() {
  const T = armorOf(matchArmor());
  P.maxArmor = T ? T.hp : 0; P.dr = T ? T.dr : 0; P.armor = P.maxArmor;
}

// ---- the armor texture: a 64x64 sheet laid out like a skin (character.js), painted with only the armored pixels.
// Anything left blank is see-through, so the face, hands and elbows show through.
function paintArmor(g, n, team) {
  const T = armorOf(n), rnd = charRng(n * 977 + (team ? team[0] * 31 + team[2] : 0));
  const put = (r, x, y, col, v = 10) => {
    if (x < 0 || y < 0 || x >= r[2] || y >= r[3]) return;
    const k = (rnd() - .5) * v;
    g.fillStyle = `rgb(${col[0] + k | 0},${col[1] + k | 0},${col[2] + k | 0})`; g.fillRect(r[0] + x, r[1] + y, 1, 1);
  };
  // the surface of a plate: planks with dark seams for wood, facets for gems, a little shine on gold
  const surf = (x, y) => {
    if (T.id === 'wood') return y % 4 === 3 ? mixC(T.c, T.dk, .7) : (x * 7 + y * 3) % 11 === 0 ? shadeC(T.c, -16) : T.c;
    if (T.gem) return (x + y) % 4 === 0 ? mixC(T.c, T.hi, .55) : (x + 2 * y) % 5 === 3 ? mixC(T.c, T.dk, .35) : T.c;
    if (T.id === 'gold') return rnd() < .1 ? mixC(T.c, T.hi, .6) : T.c;
    if (T.champ) return (x + y) % 6 === 0 ? mixC(T.c, T.hi, .5) : T.c;
    return T.c;
  };
  // a plate over rows y0-y1 of face r: lighter top row (when it's 3+ rows), darker bottom row, darker at the box's corners
  const plate = (r, y0, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = 0; x < r[2]; x++) {
      const edge = x === 0 || x === r[2] - 1;
      put(r, x, y, y === y1 ? T.dk : y === y0 && y1 - y0 >= 2 ? T.hi : edge ? mixC(surf(x, y), T.dk, .5) : surf(x, y));
    }
  };
  const cap = r => { // a face covered all over (tops of the helmet and shoulders), darker round its rim
    for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++)
      put(r, x, y, x === 0 || y === 0 || x === r[2] - 1 || y === r[3] - 1 ? mixC(surf(x, y), T.dk, .45) : surf(x, y));
  };
  const gem = (r, x, y, col) => { // a 2x2 gem: bright corner, darker opposite corner
    put(r, x, y, mixC(col, [255, 255, 255], .45), 4); put(r, x + 1, y, col, 4); put(r, x, y + 1, col, 4); put(r, x + 1, y + 1, shadeC(col, -45), 4);
  };
  const trimGem = T.champ || !T.gem ? null : mixC(T.gem, T.hi, .5); // regular gem tiers get studs in a paler shade of their own color

  // ---- helmet: crown, sides and back down to row 6, a brow band, cheek guards and a nose guard. The face stays open
  const H = regions(...PARTS.head.slice(0, 2), 8, 8, 8), F = H.front;
  cap(H.top);
  for (const f of ['left', 'right', 'back']) plate(H[f], 0, 6);
  plate(F, 0, 1);
  for (let y = 2; y <= 6; y++) { put(F, 0, y, y === 6 ? T.dk : mixC(surf(0, y), T.dk, .4)); put(F, 7, y, y === 6 ? T.dk : mixC(surf(7, y), T.dk, .4)); }
  for (let y = 2; y <= 4; y++) { put(F, 3, y, y === 4 ? T.dk : surf(3, y)); put(F, 4, y, y === 4 ? T.dk : surf(4, y)); }
  if (T.champ) gem(F, 3, 0, GEMS.di); else if (trimGem) gem(F, 3, 0, trimGem);
  else if (T.id === 'gold') { put(F, 3, 0, T.hi, 4); put(F, 4, 0, T.hi, 4); }

  // ---- chestplate: rows 0-9 all round, then a belt. Team matches add a band in the team's color so you can tell sides apart
  const B = regions(...PARTS.body.slice(0, 2), 8, 12, 4), BF = B.front;
  for (const f of ['front', 'back', 'left', 'right']) {
    plate(B[f], 0, 9);
    for (let x = 0; x < B[f][2]; x++) { put(B[f], x, 10, T.dk, 6); put(B[f], x, 11, mixC(T.c, T.dk, .55), 8); }
    if (team) for (let x = 0; x < B[f][2]; x++) { put(B[f], x, 7, team, 8); put(B[f], x, 8, shadeC(team, -35), 8); }
  }
  for (let x = 1; x < 7; x++) put(BF, x, 5, mixC(surf(x, 5), T.dk, .55)); // where the chest plate meets the stomach plate
  if (T.champ) { put(BF, 3, 2, GEMS.am, 4); put(BF, 4, 2, GEMS.ru, 4); put(BF, 3, 3, GEMS.em, 4); put(BF, 4, 3, GEMS.di, 4); }
  else if (trimGem) gem(BF, 3, 2, trimGem);
  else if (T.id === 'gold') for (const [x, y] of [[3, 2], [4, 2], [3, 3], [4, 3]]) put(BF, x, y, T.hi, 4);
  else if (T.id === 'steel') for (const [x, y] of [[1, 1], [6, 1], [1, 8], [6, 8]]) put(BF, x, y, T.dk, 4); // rivets
  // buckle
  const buck = T.champ ? GEMS.am : trimGem ?? T.hi;
  for (const [x, y] of [[3, 10], [4, 10], [3, 11], [4, 11]]) put(BF, x, y, buck, 4);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) { // shoulders, with the neck left open
    if (x >= 2 && x <= 5 && y >= 1 && y <= 2) continue;
    put(B.top, x, y, x === 0 || x === 7 || y === 0 || y === 3 ? mixC(surf(x, y), T.dk, .45) : surf(x, y));
  }

  // ---- arms: a shoulder guard (rows 0-3) and a bracer (rows 6-9). The elbow and the fist stay bare
  for (const p of ['armR', 'armL']) {
    const r = regions(...PARTS[p].slice(0, 2), 4, 12, 4), out = r[p === 'armR' ? 'right' : 'left'];
    for (const f of ['front', 'back', 'left', 'right']) { plate(r[f], 0, 3); plate(r[f], 6, 9); }
    cap(r.top);
    if (T.champ) gem(out, 1, 1, p === 'armR' ? GEMS.ru : GEMS.em); else if (trimGem) gem(out, 1, 1, trimGem);
  }

  // ---- legs: leg guards (rows 0-7) and boots (rows 8-11) with soles
  for (const p of ['legR', 'legL']) {
    const r = regions(...PARTS[p].slice(0, 2), 4, 12, 4);
    for (const f of ['front', 'back', 'left', 'right']) {
      plate(r[f], 0, 7);
      for (let x = 0; x < 4; x++) {
        put(r[f], x, 8, T.hi); put(r[f], x, 9, mixC(T.c, T.dk, .25)); put(r[f], x, 10, mixC(T.c, T.dk, .25)); put(r[f], x, 11, T.dk);
      }
    }
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) put(r.bottom, x, y, y === 0 || x === 0 || x === 3 ? mixC(T.dk, T.c, .3) : T.dk, 6);
    if (T.champ) gem(r.front, 1, 4, p === 'legR' ? GEMS.am : GEMS.di); else if (trimGem) gem(r.front, 1, 4, trimGem);
  }
}
const armorTexCache = new Map();
function armorTexture(n, team = null) {
  const key = n + ':' + (team ?? '');
  if (!armorTexCache.has(key)) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    paintArmor(c.getContext('2d'), n, team);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
    armorTexCache.set(key, t);
  }
  return armorTexCache.get(key);
}

// ---- the armor pieces: a box a little bigger than each body part, showing the armor texture.
// FIT = how far out each piece sits, in skin pixels. The two legs differ a hair so where they overlap one is always in front
const ARMOR_FIT = { head: .5, body: .5, armR: .35, armL: .35, legR: .3, legL: .25 };
const ARMOR_PARTS = ['head', 'body', 'armR', 'armL', 'legR', 'legL']; // same order as buildChar's parts
const armorGeoCache = {};
function armorGeo(part, U) {
  const k = part + ':' + U;
  if (!armorGeoCache[k]) {
    const [u, v, w, h, d] = PARTS[part], i = ARMOR_FIT[part], R = regions(u, v, w, h, d);
    armorGeoCache[k] = skinBox(w + 2 * i, h + 2 * i, d + 2 * i, U, [R.left, R.right, R.top, R.bottom, R.front, R.back]);
  }
  return armorGeoCache[k];
}
const armorMat = (n, team) => lam({ map: armorTexture(n, team), alphaTest: .5 });
// puts armor tier n on a character from buildChar (0 takes it off). Each piece rides on its body part, so it moves with it.
// team = the team color for the chest band, in team matches
function dressArmor(ch, n, team = null) {
  if (ch.armor) {
    ch.armor.meshes.forEach(m => m.parent.remove(m));
    ch.mats.splice(ch.mats.indexOf(ch.armor.mat), 1); ch.armor.mat.dispose(); ch.armor = null;
  }
  if (!n) return;
  const mat = armorMat(n, team);
  const meshes = ARMOR_PARTS.map((p, k) => { const m = new THREE.Mesh(armorGeo(p, ch.U), mat); ch.parts[k].add(m); return m; });
  ch.mats.push(mat); ch.armor = { n, mat, meshes };
}

// ---- icons for the armory: a helmet and a chestplate, with the same black outline the gun sprites have
const ICON_HELM = ['..HHHHH..', '.HAAAAAD.', 'HAAAGAAAD', 'AAAAAAAAD', 'AA.....AD', 'AA.....AD', 'DD.....DD'];
const ICON_CHEST = ['HHHH......HHHH', 'AAAAH....HAAAD', 'AAAAAHHHHAAAAD', 'AAAAAAAAAAAAAD', '.AAAAAGGAAAAD.', '.AAAAAGGAAAAD.',
  '..AAAAAAAAAD..', '..AAAAAAAAAD..', '..DAAAAAAAAD..', '..DDDDDDDDDD..'];
const ARMOR_SPRITES = ARMOR_TIERS.map((T, k) => {
  const W = 26, H = 14, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), rgb = a => `rgb(${a.map(v => Math.max(0, Math.min(255, v | 0)))})`;
  const draw = (rows, ox, oy, gems) => {
    let gi = 0;
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      let col = ch === 'H' ? T.hi : ch === 'D' ? T.dk : T.c;
      if (ch === 'A' && T.id === 'wood' && y % 3 === 2) col = mixC(T.c, T.dk, .6);
      if (ch === 'G') col = T.champ ? gems[gi++ % gems.length] : T.gem ?? (T.id === 'gold' ? T.hi : T.c);
      g.fillStyle = rgb(col); g.fillRect(ox + x, oy + y, 1, 1);
    }));
  };
  draw(ICON_HELM, 1, 4, [GEMS.di]);
  draw(ICON_CHEST, 11, 2, [GEMS.am, GEMS.ru, GEMS.em, GEMS.di]);
  const img = g.getImageData(0, 0, W, H), d = img.data, solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
  g.fillStyle = '#000';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) g.fillRect(x, y, 1, 1);
  return c.toDataURL();
});
