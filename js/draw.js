// draw your own skin: paint on the flat skin or right on the character
const DRAW_FACES = []; // [x, y, w, h, part, face]
for (const [k, [u, v, w, h, d]] of Object.entries(PARTS)) for (const [f, r] of Object.entries(regions(u, v, w, h, d))) DRAW_FACES.push([...r, k, f]);
const PART_NAME = { head: 'HEAD', body: 'BODY', neck: 'NECK', legR: 'RIGHT LEG', legL: 'LEFT LEG', armR: 'RIGHT ARM', armL: 'LEFT ARM' };
const FACE_NAME = { front: 'FRONT', back: 'BACK', top: 'TOP', bottom: 'BOTTOM', left: 'SIDE', right: 'SIDE' };
const faceAt = (x, y) => DRAW_FACES.find(([fx, fy, w, h]) => x >= fx && y >= fy && x < fx + w && y < fy + h);
const drawMask = new Uint8Array(4096);
for (const [fx, fy, w, h] of DRAW_FACES) for (let y = fy; y < fy + h; y++) for (let x = fx; x < fx + w; x++) drawMask[y * 64 + x] = 1;
// colours to start with, after the ones the look already uses
const DRAW_PAL = [0x000000, 0xffffff, 0x7a7a82, 0x3a3a40, 0xd8c8b0, 0xf7d6ba, 0xd6a37c, 0x8c5c3c, 0x5e3e2a, 0xe03a3a, 0xff8a2c, 0xffd23a,
  0x5ad04a, 0x2a8a4a, 0x2ac0d8, 0x3a6ae0, 0x2a3a8a, 0x8a4ae0, 0xe05ab0, 0xffb0c8, 0xb8e8ff, 0xc0ff9a, 0x6a3a1a, 0xa0a0a8,
  0x1c9e98, 0xb8342c, 0x4f8a5a, 0x6a4fb0, 0xe8c33a, 0x55606a, 0xf0f0f0, 0x202024];
const hex6 = c => '#' + c.toString(16).padStart(6, '0');
// the parts you can zoom in on, and the order of heroCh.parts
const DRAW_GROUPS = { head: ['HEAD', ['head', 'neck'], 'v'], body: ['BODY', ['body'], 'h'], arms: ['ARMS', ['armR', 'armL'], 'h'], legs: ['LEGS', ['legR', 'legL'], 'h'] };
const MESH_KEYS = ['head', 'neck', 'body', 'armR', 'armL', 'legR', 'legL'];
const groupOf = k => Object.keys(DRAW_GROUPS).find(g => DRAW_GROUPS[g][1].includes(k));
const dr = { part: null, view: null, turn: null, i: -1, pal: [], idx: null, slot: 0, tool: 'pen', mirror: false, undo: [], redo: [], start: null, cv: null, tex: null, down: false, last: null, sure: false };
const drawOpen = () => $('drawPanel').style.display === 'flex';

// palette order: greys light to dark, then round the colour wheel
function sortPal(d) {
  const key = c => { const [h, s, v] = rgb2hsv(c); return s < .15 || v < .14 ? -2 + (1 - v) : (Math.floor(h * 12 + .5) % 12) + (1 - v) * .9; };
  const order = d.pal.map((c, k) => k).sort((a, b) => key(d.pal[a]) - key(d.pal[b])), to = [];
  order.forEach((k, n) => { to[k] = n; });
  return { pal: order.map(k => d.pal[k]), idx: d.idx.map(v => v ? to[v - 1] + 1 : 0) };
}
// a look's skin squeezed into 32 colours
function lookToPx(L) {
  const g = makeSkin(L).image.getContext('2d'), d = g.getImageData(0, 0, 64, 64).data, count = new Map();
  for (let i = 0; i < 4096; i++) if (drawMask[i] && d[i * 4 + 3]) { const c = d[i * 4] << 16 | d[i * 4 + 1] << 8 | d[i * 4 + 2]; count.set(c, (count.get(c) || 0) + 1); }
  const dist = (p, c) => ((p >> 16) - (c >> 16)) ** 2 + ((p >> 8 & 255) - (c >> 8 & 255)) ** 2 + ((p & 255) - (c & 255)) ** 2;
  const pal = []; // up to 16 of the look's own colours (shades that are nearly the same count once), then a basic set
  for (const c of [...count.keys()].sort((a, b) => count.get(b) - count.get(a))) if (pal.length < 16 && pal.every(p => dist(p, c) > 500)) pal.push(c);
  for (const c of DRAW_PAL) if (pal.length < 32 && pal.every(p => dist(p, c) > 300)) pal.push(c);
  for (const c of DRAW_PAL) if (pal.length < 32 && !pal.includes(c)) pal.push(c);
  const near = c => { let bi = 0, bd = Infinity; pal.forEach((p, k) => { const e = dist(p, c); if (e < bd) { bd = e; bi = k; } }); return bi + 1; };
  const idx = new Uint8Array(4096);
  for (let i = 0; i < 4096; i++) if (drawMask[i] && d[i * 4 + 3]) idx[i] = near(d[i * 4] << 16 | d[i * 4 + 1] << 8 | d[i * 4 + 2]);
  return { pal, idx };
}

