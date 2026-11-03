// Every person in the game (the lobby character, bots, later the customizer) is built here from a "look".
// Proportions are Minecraft's, in skin pixels: head 8x8x8, body 8x12x4, legs 4x12x4, arms 4x12x4,
// plus a 4x1x4 neck between the body and head, so 33 pixels tall.
// The texture is one 64x64 skin laid out like a Minecraft skin, so a hand-drawn skin image could be swapped in later.
//
// look = { skin: 0-5, girl, eyes, hair, hairC, top, topC, top2, bottom, bottomC, shoes, shoeC, extra }
//   hair:   short | buzz | side | curly | long | bob
//   top:    tee | long | tank | hoodie | jacket   (top2 = the shirt under the jacket, or the hoodie strings)
//   bottom: pants | shorts      shoes: sneakers | boots | plain
//   extra:  null | glasses | stubble | beard | freckles | headband | badge
//   bigEyes: 2x2 eyes instead of 1 row tall (only drawn when the row above the eyes is free)
//   bandC: headband colour (older looks fall back to top2)
//   mouth:  small | wide        brows: none | soft | full
//   girl only picks what bots tend to roll, and the mouth/brows when a look doesn't set them

const mouthOf = L => L.mouth ?? (L.girl ? 'small' : 'wide');
const browsOf = L => L.brows ?? (L.girl ? 'soft' : 'full');

const SKIN_TONES = [[247, 214, 186], [232, 190, 152], [214, 163, 124], [184, 128, 90], [140, 92, 60], [94, 62, 42]];
const HAIR_COLS = { black: [34, 29, 29], dark: [64, 42, 26], brown: [104, 70, 40], auburn: [124, 56, 34], ginger: [186, 94, 46], blonde: [212, 176, 104] };
const EYE_COLS = { blue: [45, 95, 168], brown: [92, 58, 34], green: [60, 124, 70], dark: [42, 36, 32] };

// how far the hair comes down, in rows from the top of each column.
// front: column 0 = left edge as you look at the face. side: column 0 = the front edge. back: left to right from behind.
// body: rows of hair hanging down the back of the body (long hair).
// Faces meet without a jump: front[0] and front[7] equal side[0], back[0] and back[7] equal side[7] (seamHair enforces it).
const HAIRSTYLES = {
  short: { front: [3, 2, 2, 2, 2, 2, 2, 3], side: [3, 3, 3, 3, 4, 5, 6, 6], back: [6, 7, 8, 8, 8, 8, 7, 6] },
  buzz:  { front: [2, 1, 1, 1, 1, 1, 1, 2], side: [2, 2, 2, 2, 3, 3, 3, 4], back: [4, 5, 5, 5, 5, 5, 5, 4], thin: true },
  side:  { front: [3, 3, 3, 3, 3, 2, 2, 3], side: [3, 3, 3, 4, 4, 4, 5, 5], back: [5, 6, 6, 6, 6, 6, 6, 5], part: 2 },
  curly: { front: [3, 2, 3, 2, 2, 3, 2, 3], side: [3, 3, 4, 4, 5, 5, 6, 6], back: [6, 7, 7, 7, 7, 7, 7, 6], curls: true },
  long:  { front: [8, 3, 2, 2, 2, 2, 3, 8], side: [8, 8, 8, 8, 8, 8, 8, 8], back: [8, 8, 8, 8, 8, 8, 8, 8], body: [5, 6, 6, 6, 6, 6, 6, 5] },
  bob:   { front: [7, 3, 3, 3, 3, 3, 3, 7], side: [7, 6, 6, 6, 7, 7, 7, 7], back: [7, 8, 8, 8, 8, 8, 8, 7] },
};
const seamHair = H => { H.front[0] = H.front[7] = H.side[0]; H.back[0] = H.back[7] = H.side[7]; };
Object.values(HAIRSTYLES).forEach(seamHair);

