const $ = id => document.getElementById(id);

// graphics settings, saved per device (Chromebooks start on medium)
const GFX_Q = {
  high:   { aa: true,  maxRatio: 2, aniso: 16, detail: true,  view: 1 },
  medium: { aa: false, maxRatio: 1, aniso: 4,  detail: true,  view: 1 },
  low:    { aa: false, maxRatio: 1, aniso: 1,  detail: false, view: .7 },
};
// phones and tablets: touch controls, and the mouse lock is pretend
const TOUCH = document.body.classList.contains('touchOnly');
if (TOUCH) { // no pinch zoom, and the page never stays scrolled (iOS lets you drag it, and can leave it shifted after the keyboard)
  document.addEventListener('gesturestart', e => e.preventDefault());
  const unscroll = () => { if ((scrollX || scrollY) && !document.activeElement?.matches('input,textarea')) scrollTo(0, 0); };
  addEventListener('scroll', unscroll); addEventListener('focusout', () => setTimeout(unscroll, 100));
}
let touchLock = false;
const tStick = { x: 0, y: 0 }; // move stick, -1 to 1
const gfx = { q: TOUCH ? 'low' : /CrOS/.test(navigator.userAgent) ? 'medium' : 'high', res: 1, fps: false, auto: true }; // auto: turns itself down when the game runs slow
try { const s = JSON.parse(localStorage.getItem('voxelstrike-gfx')); if (s) { if (GFX_Q[s.q]) gfx.q = s.q; if (s.res >= .5 && s.res <= 1) gfx.res = s.res; gfx.fps = !!s.fps; gfx.auto = s.auto !== false; } } catch {}
const gfxQ = () => GFX_Q[gfx.q];
const fxN = n => gfx.q === 'low' ? Math.floor(n / 2 + Math.random()) : n; // effect bits: half as many on low
const renderer = new THREE.WebGLRenderer({ antialias: gfxQ().aa, powerPreference: 'high-performance' });
const gfxAA = gfxQ().aa; // antialias only changes on reload
const pixelRatio = () => Math.min(devicePixelRatio, gfxQ().maxRatio) * gfx.res;
renderer.setPixelRatio(pixelRatio());
renderer.domElement.id = 'view';
document.body.prepend(renderer.domElement);
// the 3D view's size on screen: every screen sum uses this, not innerWidth (phone browsers can report something else)
const scr = { get w() { return renderer.domElement.clientWidth || innerWidth; }, get h() { return renderer.domElement.clientHeight || innerHeight; } };
let scrWas = '';
function scrFit() { const k = scr.w + 'x' + scr.h; if (k === scrWas) return false; scrWas = k; return true; } // true when it changed
scrFit(); renderer.setSize(scr.w, scr.h, false);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 35, 120);
const camera = new THREE.PerspectiveCamera(75, scr.w / scr.h, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xffffff, 0x556633, 1.1); scene.add(hemi); // each map sets its own lighting
const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(10, 20, 5); scene.add(sun);
hemi.layers.enableAll(); sun.layers.enableAll(); // lights on every layer, so the glow passes see the same lights (a change re-checks every material)
addEventListener('resize', () => { scrFit(); camera.aspect = scr.w / scr.h; camera.updateProjectionMatrix(); renderer.setSize(scr.w, scr.h, false); });
new ResizeObserver(() => { if (scrFit()) dispatchEvent(new Event('resize')); }).observe(renderer.domElement); // a phone's toolbars can change it without a resize event
// menus shrink to fit a phone: --z for the big ones, --z2 for the rest (--uw/--uh: 1% of the screen inside them); the lobby shrinks in any small window
function fitUI() {
  const st = document.documentElement.style, tall = TOUCH && scr.h > scr.w; // a phone held upright fits its width
  [['', 500, 860], ['2', 420, 760]].forEach(([n, h, w]) => {
    if (tall) [h, w] = [w, h];
    const z = Math.max(.5, Math.min(1, scr.h / h, scr.w / w));
    st.setProperty('--z' + n, z); st.setProperty('--uw' + n, scr.w / z / 100 + 'px'); st.setProperty('--uh' + n, scr.h / z / 100 + 'px');
  });
}
fitUI(); addEventListener('resize', fitUI);
// where a zoomed menu really is: Safari before 26 measured zoomed elements in unzoomed px
const zoomBug = (() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:1px;zoom:.5;visibility:hidden'; document.body.append(d); const w = d.getBoundingClientRect().width; d.remove(); return w > 75; })();
function zRect(el) {
  const r = el.getBoundingClientRect(); if (!zoomBug) return r;
  let z = 1; for (let a = el; a; a = a.parentElement) z *= parseFloat(getComputedStyle(a).zoom) || 1;
  return z === 1 ? r : new DOMRect(r.left * z, r.top * z, r.width * z, r.height * z);
}

const allTex = []; // so a quality change can update every texture
// item rarity: name and colour
const RARITY = { common: ['COMMON', '#c9ced6'], rare: ['RARE', '#4fa3ff'], epic: ['EPIC', '#c06bff'], legend: ['LEGENDARY', '#ff4a4a'], mythic: ['MYTHIC', '#ffc531'] };
const rarOf = o => o?.rar || 'common';
// bots pick rarer things less often
const BOT_RAR = { common: 4, rare: 3, epic: 2, legend: 1, mythic: .5 };
function pickRare(list) {
  let r = Math.random() * list.reduce((s, o) => s + BOT_RAR[rarOf(o)], 0);
  for (const o of list) if ((r -= BOT_RAR[rarOf(o)]) < 0) return o;
  return list[list.length - 1];
}
function tex(draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;               // crisp pixel-art up close
  t.minFilter = THREE.NearestMipmapLinearFilter;   // no shimmering far away
  t.anisotropy = Math.min(gfxQ().aniso, renderer.capabilities.getMaxAnisotropy()); // sharp at steep angles
  allTex.push(t);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
function noise(g, [r, gr, b], v) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const k = (Math.random() - .5) * v;
    g.fillStyle = `rgb(${r + k | 0},${gr + k | 0},${b + k | 0})`; g.fillRect(x, y, 1, 1);
  }
}
const lam = o => new THREE.MeshLambertMaterial(o);
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const stoneMat = (rx, ry) => lam({ map: tex(g => { noise(g, [125, 125, 125], 40); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(7, 0, 1, 7); g.fillRect(15, 8, 1, 7); }, rx, ry) });
const crateMat = ry => lam({ map: tex(g => { noise(g, [150, 105, 55], 30); g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, 16, 1); g.fillRect(0, 15, 16, 1); g.fillRect(0, 0, 1, 16); g.fillRect(15, 0, 1, 16); for (let i = 1; i < 15; i++) { g.fillRect(i, i, 1, 1); g.fillRect(15 - i, i, 1, 1); } }, 1, ry) });
const skinTex = tex(g => noise(g, [90, 150, 80], 25));
const faceTex = tex(g => { noise(g, [90, 150, 80], 25); g.fillStyle = '#111'; g.fillRect(3, 6, 3, 3); g.fillRect(10, 6, 3, 3); g.fillStyle = '#d22'; g.fillRect(4, 7, 1, 1); g.fillRect(11, 7, 1, 1); g.fillStyle = '#2a3a20'; g.fillRect(5, 11, 6, 2); });
const shirtTex = tex(g => noise(g, [40, 140, 160], 30));
const pantsTex = tex(g => noise(g, [50, 50, 130], 25));
const runShirtTex = tex(g => noise(g, [200, 75, 40], 30));
const bruteShirtTex = tex(g => noise(g, [70, 45, 85], 25));
const boomShirtTex = tex(g => noise(g, [185, 200, 55], 30));
const bossShirtTex = tex(g => noise(g, [110, 20, 20], 25));
const spitShirtTex = tex(g => noise(g, [120, 60, 150], 28));
const hiveShirtTex = tex(g => noise(g, [60, 20, 90], 25));

