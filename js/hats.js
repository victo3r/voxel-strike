// Hats you wear (armory WEAR page, HATS section). Same rules as boots (js/boots.js): one on at a time, bought once and
// upgraded one star at a time (3 stars), work in every mode, and their percentages add up with your armor and boots.
// prof.hats: hat id -> stars you own. prof.hatUse: hat id -> the stars you wear when that's fewer. prof.hatOn: the hat you wear ('' = none).
// id = permanent name used in saves. Never rename or reuse one (they're separate from boot ids).
// per star [★, ★★, ★★★]: dr = share cut off every hit you take, hs = chance a headshot on you only does body-shot damage,
// half = chance a hit only does half its damage, stealth = past this many blocks (1 block = 1 meter, a player is 1.85 tall)
// enemies don't see your red outline
const HATS = [
  { id: 'warrior', name: 'Warrior Helmet', unlock: 6, price: 90, dr: [.04, .06, .08], hs: [.20, .27, .33] },
  { id: 'raider', name: 'Raider Hood', unlock: 8, price: 130, half: [.05, .07, .10], stealth: [30, 22, 15] },
];
const HAT_I = Object.fromEntries(HATS.map((H, i) => [H.id, i]));
const hatOf = id => HATS[HAT_I[id]] ?? null;
const hatStars = id => prof.hats?.[id] | 0; // 0 = not bought
const hatUse = id => { const st = hatStars(id), u = prof.hatUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornHat = () => { const id = prof.hatOn; return id && hatStars(id) ? { id, st: hatUse(id) } : null; };
// everything boots b and hat h do together ({ id, st } or null each)
function gearFx(b, h) {
  const f = { ...bootFx(b), hs: 0, half: 0, stealth: 0 }, H = h && hatOf(h.id);
  if (!H) return f;
  const L = h.st - 1;
  f.dr += H.dr?.[L] ?? 0; f.hs = H.hs?.[L] ?? 0; f.half = H.half?.[L] ?? 0; f.stealth = H.stealth?.[L] ?? 0;
  return f;
}
// yours, read live, so changing gear mid-match takes effect straight away
const youFx = () => gearFx(wornBoots(), wornHat());
const HEAD_MUL = 1.5; // a headshot does this many times the damage (combat.js)
// a hit on someone wearing gear fx: a helmet can turn a headshot into a body shot, a hood can halve the hit. Returns [damage, still a headshot]
function gearHit(fx, d, head) {
  if (head && Math.random() < fx.hs) { d /= HEAD_MUL; head = false; }
  if (fx.half && Math.random() < fx.half) d *= .5;
  return [d, head];
}
// a bot's hat for the match, the same way as its boots: none HAT_BARE of the time, or any hat in the game (botHat)
const HAT_BARE = .3;
function botHat() { // any hat in the game: ★ if you don't own it, else up to the stars you own on it (worn or not)
  if (Math.random() < HAT_BARE) return null;
  const H = HATS[Math.random() * HATS.length | 0];
  return { id: H.id, st: 1 + (Math.random() * Math.max(1, hatStars(H.id)) | 0) };
}

// ---- the model: voxel pixel art like the armor, in armor pixels (half a skin pixel each), measured from the neck,
// where the head pivots: the head is x -8..8, y 0..16, z -8..8 (+z is the face, +x the character's left).
// The face (8x8 skin pixels) has its eyes in skin columns 1-2 and 5-6 and rows 3-4 from the top, so the middle two columns
// (x -2..2) and the top two rows (y 12..16) can be covered without hiding them. Each hat stands one pixel off the head.
// The icon and the spinning preview show the hat alone, hollow, the way it looks off a head
function hatPieces(id, st) {
  const out = [], B = pieceBox(out), hex = a => palIdx(rgbHex(a));
  const head = () => B(-8, 8, 0, 16, -8, 8, 0); // after the shell: hollow it out where the head goes
  if (id === 'raider') {
    // a charcoal hood with a teal edge round the face, hanging down over the back of the neck.
    // ★★ adds a scarf pulled up over the mouth, ★★★ turns the edges gold and adds a stripe over the top
    const C = hex([56, 62, 78]), HI = hex([92, 102, 124]), TRIM = st >= 3 ? hex([240, 196, 64]) : hex([34, 200, 186]);
    B(-9, 9, 1, 18, -9, 9, C); B(-9, 9, -2, 1, -9, -6, C); // the hood, and its back over the neck
    B(-9, 9, 16, 17, -9, 9, HI); // a lighter fold along the top
    head();
    B(-8, 8, 1, 15, 8, 9, TRIM); B(-6, 6, 1, 13, 8, 9, 0); // the edge round the face (2 wide: the inner pixel turns to outline), then the opening
    if (st >= 2) { B(-7, 7, 0, 5, 8, 10, C); B(-7, 7, 4, 5, 8, 10, TRIM); } // the scarf, with an edge along its top
    if (st >= 3) B(-1, 1, 17, 18, -9, 9, TRIM); // painted into the top, front to back
  } else {
    // a steel helmet: a dome down to the brow, open at the face below it, with thick plates standing proud of it for accents:
    // the band across the brow, a cheek guard down each side of the face, a nose guard down the middle. A short guard covers the
    // back of the neck. The band is red, gold at ★★★. ★★ adds a ridge over the top (gold at ★★★)
    const C = hex([150, 156, 166]), HI = hex([204, 210, 220]), DK = hex([90, 96, 108]);
    const TRIM = st >= 3 ? hex([226, 178, 40]) : hex([158, 34, 40]);
    B(-9, 9, 6, 18, -9, 9, C); B(-9, 9, 3, 6, -9, -7, C); // the dome, and a short guard down the back of the neck
    B(-9, 9, 12, 15, -9, 9, TRIM); // the band, painted into the dome
    head();
    B(-6, 6, 6, 11, 8, 9, 0); // the face opening, under the brow and between the cheek guards
    B(-8, 8, 11, 15, 8, 10, TRIM); // the brow: the band stands proud across the front
    for (const sx of [-1, 1]) { // cheek guards: a plate down the side of the face, round onto its front and in under the eye
      const X = (a, c) => sx > 0 ? [a, c] : [-c, -a];
      B(...X(8, 10), 3, 9, 0, 10, DK); B(...X(6, 10), 3, 9, 8, 10, DK); B(...X(4, 10), 3, 6, 8, 10, DK);
    }
    B(-2, 2, 3, 12, 8, 10, DK); // nose guard, down to the cheek guards' lower edge
    if (st >= 2) B(-2, 2, 18, 20, -8, 8, st >= 3 ? hex([240, 196, 64]) : HI); // the ridge
  }
  return out;
}const HAT_PX = ARMOR_PX;
const hatGeoCache = {};
const hatGeo = (id, st, U) => hatGeoCache[id + ':' + st + ':' + U] ??= voxelGeos(hatPieces(id, st), U / HAT_PX).lit;
// puts hat h ({ id, st } or null) on a character from buildChar. It rides on the head, so it turns with it
function dressHat(ch, h) {
  if (ch.hat) { ch.hat.mesh.parent.remove(ch.hat.mesh); ch.mats.splice(ch.mats.indexOf(ch.hat.mat), 1); ch.hat.mat.dispose(); ch.hat = null; }
  if (!h || !hatOf(h.id)) return;
  const mat = armorMat(), mesh = new THREE.Mesh(hatGeo(h.id, h.st, ch.U), mat);
  ch.headPiv.add(mesh); ch.mats.push(mat); ch.hat = { mat, mesh };
}
// for the armory's spinning preview
function hatModel(id, st, g) { g.add(new THREE.Mesh(hatGeo(id, st, 1 / 16), gunLit)); }
// icon: seen from the front, 4 screen pixels per armor pixel, black outline like the armor icons.
// Every star of a hat is drawn in the same frame
const hatSpriteCache = {};
function hatSprite(id, st) {
  const key = id + st; if (hatSpriteCache[key]) return hatSpriteCache[key];
  const frame = voxelGrid(hatPieces(id, 3)), { lo, NX, NY, NZ, at } = voxelGrid(hatPieces(id, st));
  const W = frame.NX - 2, H = frame.NY - 2, K = 4, x0 = frame.lo[0] + 1, y1 = frame.lo[1] + frame.NY - 2;
  const dep = new Float32Array(W * H).fill(-99), col = new Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const x = x0 + c - lo[0], y = y1 - r - lo[1];
    for (let z = NZ - 1; z >= 0; z--) { const m = at(x, y, z); if (m) { dep[r * W + c] = z; col[r * W + c] = gunPal[m].c; break; } }
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
  return hatSpriteCache[key] = cv.toDataURL();
}
