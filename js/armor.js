// armor tiers, one per star (hp = armor, dr = damage cut per hit)
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
const ARMOR_MAX = ARMOR_TIERS.length; // basic armor tiers
// set armor, stats per star (ids are used in saves, don't rename them)
const SUIT_ST = 5;
const SUITS = [
  { id: 'warrior', rar: 'rare', name: 'Warrior Plate', mob: 1, jump: 1, hp: [100, 100, 100, 100, 100], dr: [0, .06, .11, .15, .20],
    unlock: [7, 14, 22, 32, 50], price: [150, 220, 340, 520, 800], c: [150, 156, 166], hi: [204, 210, 220], dk: [90, 96, 108] },
  { id: 'raider', rar: 'rare', name: 'Raider Cloak', mob: 3, jump: 3, hp: [60, 70, 85, 100, 100], dr: [0, 0, 0, 0, .06],
    unlock: [9, 16, 24, 34, 50], price: [170, 240, 360, 540, 800], c: [56, 62, 78], hi: [92, 102, 124], dk: [34, 38, 50], bar: [[110, 232, 220], [34, 200, 186], [16, 128, 120]] },
];
for (const S of SUITS) for (let k = 0; k < SUIT_ST; k++) ARMOR_TIERS.push({ id: S.id + (k + 1), suit: S.id, st: k + 1, rar: S.rar, name: S.name,
  hp: S.hp[k], dr: S.dr[k], mob: S.mob, jump: S.jump, unlock: S.unlock[k], price: S.price[k], c: S.c, hi: S.hi, dk: S.dk, bar: S.bar });
