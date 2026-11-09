// the colour picker, in the game's own style
const cpk = { el: null, h: 0, s: 0, v: 0, on: null, done: null, anchor: null };
function hsv2rgb(h, s, v) {
  const f = n => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return Math.round(f(5) * 255) << 16 | Math.round(f(3) * 255) << 8 | Math.round(f(1) * 255);
}
function rgb2hsv(c) {
  const r = (c >> 16) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  let h = 0; if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, mx ? d / mx : 0, mx];
}
const cpHex = c => '#' + c.toString(16).padStart(6, '0');
function cpkBuild() {
  const el = document.createElement('div'); el.id = 'colPick';
  el.innerHTML = '<canvas id="cpSV" width="200" height="140"></canvas><canvas id="cpHue" width="200" height="16"></canvas>'
    + '<div id="cpRow"><span id="cpNow"></span><input id="cpHex" maxlength="7" spellcheck="false" autocomplete="off"><button id="cpOk">OK</button></div>';
  document.body.append(el); cpk.el = el;
  const drag = (cv, set) => {
    const at = e => { const r = cv.getBoundingClientRect(); set(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height))); cpkApply(); };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); cv.dragging = true; at(e); });
    cv.addEventListener('pointermove', e => { if (cv.dragging) at(e); });
    cv.addEventListener('pointerup', () => { cv.dragging = false; });
  };
  drag($('cpSV'), (x, y) => { cpk.s = x; cpk.v = 1 - y; });
  drag($('cpHue'), x => { cpk.h = Math.min(x, .999); });
  $('cpHex').addEventListener('input', () => {
    const m = $('cpHex').value.trim().replace(/^#?/, '#'); if (!/^#[0-9a-f]{6}$/i.test(m)) return;
    [cpk.h, cpk.s, cpk.v] = rgb2hsv(parseInt(m.slice(1), 16)); cpkApply(true);
  });
  $('cpHex').addEventListener('keydown', e => { if (e.code === 'Enter') cpkClose(); });
  $('cpOk').onclick = () => cpkClose();
  document.addEventListener('pointerdown', e => { if (cpk.on && !el.contains(e.target) && !cpk.anchor?.contains(e.target)) cpkClose(true); }, true);
}
addEventListener('keydown', e => { if (cpk.on && e.code === 'Escape') { e.stopImmediatePropagation(); cpkClose(); } }, true); // before the menus' own Escape
function cpkDraw() {
  const g = $('cpSV').getContext('2d');
  g.fillStyle = cpHex(hsv2rgb(cpk.h, 1, 1)); g.fillRect(0, 0, 200, 140);
  let gr = g.createLinearGradient(0, 0, 200, 0); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 200, 140);
  gr = g.createLinearGradient(0, 0, 0, 140); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 200, 140);
  const x = cpk.s * 200, y = (1 - cpk.v) * 140;
  g.lineWidth = 2; g.strokeStyle = '#000'; g.strokeRect(x - 5, y - 5, 10, 10); g.strokeStyle = '#fff'; g.strokeRect(x - 3, y - 3, 6, 6);
  const h = $('cpHue').getContext('2d');
  gr = h.createLinearGradient(0, 0, 200, 0);
  ['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#f00'].forEach((c, i) => gr.addColorStop(i / 6, c));
  h.fillStyle = gr; h.fillRect(0, 0, 200, 16);
  h.fillStyle = '#000'; h.fillRect(cpk.h * 200 - 3, 0, 6, 16); h.fillStyle = '#fff'; h.fillRect(cpk.h * 200 - 1, 0, 2, 16);
}
function cpkApply(typed) {
  const c = hsv2rgb(cpk.h, cpk.s, cpk.v);
  cpkDraw(); $('cpNow').style.background = cpHex(c);
  if (!typed) $('cpHex').value = cpHex(c).toUpperCase();
  cpk.on?.(c);
}
// open next to a button; onInput gets each colour while you pick, onDone when it closes
function colorPick(anchor, c, onInput, onDone) {
  if (cpk.on) cpkClose();
  if (!cpk.el) cpkBuild();
  [cpk.h, cpk.s, cpk.v] = rgb2hsv(c); cpk.anchor = anchor; cpk.done = onDone;
  cpk.el.style.display = 'flex'; cpkDraw(); $('cpNow').style.background = cpHex(c); $('cpHex').value = cpHex(c).toUpperCase();
  const a = anchor.getBoundingClientRect(), w = cpk.el.offsetWidth, h = cpk.el.offsetHeight;
  let x = a.right + 10, y = a.top + a.height / 2 - h / 2;
  if (x + w > innerWidth - 8) { x = Math.min(innerWidth - w - 8, a.left); y = a.top - h - 10; if (y < 8) y = a.bottom + 10; }
  cpk.el.style.left = Math.max(8, x) + 'px'; cpk.el.style.top = Math.max(8, Math.min(innerHeight - h - 8, y)) + 'px';
  cpk.on = onInput; sfx('ui');
}
function cpkClose(outside = false) {
  if (!cpk.el) return;
  cpk.el.style.display = 'none'; cpk.on = null; cpk.anchor = null;
  const d = cpk.done; cpk.done = null;
  if (outside && d) addEventListener('pointerup', () => setTimeout(d), { once: true, capture: true }); // after the click, so redrawing doesn't swallow it
  else d?.();
}
