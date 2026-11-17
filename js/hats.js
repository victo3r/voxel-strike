// hats, stats per star (ids are used in saves, don't rename them)
const HATS = [
  { id: 'warrior', rar: 'rare', name: 'Warrior Helmet', unlock: 6, price: 90, dr: [.04, .06, .08], hs: [.20, .27, .33] },
  { id: 'raider', rar: 'rare', name: 'Raider Hood', unlock: 8, price: 130, half: [.05, .07, .10], stealth: [30, 22, 15] },
  { id: 'ironclad', rar: 'epic', name: 'Ironclad Helm', unlock: 17, price: 260, dr: [.04, .06, .08], hs: [.25, .33, .4] },
  { id: 'arcane', rar: 'epic', name: 'Arcane Hat', unlock: 20, price: 300, shrug: [.25, .35, .5] },
  { id: 'thornwood', rar: 'epic', name: 'Thornwood Helm', unlock: 14, price: 240, thorns: [.35, .5, .65] },
  { id: 'skyrunner', rar: 'legend', name: 'Skyrunner Helm', unlock: 26, price: 360, sky: [.15, .2, .25] },
  { id: 'titanium', rar: 'mythic', name: 'Titanium Helm', unlock: 50, price: 500, bars: 2, dr: [.05, .07, .09], hs: [.3, .4, .5] },
];
const HAT_I = Object.fromEntries(HATS.map((H, i) => [H.id, i]));
const hatOf = id => HATS[HAT_I[id]] ?? null;
const hatStars = id => prof.hats?.[id] | 0; // 0 = not bought
const hatUse = id => { const st = hatStars(id), u = prof.hatUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornHat = () => { const id = prof.hatOn; if (!id || !hatStars(id)) return null; const skin = hatSkin(id); return skin ? { id, st: hatUse(id), skin } : { id, st: hatUse(id) }; };
// hat skins: a new look for a hat you own, it keeps its stats (ids are used in saves, don't rename them). Each is a weekly event's top prize (EVENTS skin), or a secret
const HAT_SKINS = [
  { id: 'brainjar', name: 'Brain Jar', about: 'A brain in a jar of glowing goo, still thinking about lunch' },
  { id: 'hunter', name: "Hunter's Cap", about: 'Blaze orange with a bullseye that never stops pinging' },
  { id: 'circlet', name: 'Blade Circlet', about: 'Polished silver with a blade on the brow that catches the light' },
  { id: 'ghillie', name: 'Ghillie Hood', about: 'A hood of leaves and rags that sheds a leaf now and then' },
  { id: 'laurel', name: 'Golden Laurel', about: 'Gold leaves for a champion, sparkling wherever you go' },
  { id: 'octopus', name: 'Octopus Hat', about: 'A bright little octopus who likes the view, all eight arms waving', secret: true },
  { id: 'map', name: 'Map Hat', about: 'A treasure map you can wear, X marks your head', secret: true }, // from a code, hidden till it's yours
];
const HSKIN_I = Object.fromEntries(HAT_SKINS.map((S, i) => [S.id, i]));
const hatSkinOf = id => HAT_SKINS[HSKIN_I[id]] ?? null;
const hatSkin = id => { const s = prof.hatSkin?.[id]; return s && prof.skins?.[s] && hatSkinOf(s) ? s : ''; }; // '' = the hat's own look
// boots and hat effects combined
function gearFx(b, h) {
  const f = { ...bootFx(b), hs: 0, half: 0, stealth: 0, shrug: 0, thorns: 0, sky: 0 }, H = h && hatOf(h.id);
  if (!H) return f;
  const L = h.st - 1;
  f.dr += H.dr?.[L] ?? 0; f.hs = H.hs?.[L] ?? 0; f.half = H.half?.[L] ?? 0; f.stealth = H.stealth?.[L] ?? 0; f.shrug = H.shrug?.[L] ?? 0;
  f.thorns = H.thorns?.[L] ?? 0; f.sky = H.sky?.[L] ?? 0;
  return f;
}
const youFx = () => { const b = wornBoots(), h = wornHat(); return armorFx(gearFx(b, h), wornArmor(), b, h); };
const HEAD_MUL = 1.5; // headshot damage multiplier
// helmet can block a headshot, hood can halve a hit
function gearHit(fx, d, head) {
  if (head && Math.random() < fx.hs) { d /= HEAD_MUL; head = false; }
  if (fx.half && Math.random() < fx.half) d *= .5;
  return [d, head];
}
// bots get random hats, only ones your level unlocks, never better than yours
const HAT_BARE = .3;
function botHat() {
  const list = HATS.filter(H => hatStars(H.id) || prof.lv >= H.unlock);
  if (!list.length || Math.random() < HAT_BARE) return null;
  const H = list[Math.random() * list.length | 0];
  return { id: H.id, st: 1 + (Math.random() * Math.max(1, hatStars(H.id)) | 0) };
}

// ---- hat model (don't cover the eyes)
function hatPieces(id, st) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a), false, polished(id, a), id === 'titanium');
  const head = () => B(-8, 8, 0, 16, -8, 8, 0); // hollow out where the head goes
  if (id === 'raider') {
    // hood, scarf at 2 stars, gold trim at 3
    const C = hex([56, 62, 78]), HI = hex([92, 102, 124]), TRIM = st >= 3 ? hex([240, 196, 64]) : hex([34, 200, 186]);
    B(-9, 9, 1, 18, -9, 9, C); B(-9, 9, -2, 1, -9, -6, C);
    B(-9, 9, 16, 17, -9, 9, HI);
    head();
    B(-8, 8, 1, 15, 8, 9, TRIM); B(-6, 6, 1, 13, 8, 9, 0); // face opening
    if (st >= 2) { B(-7, 7, 0, 5, 8, 10, C); B(-7, 7, 4, 5, 8, 10, TRIM); } // scarf
    if (st >= 3) B(-1, 1, 17, 18, -9, 9, TRIM);
  } else if (id === 'ironclad') {
    // heavy iron helm, horns at 2 stars, gold at 3
    const C = hex([78, 82, 92]), HI = hex([128, 134, 146]), DK = hex([44, 46, 54]);
    const TRIM = st >= 3 ? hex([226, 178, 40]) : hex([150, 110, 60]), BONE = hex([214, 204, 176]), BONE2 = hex([160, 148, 120]);
    B(-9, 9, 6, 19, -9, 9, C); B(-9, 9, 3, 6, -9, -6, C);
    B(-9, 9, 18, 19, -9, 9, HI); B(-9, 9, 13, 14, -9, 9, DK);
    head();
    B(-6, 6, 6, 11, 8, 9, 0); // face opening
    B(-8, 8, 11, 14, 8, 10, HI); B(-8, 8, 11, 12, 9, 10, TRIM); // brow
    for (const sx of [-1, 1]) {
      const X = (a, c) => sx > 0 ? [a, c] : [-c, -a];
      B(...X(8, 10), 3, 10, 0, 10, DK); B(...X(6, 10), 3, 9, 8, 10, DK); B(...X(4, 10), 3, 6, 8, 10, DK); // cheek guards
      if (st >= 2) { // horns
        B(...X(9, 13), 12, 16, -2, 2, BONE2); B(...X(10, 14), 16, 20, -2, 2, BONE);
        B(...X(11, 14), 20, 23, -1, 2, st >= 3 ? hex([240, 196, 64]) : BONE);
      }
    }
    B(-2, 2, 3, 12, 8, 10, DK); // nose guard
    if (st >= 3) B(-2, 2, 19, 20, -7, 7, TRIM);
  } else if (id === 'arcane') {
    // a wizard hat with a tip that leans back, a gold clasp at 2 stars, a gold band at 3
    const C = hex([44, 52, 120]), DK = hex([26, 30, 76]), BAND = st >= 3 ? hex([255, 214, 90]) : hex([96, 40, 128]);
    B(-12, 12, 12, 14, -12, 12, C); B(-12, 12, 12, 13, -12, 12, DK); // brim, darker underneath
    B(-9, 9, 12, 19, -9, 9, C); B(-9, 9, 14, 16, -9, 9, BAND); // band
    head();
    B(-7, 7, 19, 23, -7, 7, C); B(-5, 5, 23, 26, -6, 4, C); B(-4, 4, 26, 29, -7, 1, C); B(-3, 3, 27, 30, -10, -4, C); // the tip leans back
    if (st >= 2) { B(-2, 2, 14, 16, 8, 9, hex([196, 150, 60])); B(-1, 1, 14, 16, 8, 9, DK); } // a gold clasp on the band
  } else if (id === 'thornwood') {
    // a bark helm with a brow ridge, moss in patches and thorns down the back, leaves at 2 stars, amber at 3
    const C = hex([112, 78, 46]), DK = hex([70, 46, 26]), HI = hex([140, 100, 62]), MOSS = hex([82, 140, 52]), LEAF = hex([118, 184, 70]), THORN = hex([188, 150, 96]), AMBER = hex([255, 186, 50]);
    B(-9, 9, 6, 17, -9, 9, C); B(-8, 8, 17, 18, -8, 8, C); B(-9, 9, 3, 6, -9, -6, C); // a rounded shell
    for (const [x0, x1, z0, z1] of [[-8, 1, -8, 3], [-3, 6, 0, 8], [2, 8, -8, -3]]) B(x0, x1, 17, 18, z0, z1, MOSS); // moss in patches
    B(-9, -8, 13, 17, -7, -1, MOSS); B(8, 9, 14, 17, 2, 7, MOSS); // dripping down the sides
    head();
    B(-6, 6, 6, 10, 8, 9, 0); // face opening
    for (const [x, y0] of [[-7, 12], [-3, 13], [2, 12], [6, 13]]) B(x, x + 1, y0, 17, 8, 9, DK); // grooves in the bark
    for (const [x, y0] of [[-8, 4], [8, 6]]) B(x, x + 1, y0, 16, -9, -6, DK);
    B(-9, 9, 10, 12, 8, 11, HI); B(-9, 9, 10, 11, 8, 11, DK); // brow ridge
    for (const sx of [-1, 1]) { const X = (a, c) => sx > 0 ? [a, c] : [-c, -a]; B(...X(8, 10), 4, 10, 0, 10, C); B(...X(6, 10), 4, 10, 8, 10, C); } // cheek guards
    let y = 18; // thorns down the back, like the armor's, each hooked down
    for (const n of st >= 2 ? [3, 4, 4] : [2, 3, 3]) for (let d = 1; d <= n; d++, y--) B(-2, 2, y - 1, y, -9 - d, -9, d === n ? DK : THORN);
    if (st >= 2) { B(-12, -9, 14, 18, -3, 3, LEAF); B(-11, -9, 11, 14, 0, 4, LEAF); B(9, 12, 15, 18, -6, -1, LEAF); } // leaves at the temples
    if (st >= 3) B(-2, 2, 10, 13, 10, 12, AMBER); // amber on the brow
  } else if (id === 'titanium') {
    // a smooth polished helm with a blue band over the brow, a crest sweeping back at 2 stars, brighter blue at 3
    const C = hex([190, 200, 212]), HI = hex([234, 240, 246]), DK = hex([54, 60, 70]), BLUE = st >= 3 ? hex([150, 205, 255]) : hex([79, 157, 255]);
    B(-9, 9, 6, 17, -9, 9, C); B(-8, 8, 17, 18, -8, 8, C); B(-6, 6, 18, 19, -7, 6, HI); B(-9, 9, 3, 6, -9, -6, C); // a rounded shell, down over the neck
    head();
    B(-6, 6, 6, 11, 8, 9, 0); // face opening
    B(-9, 9, 11, 15, 8, 10, C); B(-7, 7, 12, 14, 9, 10, BLUE); // brow
    for (const sx of [-1, 1]) {
      const X = (a, c) => sx > 0 ? [a, c] : [-c, -a];
      B(...X(8, 10), 3, 10, 0, 10, C); B(...X(6, 10), 3, 8, 8, 10, C); B(...X(8, 10), 3, 4, 0, 10, DK); // cheek guards
      if (st >= 3) B(...X(8, 9), 12, 14, -6, -1, BLUE);
    }
    if (st >= 2) B(-2, 2, 19, 22, -10, 5, st >= 3 ? BLUE : HI); // crest
  } else if (id === 'skyrunner') {
    // a white flight helm with wings sweeping back (never above the top, or they look like antennae), longer wings at 2 stars, gold at 3
    const C = hex([226, 232, 240]), HI = hex([196, 206, 220]), DK = hex([146, 160, 178]), TRIM = st >= 3 ? hex([240, 196, 64]) : hex([40, 200, 210]);
    B(-9, 9, 10, 16, -9, 9, C); B(-8, 8, 16, 17, -8, 8, C); B(-6, 6, 17, 18, -6, 6, C); B(-9, 9, 4, 10, -9, -5, C); B(-9, -8, 6, 10, -5, 3, C); B(8, 9, 6, 10, -5, 3, C); // a domed shell, down over the ears and neck
    head();
    B(-1, 1, 17, 18, -6, 6, TRIM); B(-1, 1, 16, 17, -8, 8, TRIM); B(-1, 1, 10, 16, -9, -8, TRIM); // a stripe over the top
    B(-9, 9, 10, 12, 8, 10, DK); B(-3, 3, 10, 13, 9, 11, TRIM); // brow and a peak
    for (const sx of [-1, 1]) {
      const X = (a, c) => sx > 0 ? [a, c] : [-c, -a];
      const rows = st >= 2 ? [[8, -2, 3], [10, -5, 3], [12, -9, 2], [14, -13, 0], [16, -17, -3]] : [[10, -2, 3], [12, -6, 2], [14, -10, 0], [16, -13, -3]];
      rows.forEach(([y, z0, z1], i) => { const o = i >> 1; B(...X(9 + o, 11 + o), y, y + 2, z0, z1, i === rows.length - 1 ? TRIM : i % 2 ? HI : C); }); // feathers sweeping up, back and out
    }
  } else {
    // steel helmet, ridge at 2 stars, gold at 3
    const C = hex([150, 156, 166]), HI = hex([204, 210, 220]), DK = hex([90, 96, 108]);
    const TRIM = st >= 3 ? hex([226, 178, 40]) : hex([158, 34, 40]);
    B(-9, 9, 6, 18, -9, 9, C); B(-9, 9, 3, 6, -9, -7, C);
    B(-9, 9, 12, 15, -9, 9, TRIM);
    head();
    B(-6, 6, 6, 11, 8, 9, 0); // face opening
    B(-8, 8, 11, 15, 8, 10, TRIM);
    for (const sx of [-1, 1]) { // cheek guards
      const X = (a, c) => sx > 0 ? [a, c] : [-c, -a];
      B(...X(8, 10), 3, 9, 0, 10, DK); B(...X(6, 10), 3, 9, 8, 10, DK); B(...X(4, 10), 3, 6, 8, 10, DK);
    }
    B(-2, 2, 3, 12, 8, 10, DK); // nose guard
    if (st >= 2) B(-2, 2, 18, 20, -8, 8, st >= 3 ? hex([240, 196, 64]) : HI);
  }
  return out;
}
// ---- hat skin models, in hat pixels like the hats
function skinPieces(id) {
  const out = [], B = pieceBox(out), hex = (a, g) => palIdx(rgbHex(a), g);
  const head = () => B(-8, 8, 0, 16, -8, 8, 0), X = (sx, a, c) => sx > 0 ? [a, c] : [-c, -a];
  if (id === 'brainjar') {
    // a metal collar and lid, a brain sitting in glowing goo between them (the glass is its own mesh)
    const M = hex([128, 136, 150]), MH = hex([176, 184, 198]), MD = hex([80, 86, 100]), PK = hex([242, 164, 186]), PD = hex([206, 108, 142]), GOO = hex([110, 224, 90], true), LT = hex([150, 255, 120], true);
    B(-9, 9, 12, 16, -9, 9, M); B(-9, 9, 15, 16, -9, 9, MH);
    head();
    B(-8, 8, 16, 18, -8, 8, GOO);
    B(-7, 7, 16, 22, -6, 6, PK); B(-6, 6, 16, 22, -7, 7, PK); B(-6, 6, 22, 24, -5, 5, PK); B(-5, 5, 22, 24, -6, 6, PK); // the brain
    for (const [a, b, y] of [[-5, -2, 19], [-2, 0, 18], [0, 3, 19], [3, 5, 18]]) { B(a, b, y, y + 1, 6, 7, PD); B(-b, -a, y, y + 1, -7, -6, PD); B(-7, -6, y, y + 1, a, b, PD); B(6, 7, y, y + 1, -b, -a, PD); } // its folds
    B(-1, 1, 23, 24, -6, 6, PD); B(-5, -2, 23, 24, -3, -2, PD); B(-4, -2, 23, 24, 2, 3, PD); B(2, 5, 23, 24, -2, -1, PD); B(2, 4, 23, 24, 3, 4, PD);
    for (const [x, z] of [[-9, -9], [8, -9], [-9, 8], [8, 8]]) B(x, x + 1, 16, 26, z, z + 1, MD); // corner posts
    B(-9, 9, 26, 28, -9, 9, M); B(-9, 9, 27, 28, -9, 9, MH); B(-3, 3, 28, 30, -3, 3, MD); // lid and cap
    B(-1, 1, 26, 27, 9, 10, LT); // a light on the lid
  } else if (id === 'hunter') {
    // a blaze orange cap, ear flaps folded up, a bullseye on the front
    const C = hex([255, 116, 28]), HI = hex([255, 156, 76]), DK = hex([204, 80, 14]), FL = hex([240, 228, 204]), RD = hex([214, 30, 38]), WH = hex([250, 246, 238]), CEN = hex([255, 50, 50], true);
    B(-9, 9, 12, 20, -9, 9, C); B(-8, 8, 20, 21, -8, 9, C); B(-8, 8, 20, 21, -8, -6, HI);
    B(-9, 9, 12, 14, -9, 9, DK); // band
    head();
    B(-7, 7, 12, 13, 9, 14, DK); // bill
    B(-3, 3, 14, 20, 8, 9, RD); B(-2, 2, 15, 19, 8, 9, WH); B(-1, 1, 16, 18, 8, 9, CEN); // bullseye
    for (const sx of [-1, 1]) { B(...X(sx, 9, 11), 13, 19, -5, 5, C); B(...X(sx, 9, 11), 13, 15, -5, 5, FL); } // ear flaps, fleece showing
    B(-1, 1, 21, 22, -1, 1, DK); // a button on top
  } else if (id === 'circlet') {
    // a slim silver circlet, a blade crest over a small guard, a violet gem, fins swept back at the temples
    const S = hex([200, 208, 222]), SH = hex([240, 244, 252]), SD = hex([130, 138, 156]), GEM = hex([196, 150, 255], true);
    B(-9, 9, 11, 15, -9, 9, S); B(-9, 9, 14, 15, -9, 9, SH);
    head();
    B(-4, 4, 15, 17, 8, 10, SD); // guard
    B(-2, 2, 17, 26, 8, 10, S); B(-1, 1, 17, 26, 9, 10, SH); B(-1, 1, 26, 28, 8, 10, S); // blade
    B(-1, 1, 12, 14, 9, 10, GEM); // gem
    for (const sx of [-1, 1]) { B(...X(sx, 9, 10), 13, 16, -4, 3, S); B(...X(sx, 9, 10), 16, 19, -8, -1, SH); } // fins swept back
  } else if (id === 'ghillie') {
    // a shaggy hood of leaves and rags, patched in greens and browns, ragged round the edge
    const pal = [[62, 92, 40], [86, 118, 52], [110, 100, 60], [76, 70, 42], [124, 144, 68]].map(c => hex(c)), r = charRng(77), pick = () => pal[r() * pal.length | 0], at = s => -10 + (r() * (21 - s) | 0);
    B(-10, 10, 1, 19, -10, 10, pal[0]); B(-10, 10, -1, 1, -10, -6, pal[0]); // the hood, down over the neck at the back
    for (let k = 0; k < 40; k++) { // patches
      const s = 3 + (r() * 3 | 0), a = at(s), y = 1 + (r() * (19 - s) | 0), f = r() * 4 | 0, c = pick();
      if (f === 0) B(-10, -9, y, y + s, a, a + s, c); else if (f === 1) B(9, 10, y, y + s, a, a + s, c);
      else if (f === 2) B(a, a + s, y, y + s, -10, -9, c); else { const b = at(s); B(a, a + s, 18, 19, b, b + s, c); }
    }
    for (let k = 0; k < 24; k++) { // clumps sticking out
      const s = 4 + (r() * 2 | 0), a = at(s), y = 2 + (r() * (17 - s) | 0), f = k % 4, c = pick();
      if (f === 0) B(-11, -10, y, y + s, a, a + s, c); else if (f === 1) B(10, 11, y, y + s, a, a + s, c);
      else if (f === 2) B(a, a + s, y, y + s, -11, -10, c); else { const b = at(s); B(a, a + s, 19, 20 + (r() * 3 | 0), b, b + s, c); }
    }
    for (const sx of [-1, 1]) { B(...X(sx, 7, 11), 15, 19, 10, 11, pick()); B(...X(sx, 8, 11), 5, 10, 10, 11, pick()); } // round the face
    for (const [a, y] of [[-9, -3], [-2, -2], [5, -4]]) B(a, a + 4, y, 3, -11, -9, pick()); // strips down the back
    for (let a = -9; a < 9; a += 4) { B(-10, -8, 0, 1, a, a + 2, pick()); B(8, 10, 0, 1, -a - 2, -a, pick()); } // a ragged edge
    head();
    B(-7, 7, 1, 14, 8, 11, 0); // face opening
    B(-10, 10, 14, 19, 9, 10, pick()); B(-7, -3, 12, 14, 8, 10, pick()); B(3, 7, 12, 14, 8, 10, pick()); // a shaggy brow
  } else if (id === 'laurel') {
    // a golden laurel wreath, leaves along both sides, a smooth band over the brow, tied with a red ribbon at the back
    const G = hex([240, 192, 52]), GH = hex([255, 228, 124]), GD = hex([188, 134, 28]), RB = hex([204, 38, 46]), RD = hex([150, 24, 34]);
    B(-9, 9, 11, 15, -9, 9, G); B(-9, 9, 12, 13, -9, 9, GD);
    head();
    for (const sx of [-1, 1]) {
      for (const z of [-9, -4, 1]) B(...X(sx, 8, 9), 15, 17, z, z + 4, GH); // leaves along the sides
      for (const z of [-7, -2, 3]) B(...X(sx, 8, 9), 9, 11, z, z + 4, G);
      B(...X(sx, 5, 9), 15, 17, 8, 9, GH); // and round the front corners
    }
    for (const x of [-8, 4]) B(x, x + 4, 15, 17, -9, -8, GH); // round the back
    B(-2, 2, 10, 16, -10, -9, RB); B(-4, -1, 4, 10, -10, -9, RB); B(1, 4, 3, 10, -10, -9, RD); // ribbon
  } else if (id === 'octopus') {
    // an octopus sitting on your head: a round mantle bulging out the back, two sleepy eyes (its arms are their own meshes, so they can wave)
    const [C, HI, Y, K] = OCTO.map(c => hex(c));
    B(-9, 9, 12, 24, -9, 9, C); B(-7, 7, 24, 27, -8, 6, C);
    B(-7, 7, 12, 25, -14, -9, C); // the mantle, down to where the back arms hang
    head();
    for (const sx of [-1, 1]) { B(...X(sx, 2, 7), 15, 19, 8, 9, Y); B(...X(sx, 3, 6), 16, 18, 8, 9, K); } // eyes
    for (const [x, z] of [[-4, 1], [2, -3], [-1, -6]]) B(x, x + 2, 26, 27, z, z + 2, HI); // spots
    for (const [y, z] of [[19, -4], [15, 2], [20, 4]]) { B(-9, -8, y, y + 2, z, z + 2, HI); B(8, 9, y + 1, y + 3, -z - 2, -z, HI); }
    B(-4, -2, 21, 23, -14, -13, HI); B(1, 3, 18, 20, -14, -13, HI);
  } else if (id === 'map') {
    // a treasure map wrapped round the head: sea on one side, hills on the other, a dotted trail to a red X, the rolled ends at the back
    const P = hex([228, 206, 152]), PD = hex([198, 170, 114]);
    const C = { s: hex([92, 160, 204]), w: hex([150, 204, 232]), g: hex([122, 170, 84]), G: hex([64, 118, 60]), i: hex([92, 62, 36]), r: hex([200, 48, 40]), X: hex([255, 64, 52], true) };
    const draw = (rows, put) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (C[ch]) put(i, rows.length - 1 - j, C[ch]); }));
    B(-9, 9, 11, 25, -9, 9, P);
    for (const x of [-8, 4]) B(x, x + 4, 10, 25, -12, -9, PD); // the rolls
    head();
    draw(['................', '.i...i....X.X...', 'i.i.i.i....X....', '..........X.X...', '........r.......', '.....rr.........', '..rr............', 'ss..............', 'sss.......ggg...', 'swss.....ggggg..', 'ssssw....gGggg..', 'sssss.....ggg...'], (i, j, c) => B(i - 8, i - 7, j + 12, j + 13, 8, 9, c));
    draw(['................', '....i.i.........', '.....i.....ss...', '.........ssssss.', 's......sssswssss', 'ss...sssssssssss', 'sssssssss.i.ssss', 'sswsssss.iii.sws', 'ssssssss.iii.sss', 'sssswss.iiiii.ss', 'ssssssssssssssws', 'sswssssssswsssss'], (i, j, c) => B(-9, -8, j + 12, j + 13, 7 - i, 8 - i, c));
    draw(['................', '...i.....i......', '..i.i...i.i.....', '.i...i.i...i....', '................', '....GG....GG....', '...GGGG..GGGG...', '....ii....ii....', 'gg..........gggg', 'gggg......gggggg', 'ggggg....ggggggg', 'gggg......gggggg'], (i, j, c) => B(8, 9, j + 12, j + 13, 7 - i, 8 - i, c));
    draw(['...r...', '.i.r.i.', '..iri..', 'iiiiiii', '..iii..', '.i.i.i.', '...i...'], (i, j, c) => B(i - 4, i - 3, 24, 25, 3 - j, 4 - j, c)); // a compass rose on top
    draw(['iii', '..i', '.i.', '...', '.i.'], (i, j, c) => B(1 - i, 2 - i, j + 16, j + 17, -9, -8, c)); // and a riddle on the back
  }
  return out;
}
// the octopus: its colours, and its eight arms round the rim, each hung from a pivot so it can wave ([x, z, turn, length])
const OCTO = [[226, 98, 64], [248, 150, 108], [255, 226, 120], [30, 22, 26]];
const OCTO_ARMS = [[-10, 8, -.6, 10], [10, 8, .6, 10], [-11, 2, -1.57, 8], [11, 2, 1.57, 8], [-11, -5, -1.9, 10], [11, -5, 1.9, 10], [-4, -11, 3.14, 8], [4, -11, 3.14, 8]];
const octoGeo = {};
function octoArm(len, hp) {
  return octoGeo[len + ':' + hp] ??= (() => {
    const out = [], B = pieceBox(out), C = palIdx(rgbHex(OCTO[0])), HI = palIdx(rgbHex(OCTO[1]));
    B(-2, 2, -len, 0, -2, 2, C); B(-2, 2, -len, 4 - len, 2, 6, C); // down, then curling out at the tip
    for (let y = 2; y < len - 4; y += 3) B(-1, 1, -y - 1, -y, 1, 2, HI); // suckers
    return voxelGeos(out, hp).lit;
  })();
}
// the jar's glass and the octopus's arms, in pictures too
const SKIN_GLASS = new THREE.MeshLambertMaterial({ color: 0xd2ffcc, transparent: true, opacity: .24, depthWrite: false });
function skinExtras(id, g, hp) {
  if (id === 'octopus') for (const [x, z, turn, len] of OCTO_ARMS) {
    const piv = new THREE.Group(), arm = new THREE.Mesh(octoArm(len, hp), g.material);
    piv.position.set(x * hp, 13 * hp, z * hp); piv.rotation.y = turn; arm.rotation.x = -.2; arm.userData.arm = true; piv.add(arm); g.add(piv);
  }
  if (id !== 'brainjar') return;
  const m = new THREE.Mesh(ZAP_BOX, SKIN_GLASS); m.scale.set(17.6 * hp, 10 * hp, 17.6 * hp); m.position.y = 21 * hp; m.renderOrder = 2; g.add(m);
}
// what moves on a worn skin: bubbles in the jar, the bullseye pings, a glint runs up the blade, leaves fall off the hood, the laurel sparkles, the octopus waves
const skinMats = {};
const skinMat = (c, o = 1) => skinMats[c + ':' + o] ??= new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const skinSprite = c => skinMats['s' + c] ??= new THREE.SpriteMaterial({ map: haloMap(), color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
let skinRingGeo = null, skinLeafMat = null;
function skinFx(id, g, hp) { // { tick, own: a material of its own to dispose }, or null
  const few = gfx.q === 'low', R = Math.random, at = (m, x, y, z) => m.position.set(x * hp, y * hp, z * hp);
  const box = mat => { const m = new THREE.Mesh(ZAP_BOX, mat); m.scale.setScalar(1e-4); g.add(m); return m; }; // tiny till its first tick
  if (id === 'brainjar') {
    const spot = b => { const e = R() < .5 ? -7.8 : 7.8, w = (R() - .5) * 14; [b.x, b.z] = R() < .5 ? [e, w] : [w, e]; return b; }; // round the brain
    const n = few ? 2 : 4, bs = Array.from({ length: n }, (_, i) => spot({ m: box(skinMat(0xd2ffb8, .8)), t: i / n, x: 0, z: 0 }));
    return { tick: dt => { for (const b of bs) {
      if ((b.t += dt * .4) >= 1) { b.t -= 1; spot(b); }
      at(b.m, b.x, 18 + b.t * 7.6, b.z + Math.sin(b.t * 9) * .5); b.m.scale.setScalar(hp * (b.t > .88 ? (1 - b.t) * 10 : 1.2));
    } } };
  }
  if (id === 'hunter') {
    const own = new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const ring = new THREE.Mesh(skinRingGeo ??= new THREE.RingGeometry(.8, 1, 20), own); at(ring, 0, 17, 9.3); g.add(ring);
    let t = R() * 2;
    return { own, tick: dt => { t += dt; const k = t % 2.6 / .7; ring.visible = k < 1; if (k < 1) { ring.scale.setScalar(hp * (1.5 + k * 4)); own.opacity = .7 * (1 - k); } } };
  }
  if (id === 'circlet') {
    const glint = new THREE.Sprite(skinSprite(0xffffff)), gem = new THREE.Sprite(skinSprite(0xb98aff));
    at(gem, 0, 13, 10.4); g.add(glint, gem);
    let t = R() * 3;
    return { tick: dt => {
      t += dt; const k = t % 3.2 / .45; glint.visible = k < 1;
      if (k < 1) { at(glint, 0, 17 + k * 10, 10.4); glint.scale.setScalar(hp * 5 * Math.sin(k * Math.PI)); }
      gem.scale.setScalar(hp * (3.6 + Math.sin(t * 3) * .8));
    } };
  }
  if (id === 'ghillie') {
    skinLeafMat ??= new THREE.MeshLambertMaterial({ color: 0x6f9a3a });
    const ls = Array.from({ length: few ? 1 : 2 }, () => ({ m: box(skinLeafMat), t: 1.6, p: 1.6 + R() * 3, x: 0, y: 0, z: 0 }));
    return { tick: dt => { for (const l of ls) {
      if ((l.t += dt) >= l.p) { l.t = 0; l.p = 2.5 + R() * 3; l.x = (R() - .5) * 18; l.y = 6 + R() * 10; l.z = -2 - R() * 7; }
      const k = l.t / 1.6; l.m.visible = k < 1;
      if (k < 1) { at(l.m, l.x + Math.sin(k * 7) * 2, l.y - k * 16, l.z - k * 3); l.m.rotation.set(k * 5, k * 3, 0); l.m.scale.set(1.8 * hp, .4 * hp, 1.2 * hp); }
    } } };
  }
  if (id === 'map') { // the trail lights up dash by dash, then the X
    const ms = [[-5, 17.5], [-2, 18.5], [.5, 19.5], [3.5, 21.5]].map(([x, y], i) => { const m = new THREE.Sprite(skinSprite(i === 3 ? 0xff4030 : 0xffb060)); at(m, x, y, 9.4); m.visible = false; g.add(m); return m; });
    let t = R() * 3;
    return { tick: dt => { t += dt; const k = t % 3.6 / .3; ms.forEach((m, i) => {
      const X = i === 3, a = (k - i) / (X ? 4 : 1.4); m.visible = a > 0 && a < 1;
      if (m.visible) m.scale.setScalar(hp * (X ? 7 : 3) * Math.sin(a * Math.PI));
    }); } };
  }
  if (id === 'octopus') { // its arms wave, each in its own time, and never in over your face
    const arms = []; g.traverse(o => { if (o.userData.arm) arms.push(o); });
    let t = R() * 9;
    return { tick: dt => { t += dt; arms.forEach((a, i) => { a.rotation.x = -.14 - .2 * (.5 + .5 * Math.sin(t * (1.7 + i % 3 * .35) + i * 1.9)); a.rotation.z = .1 * Math.sin(t * 1.3 + i * 2.4); }); } };
  }
  if (id === 'laurel') {
    const ss = Array.from({ length: few ? 2 : 3 }, () => ({ s: new THREE.Sprite(skinSprite(0xffe9a0)), t: 1 + R() * 2, wait: 0 }));
    for (const o of ss) { o.s.visible = false; g.add(o.s); }
    return { tick: dt => { for (const o of ss) {
      if ((o.t += dt * 1.6) < 1) { o.s.visible = true; o.s.scale.setScalar(hp * 4 * Math.sin(o.t * Math.PI)); continue; }
      o.s.visible = false;
      if ((o.wait -= dt) <= 0) { o.wait = .3 + R() * 1.5; o.t = 0; const a = R() * 6.28; at(o.s, Math.sin(a) * 10, 12 + R() * 5, Math.cos(a) * 10); }
    } } };
  }
  return null;
}
const HAT_PX = ARMOR_PX;
const hatGeoCache = {};
const hatGeos = (id, st, U, skin) => hatGeoCache[(skin ? 'skin:' + skin : id + ':' + st) + ':' + U] ??= voxelGeos(skin ? skinPieces(skin) : hatPieces(id, st), U / HAT_PX);
// a hat (with its skin) as meshes on g
function hatMeshes(id, st, U, skin, mat, g, ch = null) {
  const geos = hatGeos(id, st, U, skin), m = wearMesh(geos, mat, ch);
  if (geos.glow) m.add(new THREE.Mesh(geos.glow, gunGlow));
  if (skin) skinExtras(skin, m, U / HAT_PX);
  g.add(m); return m;
}
// put a hat on a character (null takes it off)
function dressHat(ch, h) {
  if (ch.hat) { ch.hat.mesh.parent.remove(ch.hat.mesh); ch.mats.splice(ch.mats.indexOf(ch.hat.mat), 1); ch.hat.mat.dispose(); ch.hat.fx?.own?.dispose(); ch.hat = null; }
  if (!h || !hatOf(h.id)) return;
  const skin = hatSkinOf(h.skin) ? h.skin : '', mat = armorMat(), mesh = hatMeshes(h.id, h.st, ch.U, skin, mat, ch.headPiv, ch);
  ch.mats.push(mat); ch.hat = { mat, mesh, fx: skin ? skinFx(skin, mesh, ch.U / HAT_PX) : null };
}
// armory preview
function hatModel(id, st, g, skin = '') { hatMeshes(id, st, 1 / 16, hatSkinOf(skin) ? skin : '', gunLit, g); }
// hat pictures, at their 3-star size (a skin is its own picture)
const hatPic = (id, st, skin = '') => hatSkinOf(skin) ? modelPic('hat:' + skin, g => hatModel(id, st, g, skin), { yaw: .4, tilt: .3, w: 200, h: 180 })
  : modelPic('hat:' + id + st, g => hatModel(id, st, g), { yaw: .4, tilt: .3, w: 200, h: 180, ref: ['hat:' + id, g => hatModel(id, 3, g)] });
showProf(); // the badge can tell now whether the next one is a bar or a chest