// coin icon for any HTML text
const COIN = '<i class="coin"></i>'; // drawn in icons.js
// titanium bar icon
const BAR = '<i class="tbar"></i>';
{
  const rows = ['......oooooooooooo..', '.....oTTGGTGTTTTTTo.', '....oTTGGTGTTTTTTEo.', '...oTTGGTGTTTTTTEEo.', '..oHHHHHHHHHHHHEEEo.', '.oSSSSSSSSSSSSEEEEo.', '.oFFFMMFMFFFFFEEEEo.', '.oFFMMFMFFFFFFEEEeo.', '.oFMMFMFFFFFFFEEeo..', '.oFFFFFFFFFFFFEeo...', '.offffffffffffeo....', '..ooooooooooooo.....'];
  const pal = { o: '#171c26', H: '#ffffff', G: '#ffffff', T: '#d0dbe7', S: '#bcc8d6', F: '#9aa9bb', M: '#c6d1de', f: '#76859a', E: '#63718a', e: '#4a566a' };
  const c = document.createElement('canvas'); c.width = c.height = 100; const g = c.getContext('2d'); // drawn big so it stays sharp at any size
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x * 5, y * 5 + 20, 5, 5); } }));
  document.documentElement.style.setProperty('--bar', `url(${c.toDataURL()})`);
}
// pictures of 3D models for the UI (guns, armor, boots, hats, skins), drawn in a small renderer of their own and kept as PNGs
const picCache = new Map(), picRef = new Map(), picBox = new THREE.Box3();
let pic = null;
const SHINE_T = { value: 0 }; // the clock polished gun parts shine by
function modelPic(key, build, { yaw = 0, tilt = .3, w = 320, h = 160, ref = null, done = null } = {}) {
  if (key && picCache.has(key)) return picCache.get(key);
  if (!pic) {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    const sc = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -50, 50), tip = new THREE.Group(), turn = new THREE.Group();
    const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(2, 3, 4);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x3a4a40, 1.5), sun, tip); tip.add(turn);
    pic = { r, sc, cam, tip, turn };
  }
  const { r, sc, cam, tip, turn } = pic, span = b => Math.max(b.max.x - b.min.x, (b.max.y - b.min.y) * w / h);
  const fit = f => { turn.clear(); f(turn); turn.rotation.y = yaw; tip.rotation.x = tilt; sc.updateMatrixWorld(true); return picBox.setFromObject(tip, true); };
  let rs = 0; // ref: a bigger model that sets the scale, so a set's pictures share one
  if (ref) { const rk = [ref[0], yaw, tilt, w / h].join(); if (!picRef.has(rk)) picRef.set(rk, span(fit(ref[1]))); rs = picRef.get(rk); }
  const b = fit(build), cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, fw = Math.max(rs, span(b)) * 1.06 / 2, fh = fw * h / w;
  Object.assign(cam, { left: cx - fw, right: cx + fw, top: cy + fh, bottom: cy - fh }); cam.updateProjectionMatrix();
  const st = SHINE_T.value; SHINE_T.value = 3; // pictures catch no shine line
  r.setSize(w, h, false); r.render(sc, cam); turn.clear(); done?.(); SHINE_T.value = st;
  const url = r.domElement.toDataURL();
  if (key) picCache.set(key, url);
  return url;
}