const ARMOR_ALL = ARMOR_TIERS.length;
const armorOf = n => ARMOR_TIERS[n - 1] ?? null;
// mobility and jump levels, 2 = medium (no change)
const LEVEL_NAMES = ['VERY LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY HIGH'];
const MOB_FX = [-.12, -.06, 0, .06, .12], JUMP_FX = [-.16, -.08, 0, .1, .2];
// full set bonuses: boots, hat and armor of one set
const SET_FX = { warrior: { dmg: .05, dr: .05 }, raider: { spd: .08, air: 1 } };
function armorFx(f, n, b, h) {
  const T = armorOf(n), set = T?.suit && b?.id === T.suit && h?.id === T.suit ? T.suit : '', S = SET_FX[set] ?? {};
  return { ...f, spd: f.spd + MOB_FX[T?.mob ?? 2] + (S.spd ?? 0), dmg: f.dmg + (S.dmg ?? 0), dr: f.dr + (S.dr ?? 0),
    jump: JUMP_FX[T?.jump ?? 2], air: (f.dj ? 1 : 0) + (S.air ?? 0), set };
}
const ARMOR_ITEM = 'Basic Armor';
const armorTitle = T => T.suit ? T.name : T.name + ' Armor';
// gems on Champion armor
const GEMS = { am: [178, 122, 238], ru: [228, 58, 76], em: [58, 204, 112], di: [134, 234, 246] };
const armorStars = n => starRow(n, n, ARMOR_MAX);
const SUIT_I = Object.fromEntries(SUITS.map((S, i) => [S.id, i]));
const suitOf = id => SUITS[SUIT_I[id]] ?? null;
const suitN = (id, st) => ARMOR_MAX + SUIT_I[id] * SUIT_ST + st; // its place in ARMOR_TIERS, from 1
const suitStars = id => prof.suits?.[id] | 0; // 0 = not bought
const suitUse = id => { const st = suitStars(id), u = prof.suitUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornSuit = () => { const id = prof.armorOn; return id && suitOf(id) && suitStars(id) ? { id, st: suitUse(id) } : null; };
// the basic tier you picked, your best by default
const basicWorn = () => { const n = Math.min(ARMOR_MAX, prof.armor | 0), u = prof.armorUse | 0; return u ? Math.min(u, n) : n; };
const wornArmor = () => { const s = wornSuit(); return s ? suitN(s.id, s.st) : basicWorn(); };
const matchArmor = () => wornArmor();
// bots get random armor up to your best tier, now and then a set piece
const BOT_BARE = .15, BOT_SUIT = .25;
function botArmor() {
  const sets = SUITS.filter(S => suitStars(S.id) || prof.lv >= S.unlock[0]);
  if (sets.length && Math.random() < BOT_SUIT) { const S = sets[Math.random() * sets.length | 0]; return suitN(S.id, 1 + (Math.random() * Math.max(1, suitStars(S.id)) | 0)); }
  const n = Math.max(1, Math.min(ARMOR_MAX, prof.armor | 0));
  return Math.random() >= BOT_BARE ? ARMOR_TIERS.indexOf(pickRare(ARMOR_TIERS.slice(0, n))) + 1 : 0;
}
// basic armor stops at Champion: refund stars a bug once sold past it
function fixArmor() {
  const n = prof.armor | 0; if (n <= ARMOR_MAX) return false;
  for (let k = ARMOR_MAX; k < n; k++) prof.coins += ARMOR_TIERS[k]?.price ?? 0;
  prof.armor = ARMOR_MAX; if ((prof.armorUse | 0) > ARMOR_MAX) prof.armorUse = 0;
  return true;
}
if (fixArmor()) saveProf();
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
  const T = armorOf(n); if (T.suit) return suitPieces(T, team);
  const S = T.shape, out = [];
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
  const T = armorOf(n); if (T.suit) return suitPadPieces(T, s);
  const S = T.shape, out = [];
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
// ---- set armor models
function suitPieces(T, team) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a)), st = T.st;
  const M = (x0, x1, y0, y1, z0, z1, m) => { B(x0, x1, y0, y1, z0, z1, m); B(-x1, -x0, y0, y1, z0, z1, m); };
  const C = hex(T.c), HI = hex(T.hi), DK = hex(T.dk), GOLD = hex([240, 196, 64]), LEATHER = hex([92, 60, 34]);
  const warrior = T.suit === 'warrior', zf = warrior ? 7 : 6, yb = warrior ? -5 : -12;
  const FB = (x0, x1, y0, y1, m, d = 0) => { B(x0, x1, y0, y1, 4, zf + d, m); B(x0, x1, y0, y1, -zf - d, -4, m); };
  FB(-8, 8, yb, 13, C); if (warrior) FB(-8, 8, yb, yb + 1, DK); M(5, 8, 12, 13, -4, 4, C);
  if (warrior) { // thick steel plate with a red stripe, gold at 5 stars
    const TRIM = st >= 5 ? GOLD : hex([158, 34, 40]);
    M(1, 8, 1, 9, zf, zf + 1, C); M(1, 8, 8, 9, zf, zf + 1, HI); // chest plates
    B(-1, 1, yb + 3, 9, zf, zf + 1, TRIM);
    FB(-8, 8, yb, yb + 3, team ? hex(team) : DK, 1); B(-2, 2, yb, yb + 3, zf + 1, zf + 2, TRIM); // belt and buckle
    if (st >= 2) for (const [z0, z1] of [[4, zf], [-zf, -4]]) { M(1, 8, yb - 3, yb, z0, z1, C); M(1, 8, yb - 3, yb - 2, z0, z1, TRIM); } // hip plates
    if (st >= 3) for (const y of [yb + 5, 11]) M(6, 7, y, y + 1, zf - 1, zf, HI); // rivets
    if (st >= 4) { B(-2, 2, yb + 3, 12, -zf - 2, -zf, HI); B(-1, 1, yb + 3, 12, -zf - 2, -zf - 1, TRIM); } // back ridge
    if (st >= 5) FB(-8, 8, 12, 13, GOLD);
  } else { // a long dark cloak open at the front, a cape down the back, gold trim at 5 stars (the tails hang on the legs)
    const TRIM = st >= 5 ? GOLD : hex([34, 200, 186]);
    B(-2, 2, yb, 13, 5, zf, 0); B(-2, 2, yb, 13, 4, 5, DK); // the opening
    for (const x of [-3, 2]) B(x, x + 1, yb, 13, 4, zf, TRIM);
    B(-8, 8, yb, 13, -zf - 2, -zf, C); // the cape
    M(8, 9, yb, 13, -zf, zf, C); // the sides, under the arms
    const BELT = team ? hex(team) : LEATHER; FB(-8, 8, -6, -4, BELT, 1); M(8, 9, -6, -4, -zf - 1, zf + 1, BELT); // belt
    B(-3, 3, 6, 8, zf, zf + 1, TRIM); // clasp
    if (st >= 2) for (let k = 0; k < 7; k++) B(-7 + 2 * k, -5 + 2 * k, 8 - 2 * k, 10 - 2 * k, zf - 1, zf + 1, LEATHER); // a strap across the chest
    if (st >= 4) { B(-8, 8, 9, 13, -zf - 3, -zf - 2, C); M(4, 8, 10, 13, zf, zf + 1, C); M(4, 8, 10, 11, zf, zf + 1, TRIM); } // a mantle over the shoulders
  }
  NECK_FRONT.forEach((d, a) => { if (d) for (const x of [a, -a - 1]) B(x, x + 1, 13 - d, 13, 4, zf + 3, 0); });
  NECK_BACK.forEach((d, a) => { if (d) for (const x of [a, -a - 1]) B(x, x + 1, 13 - d, 13, -zf - 3, -4, 0); });
  return out;
}
function suitPadPieces(T, s) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a)), st = T.st;
  const C = hex(T.c), HI = hex(T.hi), GOLD = hex([240, 196, 64]);
  const warrior = T.suit === 'warrior', TRIM = st >= 5 ? GOLD : warrior ? hex([158, 34, 40]) : hex([34, 200, 186]);
  const x1 = warrior ? 18 : 17, zp = warrior ? 6 : 5, ylo = warrior ? 5 : -6, y1 = warrior ? 16 : 15;
  const ring = (y0, y1, m) => { B(8, x1, y0, y1, 4, zp, m); B(8, x1, y0, y1, -zp, -4, m); B(16, x1, y0, y1, -zp, zp, m); };
  B(8, x1, 12, y1, -zp, zp, C); B(8, x1, y1 - 1, y1, -zp, zp, HI);
  ring(ylo, 12, C); ring(ylo, ylo + 1, TRIM);
  if (warrior) {
    ring(9, 10, HI); // two plates
    if (st >= 3) { B(10, x1 - 1, y1, y1 + 2, -4, 4, C); B(10, x1 - 1, y1 + 1, y1 + 2, -4, 4, HI); } // a second plate on top
    if (st >= 4) B(10, x1 - 1, y1 + 1, y1 + 2, -1, 1, TRIM);
  } else { // long sleeves with a cuff, closed on the inside
    ring(ylo + 1, ylo + 2, TRIM);
    if (st >= 4) ring(9, 10, TRIM);
    B(7, 8, ylo, 12, -zp, zp, C); B(7, 8, ylo, ylo + 2, -zp, zp, TRIM); if (st >= 4) B(7, 8, 9, 10, -zp, zp, TRIM);
  }
  if (s < 0) for (const p of out) p[4] = -p[4];
  return out;
}
// coat tails on a leg, so they swing with it (s = 1 for the left leg, -1 for the right; leg units like boots)
function suitLegPieces(T, s) {
  const out = []; if (T.suit !== 'raider') return out;
  const B = pieceBox(out), hex = a => palIdx(rgbHex(a)), C = hex(T.c), TRIM = T.st >= 5 ? hex([240, 196, 64]) : hex([34, 200, 186]), LO = -10;
  B(-2, 6, LO, 0, 4, 6, C); B(-4, 6, LO, 0, -8, -4, C); B(4, 6, LO, 0, -4, 4, C);
  B(-2, -1, LO, 0, 4, 6, TRIM); // the front edge
  if (T.st >= 3) { B(-2, 6, LO, LO + 1, 4, 6, TRIM); B(-4, 6, LO, LO + 1, -8, -4, TRIM); B(4, 6, LO, LO + 1, -4, 4, TRIM); } // hem
  if (s < 0) for (const p of out) p[4] = -p[4];
  return out;
}
// the whole set, for the armory preview and icon (cut: drop what hangs below it)
function armorAllPieces(n, cut = -99) {
  const T = armorOf(n), legs = [];
  if (T.suit) for (const s of [1, -1]) for (const p of suitLegPieces(T, s)) legs.push([p[0], p[1], p[2], p[3], p[4] + 4 * s, p[5] - 12, p[6]]);
  return [...armorPieces(n), ...armorPadPieces(n, 1), ...armorPadPieces(n, -1), ...legs].flatMap(p => {
    const y0 = p[5] - p[1] / 2, y1 = p[5] + p[1] / 2;
    return y1 <= cut ? [] : y0 >= cut ? [p] : [[p[0], y1 - cut, p[2], p[3], p[4], (y1 + cut) / 2, p[6]]];
  });
}
const ARMOR_PX = 2; // armor pixels per skin pixel
const armorGeoCache = {};
// part: 'body', 'L', 'R' (pads), 'legL', 'legR' (coat tails) or 'all'
function armorGeo(n, team, U, part = 'body') {
  const k = n + ':' + part + ':' + (part === 'body' ? team ?? '' : '') + ':' + U;
  return armorGeoCache[k] ??= voxelGeos(part === 'body' ? armorPieces(n, team) : part === 'all' ? armorAllPieces(n)
    : part.startsWith('leg') ? suitLegPieces(armorOf(n), part === 'legL' ? 1 : -1) : armorPadPieces(n, part === 'L' ? 1 : -1), U / ARMOR_PX).lit;
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
  if (armorOf(n).suit === 'raider') meshes.push(mesh('legL', ch.legL, 0, 0), mesh('legR', ch.legR, 0, 0));
  ch.mats.push(mat); ch.armor = { n, mat, meshes };
}
// armory preview
function armorModel(n, g) { g.add(new THREE.Mesh(armorGeo(n, null, 1 / 16, 'all'), gunLit)); }

// ---- armor icons, all tiers in the same frame
const armorSpriteCache = [];
function armorSprite(k) { // k = tier index (0 = Wooden)
  if (armorSpriteCache[k]) return armorSpriteCache[k];
  const { lo, NX, NY, NZ, at } = voxelGrid(armorAllPieces(k + 1, -15));
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