// the 8 starting looks (picked in the lobby, more detail in the customizer later)
const PRESETS = [
  { name: 'CLASSIC', look: { skin: 2, eyes: 'blue', hair: 'short', hairC: 'dark', top: 'tee', topC: 0x1c9e98, bottom: 'pants', bottomC: 0x2c3e80, shoes: 'plain', shoeC: 0x3a3a40, extra: 'badge' } },
  { name: 'HOODIE', look: { skin: 1, eyes: 'brown', hair: 'short', hairC: 'black', top: 'hoodie', topC: 0x33363d, top2: 0xdddddd, bottom: 'pants', bottomC: 0x3d5a8c, shoes: 'sneakers', shoeC: 0xb8342c } },
  { name: 'BOB', look: { skin: 0, girl: true, eyes: 'green', bigEyes: true, hair: 'bob', hairC: 'blonde', top: 'tee', topC: 0xd4577a, bottom: 'pants', bottomC: 0x3f5f99, shoes: 'sneakers', shoeC: 0xf0f0f0 } },
  { name: 'JACKET', look: { skin: 3, eyes: 'brown', hair: 'side', hairC: 'brown', top: 'jacket', topC: 0x5a3a24, top2: 0xe6e6e6, bottom: 'pants', bottomC: 0x2e2e34, shoes: 'boots', shoeC: 0x4a3020, extra: 'stubble' } },
  { name: 'LONG HAIR', look: { skin: 4, girl: true, eyes: 'dark', hair: 'long', hairC: 'black', top: 'long', topC: 0x6a4fb0, bottom: 'pants', bottomC: 0x2a2f3a, shoes: 'plain', shoeC: 0x26262a } },
  { name: 'CURLY', look: { skin: 5, eyes: 'dark', hair: 'curly', hairC: 'black', top: 'tank', topC: 0xe8c33a, bottom: 'shorts', bottomC: 0x3a4a5a, shoes: 'sneakers', shoeC: 0x2a2a2e } },
  { name: 'GLASSES', look: { skin: 1, girl: true, eyes: 'blue', hair: 'curly', hairC: 'auburn', top: 'hoodie', topC: 0x4f8a5a, top2: 0xf2f2f2, bottom: 'shorts', bottomC: 0x2f3440, shoes: 'sneakers', shoeC: 0xe8e8e8, extra: 'glasses' } },
  { name: 'BEARD', look: { skin: 2, eyes: 'green', hair: 'buzz', hairC: 'ginger', top: 'long', topC: 0x8a2e2e, bottom: 'pants', bottomC: 0x4b4033, shoes: 'boots', shoeC: 0x3a2618, extra: 'beard' } },
];

// the same seed always gives the same "random" pixels, so a look never changes between respawns
function charRng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const strSeed = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; };
const hexRGB = h => [h >> 16 & 255, h >> 8 & 255, h & 255];
const mixC = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const shadeC = (c, k) => c.map(v => v + k);

// where each face of a w x h x d box sits on the skin, Minecraft-style. [x, y, w, h] in skin pixels
const regions = (u, v, w, h, d) => ({
  top: [u + d, v, w, d], bottom: [u + d + w, v, w, d],
  right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d * 2 + w, v + d, w, h],
});
// "right" = the character's own right side. On a side face, the column next to the front is column d-1 on the right and 0 on the left.
const PARTS = {
  head: [0, 0, 8, 8, 8], body: [16, 16, 8, 12, 4], neck: [32, 0, 4, 1, 4], // the neck sits where a Minecraft skin keeps its hat layer, unused here
  legR: [0, 16, 4, 12, 4], legL: [16, 48, 4, 12, 4], armR: [40, 16, 4, 12, 4], armL: [32, 48, 4, 12, 4],
};

function makeSkin(look) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  paintSkin(c.getContext('2d'), look, charRng(strSeed(JSON.stringify(look))));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const skinCache = new Map();
function skinTexture(look) {
  const key = JSON.stringify(look);
  if (!skinCache.has(key)) skinCache.set(key, makeSkin(look));
  return skinCache.get(key);
}
// 2x2 eyes need row 3 of the face clear of hair, and no glasses
const bigEyesFit = L => L.extra !== 'glasses' && [1, 2, 5, 6].every(x => (HAIRSTYLES[L.hair] ?? HAIRSTYLES.short).front[x] <= 3);