function openDraw(i) { // i = which saved skin, -1 for a new one
  const saved = i >= 0 && prof.draws?.[i], d = sortPal(saved && decodePx(saved.px) || lookToPx(lookBase()));
  Object.assign(dr, { part: null, turn: null, i, pal: [...d.pal], idx: d.idx.slice(), slot: 0, tool: 'pen', undo: [], redo: [], down: false, sure: false });
  dr.start = { pal: [...dr.pal], idx: dr.idx.slice() };
  $('drawName').value = saved ? saved.n : 'SKIN ' + ((prof.draws?.length || 0) + 1);
  closeArmory();
  $('drawPanel').style.display = 'flex'; $('lobbyUI').style.display = 'none'; $('lobby').classList.add('cust');
  if (!dr.cv) { dr.cv = document.createElement('canvas'); dr.cv.width = dr.cv.height = 64; dr.tex = new THREE.CanvasTexture(dr.cv); dr.tex.magFilter = THREE.NearestFilter; dr.tex.minFilter = THREE.NearestFilter; dr.tex.colorSpace = THREE.SRGBColorSpace; }
  dressHero();
  heroCh.g.traverse(o => { if (o.isMesh && !heroCh.parts.includes(o)) o.visible = false; }); // no armor, hat or gun while you paint
  heroCh.mats[0].map = dr.tex; heroCh.mats[0].needsUpdate = true;
  setView(); renderDrawUI(); redraw(); drawMsg('PICK A PART TO DRAW'); sfx('ui');
}
function closeDraw() {
  cpkClose();
  $('drawPanel').style.display = 'none'; $('lobbyUI').style.display = ''; $('lobby').classList.remove('cust');
  dressHero(); armPage = 'wear'; wearCat = 'skins'; openArmory();
}

