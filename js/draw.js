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
const dr = { i: -1, pal: [], idx: null, slot: 0, tool: 'pen', mirror: false, undo: [], redo: [], start: null, cv: null, tex: null, down: false, last: null, sure: false };
const drawOpen = () => $('drawPanel').style.display === 'flex';

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
  const saved = i >= 0 && prof.draws?.[i], d = saved && decodePx(saved.px) || lookToPx(lookBase());
  Object.assign(dr, { i, pal: [...d.pal], idx: d.idx.slice(), slot: 0, tool: 'pen', undo: [], redo: [], down: false, sure: false });
  dr.start = { pal: [...dr.pal], idx: dr.idx.slice() };
  $('drawName').value = saved ? saved.n : 'SKIN ' + ((prof.draws?.length || 0) + 1);
  closeArmory();
  $('drawPanel').style.display = 'flex'; $('lobbyUI').style.display = 'none'; $('lobby').classList.add('cust');
  if (!dr.cv) { dr.cv = document.createElement('canvas'); dr.cv.width = dr.cv.height = 64; dr.tex = new THREE.CanvasTexture(dr.cv); dr.tex.magFilter = THREE.NearestFilter; dr.tex.minFilter = THREE.NearestFilter; dr.tex.colorSpace = THREE.SRGBColorSpace; }
  dressHero();
  heroCh.g.traverse(o => { if (o.isMesh && !heroCh.parts.includes(o)) o.visible = false; }); // no armor, hat or gun while you paint
  heroCh.mats[0].map = dr.tex; heroCh.mats[0].needsUpdate = true;
  renderDrawUI(); redraw(); sfx('ui');
}
function closeDraw() {
  $('drawPanel').style.display = 'none'; $('lobbyUI').style.display = ''; $('lobby').classList.remove('cust');
  dressHero(); armPage = 'wear'; wearCat = 'skins'; openArmory();
}

// the flat skin, 8 screen pixels a skin pixel, and the character's texture
function redraw(hover) {
  const g = $('drawSheet').getContext('2d'), K = 8;
  g.fillStyle = '#101416'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4096; i++) {
    if (!drawMask[i]) continue;
    const x = i % 64, y = i >> 6, v = dr.idx[i];
    g.fillStyle = v ? hex6(dr.pal[v - 1]) : (x + y) % 2 ? '#3a3f44' : '#2a2e32'; g.fillRect(x * K, y * K, K, K);
  }
  g.fillStyle = 'rgba(0,0,0,.18)';
  for (const [fx, fy, w, h] of DRAW_FACES) { for (let x = 1; x < w; x++) g.fillRect((fx + x) * K, fy * K, 1, h * K); for (let y = 1; y < h; y++) g.fillRect(fx * K, (fy + y) * K, w * K, 1); }
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
  for (const [fx, fy, w, h] of DRAW_FACES) g.strokeRect(fx * K + .5, fy * K + .5, w * K - 1, h * K - 1);
  if (hover) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(hover[0] * K + 1, hover[1] * K + 1, K - 2, K - 2); }
  const c = dr.cv.getContext('2d'); c.clearRect(0, 0, 64, 64); drawPx(c, dr); dr.tex.needsUpdate = true;
}
function renderDrawUI() {
  $('drawTools').innerHTML = [['pen', 'PEN'], ['fill', 'FILL'], ['pick', 'PICK']].map(([t, n]) => `<button data-tool="${t}" class="${dr.tool === t ? 'sel' : ''}">${n}</button>`).join('')
    + `<button data-mirror="1" class="${dr.mirror ? 'sel' : ''}" title="Paint both halves of a side at once">MIRROR</button>`
    + `<button data-undo="1" ${dr.undo.length ? '' : 'disabled'}>UNDO</button><button data-redo="1" ${dr.redo.length ? '' : 'disabled'}>REDO</button><button data-reset="1" title="Back to how it was">RESET</button>`;
  $('drawPal').innerHTML = dr.pal.map((c, k) => `<button class="sw${k === dr.slot ? ' sel' : ''}" data-slot="${k}" style="background:${hex6(c)}"></button>`).join('')
    + `<input type="color" id="drawColor" value="${hex6(dr.pal[dr.slot])}" title="Change this colour everywhere it's used">`;
}
const drawSnap = () => ({ pal: [...dr.pal], idx: dr.idx.slice() });
function pushUndo() { dr.undo.push(drawSnap()); if (dr.undo.length > 60) dr.undo.shift(); dr.redo = []; }
function restore(s) { dr.pal = [...s.pal]; dr.idx = s.idx.slice(); }

// one pixel, or a fill inside its face
function paintAt(x, y) {
  if (x < 0 || y < 0 || x > 63 || y > 63 || !drawMask[y * 64 + x]) return false;
  const i = y * 64 + x, f = faceAt(x, y);
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

// on the flat skin
const sheetXY = e => { const r = $('drawSheet').getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * 64), Math.floor((e.clientY - r.top) / r.height * 64)]; };
$('drawSheet').addEventListener('pointerdown', e => {
  const [x, y] = sheetXY(e); if (!drawMask[y * 64 + x]) return;
  $('drawSheet').setPointerCapture(e.pointerId); pushUndo(); dr.down = true; dr.last = null; stroke(x, y); if (dr.tool !== 'pen') dr.down = false; renderDrawUI();
});
$('drawSheet').addEventListener('pointermove', e => {
  const [x, y] = sheetXY(e), f = faceAt(x, y);
  drawMsg(f ? PART_NAME[f[4]] + ' · ' + FACE_NAME[f[5]] : '');
  if (dr.down) stroke(x, y); else redraw(f ? [x, y] : null);
});
const drawUp = () => { dr.down = false; dr.last = null; };
$('drawSheet').addEventListener('pointerup', drawUp); $('drawSheet').addEventListener('pointercancel', drawUp);
$('drawSheet').addEventListener('pointerleave', () => { if (!dr.down) { redraw(); drawMsg(''); } });

// right on the character (drag off the character to turn it)
const drawRay = new THREE.Raycaster(), drawNdc = new THREE.Vector2();
function heroPixel(e) {
  const r = renderer.domElement.getBoundingClientRect();
  drawNdc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  drawRay.setFromCamera(drawNdc, lobbyCam);
  const hit = drawRay.intersectObjects(heroCh.parts, false)[0];
  return hit?.uv ? [Math.min(63, Math.floor(hit.uv.x * 64)), Math.min(63, Math.floor((1 - hit.uv.y) * 64))] : null;
}
$('stage').addEventListener('pointerdown', e => {
  if (!drawOpen()) return;
  const px = heroPixel(e); if (!px) return; // not on the character: let it turn
  e.stopImmediatePropagation(); $('stage').setPointerCapture(e.pointerId);
  pushUndo(); dr.down = 'hero'; dr.last = null; stroke(...px); if (dr.tool !== 'pen') dr.down = false; renderDrawUI();
}, true);
addEventListener('pointermove', e => { if (dr.down === 'hero') { const px = heroPixel(e); if (px) stroke(...px); else dr.last = null; } });
addEventListener('pointerup', () => { if (dr.down === 'hero') drawUp(); });

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
let palUndo = false;
$('drawPal').addEventListener('input', e => { if (e.target.id !== 'drawColor') return; if (!palUndo) { pushUndo(); palUndo = true; } dr.pal[dr.slot] = parseInt(e.target.value.slice(1), 16); redraw(); $('drawPal').children[dr.slot].style.background = e.target.value; });
$('drawPal').addEventListener('change', e => { if (e.target.id === 'drawColor') { palUndo = false; renderDrawUI(); } });
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