function paintSkin(g, L, rnd) {
  const SK = SKIN_TONES[L.skin ?? 2], HC = HAIR_COLS[L.hairC] ?? HAIR_COLS.dark, EYE = EYE_COLS[L.eyes] ?? EYE_COLS.blue;
  const TOP = hexRGB(L.topC ?? 0x1c9e98), TOP2 = hexRGB(L.top2 ?? 0xe6e6e6), BOT = hexRGB(L.bottomC ?? 0x2c3e80), SHOE = hexRGB(L.shoeC ?? 0x3a3a40);
  const H = HAIRSTYLES[L.hair] ?? HAIRSTYLES.short;
  const px = (x, y, col, v = 0) => { const k = (rnd() - .5) * v; g.fillStyle = `rgb(${col[0] + k | 0},${col[1] + k | 0},${col[2] + k | 0})`; g.fillRect(x, y, 1, 1); };
  const fill = ([x0, y0, w, h], col, v) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x0 + x, y0 + y, col, v); };
  const at = (r, x, y, col, v) => { if (x >= 0 && y >= 0 && x < r[2] && y < r[3]) px(r[0] + x, r[1] + y, col, v); };
  const hairPx = (r, x, y, edge) => { // hair pixel: a bit of strand texture, darker right at the hairline
    let col = H.thin ? mixC(HC, SK, .4) : HC;
    if (H.curls && rnd() < .35) col = shadeC(col, 12);
    else if (!H.curls && x % 3 === 1) col = shadeC(col, -8);
    if (edge) col = shadeC(col, -10);
    at(r, x, y, col, 16);
  };

  // ---- head ----
  const head = regions(...PARTS.head.slice(0, 2), 8, 8, 8);
  for (const f of ['front', 'back', 'left', 'right']) fill(head[f], SK, 10);
  // underside of the head (row 0 = chin, row 7 = back of the head, column 0 = the character's right):
  // the lighting already darkens downward faces, so this is only a touch lighter than the face, with a slightly darker neck patch
  const HB = head.bottom;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const neck = x >= 2 && x <= 5 && y >= 2 && y <= 6;
    at(HB, x, y, shadeC(SK, neck ? -8 : 6), 8);
  }
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) hairPx(head.top, x, y, false);
  if (H.part !== undefined) for (let y = 0; y < 8; y++) at(head.top, H.part, y, shadeC(HC, -22), 6); // the parting line, a darker strand rather than bare scalp
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < H.front[x]; y++) hairPx(head.front, x, y, y === H.front[x] - 1);
    for (let y = 0; y < H.back[x]; y++) hairPx(head.back, x, y, y === H.back[x] - 1);
  }
  for (let c = 0; c < 8; c++) { // sides: c = 0 at the front edge
    for (let y = 0; y < H.side[c]; y++) { hairPx(head.right, 7 - c, y, y === H.side[c] - 1); hairPx(head.left, c, y, y === H.side[c] - 1); }
    if (c === 3 && H.side[3] <= 4) { at(head.right, 4, 4, shadeC(SK, -26), 6); at(head.right, 4, 5, shadeC(SK, -26), 6); at(head.left, 3, 4, shadeC(SK, -26), 6); at(head.left, 3, 5, shadeC(SK, -26), 6); } // ears
  }

  for (let i = 0; i < 8; i++) {
    if (H.back[7 - i] >= 8) hairPx(HB, i, 7, false);
    if (H.side[i] >= 8) { hairPx(HB, 0, i, false); hairPx(HB, 7, i, false); }
    if (H.front[i] >= 8) hairPx(HB, i, 0, false);
  }

  // face
  const F = head.front, open = (x, y) => H.front[x] <= y;
  // 2x2 eyes take row 3 too, so they only go where that row is clear of hair and glasses; brows move up a row if there's room
  const tall = L.bigEyes && bigEyesFit(L), brows = browsOf(L), small = mouthOf(L) === 'small';
  const br = tall ? 2 : 3; // brows sit just above the eyes
  if (tall) { at(F, 1, 3, [240, 240, 240]); at(F, 2, 3, shadeC(EYE, -22)); at(F, 5, 3, shadeC(EYE, -22)); at(F, 6, 3, [240, 240, 240]); }
  if (brows !== 'none') { // soft = faint, part-way to the skin tone
    const brow = brows === 'soft' ? mixC(shadeC(HC, -20), SK, .4) : shadeC(HC, -6);
    for (const x of [1, 2, 5, 6]) if (open(x, br)) at(F, x, br, brow, brows === 'soft' ? 4 : 6);
  }
  at(F, 1, 4, [250, 250, 250]); at(F, 2, 4, EYE); at(F, 5, 4, EYE); at(F, 6, 4, [250, 250, 250]);
  at(F, 3, 5, shadeC(SK, small ? -14 : -24)); at(F, 4, 5, shadeC(SK, small ? -14 : -24)); // nose
  if (small) { at(F, 3, 6, mixC(SK, [196, 72, 92], .55)); at(F, 4, 6, mixC(SK, [196, 72, 92], .55)); }
  else for (let x = 2; x < 6; x++) at(F, x, 6, mixC(SK, [120, 48, 42], .5));

  // ---- body: top on rows 0-9, belt/waist on 10-11 ----
  const body = regions(...PARTS.body.slice(0, 2), 8, 12, 4), longTop = L.top === 'hoodie' || L.top === 'jacket';
  const topRows = longTop ? 11 : 10;
  for (const f of ['front', 'back', 'left', 'right']) {
    const r = body[f];
    for (let y = 0; y < 12; y++) for (let x = 0; x < r[2]; x++) {
      if (y < topRows) at(r, x, y, y === topRows - 1 ? shadeC(TOP, -26) : TOP, 20);
      else at(r, x, y, y === 10 && !longTop ? shadeC(BOT, -30) : BOT, 14);
    }
  }
  // shoulders (row 0 = back, row 3 = front): neck in the middle, a seam along each shoulder
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
    const neck = x >= 2 && x <= 5 && y >= 1 && y <= 2, collar = x >= 2 && x <= 5 && !neck;
    const tankSkin = L.top === 'tank' && x >= 2 && x <= 5;
    at(body.top, x, y, neck ? shadeC(SK, -24) : tankSkin ? SK : collar ? shadeC(TOP, -18) : x === 0 || x === 7 ? shadeC(TOP, 10) : TOP, 12);
  }
  // seat of the pants (row 0 = front): darker centre seam and edges
  for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++)
    at(body.bottom, x, y, x === 3 || x === 4 ? shadeC(BOT, -26) : x === 0 || x === 7 || y === 0 || y === 3 ? shadeC(BOT, -12) : BOT, 12);
  const BF = body.front, BB = body.back;
  if (L.top === 'tee' || L.top === 'long') { at(BF, 3, 0, SK, 8); at(BF, 4, 0, SK, 8); }
  if (L.top === 'tank') {
    for (let x = 2; x < 6; x++) { at(BF, x, 0, SK, 8); at(BB, x, 0, SK, 8); }
    at(BF, 3, 1, SK, 8); at(BF, 4, 1, SK, 8);
    for (const f of ['left', 'right']) for (let x = 0; x < 4; x++) { at(body[f], x, 0, SK, 8); at(body[f], x, 1, SK, 8); }
  }
  if (L.top === 'hoodie') {
    for (let x = 1; x < 7; x++) for (let y = 7; y < 10; y++) at(BF, x, y, shadeC(TOP, y === 7 ? -30 : -14), 14); // front pocket
    for (let y = 1; y < 4; y++) { at(BF, 2, y, y === 3 ? shadeC(TOP2, -30) : TOP2, 8); at(BF, 5, y, y === 3 ? shadeC(TOP2, -30) : TOP2, 8); } // strings, darker tips
    at(BF, 3, 0, SK, 8); at(BF, 4, 0, SK, 8);
    const hood = [shadeC(TOP, 18), shadeC(TOP, 14), shadeC(TOP, -20)]; // folded down, carried round onto the column of each side next to the back
    hood.forEach((col, y) => { for (let x = 0; x < 8; x++) at(BB, x, y, col, 12); at(body.right, 0, y, col, 12); at(body.left, 3, y, col, 12); });
  }
  if (L.top === 'jacket') {
    for (let y = 0; y < 10; y++) for (let x = 2; x < 6; x++) at(BF, x, y, TOP2, 12); // the shirt under it
    for (let y = 0; y < 11; y++) { at(BF, 2, y, shadeC(TOP, -22), 10); at(BF, 5, y, shadeC(TOP, -22), 10); } // open edges
    at(BF, 1, 0, shadeC(TOP, 22)); at(BF, 6, 0, shadeC(TOP, 22)); at(BF, 1, 1, shadeC(TOP, 22)); at(BF, 6, 1, shadeC(TOP, 22)); // collar
  }
  if (L.extra === 'badge') { at(BF, 5, 3, [255, 210, 63]); at(BF, 6, 3, [255, 210, 63]); at(BF, 5, 4, [255, 210, 63]); at(BF, 6, 4, [184, 144, 31]); }
  if (H.body) {
    for (let x = 0; x < 8; x++) for (let y = 0; y < H.body[x]; y++) hairPx(BB, x, y, y === H.body[x] - 1);
    // the back's edge columns carry on round the corner onto the side column next to the back
    for (let y = 0; y < H.body[0]; y++) hairPx(body.left, 3, y, y === H.body[0] - 1);
    for (let y = 0; y < H.body[7]; y++) hairPx(body.right, 0, y, y === H.body[7] - 1);
  }

  // ---- neck: in the chin's shadow, a bit darker than the face. Long hair hangs down the back of it, a hoodie's hood folds round it
  const neck = regions(...PARTS.neck.slice(0, 2), 4, 1, 4), nk = shadeC(SK, -18);
  for (const f of ['front', 'left', 'right', 'top', 'bottom']) fill(neck[f], nk, 8);
  fill(neck.back, shadeC(SK, -24), 8);
  if (H.body) { for (let x = 0; x < 4; x++) hairPx(neck.back, x, 0, false); hairPx(neck.left, 3, 0, false); hairPx(neck.right, 0, 0, false); }
  else if (L.top === 'hoodie') { for (let x = 0; x < 4; x++) at(neck.back, x, 0, shadeC(TOP, 18), 12); at(neck.left, 3, 0, shadeC(TOP, 18), 12); at(neck.right, 0, 0, shadeC(TOP, 18), 12); }

  // ---- arms ----
  const sleeve = { tee: 4, long: 11, tank: 0, hoodie: 11, jacket: 11 }[L.top] ?? 4;
  for (const p of ['armR', 'armL']) {
    const r = regions(PARTS[p][0], PARTS[p][1], 4, 12, 4);
    for (const f of ['front', 'back', 'left', 'right']) for (let y = 0; y < 12; y++) for (let x = 0; x < r[f][2]; x++) {
      if (y < sleeve) at(r[f], x, y, y === sleeve - 1 && sleeve > 0 ? shadeC(TOP, -26) : TOP, 20);
      else at(r[f], x, y, SK, 10);
    }
    const sh = sleeve ? TOP : SK; // shoulder: lighter middle, darker rim
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) at(r.top, x, y, x % 3 && y % 3 ? shadeC(sh, 10) : shadeC(sh, -10), 10);
    // fist from below (row 0 = front): knuckle row in front, finger creases, darker palm
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++)
      at(r.bottom, x, y, y === 0 ? shadeC(SK, -6) : y === 1 ? shadeC(SK, x % 2 ? -26 : -16) : shadeC(SK, -20), 6);
  }

  // ---- legs ----
  const legTo = L.bottom === 'shorts' ? 5 : 10, shoeFrom = L.shoes === 'boots' ? 8 : 10;
  for (const p of ['legR', 'legL']) {
    const r = regions(PARTS[p][0], PARTS[p][1], 4, 12, 4);
    for (const f of ['front', 'back', 'left', 'right']) for (let y = 0; y < 12; y++) for (let x = 0; x < 4; x++) {
      if (y >= shoeFrom) at(r[f], x, y, L.shoes === 'sneakers' && y === 11 ? [232, 232, 232] : L.shoes === 'boots' && y === shoeFrom ? shadeC(SHOE, 16) : SHOE, 12);
      else if (y < legTo) at(r[f], x, y, y === legTo - 1 && L.bottom === 'shorts' ? shadeC(BOT, -24) : BOT, 14);
      else at(r[f], x, y, SK, 10);
    }
    if (L.shoes === 'sneakers') { at(r.front, 1, 10, [235, 235, 235]); at(r.front, 2, 10, [235, 235, 235]); } // laces
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) at(r.top, x, y, x === 0 || x === 3 ? shadeC(BOT, -10) : BOT, 12);
    // sole (row 0 = toe): rim around the edge, tread lines across, a heel block at the back
    const sole = L.shoes === 'sneakers' ? [226, 226, 226] : shadeC(SHOE, -14);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const rim = x === 0 || x === 3 || y === 0;
      at(r.bottom, x, y, rim ? shadeC(sole, 10) : y === 3 ? shadeC(sole, -22) : y === 1 ? shadeC(sole, -14) : sole, 6);
    }
  }

  // ---- extras painted on top ----
  const sideFront = (c, y, col, v) => { at(head.right, 7 - c, y, col, v); at(head.left, c, y, col, v); };
  if (L.extra === 'glasses') {
    const fr = [30, 30, 34];
    for (const x of [1, 2, 5, 6]) at(F, x, 3, fr);
    for (const x of [0, 3, 4, 7]) at(F, x, 4, fr);
    for (let c = 0; c < 3; c++) sideFront(c, 4, fr);
  }
  if (L.extra === 'stubble' || L.extra === 'beard') {
    // jaw corners beside the mouth, the chin row, and the jaw on each side, thinning out toward the ear.
    // Light strand texture: a few pixels a shade darker or lighter, not random speckle.
    const beard = L.extra === 'beard', col = beard ? mixC(HC, SK, .15) : mixC(SK, HC, .3), fade = mixC(col, SK, .5);
    const bpx = (put, col) => { const r = rnd(); put(r < .2 ? shadeC(col, -10) : r > .85 ? shadeC(col, 8) : col); };
    for (const x of [0, 1, 6, 7]) bpx(c => at(F, x, 6, c, 8), col);
    for (let x = 0; x < 8; x++) bpx(c => at(F, x, 7, c, 8), col);
    if (beard) for (const x of [0, 7]) at(F, x, 5, fade, 6); // soft top edge at the cheeks
    // side jaw, front edge -> ear: full rows near the chin, thinner and lighter toward the back
    const jaw = beard ? [[5, 6, 7], [6, 7], [6, 7], [7]] : [[6, 7], [7], [7]];
    jaw.forEach((rows, c) => rows.forEach((y, i) => {
      const last = c === jaw.length - 1 || (i === 0 && rows.length > 1 && y === 5);
      bpx(k => sideFront(c, y, k, 8), last ? fade : col);
    }));
    // under the chin: the beard carries on underneath and fades out before the neck
    const under = beard ? [8, 8, 6] : [8, 4];
    under.forEach((w, y) => { for (let x = (8 - w) / 2; x < (8 + w) / 2; x++) bpx(k => at(HB, x, y, k, 8), y === under.length - 1 ? fade : col); });
    for (let y = 0; y < jaw.length; y++) { bpx(k => at(HB, 0, y, k, 8), y === jaw.length - 1 ? fade : col); bpx(k => at(HB, 7, y, k, 8), y === jaw.length - 1 ? fade : col); }
  }
  if (L.extra === 'freckles') for (const [x, y] of [[1, 5], [2, 6], [5, 5], [6, 6], [0, 5], [7, 5]]) at(F, x, y, shadeC(SK, -32), 6);
  if (L.extra === 'headband') {
    const band = hexRGB(L.bandC ?? L.top2 ?? 0xd23a3a);
    for (let x = 0; x < 8; x++) { at(F, x, 2, band, 10); at(head.back, x, 2, band, 10); }
    for (let c = 0; c < 8; c++) sideFront(c, 2, band, 10);
  }
}