// the sheet: the whole skin, or one part big enough to paint
const partRect = k => { const [u, v, w, h, d] = PARTS[k]; return [u, v, 2 * (d + w), d + h]; };
function setView() {
  const cv = $('drawSheet');
  if (!dr.part) dr.view = { K: 8, W: 512, H: 512, blocks: [[0, 0, 64, 64, 0, 0]], labels: [] };
  else {
    const [, keys, dir] = DRAW_GROUPS[dr.part], rs = keys.map(partRect), lab = dir === 'h' && keys.length > 1 ? 2 : 0;
    const TW = dir === 'v' ? Math.max(...rs.map(r => r[2])) : rs.reduce((a, r) => a + r[2], 0) + rs.length - 1;
    const TH = dir === 'v' ? rs.reduce((a, r) => a + r[3], 0) + rs.length - 1 : Math.max(...rs.map(r => r[3])) + lab;
    const K = Math.floor(Math.min(512 / TW, 400 / TH)), blocks = [], labels = [];
    let at = 0;
    rs.forEach(([sx, sy, w, h], n) => {
      const ox = dir === 'v' ? (TW - w) / 2 * K : at * K, oy = dir === 'v' ? at * K : lab * K;
      blocks.push([sx, sy, w, h, ox, oy]);
      if (lab) labels.push([PART_NAME[keys[n]], ox + w * K / 2, lab * K * .62]);
      at += (dir === 'v' ? h : w) + 1;
    });
    dr.view = { K, W: TW * K, H: TH * K, blocks, labels };
  }
  cv.width = dr.view.W; cv.height = dr.view.H;
}
const blockOf = (x, y) => dr.view.blocks.find(([sx, sy, w, h]) => x >= sx && y >= sy && x < sx + w && y < sy + h);
function redraw(hover) {
  const g = $('drawSheet').getContext('2d'), { K, W, H, blocks, labels } = dr.view;
  g.fillStyle = '#101416'; g.fillRect(0, 0, W, H);
  const hg = !dr.part && hover && groupOf(faceAt(...hover)?.[4]);
  for (const [sx, sy, w, h, ox, oy] of blocks) for (let y = sy; y < sy + h; y++) for (let x = sx; x < sx + w; x++) {
    const i = y * 64 + x; if (!drawMask[i]) continue;
    const v = dr.idx[i];
    g.fillStyle = v ? hex6(dr.pal[v - 1]) : (x + y) % 2 ? '#3a3f44' : '#2a2e32'; g.fillRect(ox + (x - sx) * K, oy + (y - sy) * K, K, K);
  }
  for (const [fx, fy, w, h, k] of DRAW_FACES) {
    const b = blockOf(fx, fy); if (!b) continue;
    const X = b[4] + (fx - b[0]) * K, Y = b[5] + (fy - b[1]) * K;
    if (dr.part) { // pixel grid
      g.fillStyle = 'rgba(0,0,0,.22)';
      for (let x = 1; x < w; x++) g.fillRect(X + x * K, Y, 1, h * K);
      for (let y = 1; y < h; y++) g.fillRect(X, Y + y * K, w * K, 1);
    }
    const lit = hg && groupOf(k) === hg;
    g.strokeStyle = lit ? '#fff' : 'rgba(255,255,255,.5)'; g.lineWidth = lit ? 3 : dr.part ? 2 : 1;
    g.strokeRect(X + g.lineWidth / 2, Y + g.lineWidth / 2, w * K - g.lineWidth, h * K - g.lineWidth);
    if (hg && !lit) { g.fillStyle = 'rgba(16,20,22,.45)'; g.fillRect(X, Y, w * K, h * K); }
  }
  g.font = `bold ${Math.max(11, K * .9 | 0)}px monospace`; g.textAlign = 'center'; g.fillStyle = '#8ff0b6';
  for (const [t, x, y] of labels) g.fillText(t, x, y);
  if (hover && dr.part) {
    const b = blockOf(...hover);
    if (b) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(b[4] + (hover[0] - b[0]) * K + 1, b[5] + (hover[1] - b[1]) * K + 1, K - 2, K - 2); }
  }
  const c = dr.cv.getContext('2d'); c.clearRect(0, 0, 64, 64); drawPx(c, dr); dr.tex.needsUpdate = true;
}
function setPart(g) {
  dr.part = g; setView(); redraw(); renderDrawUI();
  drawMsg(g ? '' : 'PICK A PART TO DRAW'); sfx('ui');
}
// what the lobby camera zooms on
const drawBox = new THREE.Box3();
function drawFocus() {
  if (!drawOpen() || !dr.part || !heroCh) return null;
  drawBox.makeEmpty();
  for (const k of DRAW_GROUPS[dr.part][1]) drawBox.expandByObject(heroCh.parts[MESH_KEYS.indexOf(k)]);
  return drawBox;
}
function renderDrawUI() {
  $('drawParts').innerHTML = [[null, 'ALL'], ...Object.entries(DRAW_GROUPS).map(([g, [n]]) => [g, n])]
    .map(([g, n]) => `<button data-part="${g ?? ''}" class="${dr.part === g ? 'sel' : ''}">${n}</button>`).join('')
    + `<span class="gap"></span><button data-turn="-1" title="Turn">${ico('left')}</button><button data-turn="1" title="Turn">${ico('right')}</button>`;
  $('drawTools').innerHTML = [['pen', 'PEN'], ['fill', 'FILL'], ['pick', 'PICK']].map(([t, n]) => `<button data-tool="${t}" class="${dr.tool === t ? 'sel' : ''}">${n}</button>`).join('')
    + `<button data-mirror="1" class="${dr.mirror ? 'sel' : ''}" title="Paint both halves of a side at once">MIRROR</button>`
    + `<button data-undo="1" ${dr.undo.length ? '' : 'disabled'}>UNDO</button><button data-redo="1" ${dr.redo.length ? '' : 'disabled'}>REDO</button><button data-reset="1" title="Back to how it was">RESET</button>`;
  $('drawPal').innerHTML = dr.pal.map((c, k) => `<button class="sw${k === dr.slot ? ' sel' : ''}" data-slot="${k}" style="background:${hex6(c)}"></button>`).join('');
  $('drawColor').style.setProperty('--c', hex6(dr.pal[dr.slot]));
}
const drawSnap = () => ({ pal: [...dr.pal], idx: dr.idx.slice() });
function pushUndo() { dr.undo.push(drawSnap()); if (dr.undo.length > 60) dr.undo.shift(); dr.redo = []; }
function restore(s) { dr.pal = [...s.pal]; dr.idx = s.idx.slice(); }

