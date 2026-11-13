// hats, stats per star (ids are used in saves, don't rename them)
const HATS = [
  { id: 'warrior', rar: 'rare', name: 'Warrior Helmet', unlock: 6, price: 90, dr: [.04, .06, .08], hs: [.20, .27, .33] },
  { id: 'raider', rar: 'rare', name: 'Raider Hood', unlock: 8, price: 130, half: [.05, .07, .10], stealth: [30, 22, 15] },
  { id: 'ironclad', rar: 'epic', name: 'Ironclad Helm', unlock: 17, price: 260, dr: [.04, .06, .08], hs: [.25, .33, .4] },
  { id: 'arcane', rar: 'epic', name: 'Arcane Hat', unlock: 20, price: 300, shrug: [.25, .35, .5] },
  { id: 'thornwood', rar: 'epic', name: 'Thornwood Helm', unlock: 14, price: 240, thorns: [.35, .5, .65] },
  { id: 'skyrunner', rar: 'legend', name: 'Skyrunner Helm', unlock: 26, price: 360, sky: [.15, .2, .25] },
];
const HAT_I = Object.fromEntries(HATS.map((H, i) => [H.id, i]));
const hatOf = id => HATS[HAT_I[id]] ?? null;
const hatStars = id => prof.hats?.[id] | 0; // 0 = not bought
const hatUse = id => { const st = hatStars(id), u = prof.hatUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornHat = () => { const id = prof.hatOn; return id && hatStars(id) ? { id, st: hatUse(id) } : null; };
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
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a));
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
const HAT_PX = ARMOR_PX;
const hatGeoCache = {};
const hatGeo = (id, st, U) => hatGeoCache[id + ':' + st + ':' + U] ??= voxelGeos(hatPieces(id, st), U / HAT_PX).lit;
// put a hat on a character (null takes it off)
function dressHat(ch, h) {
  if (ch.hat) { ch.hat.mesh.parent.remove(ch.hat.mesh); ch.mats.splice(ch.mats.indexOf(ch.hat.mat), 1); ch.hat.mat.dispose(); ch.hat = null; }
  if (!h || !hatOf(h.id)) return;
  const mat = armorMat(), mesh = new THREE.Mesh(hatGeo(h.id, h.st, ch.U), mat);
  ch.headPiv.add(mesh); ch.mats.push(mat); ch.hat = { mat, mesh };
}
// armory preview
function hatModel(id, st, g) { g.add(new THREE.Mesh(hatGeo(id, st, 1 / 16), gunLit)); }
// hat pictures, at their 3-star size
const hatPic = (id, st) => modelPic('hat:' + id + st, g => hatModel(id, st, g), { yaw: .4, tilt: .3, w: 200, h: 180, ref: ['hat:' + id, g => hatModel(id, 3, g)] });