// a box whose faces show the given parts of the skin. BoxGeometry face order: +x, -x, +y, -y, +z, -z.
// The character faces +z, so +x is its left side.
const EPS = .02; // keeps samples a hair inside each patch so no neighbouring pixels bleed in
function skinBox(w, h, d, U, faces) {
  const geo = new THREE.BoxGeometry(w * U, h * U, d * U), uv = geo.attributes.uv;
  faces.forEach(([x, y, rw, rh], f) => {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k, a = uv.getX(i), b = uv.getY(i);
      uv.setXY(i, (x + EPS + a * (rw - 2 * EPS)) / 64, 1 - (y + EPS + (1 - b) * (rh - 2 * EPS)) / 64);
    }
  });
  return geo;
}
const partBox = (w, h, d, u, v, U) => { const R = regions(u, v, w, h, d); return skinBox(w, h, d, U, [R.left, R.right, R.top, R.bottom, R.front, R.back]); };

// U = size of one skin pixel in world units (1/16 = 2 blocks tall).
// Returns the group plus the pivots you animate: headPiv (neck), armR/armL (shoulders), legR/legL (hips).
// parts = the meshes bullets can hit; mats = materials to flash when hurt.
// own = give it its own texture instead of the shared cached one (the lobby character, rebuilt on every customizer change),
// so dispose() can free everything
function buildChar(look, U = 1 / 16, own = false) {
  const mat = lam({ map: own ? makeSkin(look) : skinTexture(look) });
  const g = new THREE.Group();
  const mesh = (geo, parent, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x * U, y * U, z * U); parent.add(m); return m; };
  const body = mesh(partBox(8, 12, 4, 16, 16, U), g, 0, 18, 0);
  const neck = mesh(partBox(4, 1, 4, 32, 0, U), g, 0, 24.5, 0);
  const headPiv = new THREE.Group(); headPiv.position.y = 25 * U; g.add(headPiv);
  const head = mesh(partBox(8, 8, 8, 0, 0, U), headPiv, 0, 4, 0); head.userData.head = true;
  const pivot = (x, y) => { const p = new THREE.Group(); p.position.set(x * U, y * U, 0); g.add(p); return p; };
  const armR = pivot(-6, 22), armL = pivot(6, 22), legR = pivot(-2, 12), legL = pivot(2, 12);
  const armRM = mesh(partBox(4, 12, 4, 40, 16, U), armR, 0, -4, 0), armLM = mesh(partBox(4, 12, 4, 32, 48, U), armL, 0, -4, 0);
  const legRM = mesh(partBox(4, 12, 4, 0, 16, U), legR, 0, -6, 0), legLM = mesh(partBox(4, 12, 4, 16, 48, U), legL, 0, -6, 0);
  const parts = [head, neck, body, armRM, armLM, legRM, legLM];
  // ch.armor = the armor it's wearing (js/armor.js dressArmor): the chestplate rides on the body, each shoulder pad on its arm
  // ch.boots = the boots (js/boots.js dressBoots), one on each leg
  const ch = { g, head, headPiv, body, armR, armL, legR, legL, parts, mats: [mat], U, armor: null, boots: null };
  ch.dispose = () => { parts.forEach(m => m.geometry.dispose()); if (own) mat.map.dispose(); mat.dispose(); ch.armor?.mat.dispose(); ch.boots?.mat.dispose(); };
  return ch;
}