// one pixel, or a fill inside its face
function paintAt(x, y) {
  if (x < 0 || y < 0 || x > 63 || y > 63 || !drawMask[y * 64 + x]) return false;
  const i = y * 64 + x, f = faceAt(x, y);
  if (!f || groupOf(f[4]) !== dr.part) return false;
  if (dr.tool === 'pick') { if (dr.idx[i]) { dr.slot = dr.idx[i] - 1; dr.tool = 'pen'; renderDrawUI(); } return false; }
  const spots = [[x, y]];
  if (dr.mirror && f) spots.push([f[0] + f[2] - 1 - (x - f[0]), y]);
  for (const [px, py] of spots) {
    if (dr.tool === 'fill') {
      const [fx, fy, w, h] = faceAt(px, py), from = dr.idx[py * 64 + px], to = dr.slot + 1; if (from === to) continue;
      const q = [[px, py]];
      while (q.length) { const [a, b] = q.pop(), k = b * 64 + a; if (a < fx || b < fy || a >= fx + w || b >= fy + h || dr.idx[k] !== from) continue; dr.idx[k] = to; q.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]); }
    } else dr.idx[py * 64 + px] = dr.slot + 1;
  }
  return true;
}
function stroke(x, y) { // a line from the last point, so fast strokes don't leave gaps
  const [x0, y0] = dr.last && dr.tool === 'pen' ? dr.last : [x, y], n = Math.max(Math.abs(x - x0), Math.abs(y - y0));
  let did = false;
  for (let k = 0; k <= n; k++) { const t = n ? k / n : 0; did = paintAt(Math.round(x0 + (x - x0) * t), Math.round(y0 + (y - y0) * t)) || did; }
  dr.last = [x, y];
  if (did) redraw();
}
const drawMsg = t => { $('drawMsg').textContent = t; };

// on the sheet
const sheetXY = e => {
  const r = $('drawSheet').getBoundingClientRect(), { K, W, H, blocks } = dr.view;
  const cx = (e.clientX - r.left) / r.width * W, cy = (e.clientY - r.top) / r.height * H;
  const b = blocks.find(([, , w, h, ox, oy]) => cx >= ox && cy >= oy && cx < ox + w * K && cy < oy + h * K);
  return b ? [b[0] + Math.floor((cx - b[4]) / K), b[1] + Math.floor((cy - b[5]) / K)] : [-1, -1];
};
$('drawSheet').addEventListener('pointerdown', e => {
  const [x, y] = sheetXY(e), f = x >= 0 && faceAt(x, y); if (!f) return;
  if (!dr.part) { setPart(groupOf(f[4])); return; }
  $('drawSheet').setPointerCapture(e.pointerId); pushUndo(); dr.down = true; dr.last = null; stroke(x, y); if (dr.tool !== 'pen') dr.down = false; renderDrawUI();
});
$('drawSheet').addEventListener('pointermove', e => {
  const [x, y] = sheetXY(e), f = x >= 0 && faceAt(x, y);
  if (!dr.part) drawMsg(f ? DRAW_GROUPS[groupOf(f[4])][0] : 'PICK A PART TO DRAW');
  else drawMsg(f ? PART_NAME[f[4]] + ' · ' + FACE_NAME[f[5]] : '');
  if (dr.down) { if (f) stroke(x, y); } else redraw(f ? [x, y] : null);
});
const drawUp = () => { dr.down = false; dr.last = null; };
$('drawSheet').addEventListener('pointerup', drawUp); $('drawSheet').addEventListener('pointercancel', drawUp);
$('drawSheet').addEventListener('pointerleave', () => { if (!dr.down) { redraw(); drawMsg(dr.part ? '' : 'PICK A PART TO DRAW'); } });

