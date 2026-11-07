// hats, stats per star (ids are used in saves, don't rename them)
const HATS = [
  { id: 'warrior', name: 'Warrior Helmet', unlock: 6, price: 90, dr: [.04, .06, .08], hs: [.20, .27, .33] },
  { id: 'raider', name: 'Raider Hood', unlock: 8, price: 130, half: [.05, .07, .10], stealth: [30, 22, 15] },
];
const HAT_I = Object.fromEntries(HATS.map((H, i) => [H.id, i]));
const hatOf = id => HATS[HAT_I[id]] ?? null;
const hatStars = id => prof.hats?.[id] | 0; // 0 = not bought
const hatUse = id => { const st = hatStars(id), u = prof.hatUse?.[id] | 0; return u ? Math.max(1, Math.min(st, u)) : st; };
const wornHat = () => { const id = prof.hatOn; return id && hatStars(id) ? { id, st: hatUse(id) } : null; };
// boots and hat effects combined
function gearFx(b, h) {
  const f = { ...bootFx(b), hs: 0, half: 0, stealth: 0 }, H = h && hatOf(h.id);
  if (!H) return f;
  const L = h.st - 1;
  f.dr += H.dr?.[L] ?? 0; f.hs = H.hs?.[L] ?? 0; f.half = H.half?.[L] ?? 0; f.stealth = H.stealth?.[L] ?? 0;
  return f;
}
const youFx = () => gearFx(wornBoots(), wornHat());
const HEAD_MUL = 1.5; // headshot damage multiplier
// helmet can block a headshot, hood can halve a hit
function gearHit(fx, d, head) {
  if (head && Math.random() < fx.hs) { d /= HEAD_MUL; head = false; }
  if (fx.half && Math.random() < fx.half) d *= .5;
  return [d, head];
}
// bots get random hats, never better than yours
const HAT_BARE = .3;
function botHat() {
  if (Math.random() < HAT_BARE) return null;
  const H = HATS[Math.random() * HATS.length | 0];
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
}const HAT_PX = ARMOR_PX;
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
// hat icons
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