// a random look from a seed (bots: the seed is their name, so the same name always looks the same)
const GIRL_NAMES = new Set(['mia', 'ava', 'emma', 'lily', 'zoe', 'chloe', 'ella', 'maya', 'ruby', 'nora', 'grace', 'hannah', 'sophie', 'sofi',
  'lea', 'giulia', 'jisoo', 'hikari', 'sakura', 'サクラ', '지수']);
// "LeaPlays", "emma_2010", "xXmiaXx" -> ['lea', 'plays'], ['emma'], ['mia']. A girl's first name in there makes a girl
const nameWords = s => s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z぀-ヿ가-힯]+/).map(w => w.replace(/^x+|x+$/g, ''));
function randomLook(seedStr, topC) {
  const r = charRng(strSeed(seedStr)), pick = a => a[r() * a.length | 0];
  const girl = nameWords(seedStr).some(w => GIRL_NAMES.has(w)) || r() < .3;
  const dark = n => { const c = hexRGB(n); return (c[0] + c[1] + c[2]) / 3 < 70; };
  const top = pick(['tee', 'tee', 'long', 'hoodie', 'jacket', 'tank']), bottomC = pick([0x2c3e80, 0x3d5a8c, 0x2e2e34, 0x4b4033, 0x3a4a5a, 0x55606a]);
  return {
    skin: r() * 6 | 0, girl, eyes: pick(Object.keys(EYE_COLS)),
    hair: girl ? pick(['long', 'long', 'bob', 'bob', 'curly', 'side']) : pick(['short', 'short', 'buzz', 'side', 'side', 'curly']),
    hairC: pick(['black', 'black', 'dark', 'dark', 'brown', 'brown', 'auburn', 'ginger', 'blonde']),
    top, topC, top2: top === 'jacket' ? (dark(topC) ? 0xe6e6e6 : 0x2a2a30) : 0xeeeeee,
    bottom: r() < .3 ? 'shorts' : 'pants', bottomC,
    shoes: pick(['sneakers', 'sneakers', 'boots', 'plain']), shoeC: pick([0x2a2a2e, 0xe8e8e8, 0x4a3020, 0xb8342c, 0x3a3a40]),
    extra: r() < .35 ? pick(girl ? ['glasses', 'freckles', 'headband'] : ['glasses', 'stubble', 'beard', 'freckles']) : null,
    bigEyes: r() < (girl ? .4 : .2),
  };
}