// right on the character: click a part to zoom in on it, then paint (drag off the character to turn it)
const drawRay = new THREE.Raycaster(), drawNdc = new THREE.Vector2();
function heroPixel(e) {
  const r = renderer.domElement.getBoundingClientRect();
  drawNdc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  drawRay.setFromCamera(drawNdc, lobbyCam);
  const hit = drawRay.intersectObjects(heroCh.parts, false)[0];
  return hit?.uv ? { px: [Math.min(63, Math.floor(hit.uv.x * 64)), Math.min(63, Math.floor((1 - hit.uv.y) * 64))], g: groupOf(MESH_KEYS[heroCh.parts.indexOf(hit.object)]) } : null;
}
$('stage').addEventListener('pointerdown', e => {
  if (!drawOpen()) return;
  const h = heroPixel(e); if (!h) { dr.turn = null; return; } // not on the character: let it turn
  e.stopImmediatePropagation();
  if (h.g !== dr.part) { setPart(h.g); return; }
  $('stage').setPointerCapture(e.pointerId);
  pushUndo(); dr.down = 'hero'; dr.last = null; stroke(...h.px); if (dr.tool !== 'pen') dr.down = false; renderDrawUI();
}, true);
addEventListener('pointermove', e => { if (dr.down === 'hero') { const h = heroPixel(e); if (h?.g === dr.part) stroke(...h.px); else dr.last = null; } });
addEventListener('pointerup', () => { if (dr.down === 'hero') drawUp(); });
$('drawParts').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.turn) { const q = Math.PI / 2; dr.turn = Math.round((dr.turn ?? spin) / q) * q + q * +b.dataset.turn; sfx('ui'); }
  else setPart(b.dataset.part || null);
});

// tools, colours, name, save
$('drawTools').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.tool) dr.tool = b.dataset.tool;
  else if (b.dataset.mirror) dr.mirror = !dr.mirror;
  else if (b.dataset.undo) { dr.redo.push(drawSnap()); restore(dr.undo.pop()); redraw(); }
  else if (b.dataset.redo) { dr.undo.push(drawSnap()); restore(dr.redo.pop()); redraw(); }
  else if (b.dataset.reset) { pushUndo(); restore(dr.start); redraw(); }
  renderDrawUI(); sfx('ui');
});
$('drawPal').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; dr.slot = +b.dataset.slot; if (dr.tool === 'pick') dr.tool = 'pen'; renderDrawUI(); sfx('ui'); });
$('drawColor').onclick = () => { // a new colour goes in a slot nothing uses yet; once all 32 are used it changes that colour everywhere
  let first = true;
  const used = new Set(dr.idx), free = dr.pal.findIndex((c, k) => !used.has(k + 1));
  if (used.has(dr.slot + 1) && free >= 0) { pushUndo(); first = false; dr.pal[free] = dr.pal[dr.slot]; dr.slot = free; renderDrawUI(); }
  else if (used.has(dr.slot + 1)) drawMsg('PALETTE FULL, THIS COLOUR CHANGES EVERYWHERE');
  colorPick($('drawColor'), dr.pal[dr.slot], c => {
    if (first) { pushUndo(); first = false; }
    dr.pal[dr.slot] = c; redraw(); $('drawPal').children[dr.slot].style.background = hex6(c); $('drawColor').style.setProperty('--c', hex6(c));
  }, renderDrawUI);
};
const cleanSkinName = s => s.toUpperCase().replace(/[^A-Z0-9 _!?'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
$('drawName').addEventListener('input', () => { const v = cleanSkinName($('drawName').value); if (v !== $('drawName').value.trim()) $('drawName').value = v; });
$('drawSave').onclick = () => {
  const px = encodePx(dr.pal, dr.idx);
  if (px.length > PX_MAX) { drawMsg('Too busy to save, try bigger patches of colour'); sfx('ui'); return; }
  const n = cleanSkinName($('drawName').value) || 'MY SKIN';
  prof.draws ??= [];
  if (dr.i >= 0 && prof.draws[dr.i]) prof.draws[dr.i] = { n, px }; else if (prof.draws.length < DRAW_MAX) prof.draws.push({ n, px });
  prof.look = { ...lookBase(), px }; saveProf(); sfx('equip');
  closeDraw();
};
$('drawCancel').onclick = closeDraw;
addEventListener('keydown', e => {
  if (!inLobby || !drawOpen() || e.target.tagName === 'INPUT') return;
  if (e.code === 'Escape') { e.stopImmediatePropagation(); closeDraw(); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); $('drawTools').querySelector(e.shiftKey ? '[data-redo]' : '[data-undo]')?.click(); }
}, true);

// the armory side: unlock, start a new one, edit or delete the one you wear
function drawBuy() {
  if (prof.draw || prof.coins < DRAW_PRICE) { sfx('ui'); return; }
  prof.coins -= DRAW_PRICE; prof.draw = 1; saveProf(); showProf(); sfx('buy'); renderArmory();
}
function drawDelete(i) {
  const d = prof.draws?.[i]; if (!d) return;
  if (prof.look.px === d.px) prof.look = lookBase();
  prof.draws.splice(i, 1); saveProf(); dressHero(); sfx('ui'); renderArmory();
}
