const $ = id => document.getElementById(id);

// graphics settings, saved per device (Chromebooks start on medium)
const GFX_Q = {
  high:   { aa: true,  maxRatio: 2, aniso: 16, detail: true,  view: 1, shadow: true },
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
// glsl value noise: h2 a hash, vn smooth between them
const NOISE_GL = `float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f *= f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + 1.), f.x), f.y); }`;
// the sky draws first, under everything: its dome (-2), stars and glows (-1.5), then moons and suns (-1); anything else covers them, however far off it is
const skyBack = (o, order = -1.5) => { o.renderOrder = order; for (const m of [o.material].flat()) { m.transparent = false; m.depthTest = m.depthWrite = false; } o.frustumCulled = false; o.userData.live = true; return o; };
// moons, suns and the Earth are blocks: 16 px faces (draw(g, f), faces +x -x +y -y +z -z), lit by their own sun (a world direction), turning slowly on a tilted axis; night(g, f) shows on the dark side
function skyCube(draw, sun, { amb = .3, night = null, spin = .026, tilt = [.35, .2], order = -1 } = {}) {
  const sheet = f => { const c = document.createElement('canvas'); c.width = 96; c.height = 16; const g = c.getContext('2d'); for (let i = 0; i < 6; i++) { g.setTransform(1, 0, 0, 1, i * 16, 0); f(g, i); } const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.attributes.uv;
  for (let i = 0; i < 24; i++) uv.setX(i, (Math.floor(i / 4) + uv.getX(i)) / 6); // each face its own square of the sheet
  const m = skyBack(new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: { map: { value: sheet(draw) }, dark: { value: night && sheet(night) }, sun: { value: sun.clone().normalize() }, amb: { value: amb } }, defines: night ? { NIGHT: 1 } : {},
    vertexShader: 'varying vec2 vU; varying vec3 vN;\nvoid main() { vU = uv; vN = mat3(modelMatrix) * normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform sampler2D map, dark; uniform vec3 sun; uniform float amb; varying vec2 vU; varying vec3 vN;\nvoid main() { float l = max(dot(normalize(vN), sun), 0.); vec3 c = texture2D(map, vU).rgb * (amb + (1. - amb) * l);\n#ifdef NIGHT\n  c += texture2D(dark, vU).rgb * (1. - smoothstep(0., .3, l));\n#endif\n  gl_FragColor = vec4(c, 1.);\n#include <colorspace_fragment>\n}'
  })), order);
  const a0 = Math.random() * 6.3; m.rotation.order = 'ZXY'; m.rotation.x = tilt[0]; m.rotation.z = tilt[1];
  m.onBeforeRender = () => { m.rotation.y = a0 + performance.now() / 1000 * spin; m.updateMatrixWorld(); };
  return m;
}
// a moon's faces: its dust, and seas and craters a shade darker
const moonFaces = (lite, dim) => (g, f) => {
  noise(g, lite, 10);
  for (let i = 0; i < 3 + f % 2; i++) { const cx = 2 + Math.random() * 12, cy = 2 + Math.random() * 12, r = 1.2 + Math.random() * 2; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x + .5 - cx, y + .5 - cy) < r) { const k = (Math.random() - .5) * 8; g.fillStyle = `rgb(${dim[0] + k | 0},${dim[1] + k | 0},${dim[2] + k | 0})`; g.fillRect(x, y, 1, 1); } }
};
// a sun's faces: a pale middle in rings of gold
const sunFaces = (rim, mid, core) => g => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = Math.min(x, y, 15 - x, 15 - y), c = e < 1 ? rim : e < 3 ? mid : core, k = (Math.random() - .5) * 6; g.fillStyle = `rgb(${c[0] + k | 0},${c[1] + k | 0},${c[2] + k | 0})`; g.fillRect(x, y, 1, 1); } };
// the Earth's faces: sea, green and dry land, ice on the poles, wisps of cloud; and its cities, lit on the night side
function earthFaces() {
  const px = [...Array(6)].map((_, f) => {
    const isles = [...Array(3 + (Math.random() * 3 | 0))].map(() => [1 + Math.random() * 14, 1 + Math.random() * 14, 2 + Math.random() * 3]), dry = [Math.random() * 16, Math.random() * 16, 2 + Math.random() * 2];
    const c = [...Array(256)].map((_, i) => { const x = i % 16 + .5, y = (i >> 4) + .5, j = Math.random() - .5;
      if ((f === 2 || f === 3) && Math.hypot(x - 8, y - 8) < 5 + j) return 'ice';
      return isles.some(([a, b, r]) => Math.hypot(x - a, y - b) < r + j) ? Math.hypot(x - dry[0], y - dry[1]) < dry[2] ? 'dry' : 'land' : 'sea'; });
    for (let k = 0; k < 2 + (Math.random() * 2 | 0); k++) { const y = Math.random() * 16 | 0, x0 = Math.random() * 16 | 0, n = 3 + (Math.random() * 5 | 0); for (let x = x0; x < x0 + n; x++) c[y * 16 + (x & 15)] = 'cloud'; c[((y + 1) & 15) * 16 + ((x0 + 2) & 15)] = 'cloud'; }
    return c.map(k => [k, (k === 'land' || k === 'dry') && Math.random() < .15]);
  });
  const COL = { sea: [36, 86, 168], land: [92, 138, 66], dry: [156, 134, 88], ice: [238, 242, 248], cloud: [238, 242, 248] };
  const paint = pick => (g, f) => px[f].forEach(([k, city], i) => { const c = pick(k, city); if (!c) return; const n = (Math.random() - .5) * 10; g.fillStyle = `rgb(${c[0] + n | 0},${c[1] + n | 0},${c[2] + n | 0})`; g.fillRect(i % 16, i >> 4, 1, 1); });
  return { day: paint(k => COL[k]), night: paint((k, city) => city && [255, 206, 120]) };
}
// a sky dome round whoever looks, coloured by height (stops: [y from -1 to 1, colour])
function skyDome(R, stops) {
  const geo = new THREE.SphereGeometry(R, 32, 72), p = geo.attributes.position, col = [], c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / R; let k = 0;
    while (k < stops.length - 2 && y > stops[k + 1][0]) k++;
    c.set(stops[k][1]).lerp(c2.set(stops[k + 1][1]), THREE.MathUtils.clamp((y - stops[k][0]) / (stops[k + 1][0] - stops[k][0]), 0, 1)); col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = skyBack(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })), -2);
  m.onBeforeRender = (r, s, cam) => m.matrixWorld.setPosition(cam.position);
  return m;
}
// stars: square pixels, twinkling, fading as they set (s: size, brightness, twinkle, seed; k: the camera's pixels for a metre a metre off)
const STAR_VS = `uniform float t, k, h; attribute vec4 s; attribute vec3 c; varying vec3 vC; varying float vA;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.), mv = viewMatrix * w; gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1., floor(s.x * k / -mv.z + .5));
  vA = s.y * (1. - s.z * (.5 + .5 * sin(t * (1.1 + s.w * 2.3) + s.w * 40.))) * smoothstep(-1.5, h, (w.y - cameraPosition.y) * 250. / distance(w.xyz, cameraPosition)); // gone below the horizon (h: how high they fade in)
  vC = c;
}`;
const STAR_FS = `varying vec3 vC; varying float vA;
void main() { gl_FragColor = vec4(vC, vA);
#include <colorspace_fragment>
}`;
const starMat = (t, k, h = .5) => new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, blending: THREE.AdditiveBlending, uniforms: { t, k, h: { value: h } } });
// stars round whoever looks, with their own clock and size for the camera drawing them (pos on a sphere, s and c as above)
function camStars(pos, s, c, h) {
  const t = { value: 0 }, k = { value: 1 }, v = new THREE.Vector2(), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('s', new THREE.Float32BufferAttribute(s, 4)); geo.setAttribute('c', new THREE.Float32BufferAttribute(c, 3));
  const m = skyBack(new THREE.Points(geo, starMat(t, k, h)));
  m.onBeforeRender = (r, sc, cam) => { t.value = performance.now() / 1000; k.value = r.getDrawingBufferSize(v).y / (2 * Math.tan(cam.fov * Math.PI / 360)); m.matrixWorld.setPosition(cam.position); };
  return m;
}
// the Milky Way: a glowing band of pixels round a sphere's middle, dark lanes down it, warmer and brighter at its core (+x); a: how bright
const SKY_VS = `varying vec3 vD, vW; void main() { vD = position; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const BAND_FS = `uniform float a, h; varying vec3 vD, vW;
` + NOISE_GL + `
void main() {
  vec3 d = normalize(vD); float l = atan(d.z, d.x), b = asin(clamp(d.y, -1., 1.));
  vec2 q = floor(vec2(l, b) / .0025) * .0025; l = q.x; b = q.y; // in pixels
  float core = exp(-l * l / .4), wide = .07 + .03 * sin(l * 3. + 1.) + .05 * core;
  float n = vn(vec2(l, b) * 9.) * .5 + vn(vec2(l, b) * 23. + 4.) * .3 + vn(vec2(l, b) * 70.) * .2, grain = vn(vec2(l, b) * 190.);
  float lane = smoothstep(.58, .78, vn(vec2(l * 6., b * 45.) + 9.)) * exp(-b * b / .0012) * (.4 + .6 * smoothstep(-.6, .4, sin(l * 2. + .5)));
  float k = exp(-b * b / (wide * wide)) * (.3 + .9 * n * n + .35 * grain) * (1. - .9 * lane) + core * exp(-b * b / .008) * .6 * (.6 + .4 * grain);
  vec3 c = mix(vec3(.4, .43, .56), vec3(.68, .56, .4), core * .8) * k * .12 * a;
  gl_FragColor = vec4(c * smoothstep(-1.5, h, (vW.y - cameraPosition.y) * 248. / distance(vW, cameraPosition)), 1.);
#include <colorspace_fragment>
}`;
const skyBand = (R, a = 1, fs = BAND_FS, u = {}) => skyBack(new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, blending: THREE.AdditiveBlending, uniforms: { a: { value: a }, h: { value: 1 }, ...u }, vertexShader: SKY_VS, fragmentShader: fs })), -1.6);
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
