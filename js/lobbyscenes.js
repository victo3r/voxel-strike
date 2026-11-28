// the lobbies you buy or win (LOBBIES in lobbies.js), each made the first time it's shown
const LOB_T = { value: 0 }, LOB_K = { value: 1000 }; // their clock, and how many pixels a metre is at a metre off (for sizes on screen)
const _lsz = new THREE.Vector2();
function lobbyClock(t) { LOB_T.value = t; LOB_K.value = renderer.getDrawingBufferSize(_lsz).y / (2 * Math.tan(lobbyCam.fov * Math.PI / 360)); }
const lr = (a, b) => a + Math.random() * (b - a);
const lAt = (list, x, y, z) => list.map(b => ({ ...b, x: b.x + snap(x), y: b.y + y, z: b.z + snap(z) }));
const solidM = () => lam({ vertexColors: true }), glowM = (fog = true) => new THREE.MeshBasicMaterial({ vertexColors: true, fog });
const glowSpr = (c, o = .8) => new THREE.Sprite(new THREE.SpriteMaterial({ map: haloMap(), color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
const hexR = r => a => r * .866 / Math.cos(((a % 1.0472) + 1.0472) % 1.0472 - .5236); // a hexagon r pixels to its corners
// pxBlob for things far off: s-metre cells between R0(angle) and R(angle) metres from the middle
function cellBlob(R, y0, y1, s, R0 = () => 0) {
  const out = [], y = (y0 + y1) / 2, h = y1 - y0; let n = 0;
  for (let i = 0; i < 64; i++) n = Math.max(n, Math.ceil(R(i / 64 * Math.PI * 2) / s) + 1);
  for (let j = -n; j < n; j++) for (let i = -n, run = null; i <= n; i++) {
    const x = (i + .5) * s, z = (j + .5) * s, r = Math.hypot(x, z), a = Math.atan2(z, x);
    if (i < n && r < R(a) && r >= R0(a)) run ??= i;
    else if (run !== null) { out.push({ x: (run + i) / 2 * s, y, z, w: (i - run) * s, h, d: s }); run = null; }
  }
  return out;
}
// where a bit stuck on a side goes: the first n by n pixels clear of the boxes, going out from (x, z) along (dx, dz), between y0 and y1
function pxClear(bs, x, z, y0, y1, dx, dz, n = 1) {
  const lh = (m, s) => { let lo = Math.round((m - s / 2) * TX), hi = Math.round((m + s / 2) * TX); if (hi <= lo) { lo = Math.floor(m * TX); hi = lo + 1; } return [lo, hi]; }, Y = lh((y0 + y1) / 2, y1 - y0);
  const B = bs.map(b => [lh(b.x, b.w), lh(b.y, b.h), lh(b.z, b.d)]).filter(([, [a, c]]) => a < Y[1] && Y[0] < c), hit = (i, j) => B.some(([[a, b], , [c, d]]) => a < i + n && i < b && c < j + n && j < d);
  for (let s = 0; s < 160; s += .25) { const i = Math.floor(x * TX + dx * s - (n - 1) / 2), j = Math.floor(z * TX + dz * s - (n - 1) / 2); if (!hit(i, j)) return [(i + n / 2) / TX, (j + n / 2) / TX]; }
  return [x, z];
}
// a far mountain range: flat-coloured columns `cell` metres wide, as high as its n peaks (lo to hi high) there, snow above `snow`
function lobRange(z, n, [lo, hi], { y0 = 0, snow = 1e9, rock, cap, x0 = -230, x1 = 230, cell = 3, d = 14, jit = 1.5, roll = false }) {
  const peaks = [...Array(n)].map(() => [lr(x0, x1), lr(22, 55), lr(lo, hi)]), out = [], C = new THREE.Color(), p = [lr(0, 6), lr(0, 6), lr(0, 6)];
  for (let x = x0; x < x1; x += cell) {
    let h = 0; for (const [c, w, a] of peaks) h = Math.max(h, a * (1 - Math.abs(x + cell / 2 - c) / w));
    if (roll) h = lo + (hi - lo) * (.5 + .3 * Math.sin(x * .031 + p[0]) + .14 * Math.sin(x * .083 + p[1]) + .06 * Math.sin(x * .19 + p[2])); // rolling hills: no flat ground between peaks
    h = Math.max(h, lo * .35) + (Math.random() - .5) * jit;
    const top = y0 + h, cut = Math.min(top, y0 + snow + lr(-1.5, 1.5)), k = lr(-.03, .03);
    out.push({ x: x + cell / 2, y: (y0 - 2 + cut) / 2, z, w: cell, h: cut - y0 + 2, d, c: C.set(rock).offsetHSL(0, 0, k).getHex() });
    if (top > cut) out.push({ x: x + cell / 2, y: (cut + top) / 2, z, w: cell, h: top - cut, d, c: C.set(cap).offsetHSL(0, 0, k).getHex() });
  }
  return out;
}
// a sky all round you, coloured by height ([from -1 to 1, colour] low to high)
const lobbyDome = stops => skyDome(240, stops);
// little squares of light, smoke or snow, each going round its own life (rising, or falling when rise is down), swaying; one draw for them all
const MOTE_VS = `uniform float t, k, sway, grow, fade, hk; uniform vec3 rise, hc; attribute vec4 s; attribute vec3 c; varying vec3 vC; varying float vA;
#include <fog_pars_vertex>
void main() {
  float life = fract(t * s.y + s.x);
  vec3 p = position + rise * life + vec3(sin(t * .8 + s.w * 6.3), 0., cos(t * .6 + s.w * 5.1)) * sway;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = max(1., s.z * (1. + grow * life) * k / -mvPosition.z);
  vA = fade < .5 ? sin(life * 3.1416) : fade < 1.5 ? smoothstep(0., .08, life) * (1. - life) : .55 + .45 * sin(life * 6.2832);
  vC = mix(c, hc, hk * (1. - smoothstep(0., .35, life)));
#include <fog_vertex>
}`;
const MOTE_FS = `uniform float a; varying vec3 vC; varying float vA;
#include <fog_pars_fragment>
void main() { gl_FragColor = vec4(vC, vA * a);
#include <colorspace_fragment>
#include <fog_fragment>
}`;
// fade: 0 in and out, 1 smoke (quick in, slow out), 2 twinkling; hot: the colour it starts as
function lobbyMotes({ n, box, place, rise = [0, 2, 0], sway = .3, size = [.06, .12], speed = [.08, .16], colors, add = true, a = 1, grow = 0, fade = 0, hot = null }) {
  const pos = [], s = [], c = [], C = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.push(...(place ? place() : [lr(box[0], box[1]), lr(box[2], box[3]), lr(box[4], box[5])]));
    s.push(Math.random(), lr(...speed), lr(...size), Math.random()); C.set(lPick(colors)); c.push(C.r, C.g, C.b);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('s', new THREE.Float32BufferAttribute(s, 4)); geo.setAttribute('c', new THREE.Float32BufferAttribute(c, 3));
  const m = new THREE.Points(geo, new THREE.ShaderMaterial({ fog: !add, vertexShader: MOTE_VS, fragmentShader: MOTE_FS, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), t: LOB_T, k: LOB_K, rise: { value: new THREE.Vector3(...rise) }, sway: { value: sway }, a: { value: a }, grow: { value: grow }, fade: { value: fade },
      hc: { value: new THREE.Color(hot ?? 0) }, hk: { value: hot === null ? 0 : 1 } } }));
  m.frustumCulled = false; m.userData.n = n; return m;
}
const motesQ = m => m.geometry.setDrawRange(0, gfx.q === 'low' ? m.userData.n >> 1 : m.userData.n); // half on low graphics
// lava: dark crust, glowing cracks and pools, flowing; 16 pixels to the metre (on the ground by where it is, on a fall by its own size)
const LAVA_VS = `uniform vec2 uvs; varying vec2 vU;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.); vU = uvs.x > 0. ? uv * uvs : w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const LAVA_FS = `uniform float t, hot, down; uniform vec2 flow, str; varying vec2 vU;
#include <fog_pars_fragment>
float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f *= f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1., 0.)), f.x), mix(h2(i + vec2(0., 1.)), h2(i + 1.), f.x), f.y); }
void main() {
  vec2 q = (floor(vU * 16.) + .5) / 16. * str;
  vec2 fb = down > .5 ? flow * 1.4 : -flow * 1.4, fd = down > .5 ? flow * 2.1 : flow.yx * 2.1; // a fall's layers all go down, a lake's churn
  float a = vn(q * .42 + flow * t), b = vn(q * 1.1 + fb * t + 3.1), d = vn(q * 2.6 + fd * t + 5.7);
  float crack = max(1. - smoothstep(.02, .055, abs(a - .5)), .8 * (1. - smoothstep(.015, .04, abs(b - .5))));
  crack = mix(crack, .3, smoothstep(.08, .3, length(fwidth(vU)))); // far off, where a crack is thinner than a pixel, just its glow
  float g = clamp(max(crack * (.7 + .3 * d), smoothstep(.66, .8, a * .7 + d * .3)) + hot + .04 * sin(t * 2.3 + q.x * .5), 0., 1.);
  vec3 crust = mix(vec3(.06, .025, .025), vec3(.2, .07, .04), d);
  vec3 c = g < .5 ? mix(crust, vec3(.8, .14, .02), g * 2.) : mix(vec3(.8, .14, .02), vec3(1., .8, .32), g * 2. - 1.);
  gl_FragColor = vec4(pow(c, vec3(2.2)), 1.);
#include <colorspace_fragment>
#include <fog_fragment>
}`;
const lavaMat = ({ flow = [.04, .02], hot = 0, uvs = [0, 0], str = [1, 1], down = 0 } = {}) => new THREE.ShaderMaterial({ fog: true, vertexShader: LAVA_VS, fragmentShader: LAVA_FS,
  uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), t: LOB_T, hot: { value: hot }, down: { value: down }, flow: { value: new THREE.Vector2(...flow) }, uvs: { value: new THREE.Vector2(...uvs) }, str: { value: new THREE.Vector2(...str) } } });
// a picture in pixel boxes standing up at the origin, facing +z, from rows of letters (' ' empty) in the colours of pal; one row of boxes per run
function pxPic(rows, pal, d = 1 / TX) {
  const out = [], n = rows.length, w = Math.max(...rows.map(r => r.length));
  rows.forEach((row, j) => { for (let i = 0; i < row.length;) { let k = i; while (k < row.length && row[k] === row[i]) k++; if (row[i] !== ' ') out.push({ x: ((i + k) / 2 - w / 2) / TX, y: (n / 2 - j - .5) / TX, z: 0, w: (k - i) / TX, h: 1 / TX, d, c: pal[row[i]] }); i = k; } });
  return out;
}
const lMove = (list, x, y, z) => list.map(b => ({ ...b, x: b.x + x, y: b.y + y, z: b.z + z }));
// cloth: a flag fixed along its pole, or a banner hung from its top, rippling; w and h whole pixels, the picture drawn at 16 to the metre
function lobCloth(w, h, draw, hang = false, amp = .1) {
  const geo = new THREE.PlaneGeometry(w, h, hang ? 1 : 10, hang ? 12 : 1); geo.translate(hang ? 0 : w / 2, hang ? -h / 2 : 0, 0);
  const m = lam({ map: pxTex(Math.round(w * TX), Math.round(h * TX), draw), side: THREE.DoubleSide, alphaTest: .5 });
  m.onBeforeCompile = sh => {
    sh.uniforms.wT = LOB_T;
    sh.vertexShader = 'uniform float wT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (hang
      ? `transformed.z += (.6 + .4 * sin(position.y * 1.2 + wT * 1.4 + modelMatrix[3][0])) * ${amp.toFixed(3)} * -position.y;` // out from the wall, never into it
      : `transformed.z += sin(position.x * 2.8 - wT * 5. + modelMatrix[3][0]) * ${amp.toFixed(3)} * position.x; transformed.y -= position.x * position.x * .02;`));
  };
  m.customProgramCacheKey = () => 'cloth' + hang + amp;
  return new THREE.Mesh(geo, m);
}
// fire: glowing boxes licking up and flickering, never two alike
function lobFlame(s = 1) {
  const g = new THREE.Group(), parts = [];
  for (const [w, h, x, y, z, c] of [[.36, .3, 0, .15, 0, 0xd8300c], [.3, .34, .05, .3, -.03, 0xff6a14], [.22, .3, -.04, .44, .03, 0xff9a1e], [.14, .24, .02, .58, 0, 0xffd04a], [.08, .14, -.02, .72, .01, 0xfff2b0], [.12, .16, -.13, .26, .1, 0xff8a1a]]) {
    const b = box(w * s, h * s, w * s, new THREE.MeshBasicMaterial({ color: c })); b.position.set(x * s, y * s, z * s); g.add(b); parts.push({ b, x: x * s, y: y * s, p: Math.random() * 6 });
  }
  g.userData.tick = t => parts.forEach((q, i) => {
    const k = 1 + Math.sin(t * (8 + i * 2.7) + q.p) * .16 + Math.sin(t * 21 + i * 1.3) * .07;
    q.b.scale.set(k, 1 + (k - 1) * 1.8, k); q.b.position.set(q.x + Math.sin(t * 5 + q.p) * .02 * s * i, q.y * (1 + (k - 1) * .6), q.b.position.z); q.b.rotation.y = t * (.8 + i * .5) + q.p;
  });
  return g;
}
// bits thrown up that fall back and fade: lava bombs, sparks, fireworks (size in metres)
const BIT_VS = `uniform float k, sz; attribute vec4 c; varying vec4 vC;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = max(1., sz * k / -mv.z); vC = c; }`;
const BIT_FS = `varying vec4 vC;
void main() { gl_FragColor = vC;
#include <colorspace_fragment>
}`;
function lobbyBits(n, size, add = true, a = 1) {
  const pos = new Float32Array(n * 3).fill(-999), col = new Float32Array(n * 4), geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('c', new THREE.BufferAttribute(col, 4));
  const m = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: { k: LOB_K, sz: { value: size } }, vertexShader: BIT_VS, fragmentShader: BIT_FS, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
  m.frustumCulled = false; const bits = [], C = new THREE.Color(); let was = 0;
  m.userData = {
    throw(x, y, z, vx, vy, vz, life, c, drag = 0) { if (bits.length < n) bits.push({ x, y, z, vx, vy, vz, life, age: 0, c: C.set(c).toArray(), drag }); },
    tick(dt, grav = 9) {
      if (!bits.length && !was) return;
      for (let i = bits.length; i--;) {
        const b = bits[i]; b.age += dt; if (b.age > b.life) { bits.splice(i, 1); continue; }
        const d = Math.exp(-b.drag * dt); b.vx *= d; b.vz *= d; b.vy = b.vy * d - grav * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      }
      for (let i = 0; i < Math.max(was, bits.length); i++) {
        const b = bits[i], k = b ? Math.min(1, (b.life - b.age) * 2) : 0;
        pos[i * 3] = b ? b.x : 0; pos[i * 3 + 1] = b ? b.y : -999; pos[i * 3 + 2] = b ? b.z : 0;
        if (b) col.set([...b.c, k * a], i * 4); else col[i * 4 + 3] = 0;
      }
      was = bits.length; geo.attributes.position.needsUpdate = geo.attributes.c.needsUpdate = true;
    },
  };
  return m;
}
const litOf = (cols, ints, d) => { const s = litSet(); cols.forEach((c, j) => s.c[j].set(c)); s.i.splice(0, 4, ...ints); s.d.set(...d).normalize(); return s; }; // [sky, ground, key, rim, bounce], [hemi, key, rim, bounce], key from

// ---- the volcano: you on a basalt column in a lava lake, the volcano smoking far off and now and then throwing up lava
LOBBY_MAKE.volcano = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0x2a0a08], [-.02, 0x6e2410], [0, 0x8a3214], [.03, 0x6a220f], [.08, 0x3e150e], [.22, 0x1c0b0c], [1, 0x0a0608]]));
  const fog = new THREE.Fog(0x8a3214, 40, 330);
  const lake = add(new THREE.Mesh(new THREE.PlaneGeometry(560, 560), lavaMat({ flow: [.05, .03] }))); lake.rotation.x = -Math.PI / 2; lake.position.y = -.75;
  // basalt: cool grey, cracked across now and then
  const bSide = pxTex(16, 32, c => {
    fillN(c, 16, 32, [62, 62, 72], 10);
    for (let y = 2 + (Math.random() * 6 | 0); y < 31; y += 7 + (Math.random() * 9 | 0)) { const j = Math.random() * 16 | 0; for (let x = 0; x < 16; x++) dot(c, rgb([34, 34, 42], (Math.random() - .5) * 6), x, y + ((x + j) % 16 < 5 ? 1 : 0)); }
    for (let i = 0; i < 10; i++) dot(c, rgb([98, 98, 112]), Math.random() * 16 | 0, Math.random() * 32 | 0);
  });
  const bTop = pxTex(32, 32, c => { fillN(c, 32, 32, [84, 82, 94], 14); for (let i = 0; i < 30; i++) dot(c, rgb([58, 56, 66]), Math.random() * 32 | 0, Math.random() * 32 | 0, 1 + (Math.random() * 2 | 0), 1); for (let i = 0; i < 12; i++) dot(c, rgb([112, 108, 122]), Math.random() * 32 | 0, Math.random() * 32 | 0); });
  // your column's top, cracks glowing out from its middle
  const crack = (r, a) => r > 3 && r < 17.5 && Math.abs(Math.sin(a * 2.5 + Math.sin(r * .35) * .35 + 1)) < .07 + r * .002;
  const myTop = glow => pxTex(64, 64, c => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const dx = (x + 32) % 64 - 32 + .5, dy = (y + 32) % 64 - 32 + .5, r = Math.hypot(dx, dy), k = crack(r, Math.atan2(dy, dx));
      dot(c, glow ? (k ? (r < 9 ? '#ffd27a' : '#ff8a2a') : '#000') : k ? '#ff9a3c' : rgb(r < 2.5 ? [130, 74, 46] : [84, 82, 94], (Math.random() - .5) * 16), x, y);
    }
  });
  const sideM = pxMat(bSide), topM = pxMat(bTop), mine = lam({ map: myTop(false), emissiveMap: myTop(true), emissive: 0xffffff, vertexColors: true });
  add(pxBoxes(pxBlob(hexR(19), -3, .5), [sideM, mine], { th: 32, end: 'y', ew: 64 }));
  // more columns round you, in clusters and standing alone, and the cliff the lava pours from
  const cols = [], col = (x, z, r, top) => cols.push(...lAt(pxBlob(hexR(r - .5), -3, snap(top)), x, 0, z));
  const cluster = (cx, cz, r, n, top, drop, rag = .5) => { // on a hex grid round (cx, cz), lower by `drop` a ring out, ragged at the edge
    const s = r * 1.5 / TX, t = r * Math.sqrt(3) / TX;
    for (let q = -n; q <= n; q++) for (let k = Math.max(-n, -q - n); k <= Math.min(n, n - q); k++) {
      const ring = (Math.abs(q) + Math.abs(k) + Math.abs(q + k)) / 2;
      if (ring && Math.random() < rag * ring / (n + 1)) continue;
      col(cx + s * q, cz + t * (k + q / 2), r, top - ring * drop - (ring ? Math.random() * drop * .7 : 0));
    }
  };
  for (const [x, z, r, top] of [[-1.75, -.55, 11, .06], [-1.3, -2.05, 12, .31], [.3, -2.3, 10, -.12], [1.75, -1.5, 12, .19], [2.05, .1, 10, -.25], [-2.2, 1.05, 9, -.44], [1.85, 1.35, 9, -.5], [-.6, -3.6, 9, -.3], [3.1, -2.9, 10, -.38], [-3.1, -1.6, 10, -.2],
    [2.6, -10.5, 9, .55], [-3.4, -15.5, 10, 1.15], [1.6, -23, 11, .85], [-1.2, -40, 12, 2.1], [5.5, -16, 9, .2], [-9, -21, 10, .9], [15, -14, 9, .7], [-14, -12, 10, 1.6], [-4.5, -30, 11, .4], [13, -40, 12, 1.2]]) col(x, z, r, top);
  cluster(-7.6, -8.2, 10, 2, 2.4, .55); cluster(7.4, -9.6, 9, 2, 1.5, .5); cluster(-18, -33, 12, 2, 4.2, .55); cluster(8.5, -31, 12, 2, 5.2, .12, 0);
  add(pxBoxes(cols, [sideM, topM], { th: 32, end: 'y', ew: 32 }));
  const fall = add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.5), lavaMat({ flow: [0, .5], hot: .22, uvs: [1.5, 5.5], str: [1, .3], down: 1 })));
  fall.position.set(8.5, 2, -27.6); fall.rotation.y = -.24;
  const foot = add(glowSpr(0xff7a2a)); foot.position.set(8.5, -.3, -27.2); foot.scale.set(6, 3, 1);
  // black glass on the rocks, fires burning
  const glass = [], shard = (x, y, z, n, w, r) => { for (let k = 0; k < n; k++) { const s = Math.max(1 / TX, w * (1 - k / n)); glass.push({ x, y: y + (k + .5) * .1875, z, w: s, h: .1875, d: s, r, c: k === n - 1 ? 0xc0a0ee : k >= n / 2 ? 0x4a3470 : 0x1e1430 }); } };
  for (const [x, y, z, k] of [[-1.35, .31, -2.2, 3], [7.3, 1.5, -9.5, 3], [-3.45, 1.15, -15.6, 2], [3.05, -.38, -2.95, 2]]) for (let i = 0; i < k; i++) shard(x + lr(-.22, .22), snap(y) - i / TX, z + lr(-.2, .2), 3 + (Math.random() * 3 | 0), lr(.19, .3), lr(0, 1.5)); // each a pixel lower, so their steps never level
  add(pxBoxes(glass, lam({ vertexColors: true, emissive: 0x1a0c2a })));
  const fires = [[-7.6, 2.4, -8.2, 1.1], [-18, 4.2, -33, 1.5], [5.5, .2, -16, .8]].map(([x, y, z, s]) => { const f = add(lobFlame(s)); f.position.set(snap(x), snap(y), snap(z)); return f; });
  // the volcano: far off, rivers of lava down its side, its crater glowing, smoke blown off its top
  const V = [-14, -195], ty = k => .9 + k * 1.9, lv = k => 56 * (1 - k / 9) ** 1.3 + 7, base = lumpy(1, .1, [.4, 1.7, 2.9]);
  const Rk = [...Array(9)].map((_, k) => { const w = lumpy(1, .03, [k * 1.3, k * 2.1, k * .7]); return a => lv(k) * base(a) * w(a); });
  const vRock = [], vLava = [];
  Rk.forEach((R, k) => vRock.push(...lAt(cellBlob(R, ty(k) - 1.9 - (k ? 0 : .1), ty(k), 2, k === 8 ? () => 6.4 : undefined), V[0], 0, V[1])));
  for (const [a0, sd] of [[1.32, 0], [1.58, 2.1], [1.86, 4.3]]) {
    const T = k => Math.round(ty(k) * TX), st = (a, r, y0, y1, w, d, c) => vLava.push({ x: V[0] + Math.cos(a) * r, y: (y0 + y1) / 2 / TX, z: V[1] + Math.sin(a) * r, w, h: (y1 - y0) / TX, d, r: -a, c }), cs = [0xff7a24, 0xff9a2a, 0xffb43a];
    const a8 = a0 + .05 * Math.sin(8 * 1.9 + sd); st(a8, (6.4 + Rk[8](a8)) / 2, T(8) - 1, T(8) + 4, Rk[8](a8) - 6.4, 1.5, lPick(cs)); // over the crater's lip
    for (let k = 0; k < 8; k++) { // never level with the rock's layers, so no faces meet
      const a = a0 + .05 * Math.sin(k * 1.9 + sd), r0 = Rk[k](a), r1 = Rk[k + 1](a), d = 1.6 + (8 - k) * .22, c = lPick(cs);
      st(a, (r0 + r1) / 2, T(k) - 1, T(k) + 4, r0 - r1 + .2, d, c); st(a, r1 - .15, T(k) - 2, T(k + 1) + 1, .5, d, c);
      if (!k) st(a, r0 - .1, -12, T(0) + 1, .4, d, c);
    }
  }
  add(pxBoxes(vRock.map(b => ({ c: lPick([0x3e3436, 0x463b3c, 0x383032]), ...b })), solidM()));
  const lavaGlow = glowM(false); add(pxBoxes(vLava, lavaGlow));
  const crater = add(glowSpr(0xff8030, .7)); crater.position.set(V[0], ty(8) + 2, V[1]); crater.scale.set(40, 16, 1);
  const smoke = add(lobbyMotes({ n: 40, box: [V[0] - 3, V[0] + 3, ty(8) + .5, ty(8) + 1.5, V[1] - 3, V[1] + 3], rise: [62, 26, 12], sway: 2.5, size: [7, 11], speed: [.028, .042], colors: [0x2c2426, 0x3a3034, 0x46393a, 0x55453f], add: false, a: .85, grow: 1.7, fade: 1, hot: 0xb0401a }));
  const embers = add(lobbyMotes({ n: 80, box: [-12, 12, -.7, -.3, -16, 4], rise: [.4, 4.5, 0], sway: .35, size: [.05, .11], speed: [.1, .22], colors: [0xffb040, 0xff7a20, 0xffe08a, 0xff5a18] }));
  const ash = add(lobbyMotes({ n: 50, box: [-12, 12, 1, 9, -16, 4], rise: [1.2, -7, .4], sway: .6, size: [.04, .07], speed: [.04, .08], colors: [0x8a8284, 0x6a6466], add: false, a: .7 }));
  const splash = add(lobbyMotes({ n: 18, box: [7.8, 9.2, -.75, -.6, -27.6, -27], rise: [0, 1.5, .6], sway: .15, size: [.06, .12], speed: [.4, .7], colors: [0xffd27a, 0xff9a2a, 0xff6a18] }));
  const bombs = add(lobbyBits(70, 1.1));
  const lights = [[0xff6a20, 7, 9, 0, -.25, 1.9], [0xff5414, 9, 16, 8.4, .6, -26]].map(([c, i, d, x, y, z]) => { const l = add(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  let next = 3, flare = 0;
  const erupt = (n, big) => {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.3, s = lr(2, big ? 10 : 6); bombs.userData.throw(V[0] + lr(-2, 2), ty(8) + .5, V[1] + lr(-2, 2), Math.cos(a) * s, lr(big ? 14 : 9, big ? 24 : 16), Math.sin(a) * s, lr(2.2, 3.6), lPick([0xffd27a, 0xff9a2a, 0xff6a18])); }
    flare = big ? 1.6 : 1;
  };
  return {
    g, sky: null, fog,
    lit: litOf([0x8a7a86, 0xff6a2a, 0xffd2b0, 0xff7a30, 0xff8a3a], [1, 1.2, 1.6, 1.1], [-5, 7, 6]),
    hey() { erupt(60, true); },
    tick(dt, t) {
      lobbyClock(t); [smoke, embers, ash, splash].forEach(motesQ);
      if ((next -= dt) < 0) { erupt(8 + (Math.random() * 10 | 0)); next = lr(5, 10); }
      bombs.userData.tick(dt, 12);
      flare = Math.max(0, flare - dt * .6);
      crater.material.opacity = .6 + Math.sin(t * 1.7) * .08 + flare * .3; crater.scale.set(40 + flare * 14, 16 + flare * 6, 1);
      lavaGlow.color.setScalar(.9 + .1 * Math.sin(t * 1.3) + flare * .1);
      fires.forEach(f => f.userData.tick(t));
      lights[0].intensity = 7 + Math.sin(t * 2.1) * .8 + Math.sin(t * 7.3) * .3; lights[1].intensity = 9 + Math.sin(t * 3.1) * 1.2;
      foot.material.opacity = .7 + Math.sin(t * 4) * .1;
    },
  };
};

// ---- the castle: you up on its lookout at the end of the afternoon, the keep and its towers before you with their flags out
LOBBY_MAKE.castle = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0x5a6a4a], [-.02, 0xf0c48a], [0, 0xffc684], [.025, 0xffd09a], [.07, 0xf8dcb0], [.15, 0xa8cbee], [.4, 0x6a9fe0], [1, 0x3a6ac6]]));
  const fog = new THREE.Fog(0xffc684, 50, 320);
  const GY = -14; // the ground in the castle and round it
  const stone = pxTex(32, 32, c => { // bricks 8 by 4, every other row shifted, each its own shade, moss in a few joints
    const tone = [...Array(32)].map(() => (Math.random() - .5) * 26), warm = [...Array(32)].map(() => Math.random() < .18);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const row = y >> 2, sx = (x + (row & 1) * 4) % 32, b = row * 4 + (sx >> 3), joint = y % 4 === 3 || sx % 8 === 7;
      dot(c, joint ? rgb([100, 96, 92], (Math.random() - .5) * 10) : rgb(warm[b] ? [166, 150, 128] : [152, 148, 142], tone[b] + (Math.random() - .5) * 10), x, y);
    }
    for (let i = 0; i < 9; i++) dot(c, rgb([84, 116, 62], (Math.random() - .5) * 18), Math.random() * 31 | 0, (Math.random() * 8 | 0) * 4 + 3, 1 + (Math.random() * 2 | 0), 1);
  });
  const floor = ringsTex(96, (r, a) => { // the lookout's floor: a star of red and gold in a gold ring, flagstones round it
    if (r > 45) return [118, 114, 108];
    const q = Math.cos(4 * a), tip = 4 + 10.5 * Math.abs(q) ** 2.5;
    if (r < 3) return [222, 176, 76];
    if (r < 15) return r < tip - 1 ? (q > 0 ? [178, 40, 38] : [222, 176, 76]) : r < tip ? [96, 66, 40] : [60, 62, 78];
    if (r < 16.5) return [222, 176, 76];
    const [k, off] = r < 32 ? [10, .5] : [14, .25], u = (a / (Math.PI * 2 / k) + off) % 1 + 1, d = u % 1, near = Math.min(d, 1 - d) * Math.PI * 2 / k * r;
    if (near < .6 || Math.abs(r - 32) < .6) return [112, 108, 102];
    const v = (((Math.floor(u + 9) * 7 + (r < 32 ? 3 : 5) * 11) % 9) - 4) * 4; return [168 + v, 164 + v, 156 + v];
  });
  const slate = pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) dot(c, rgb(y % 4 === 3 || (x + (y >> 2) * 5) % 8 === 0 ? [36, 52, 92] : [58, 84, 140], (Math.random() - .5) * 14), x, y); });
  const redRoof = pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) dot(c, rgb(y % 4 === 3 || (x + (y >> 2) * 5) % 8 === 0 ? [110, 36, 30] : [168, 58, 44], (Math.random() - .5) * 14), x, y); });
  const stoneM = pxMat(stone), floorM = pxMat(floor), slateM = pxMat(slate), redM = pxMat(redRoof), ST = { tw: 32 };
  const walls = [], roofs = [[], []];
  // the lookout you stand on: its wall dropping away below, a band round its top, merlons round its back
  add(pxBoxes(pxRing(44, 0, GY, -.875), stoneM, ST));
  add(pxBoxes(pxRing(48, 0, -.875, .5), [stoneM, floorM], { end: 'y', ew: 96, tw: 32 }));
  walls.push(...pxRing(48, 43, .5, .8125));
  const cope = pxRing(49, 42, .8125, .9375).map(b => ({ ...b, c: 0xd8d0c4 }));
  for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; walls.push({ x: Math.cos(a) * 2.9, y: -1.1, z: Math.sin(a) * 2.9, w: .375, h: .5, d: .375, r: -a, o: 'c' }); } // corbels
  for (let k = 0; k < 7; k++) { const a = -Math.PI * (.08 + k * .14); walls.push({ x: Math.cos(a) * 2.84, y: 1.25, z: Math.sin(a) * 2.84, w: .4375, h: .625, d: .75, r: -a, o: 'c' }); cope.push({ x: Math.cos(a) * 2.84, y: 1.59375, z: Math.sin(a) * 2.84, w: .5625, h: .0625, d: .875, r: -a, o: 'c', c: 0xd8d0c4 }); }
  // round towers: wall, band, merlons all round, a pointed roof
  const tower = (x, z, R, top, roofH, red) => {
    walls.push(...lAt(pxRing(R, 0, GY, top - .75), x, 0, z), ...lAt(pxRing(R + 3, 0, top - .75, top), x, 0, z));
    const n = Math.round(R / 3.2); for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; walls.push({ x: x + Math.cos(a) * (R + 1) / TX, y: top + .375, z: z + Math.sin(a) * (R + 1) / TX, w: .375, h: .75, d: .625, r: -a, o: 'c' }); }
    const L = Math.round(roofH * 4); for (let k = 0; k < L; k++) roofs[red ? 1 : 0].push(...lAt(pxRing(Math.max(1, Math.round((R - 2) * (1 - k / L))), 0, top + k * .25, top + (k + 1) * .25), x, 0, z));
    const at = Math.atan2(8 - z, -x); // toward the lookout
    for (const [da, y, on] of [[-.45, top - 3.2, 1], [.4, top - 3.6, 0], [0, top - 7.5, 0], [-.2, top - 11, 1], [.55, top - 9.5, 0]]) {
      const a = at + da, rr = R / TX + .02; (on && Math.random() < .7 ? lit : face).push({ x: x + Math.cos(a) * rr, y, z: z + Math.sin(a) * rr, w: .0625, h: on ? 1.125 : 1, d: on ? .5 : .25, r: -a, o: 'c', c: 0x1e1c22 });
    }
    return [x, top + roofH, z];
  };
  // square turrets with a pyramid roof
  const turret = (x, z, s, y0, y1, roofH) => {
    walls.push({ x, y: (y0 + y1) / 2, z, w: s, h: y1 - y0, d: s });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) walls.push({ x: x + dx * (s / 2 - .1875), y: y1 + .3125, z: z + dz * (s / 2 - .1875), w: .375, h: .625, d: .375 });
    const L = Math.round(roofH * 4); for (let k = 0; k < L; k++) { const w = Math.max(.125, even((s + .25) * (1 - k / L))); roofs[0].push({ x, y: y1 + .625 + k * .25 + .125, z, w, h: .25, d: w }); }
    return [x, y1 + .625 + roofH, z];
  };
  const face = [], lit = [];
  const tops = [tower(-19.5, -13, 48, -1.5, 5, true), tower(17.5, -21, 52, -.5, 5.5, true), tower(-20, -44, 44, -2.5, 4.5, false), tower(20, -46, 44, -2.5, 4.5, false)];
  // the keep: tall and square, a crown of merlons, turrets at its corners, a great door, its windows lit
  const K = [-2.5, -36], KW = 18, KD = 12, KT = 1;
  walls.push({ x: K[0], y: (GY + KT) / 2, z: K[1], w: KW, h: KT - GY, d: KD });
  for (let i = 0; i < 11; i++) for (const z of [K[1] + KD / 2 - .25, K[1] - KD / 2 + .25]) walls.push({ x: K[0] - KW / 2 + 1.6 + i * 1.48, y: KT + .375, z, w: .625, h: .75, d: .5 });
  for (const [dx, dz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) tops.push(turret(K[0] + dx * (KW / 2 - 1.25), K[1] + dz * (KD / 2 - 1.25), 3, KT, KT + 3.5, 3.5));
  // curtain walls between them, merlons along the top
  const wall = (x0, z0, x1, z1, top) => {
    const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(z1 - z0, x1 - x0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    walls.push({ x: mx, y: (GY + top) / 2, z: mz, w: L, h: top - GY, d: 2.5, r: -a, o: 'c' });
    for (let s = 1; s < L - .8; s += 1.5) for (const side of [-1, 1]) walls.push({ x: x0 + Math.cos(a) * s - Math.sin(a) * side * 1.06, y: top + .375, z: z0 + Math.sin(a) * s + Math.cos(a) * side * 1.06, w: .75, h: .75, d: .375, r: -a, o: 'c' });
  };
  wall(-2.2, -1.6, -17, -11.5, -4); wall(2.2, -1.8, 14.8, -18.8, -4); wall(-19.5, -16, -20, -41, -5); wall(17.5, -24, 20, -43, -5); wall(-17.5, -45, -11.5, -42, -5); wall(17.5, -46, 6.5, -42, -5);
  add(pxBoxes(walls, stoneM, ST)); add(pxBoxes(cope, stoneM, ST)); add(pxBoxes(roofs[0], slateM)); add(pxBoxes(roofs[1], redM));
  // the keep's face: door, windows (some lit)
  const kf = K[1] + KD / 2 + .03;
  face.push({ x: K[0], y: GY + 2.25, z: kf, w: 4, h: 4.5, d: .125, c: 0x5a3a22 }, { x: K[0], y: GY + 4.75, z: kf, w: 3, h: .5, d: .125, c: 0x5a3a22 }, { x: K[0], y: GY + 5.125, z: kf, w: 2, h: .25, d: .125, c: 0x5a3a22 });
  for (let i = -1; i <= 1; i += 2) face.push({ x: K[0] + i * .9, y: GY + 2.25, z: kf + .05, w: .125, h: 4.5, d: .125, c: 0x2a2420 });
  for (const y of [GY + 9, GY + 12.5]) for (let i = 0; i < 5; i++) {
    const x = K[0] - 6.4 + i * 3.2; if (Math.abs(x - K[0]) < 1 && y < GY + 10) continue;
    (Math.random() < .45 ? lit : face).push({ x, y, z: kf, w: .75, h: 1.375, d: .125, c: 0x1e1c22 }, { x, y: y + .75, z: kf, w: .375, h: .125, d: .125, c: 0x1e1c22 });
  }
  for (const y of [GY + 7.4, GY + 10.9]) face.push({ x: K[0], y, z: kf + .03, w: KW + .125, h: .25, d: .125, c: 0xbcb4a6 });
  face.push(...lMove(pxPic([
    ' gggggggggggg ', 'gRRRRRRBBBBBBg', 'gRRRRRRBBBBBBg', 'gRRYRRRBBBYBBg', 'gRYYYRRBBYYYBg', 'gRRYRRRBBBYBBg', 'gRRRRRRBBBBBBg', 'gBBBBBBRRRRRRg',
    'gBBBYBBRRRYRRg', 'gBBYYYBRRYYYRg', 'gBBBYBBRRRYRRg', ' gBBBBBRRRRRg ', '  gBBBBRRRRg  ', '   gBBBRRRg   ', '    gBBRRg    ', '     gggg     '],
    { g: 0xd8a83a, R: 0xb02a26, B: 0x2a4a9a, Y: 0xf0d070 }, .0625).map(b => ({ ...b, x: b.x * 2, y: b.y * 2, w: b.w * 2, h: b.h * 2 })), K[0], GY + 6.3, kf + .05));
  const IVY = [0x3e7a2e, 0x4a8a34, 0x5a9a3e, 0x2e6a26, 0x6aa848];
  const ivyAt = new Set(); // its leaves on a grid, so none overlap
  for (let v = 0; v < 7; v++) { let x = K[0] - KW / 2 + .4 + lr(0, 2.6), y = GY; const top = GY + lr(4, 10.5); while (y < top) { for (let k = 0; k < 3; k++) { const i = Math.floor((x + lr(-.35, .35)) * 4), j = Math.floor((y + lr(-.15, .15)) * 4); if (ivyAt.has(i + ',' + j)) continue; ivyAt.add(i + ',' + j); face.push({ x: (i + .5) / 4, y: (j + .5) / 4, z: kf + .04, w: .25, h: .25, d: .0625, c: lPick(IVY) }); } y += .25; x += lr(-.12, .12); } }
  // banners down the keep, flags on every roof
  const crest = (bg, fg) => (c, w, h) => {
    fillN(c, w, h, bg, 12); c.fillStyle = rgb(fg); c.fillRect(1, 0, 1, h); c.fillRect(w - 2, 0, 1, h);
    const cx = w >> 1, cy = Math.round(h * .3); for (const [dx, dy] of [[0, -3], [-3, -2], [3, -2], [-3, -1], [-2, -1], [0, -1], [2, -1], [3, -1], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-3, 1], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1]]) dot(c, rgb(fg), cx + dx, cy + dy);
    for (let x = 0; x < w; x++) if ((x & 1) === 0) dot(c, rgb(bg, -40), x, h - 1);
  };
  const banner = (c, w, h) => { // a crown on red, gold down its sides, cut in a swallowtail
    fillN(c, w, h, [176, 34, 38], 12); c.fillStyle = rgb([255, 206, 74]); c.fillRect(1, 0, 1, h); c.fillRect(w - 2, 0, 1, h); c.fillRect(0, 2, w, 1);
    const cx = w >> 1, cy = 16;
    for (const [dx, dy] of [[-4, -3], [0, -4], [4, -3], [-4, -2], [-1, -2], [0, -2], [1, -2], [4, -2], [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1]]) dot(c, rgb([255, 206, 74]), cx + dx, cy + dy);
    for (let x = -4; x <= 4; x++) for (const y of [0, 1]) dot(c, rgb(y ? [214, 160, 50] : [255, 206, 74]), cx + x, cy + y);
    for (const dx of [-2, 0, 2]) dot(c, rgb([96, 170, 255]), cx + dx, cy);
    for (let y = h - 12; y < h; y++) { const k = y - (h - 12); for (let x = 0; x < w; x++) if (Math.abs(x - cx + .5) < k * .9) c.clearRect(x, y, 1, 1); }
  };
  for (const x of [K[0] - 4.8, K[0] + 4.8]) {
    const b = add(lobCloth(1.5, 5, c => banner(c, 24, 80), true, .025)); b.position.set(x, KT - .375, kf + .07);
    face.push({ x, y: KT - .3125, z: kf + .1, w: 1.75, h: .125, d: .125, c: 0xd8a83a }, { x: x - .9375, y: KT - .3125, z: kf + .1, w: .125, h: .25, d: .1875, c: 0xf0d070 }, { x: x + .9375, y: KT - .3125, z: kf + .1, w: .125, h: .25, d: .1875, c: 0xf0d070 });
  }
  const poles = [];
  tops.forEach(([x, y, z], i) => { poles.push({ x, y: y + .9, z, w: .125, h: 1.8, d: .125, c: 0x3a3030 }); const f = add(lobCloth(1.25, .75, c => crest(i % 2 ? [40, 70, 160] : [176, 34, 38], [255, 206, 74])(c, 20, 12), false, .09)); f.position.set(x + .06, y + 1.4, z); });
  add(pxBoxes(poles, solidM())); add(pxBoxes(face, solidM())); add(pxBoxes(lit.map(b => ({ ...b, c: 0xffc860 })), glowM()));
  // the yard below: cobbles, a well, carts, stalls, hay; grass and woods outside, hills, mountains far off
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(40, 34), lam({ map: tex(c => { fillN(c, 16, 16, [128, 120, 108], 18); for (let i = 0; i < 14; i++) dot(c, rgb([96, 90, 82]), Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); }, 40, 34) }));
  yard.rotation.x = -Math.PI / 2; yard.position.set(0, GY + .01, -26); add(yard);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), lam({ map: tex(c => { fillN(c, 16, 16, [104, 156, 64], 26); for (let i = 0; i < 10; i++) dot(c, 'rgba(40,80,20,.4)', Math.random() * 16 | 0, Math.random() * 16 | 0, 1, 2); }, 480, 480) }));
  field.rotation.x = -Math.PI / 2; field.position.y = GY; add(field);
  const props = [];
  props.push(...lAt(pxRing(12, 8, 0, .875), -8, GY, -24).map(b => ({ ...b, c: 0x9a948c })), { x: -8.6, y: GY + 1.6, z: -24, w: .125, h: 1.5, d: .125, c: 0x5a3a22 }, { x: -7.4, y: GY + 1.6, z: -24, w: .125, h: 1.5, d: .125, c: 0x5a3a22 }, { x: -8, y: GY + 2.4, z: -24, w: 1.75, h: .25, d: 1.25, c: 0x8a3a2a });
  for (const [x, z, r] of [[6, -24, .3], [-11.5, -31, -.2]]) props.push({ x, y: GY + .75, z, w: 2.5, h: .25, d: 1.375, r, c: 0x8a5a32 }, { x, y: GY + 1.25, z, w: 2.25, h: .75, d: 1.125, r, c: 0xd8b85a }, ...[-1, 1].map(s => ({ x: x + s * .7, y: GY + .375, z: z + .75, w: .75, h: .75, d: .125, r, c: 0x4a3020 })));
  for (const [x, z, c] of [[3, -29, 0xd84a3a], [-6, -30, 0x3a7ad8]]) { props.push({ x, y: GY + 1, z, w: 2.5, h: .125, d: 1.5, c: 0x8a5a32 }, { x, y: GY + 2.1, z, w: 2.75, h: .125, d: 1.75, c }, { x, y: GY + 2.25, z, w: 1.5, h: .125, d: 1.75, c: 0xf0e8d8 }); for (const s of [-1, 1]) props.push({ x: x + s * 1.2, y: GY + 1.05, z: z + .7, w: .125, h: 2.1, d: .125, c: 0x6a4428 }); }
  for (let i = 0; i < 9; i++) props.push({ x: lr(-14, 13), y: GY + .375, z: lr(-30, -18), w: .75, h: .75, d: .75, r: lr(0, 1.5), c: lPick([0x9a6a3a, 0x8a5a32, 0xd8b85a]) });
  for (const [x, z] of [[9.5, -26], [10.4, -26.3], [9.9, -25.2], [-13, -22], [-12.1, -21.6]]) props.push({ x, y: GY + .4375, z, w: 1, h: .875, d: .75, r: .2, c: 0xd8b85a }, { x, y: GY + .4375, z, w: 1.0625, h: .125, d: .8125, r: .2, c: 0xa8883a });
  for (const [x, z] of [[4.2, -21], [4.9, -21.4], [-4.5, -20.5]]) props.push({ x, y: GY + .5, z, w: .625, h: 1, d: .625, c: 0x7a5232 }, { x, y: GY + .25, z, w: .6875, h: .0625, d: .6875, c: 0x3a3030 }, { x, y: GY + .75, z, w: .6875, h: .0625, d: .6875, c: 0x3a3030 });
  for (let i = 0; i < 60; i++) { const a = lr(0, 6.3), d = lr(34, 120), x = Math.cos(a) * d, z = Math.sin(a) * d - 26; if (z > -4 && Math.abs(x) < 30) continue; const h = lr(3, 6), s = even(lr(2.5, 4.5)), cc = lPick([0x4a8a3a, 0x3e7a34, 0x5a9a44]); props.push({ x, y: GY + h / 2, z, w: .75, h, d: .75, c: 0x5a3a22 }, { x, y: GY + h + .6, z, w: s, h: 2, d: s, c: cc }, { x, y: GY + h + 2, z, w: even(s * .6), h: 1, d: even(s * .6), c: cc }); }
  add(pxBoxes(props, solidM()));
  const hills = [], peaks = [];
  for (const [x, z, R, h] of [[-90, -110, 50, 9], [-20, -150, 70, 11], [70, -120, 55, 8], [120, -60, 50, 10], [-130, -40, 48, 9], [40, -190, 60, 12]])
    for (let k = 0; k < 4; k++) hills.push(...lAt(cellBlob(lumpy(R * (1 - k / 4.5), .18, [x * .1, z * .1, k]), GY + k * h / 4, GY + (k + 1) * h / 4, 2), x, 0, z).map(b => ({ ...b, c: [0x6aa04a, 0x64984a, 0x5e9044, 0x68a04c][k] })));
  peaks.push(...lobRange(-236, 9, [28, 44], { y0: GY, snow: 33, rock: 0xb4a6c6, cap: 0xf6ecef, cell: 2, jit: .8 }), ...lobRange(-205, 10, [18, 32], { y0: GY, snow: 27, rock: 0x8a7fa8, cap: 0xeadde6, cell: 2, jit: .8 }));
  add(pxBoxes(hills, solidM())); add(pxBoxes(peaks, glowM(false)));
  // the sun low on the left, clouds going by, birds round the keep
  const sunD = new THREE.Vector3(-.341, .061, -.938);
  const sun = add(skyCube(sunFaces([255, 186, 70], [255, 208, 110], [255, 228, 156]), sunD.clone().negate().add(new THREE.Vector3(-.4, .5, 0)), { amb: .6 })); sun.scale.setScalar(8.5); sun.position.copy(sunD).multiplyScalar(220); // a block
  const glow = add(skyBack(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunGlowTex, color: 0xffb060, fog: false, opacity: .8, blending: THREE.AdditiveBlending })))); glow.scale.setScalar(70); glow.position.copy(sunD).multiplyScalar(218);
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const parts = [], w = lr(14, 26); for (let k = 0; k < 4; k++) parts.push({ x: lr(-w / 3, w / 3), y: lr(0, 2.5), z: lr(-2, 2), w: lr(w * .35, w * .6), h: lr(2.5, 4), d: lr(5, 9), c: 0xffffff });
    const m = add(pxBoxes(parts, lam({ vertexColors: true, emissive: 0x9a7a5a, fog: false }))); m.position.set(lr(-180, 180), lr(9, 18), lr(-200, -150)); clouds.push(m);
  }
  const birds = [0, 1, 2, 3].map(i => {
    const b = new THREE.Group(), wings = [-1, 1].map(s => { const w = box(.5, .05, .22, lam({ color: 0x2a2a30 })); w.position.x = s * .27; b.add(w); return w; });
    b.add(box(.18, .14, .5, lam({ color: 0x2a2a30 }))); add(b); return { b, wings, r: lr(9, 16), y: lr(4, 8), a: i * 1.6, v: lr(.25, .4) * (i % 2 ? 1 : -1), cx: K[0] + lr(-4, 4), cz: K[1] + lr(4, 10) };
  });
  const SH = [['oooooooooooooooo', 'oRRRRRRRGGGGGGGo', 'oRRRRRRRGGGGGGGo', 'oRRRRRRRGGGGGGGo', 'oRRRRRRRGGGGGGGo', 'oRRRRRRRGGGGGGGo', 'oRRRRRRRGGGGGGGo', 'oRRRRRRRGGGGGGGo', 'oGGGGGGGRRRRRRRo', 'oGGGGGGGRRRRRRRo', 'oGGGGGGGRRRRRRRo', ' oGGGGGGRRRRRRo ', ' oGGGGGGRRRRRRo ', '  oGGGGGRRRRRo  ', '  oGGGGGRRRRRo  ', '   oGGGGRRRRo   ', '    oGGGRRRo    ', '     oooooo     '],
    ['oooooooooooooooo', 'oBBBBBBWWBBBBBBo', 'oBBBBBBWWBBBBBBo', 'oBBBBBBWWBBBBBBo', 'oWWWWWWWWWWWWWWo', 'oWWWWWWWWWWWWWWo', 'oBBBBBBWWBBBBBBo', 'oBBBBBBWWBBBBBBo', 'oBBBBBBWWBBBBBBo', 'oBBBBBBWWBBBBBBo', 'oBBBBBBWWBBBBBBo', ' oBBBBBWWBBBBBo ', ' oBBBBBWWBBBBBo ', '  oBBBBWWBBBBo  ', '  oBBBBWWBBBBo  ', '   oBBBWWBBBo   ', '    oBBWWBBo    ', '     oooooo     ']]; // shields hung on two merlons, drawn at 16 to the metre
  for (const [k, i] of [[2, 0], [4, 1]]) { const a = -Math.PI * (.08 + k * .14), m = add(pxBoxes(pxPic(SH[i], { o: 0x5a5250, R: 0xb02a26, G: 0xe0b040, B: 0x2a4a9a, W: 0xeeeae0 }), solidM())); m.position.set(Math.cos(a) * 2.6, 1, Math.sin(a) * 2.6); m.rotation.y = -a - Math.PI / 2; }
  // two braziers on the lookout: iron bowls on a stem, coals and a fire in each
  const iron = [], coals = [];
  const fires = [[-1.95, -1.05], [1.95, -1.05]].map(([x, z]) => {
    iron.push({ x, y: .53125, z, w: .5, h: .0625, d: .5, c: 0x2a2626 }, { x, y: .875, z, w: .125, h: .625, d: .125, c: 0x2a2626 }, { x, y: 1.25, z, w: .375, h: .125, d: .375, c: 0x2a2626 },
      { x, y: 1.375, z, w: .625, h: .125, d: .625, c: 0x363030 }, { x, y: 1.5, z, w: .75, h: .125, d: .75, c: 0x2a2626 });
    coals.push({ x, y: 1.59375, z, w: .5, h: .0625, d: .5, c: 0xff6a1a });
    const f = add(lobFlame(1)); f.position.set(x, 1.5625, z); return f;
  });
  add(pxBoxes(iron, solidM())); add(pxBoxes(coals, glowM()));
  const lamps = fires.map(f => { const l = add(new THREE.PointLight(0xffa040, 3.5, 6)); l.position.set(f.position.x, 2.1, f.position.z + .3); return l; });
  const booms = add(lobbyBits(240, .22, false));
  const firework = () => { // beside the keep, where there's sky to see them in
    const x = K[0] + (Math.random() < .5 ? -1 : 1) * lr(9, 16), y = lr(4, 7.5), z = K[1] + lr(-4, 4), c = lPick([0xe8203a, 0xffc012, 0x1a8aff, 0x9a3aff, 0x18c850]);
    for (let i = 0; i < 56; i++) { const u = lr(-1, 1), a = lr(0, 6.3), s = lr(4, 6), q = Math.sqrt(1 - u * u); booms.userData.throw(x, y, z, Math.cos(a) * q * s, u * s + 1.5, Math.sin(a) * q * s, lr(1.4, 2), c, 1.4); }
  };
  let shows = 0, showT = 0;
  return {
    g, sky: null, fog,
    lit: litOf([0xcfe0ff, 0x8a8060, 0xffe2b8, 0xffc890, 0xd8c8a8], [1, 1.7, 1.2, .8], [-7, 5, 4]),
    hey() { shows = 5; showT = 0; },
    tick(dt, t) {
      lobbyClock(t);
      fires.forEach(f => f.userData.tick(t)); lamps.forEach((l, i) => l.intensity = 3.5 + Math.sin(t * 9 + i * 2) * .35 + Math.sin(t * 21 + i) * .15);
      clouds.forEach((c, i) => { c.position.x += dt * (.6 + i * .08); if (c.position.x > 200) c.position.x = -200; });
      for (const B of birds) { B.a += dt * B.v; B.b.position.set(B.cx + Math.cos(B.a) * B.r, B.y + Math.sin(t * .7 + B.r) * .6, B.cz + Math.sin(B.a) * B.r); B.b.rotation.y = -B.a + (B.v > 0 ? 0 : Math.PI); B.wings.forEach((w, s) => w.rotation.z = (s ? 1 : -1) * Math.sin(t * 9 + B.r) * .5); }
      if (shows > 0 && (showT -= dt) < 0) { firework(); shows--; showT = lr(.35, .7); }
      booms.userData.tick(dt, 3);
    },
  };
};

// ---- the aurora: a snowy night on a boulder by a frozen lake, the northern lights over the far shore, a cabin with its lights on
const AUR_N = `uniform float t, a, seed; uniform vec3 c1, c2;
float h1(float x) { return fract(sin(x * 127.1 + seed) * 43758.5453); }
float n1(float x) { float i = floor(x), f = fract(x); f *= f * (3. - 2. * f); return mix(h1(i), h1(i + 1.), f); }
vec3 aur(float x, float v, float fold) { // x along the curtain in metres, v up it (0 to 1)
  float u = floor(x / 1.25) * 1.25; v = floor(v * 28.) / 28.; // in pixels a ray wide
  float top = .22 + .78 * n1(u * .09 + t * .11 + 4.) * (.55 + .45 * n1(u * .41 - t * .37)); // how high each ray reaches
  float ray = .2 + .8 * smoothstep(.2, .85, n1(u * .33 + t * .42)) * (.5 + .5 * n1(u * 1.17 - t * 1.6));
  float pat = smoothstep(.18, .72, .6 * n1(u * .02 - t * .05 + 1.) + .4 * n1(u * .061 + t * .09 + 9.)); // bright stretches and gaps between
  float body = smoothstep(0., .05, v) * pow(clamp(1. - v / top, 0., 1.), 1.4), foot = smoothstep(0., .03, v) * exp(-v * 16.);
  vec3 c = mix(c1, c2, smoothstep(.2, .85, v * 1.5 + .25 * n1(u * .1 + 2.)));
  return c * (ray * body + foot * (.5 + .5 * ray)) * pat * (1. + 1.6 * fold) * a;
}`;
const AUR_VS = `uniform float t, seed; varying vec2 vU; varying float vX, vF;
void main() {
  vec3 p = position; float w1 = p.x * .021 + t * .13 + seed, w2 = p.x * .057 - t * .09;
  p.z += sin(w1) * 18. + sin(w2) * 6.; vF = clamp(abs(cos(w1) * .38 + cos(w2) * .34) - .2, 0., 1.); // where it folds you look along it: brighter
  p.y += sin(p.x * .016 - t * .06 + seed * 2.) * 4. + sin(p.x * .043 + t * .1) * 1.5 + sin(p.x * .03 + t * .2) * 3. * uv.y;
  vU = uv; vX = position.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`;
const AUR_FS = AUR_N + `
uniform float L; varying vec2 vU; varying float vX, vF;
void main() { gl_FragColor = vec4(aur(vX, vU.y, vF) * smoothstep(L * .5, L * .28, abs(vX)), 1.);
#include <colorspace_fragment>
}`;
// the first curtain again in the ice, where it would be seen in it, broken up by the ice
const SHEEN_VS = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SHEEN_FS = AUR_N + `
uniform vec3 at; uniform float H; varying vec3 vW;
void main() {
  vec3 d = vW - cameraPosition; float D = cameraPosition.z - at.z;
  float e = atan(-d.y, length(d.xz)), e0 = atan(at.y - cameraPosition.y, D), e1 = atan(at.y + H - cameraPosition.y, D);
  float rip = .55 + .45 * n1(floor(vW.z * 3.) * 1.7 + floor(vW.x * .4) * .3);
  gl_FragColor = vec4(aur(at.x + d.x / max(.5, -d.z) * D, (e - e0) / (e1 - e0), 0.) * rip, 1.);
#include <colorspace_fragment>
}`;
LOBBY_MAKE.aurora = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  const lo = new THREE.Group(), put = o => (lo.add(o), o), GY = -1.25; lo.position.y = GY; g.add(lo); // the snow round your boulder, and all on it
  add(lobbyDome([[-1, 0x0a1426], [-.02, 0x1a3450], [0, 0x203f60], [.03, 0x18344e], [.1, 0x0e1c38], [.3, 0x070e22], [1, 0x03050e]]));
  const fog = new THREE.Fog(0x203f60, 60, 380);
  const snowDraw = c => { fillN(c, 16, 16, [214, 226, 246], 10); for (let i = 0; i < 9; i++) dot(c, rgb([184, 200, 228]), Math.random() * 16 | 0, Math.random() * 16 | 0, 2, 1); for (let i = 0; i < 3; i++) dot(c, '#f4f8ff', Math.random() * 16 | 0, Math.random() * 16 | 0); };
  const snowM = pxMat(pxTex(16, 16, snowDraw)), rockM = pxMat(pxTex(16, 16, c => { fillN(c, 16, 16, [92, 100, 116], 22); for (let i = 0; i < 8; i++) dot(c, rgb([64, 70, 84]), Math.random() * 15 | 0, Math.random() * 16 | 0, 2, 1); }));
  const logsM = pxMat(pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) dot(c, rgb(y % 4 === 0 ? [58, 36, 22] : y % 4 === 3 ? [86, 56, 34] : [118, 78, 46], (Math.random() - .5) * 14), x, y); }));
  const needleM = pxMat(pxTex(32, 32, c => { fillN(c, 32, 32, [34, 82, 64], 22); for (let i = 0; i < 50; i++) dot(c, 'rgba(6,30,24,.5)', Math.random() * 31 | 0, Math.random() * 32 | 0, 2, 1); }));
  const ground = put(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lam({ map: tex(snowDraw, 600, 600) }))); ground.rotation.x = -Math.PI / 2;
  // your boulder, snow on its top
  const rockR = lumpy(23, .12, [.4, 1.1, 2.6]), midR = lumpy(25.5, .14, [1.3, .2, 2]), footR = lumpy(28, .16, [2.2, 1.6, .9]);
  add(pxBoxes([...pxBlob(footR, GY - .25, -.6875), ...pxBlob(midR, -.6875, -.125), ...pxBlob(rockR, -.125, .3125)], rockM));
  add(pxBoxes(pxBlob(rockR, .3125, .5), snowM));
  for (const [x, z, r, h] of [[-2.05, .7, 8, .375], [1.85, 1.05, 7, .3125], [-.55, 2.1, 6, .25], [2.3, -1.9, 9, .5]]) { put(pxBoxes(lAt(pxBlob(lumpy(r, .15, [x, z, r]), -.25, h), x, 0, z), rockM)); put(pxBoxes(lAt(pxBlob(lumpy(r - 1, .15, [x, z, r]), h, h + .125), x, 0, z), snowM)); }
  // the lake: dark ice, the lights in it
  const shore = lumpy(46, .1, [.3, 1.9, 2.2]), LZ = -62, near = x => -22 + x * x * .012; // the near shore keeps back behind the cabin, the fire and the snowman
  const lakeIn = (x, z, m = 0) => Math.hypot(x / 1.5, z - LZ) < shore(Math.atan2(z - LZ, x / 1.5)) + m && z < near(x) + m;
  const lakeS = new THREE.Shape();
  for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 2, r = shore(a), x = 1.5 * r * Math.cos(a), y = -Math.min(LZ + r * Math.sin(a), near(x)); i ? lakeS.lineTo(x, y) : lakeS.moveTo(x, y); }
  const lakeG = new THREE.ShapeGeometry(lakeS, 1);
  const iceT = pxTex(16, 16, c => { fillN(c, 16, 16, [52, 84, 112], 8); for (let i = 0; i < 2; i++) { let x = Math.random() * 16 | 0, y = Math.random() * 16 | 0; for (let k = 0; k < 7; k++) { dot(c, rgb([120, 156, 184]), x, y); x = (x + (Math.random() < .5 ? 1 : 15)) % 16; y = (y + 1) % 16; } } for (let i = 0; i < 4; i++) dot(c, rgb([150, 176, 204]), Math.random() * 16 | 0, Math.random() * 16 | 0); });
  const ice = put(new THREE.Mesh(lakeG, lam({ map: iceT }))); ice.rotation.x = -Math.PI / 2; ice.position.y = .06;
  // the northern lights: curtains far beyond the lake, green at their feet and violet higher up
  const AH = 34, curt = [[0x30ffa0, 0x8a4aff, 1, -238, 13, 0, .06, 230], [0x40ffd0, 0x40a0ff, .7, -250, 17, -95, -.12, 150], [0xa0ff60, 0xff4ab0, .55, -226, 19, 80, .16, 160], [0x50ffc0, 0xc060ff, .4, -262, 24, -10, .03, 120]];
  const aur = curt.map(([c1, c2, a, z, y, x, r, L], i) => {
    const m = add(new THREE.Mesh(new THREE.PlaneGeometry(L, AH, Math.round(L / 2), 1), new THREE.ShaderMaterial({ vertexShader: AUR_VS, fragmentShader: AUR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { t: LOB_T, L: { value: L }, a: { value: a }, seed: { value: i * 3.7 + .5 }, c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) } } })));
    m.position.set(x, y + AH / 2, z); m.rotation.y = r; m.frustumCulled = false; return m;
  });
  const sheen = put(new THREE.Mesh(lakeG, new THREE.ShaderMaterial({ vertexShader: SHEEN_VS, fragmentShader: SHEEN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { t: LOB_T, a: { value: .25 }, seed: { value: 0 }, c1: { value: new THREE.Color(curt[0][0]) }, c2: { value: new THREE.Color(curt[0][1]) }, at: { value: new THREE.Vector3(0, curt[0][4], curt[0][3]) }, H: { value: AH } } })));
  sheen.rotation.x = -Math.PI / 2; sheen.position.y = .07;
  // the cabin: log walls, snow on its roof, its windows warm, smoke from the chimney; a fire outside, a snowman by the shore
  const C = [-9.5, -17], F = [-5.8, -10.5], SM = [3.8, -5.6], CD = 3.5;
  put(pxBoxes([{ x: C[0], y: 1.25, z: C[1], w: 4.5, h: 2.5, d: CD }, ...[0, 1, 2, 3].map(k => ({ x: C[0], y: 2.5 + (k + .5) * .375, z: C[1], w: 4.5, h: .375, d: CD - .4 - k * .8 }))], logsM));
  const eaves = [0, 1, 2, 3, 4].map(k => ({ x: C[0], y: 2.5 + k * .375, z: C[1], w: 5.25, d: CD + .75 - k * .8 }));
  put(pxBoxes(eaves.map(b => ({ ...b, y: b.y + .125, h: .25, c: 0x8a6a52 })), logsM)); put(pxBoxes(eaves.map(b => ({ ...b, y: b.y + .34375, h: .1875, w: b.w + .125 })), snowM)); // a pixel over the logs, so no faces meet
  put(pxBoxes([{ x: C[0] + 1.4, y: 3.9, z: C[1] - .6, w: .625, h: 1.6, d: .625 }], rockM));
  const things = [], warm = [], cf = C[1] + CD / 2, p = 1 / TX;
  for (const sx of [-1, 1]) { // the windows: glass in a frame, a cross from side to side through the middle pixel, snow on the sill
    const x = C[0] + sx * 20.5 * p, y = 22.5 * p, F = 0x3a2412;
    warm.push({ x, y, z: cf + p / 2, w: 13 * p, h: 11 * p, d: p, c: 0xffc870 });
    things.push({ x, y: y + 6 * p, z: cf + p, w: 15 * p, h: p, d: 2 * p, c: F }, { x, y: y - 6 * p, z: cf + p, w: 15 * p, h: p, d: 2 * p, c: F }, { x: x - 7 * p, y, z: cf + p, w: p, h: 11 * p, d: 2 * p, c: F }, { x: x + 7 * p, y, z: cf + p, w: p, h: 11 * p, d: 2 * p, c: F },
      { x, y, z: cf + 1.5 * p, w: 13 * p, h: p, d: p, c: F }, { x, y, z: cf + 1.5 * p, w: p, h: 11 * p, d: p, c: F }, { x, y: y - 7 * p, z: cf + 1.5 * p, w: 17 * p, h: p, d: 3 * p, c: 0xe8f0ff });
  }
  things.push({ x: C[0], y: .95, z: cf + .03, w: .875, h: 1.9, d: .0625, c: 0x4a2c18 });
  for (let k = 0; k < 4; k++) { const a = k * 1.57 + .4; things.push({ x: F[0] + Math.cos(a) * .3, y: .125, z: F[1] + Math.sin(a) * .3, w: .875, h: .1875, d: .1875, r: -a, c: 0x4a2c18 }); }
  for (let k = 0; k < 8; k++) { const a = k * .785; things.push({ x: F[0] + Math.cos(a) * .7, y: .1, z: F[1] + Math.sin(a) * .7, w: .25, h: .2, d: .25, r: -a, c: 0x6a7280 }); }
  things.push({ x: SM[0] - .1, y: 2.05, z: SM[1] + .3, w: .0625, h: .0625, d: .0625, c: 0x111111 }, { x: SM[0] + .1, y: 2.05, z: SM[1] + .3, w: .0625, h: .0625, d: .0625, c: 0x111111 }, { x: SM[0], y: 1.97, z: SM[1] + .42, w: .0625, h: .0625, d: .25, c: 0xff8a2a },
    { x: SM[0], y: 1.75, z: SM[1], w: .625, h: .125, d: .625, c: 0xc8303a }, { x: SM[0] - .55, y: 1.35, z: SM[1], w: .6, h: .0625, d: .0625, r: .5, c: 0x4a2c18 }, { x: SM[0] + .55, y: 1.35, z: SM[1], w: .6, h: .0625, d: .0625, r: -.5, c: 0x4a2c18 },
    { x: SM[0], y: 1.45, z: SM[1] + .43, w: .0625, h: .0625, d: .0625, c: 0x111111 }, { x: SM[0], y: 1.2, z: SM[1] + .45, w: .0625, h: .0625, d: .0625, c: 0x111111 });
  for (const [k, rr] of [[7, 7], [8, 7], [9, 7], [10, 6], [11, 5]]) things.push({ x: SM[0] + .125, y: (15.5 + k) / TX, z: snap(SM[1]) + (rr + .5) / TX, w: .125, h: 1 / TX, d: 1 / TX, c: 0xc8303a }); // the scarf's end, down his front
  const LP = [-2.375, -1.25]; // the lantern on its post beside you: glass between four corner posts, plates under and over it, a cap, all square on the post
  things.push({ x: LP[0], y: 1.5, z: LP[1], w: .125, h: 3, d: .125, c: 0x2a2a30 });
  for (const [y, w] of [[3.03125, 6], [3.40625, 6], [3.46875, 4], [3.53125, 2]]) things.push({ x: LP[0], y, z: LP[1], w: w * p, h: p, d: w * p, c: 0x2a2a30 });
  for (const ox of [-2.5, 2.5]) for (const oz of [-2.5, 2.5]) things.push({ x: LP[0] + ox * p, y: 3.21875, z: LP[1] + oz * p, w: p, h: 5 * p, d: p, c: 0x2a2a30 });
  warm.push({ x: LP[0], y: 3.21875, z: LP[1], w: 4 * p, h: 5 * p, d: 4 * p, c: 0xffd27a });
  const man = [];
  for (const [r, y0] of [[9, 0], [7, .95], [5, 1.7]]) for (let k = 0; k < 2 * r; k++) { const yy = y0 + k / TX, z = (k - r + .5) / r, rr = Math.round(r * Math.sqrt(Math.max(0, 1 - z * z))); if (rr > 0) man.push(...lAt(pxRing(rr, 0, yy, yy + 1 / TX), SM[0], 0, SM[1])); }
  for (let k = 0; k < 14; k++) { const z = -18.5 - k * .625, sn = Math.random() < .55; things.push({ x: 6.5, y: .3125, z, w: 1.75, h: .125, d: .5, c: lPick([0x7a5232, 0x6a4628, 0x86603a]) }); if (sn) things.push({ x: 6.5 + lr(-.3, .3), y: .40625, z, w: lr(.6, 1.2), h: .0625, d: .4375, c: 0xe8f0ff }); } // the jetty
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) things.push({ x: 6.5 + s, y: .15, z: -18.8 - k * 2.1, w: .25, h: .7, d: .25, c: 0x4a3020 }); // posts beside the planks
  things.push({ x: 7.25, y: .9375, z: -26.9, w: .125, h: 1.125, d: .125, c: 0x4a3020 }, { x: 5.75, y: .9375, z: -26.9, w: .125, h: 1.125, d: .125, c: 0x4a3020 }, { x: 6.5, y: 1.4, z: -26.9, w: 1.5, h: .125, d: .125, c: 0x5a3a22 });
  for (const s of [-.35, .35]) things.push({ x: -5.6 + s, y: .0625, z: -14.2, w: .0625, h: .125, d: 1.75, c: 0x8a2a2a }); // a sled
  things.push({ x: -5.6, y: .25, z: -14.2, w: .875, h: .125, d: 1.25, c: 0xc84a3a }, { x: -5.6, y: .1875, z: -14.95, w: .875, h: .25, d: .125, c: 0x8a2a2a }, { x: -5.6, y: .34375, z: -14.1, w: .75, h: .0625, d: .875, c: 0xeef4ff });
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6 - (r >> 1); k++) things.push({ x: C[0] + 2.62, y: .1875 + r * .375, z: C[1] + 1.1 - k * .4 - (r & 1) * .2, w: .625, h: .375, d: .375, c: lPick([0x6a4628, 0x7a5232, 0x5a3a22]) }); // firewood
  things.push({ x: C[0] + 2.62, y: 1.59, z: C[1] + .2, w: .75, h: .0625, d: 2.3, c: 0xe8f0ff });
  put(pxBoxes(man, snowM)); put(pxBoxes(things, solidM())); put(pxBoxes(warm, glowM()));
  for (const [x, z, r, h] of [[-13.5, -20.5, 10, .5], [12.5, -19, 8, .375], [3.2, -20.8, 6, .25], [-2.5, -21.6, 7, .3125], [15, -9, 9, .4375]]) { put(pxBoxes(lAt(pxBlob(lumpy(r, .18, [x, z, r]), -.25, h), x, 0, z), rockM)); put(pxBoxes(lAt(pxBlob(lumpy(r - 1.5, .2, [z, x, r]), h, h + .125), x, 0, z), snowM)); }
  const fire = put(lobFlame(.9)); fire.position.set(F[0], .2, F[1]);
  // snowy pines all round the lake, none near you, short ones on the far shore so the lights show over them
  const trunks = [], boughs = [], caps = [], spots = [];
  const pine = (x, z, s) => {
    x = snap(x); z = snap(z); const h = (1.2 + Math.random()) * s, layers = 3 + (Math.random() * 2 | 0);
    trunks.push({ x, y: (h + layers) / 2, z, w: .5, h: h + layers, d: .5 });
    for (let k = 0; k < layers; k++) { const w = even((3.6 - k * (2.8 / layers)) * s), y = h + .5 + k * 1.05 * s; boughs.push({ x, y, z, w, h: 1.125 * s, d: w }); caps.push({ x, y: y + .5625 * s + .09375, z, w: Math.max(.25, w - .25), h: .1875, d: Math.max(.25, w - .25) }); }
    caps.push({ x, y: h + .5 + layers * 1.05 * s, z, w: .5, h: .5, d: .5 });
  };
  for (let tries = 0; spots.length < 170 && tries < 6000; tries++) {
    const x = lr(-90, 90), z = lr(-140, 10), far = z < LZ;
    if (lakeIn(x, z, 2.5) || Math.hypot(x, z) < 8 || (z > -25 && Math.abs(x) < 16) || (Math.abs(x - C[0]) < 4.5 && Math.abs(z - C[1]) < 4) || Math.hypot(x - F[0], z - F[1]) < 2.5 || Math.hypot(x - SM[0], z - SM[1]) < 2) continue;
    if (spots.some(([a, b]) => (a - x) ** 2 + (b - z) ** 2 < (far ? 12 : 6))) continue;
    spots.push([x, z]); pine(x, z, far ? lr(.85, 1.15) : lr(1, 1.4));
  }
  put(pxBoxes(trunks, pxMat(fBark), { th: 32 })); put(pxBoxes(boughs, needleM, { tw: 32 })); put(pxBoxes(caps, snowM));
  // mountains far off, low under the lights, snow on their tops
  put(pxBoxes([...lobRange(-224, 0, [5, 13], { snow: 10, rock: 0x2c3a58, cap: 0x8a9cc0, cell: 2, jit: .2, roll: true }), ...lobRange(-196, 0, [2, 8], { snow: 6.5, rock: 0x22304a, cap: 0x7a8cae, cell: 2, jit: .2, roll: true })], glowM(false)));
  // the moon, the stars, snow falling now and then; smoke from the chimney, sparks from the fire
  const moonD = new THREE.Vector3(.3734, .0837, -.924);
  const moon = add(skyCube(moonFaces([238, 240, 248], [198, 204, 222]), moonD.clone().negate().add(new THREE.Vector3(-.5, .6, 0)), { amb: .3 })); moon.scale.setScalar(6); moon.position.copy(moonD).multiplyScalar(200); // full, a block
  const halo = add(skyBack(glowSpr(0x9ab8ff, .35))); halo.scale.setScalar(34); halo.position.copy(moonD).multiplyScalar(201);
  const stars = add(skyBack(lobbyMotes({ n: 240, place: () => { const e = Math.asin(lr(.03, .85)), az = Math.PI + lr(-1.4, 1.4); return [Math.sin(az) * Math.cos(e) * 245, 2.6 + Math.sin(e) * 245, Math.cos(az) * Math.cos(e) * 245]; },
    rise: [0, 0, 0], sway: 0, size: [.25, .55], speed: [.05, .2], colors: [0xffffff, 0xdfe8ff, 0xfff2d8], fade: 2 })));
  const flakes = add(lobbyMotes({ n: 70, box: [-12, 12, -1, 9, -18, 6], rise: [.6, -10, .3], sway: .5, size: [.03, .05], speed: [.03, .06], colors: [0xffffff, 0xe8f0ff], add: false, a: .85 }));
  const smoke = put(lobbyMotes({ n: 18, box: [C[0] + 1.3, C[0] + 1.5, 4.6, 4.8, C[1] - .7, C[1] - .5], rise: [1.6, 3.5, -.6], sway: .3, size: [.25, .4], speed: [.1, .14], colors: [0x8a94a8, 0x6a7488], add: false, a: .35, grow: 1, fade: 1 }));
  const sparks = put(lobbyMotes({ n: 16, box: [F[0] - .2, F[0] + .2, .4, .6, F[1] - .2, F[1] + .2], rise: [0, 2.2, 0], sway: .2, size: [.05, .08], speed: [.4, .7], colors: [0xffb040, 0xffe08a] }));
  const lights = [[0xffb060, 4, 7, LP[0], 3.2, LP[1] + .3], [0xff9440, 6, 9, F[0], 1, F[1] + .4]].map(([c, i, d, x, y, z]) => { const l = put(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  const shoot = add(box(.25, .25, 12, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  let flare = 0, sh = null;
  return {
    g, sky: null, fog,
    lit: litOf([0x6a88d8, 0xb8cce8, 0xc0d0ff, 0x50ffb0, 0xa8c0f0], [.6, .85, 1.5, .5], [5, 7, 6]),
    hey() { flare = 1; sh = { t: 0, x: -70, y: 40, z: -190 }; },
    tick(dt, t) {
      lobbyClock(t); [stars, flakes, smoke, sparks].forEach(motesQ);
      flare = Math.max(0, flare - dt * .25);
      aur.forEach((m, i) => m.material.uniforms.a.value = curt[i][2] * (.85 + .15 * Math.sin(t * .3 + i * 2) + flare * 1.2));
      sheen.material.uniforms.a.value = .25 * (1 + flare);
      fire.userData.tick(t); lights[0].intensity = 4 + Math.sin(t * 3.7) * .2; lights[1].intensity = 6 + Math.sin(t * 9) * .6 + Math.sin(t * 23) * .3;
      if (sh) { sh.t += dt; const k = sh.t / 1.1; shoot.position.set(sh.x + k * 140, sh.y - k * 24, sh.z); shoot.rotation.set(0, Math.PI / 2, .17); shoot.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * .9; if (k > 1) { sh = null; shoot.material.opacity = 0; } }
    },
  };
};

// water: bands of colour drifting, crests near you, light glinting in a path toward the sun or moon (sun: radians right of ahead); 16 pixels to the metre
const LOB_NOISE = NOISE_GL;
const WATER_VS = `uniform vec2 uvs; varying vec3 vW; varying vec2 vQ;
#include <fog_pars_vertex>
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vQ = uvs.x > 0. ? uv * uvs : w.xz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WATER_FS = `uniform float t, sun, sunW, gli; uniform vec2 flow; uniform vec3 c1, c2, c3, c4; varying vec3 vW; varying vec2 vQ;
#include <fog_pars_fragment>
` + LOB_NOISE + `
void main() {
  vec2 q = (floor(vQ * 16.) + .5) / 16.;
  float far = smoothstep(.05, .3, length(fwidth(vQ)));
  float w = vn(q * vec2(.5, 1.4) + flow * t) * .6 + vn(q * vec2(1.3, 2.9) + flow * t * 1.7 + 4.2) * .4;
  vec3 c = mix(c1, c2, smoothstep(.3, .8, w));
  c = mix(c, c3, smoothstep(.75, .8, w) * (1. - far) * .7);
  vec2 d = vW.xz - cameraPosition.xz; float az = atan(d.x, -d.y), p = exp(-pow((az - sun) / sunW, 2.)) * smoothstep(2., 30., length(d));
  vec2 cell = floor(q * 3.); float tw = step(.92, h2(cell + floor(t * 2.5 + h2(cell + 3.) * 9.)));
  c += c4 * p * (.35 * smoothstep(.45, .85, w) + tw * mix(1., .5, far)) * gli;
  gl_FragColor = vec4(c, 1.);
#include <colorspace_fragment>
#include <fog_fragment>
}`;
const lobWater = ({ c1, c2, c3, c4 = 0xffffff, flow = [.12, .08], sun = 0, sunW = .1, gli = 1, uvs = [0, 0] }) => new THREE.ShaderMaterial({ fog: true, vertexShader: WATER_VS, fragmentShader: WATER_FS,
  uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), t: LOB_T, sun: { value: sun }, sunW: { value: sunW }, gli: { value: gli }, flow: { value: new THREE.Vector2(...flow) }, uvs: { value: new THREE.Vector2(...uvs) },
    c1: { value: new THREE.Color(c1) }, c2: { value: new THREE.Color(c2) }, c3: { value: new THREE.Color(c3) }, c4: { value: new THREE.Color(c4) } } });
// birds, bats or fish going round and round, flapping or wagging: one draw for them all
const FLOCK_VS = `uniform float t, flap; attribute vec4 f; attribute vec3 o, c; attribute float k, pv; varying vec3 vC;
#include <fog_pars_vertex>
void main() {
  float a = f.x + t * f.w, fl = sin(t * flap + f.x * 7.3) * .6, b = fl * k;
  vec3 p = position;
  if (abs(k) == 1.) { p.x -= pv; p.xy = vec2(p.x * cos(b) - p.y * sin(b), p.x * sin(b) + p.y * cos(b)); p.x += pv; } // wings, about their root
  if (k == 2.) { b = fl * .7; p.xz = vec2(p.x * cos(b) + p.z * sin(b), -p.x * sin(b) + p.z * cos(b)); } // a tail, side to side
  float ph = f.w > 0. ? 3.14159 - a : -a, r = f.y * (1. + .12 * sin(t * .37 + f.x * 3.));
  p.xz = vec2(p.x * cos(ph) + p.z * sin(ph), -p.x * sin(ph) + p.z * cos(ph));
  p += o + vec3(cos(a) * r, f.z + sin(t * .9 + f.x * 5.) * .3, sin(a) * r);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mvPosition; vC = c;
#include <fog_vertex>
}`;
const FLOCK_FS = `varying vec3 vC;
#include <fog_pars_fragment>
void main() { gl_FragColor = vec4(vC, 1.);
#include <colorspace_fragment>
#include <fog_fragment>
}`;
// groups: { at: [x, y, z], n, r: radius [lo, hi], h: height [lo, hi], v: radians a second [lo, hi], dir: 1 or -1, size: [lo, hi], parts: [[w, h, d, x, y, z, kind (0 body, ±1 wing, 2 tail), colour, the x a wing turns about]] }
function lobFlock(groups, flap = 9, tU = LOB_T) {
  const pos = [], ix = [], F = [], O = [], K = [], PV = [], Cs = [], C = new THREE.Color();
  for (const G of groups) {
    const dir = G.dir ?? (Math.random() < .5 ? 1 : -1);
    for (let i = 0; i < G.n; i++) {
      const s = lr(...(G.size || [1, 1])), f = [lr(0, 6.3), lr(...G.r), lr(...G.h), lr(...G.v) * dir];
      for (const [w, h, d, x, y, z, k, col, pv = 0] of G.parts) {
        const b = new THREE.BoxGeometry(w * s, h * s, d * s), P = b.attributes.position, v0 = pos.length / 3; C.set(col);
        for (let j = 0; j < P.count; j++) { pos.push(P.getX(j) + x * s, P.getY(j) + y * s, P.getZ(j) + z * s); F.push(...f); O.push(...G.at); K.push(k); PV.push(pv * s); Cs.push(C.r, C.g, C.b); }
        for (const j of b.index.array) ix.push(v0 + j);
        b.dispose();
      }
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('f', new THREE.Float32BufferAttribute(F, 4));
  geo.setAttribute('o', new THREE.Float32BufferAttribute(O, 3)); geo.setAttribute('k', new THREE.Float32BufferAttribute(K, 1)); geo.setAttribute('pv', new THREE.Float32BufferAttribute(PV, 1)); geo.setAttribute('c', new THREE.Float32BufferAttribute(Cs, 3)); geo.setIndex(ix);
  const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ fog: true, vertexShader: FLOCK_VS, fragmentShader: FLOCK_FS, uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), t: tU, flap: { value: flap } } }));
  m.frustumCulled = false; return m;
}
// a streak across the sky now and then (shooting stars), from a few kept ready
function lobStreaks(n, col = 0xffffff) {
  const _v = new THREE.Vector3(), fly = [], ms = [...Array(n)].map(() => { const m = box(.25, .25, 10, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.visible = false; return m; });
  return {
    ms,
    go(x, y, z, vx, vy, d) { const m = ms.find(s => !s.visible); if (!m) return; fly.push({ m, t: 0, x, y, z, vx, vy, d }); m.visible = true; },
    tick(dt) {
      for (let i = fly.length; i--;) {
        const f = fly[i], k = (f.t += dt) / f.d; f.m.position.set(f.x + f.vx * f.t, f.y + f.vy * f.t, f.z); f.m.lookAt(_v.set(f.m.position.x + f.vx, f.m.position.y + f.vy, f.z));
        f.m.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * .9; if (k > 1) { f.m.visible = false; fly.splice(i, 1); }
      }
    },
  };
}

// ---- the canyon at night: you up on a hoodoo, the canyon winding away below you out onto the desert under the stars and the Milky Way, a camp by the river
const MW_FS = `uniform float t, a; varying vec3 vD, vW;
` + LOB_NOISE + `
void main() {
  vec3 e = normalize(vD); vec2 vU = (vec2(atan(e.x, -e.z), asin(clamp(e.y, -1., 1.))) - vec2(-.0825, .0512)) * 242.; // across the sky in metres 242 m off, where the band ran before
  vec2 q = floor(vU / .75) * .75; float d = (q.y - q.x * .1) / 7.;
  float n = vn(q * .05) * .6 + vn(q * .15 + 3.) * .4, band = exp(-d * d * 1.4) * (.4 + .6 * n);
  float lane = 1. - .8 * exp(-pow((d - .1 + .25 * sin(q.x * .025)) / .2, 2.)) * smoothstep(.3, .6, vn(q * .04 + 7.)); // the dark lane down it
  float st = step(.986 - band * .05, h2(q * 1.31)) * (.6 + .4 * sin(t * 2. + h2(q) * 30.));
  vec3 c = mix(vec3(.22, .22, .46), vec3(.74, .7, .9), n) * band * lane * .5 + vec3(.9, .92, 1.) * st * (.3 + band * .7);
  gl_FragColor = vec4(c * a * smoothstep(-1.5, .5, (vW.y - cameraPosition.y) * 242. / distance(vW, cameraPosition)), 1.);
#include <colorspace_fragment>
}`;
LOBBY_MAKE.canyon = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0x080a14], [-.02, 0x2a3c62], [0, 0x34497c], [.03, 0x24366a], [.09, 0x141e48], [.25, 0x0a0f2c], [1, 0x04050e]]));
  const fog = new THREE.Fog(0x2a3c62, 45, 270);
  const GY = -12, xc = z => 9 * Math.sin(z * .021 + .8) + 4 * Math.sin(z * .053 + 2), wob = (z, p) => Math.sin(z * .06 + p) * .5 + Math.sin(z * .17 + p * 2.3) * .3 + Math.sin(z * .41 + p * .7) * .2; // the floor, the river's line
  // sandstone in layers, the same at the same height everywhere; slickrock on top
  const BANDS = [[10, [152, 64, 42]], [4, [198, 122, 72]], [14, [134, 54, 38]], [3, [220, 172, 122]], [8, [172, 82, 50]], [12, [122, 48, 36]], [5, [202, 112, 66]], [16, [148, 60, 42]], [3, [228, 186, 138]], [10, [162, 72, 46]], [6, [184, 98, 60]], [12, [130, 52, 38]], [4, [212, 142, 92]], [21, [156, 66, 44]]];
  const strata = pxTex(64, 128, c => {
    let y = 0; for (const [n, col] of BANDS) for (let j = 0; j < n; j++, y++) for (let x = 0; x < 64; x++) dot(c, rgb(col, (Math.random() - .5) * 14 - (j ? 0 : 10)), x, y);
    for (let i = 0; i < 40; i++) dot(c, 'rgba(60,26,24,.25)', Math.random() * 64 | 0, Math.random() * 128 | 0, 1 + (Math.random() * 3 | 0), 1);
  });
  const slick = pxTex(32, 32, c => { fillN(c, 32, 32, [192, 118, 76], 14); for (let i = 0; i < 26; i++) dot(c, rgb([164, 94, 60]), Math.random() * 30 | 0, Math.random() * 32 | 0, 1 + (Math.random() * 3 | 0), 1); for (let i = 0; i < 12; i++) dot(c, rgb([220, 156, 104]), Math.random() * 32 | 0, Math.random() * 32 | 0); });
  const rockM = [pxMat(strata), pxMat(slick)], RK = { tw: 64, th: 128, end: 'y', ew: 32 };
  const sandDraw = c => { fillN(c, 16, 16, [170, 102, 66], 12); for (let i = 0; i < 6; i++) dot(c, rgb([144, 84, 56]), Math.random() * 16 | 0, Math.random() * 16 | 0); for (let i = 0; i < 4; i++) dot(c, rgb([198, 132, 90]), Math.random() * 16 | 0, Math.random() * 16 | 0); };
  const floorM = lam({ map: tex(sandDraw, 600, 600) }); // sand, in patches darker, paler and scrubby big enough to see from up here
  floorM.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec2 vG;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vG = (modelMatrix * vec4(position, 1.)).xz;');
    sh.fragmentShader = 'varying vec2 vG;\n' + LOB_NOISE + '\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    { vec2 q = (floor(vG * 16.) + .5) / 16.; float px = length(fwidth(vG)), aa = max(px * 1.5, .02); // in pixels; px: metres across a pixel on screen
      float big = smoothstep(.36, .64, vn(q * .06 + 3.) * .65 + vn(q * .2 + 1.) * .35), mot = mix(vn(q * .7 + 7.), .5, smoothstep(.1, .35, px));
      float bank = abs(q.x - 9. * sin(q.y * .021 + .8) - 4. * sin(q.y * .053 + 2.)) - 3. - sin(q.y * .09) - max(0., -q.y) * .012; // from the water's edge
      vec3 k = mix(vec3(.62, .5, .46), vec3(1.2, 1.12, 1.02), big) * mix(.8, 1.15, mot) * (1. - mix(step(.82, h2(floor(q * 2.))), .18, smoothstep(.15, .4, px)) * .25); // red-brown ground and pale sand in patches, gravel
      k = mix(k, vec3(1.24, 1.16, 1.05), (1. - smoothstep(.5, 3. + vn(q * .3) * 3., bank)) * .7); // a pale beach down to the water
      float sc = smoothstep(.76 - aa, .76 + aa, vn(q * .8 + 11.)) * step(.42, vn(q * .1 + 20.)); // scrubby clumps where it's rougher
      k = mix(k, vec3(.42, .45, .36), sc * .55) * (1. - step(.9, h2(floor(q * 5.))) * .2 * (1. - smoothstep(.05, .15, px))); // pebbles close by
      diffuseColor.rgb *= k; }`);
  };
  floorM.customProgramCacheKey = () => 'desert';
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), floorM)); floor.rotation.x = -Math.PI / 2; floor.position.y = GY;
  // the canyon's walls, stepping back in ledges to the rim, then dropping away where it opens out onto the desert
  const rock = [];
  for (const s of [-1, 1]) {
    const p = lr(0, 9);
    for (let z = -18; z > -196; z -= 2) {
      const open = THREE.MathUtils.clamp((-z - 140) / 50, 0, 1), x0 = xc(z) + s * (22 + Math.max(0, -z) * .1 + 2 * wob(z * .5, p + 5) + open * 14);
      const rim = THREE.MathUtils.lerp(5 + 2.5 * wob(z, p) + Math.max(0, -z - 90) * .05, GY + 2.5, open * open);
      for (let k = 0; k < 4; k++) {
        const top = k < 3 ? GY + (k + 1) * (rim - GY) / 3.6 + 1.6 * wob(z * 1.3, p + k * 2) * (1 - open) : rim, w = k < 3 ? 3 : 46;
        rock.push({ x: x0 + s * (k * 3 + w / 2), y: (GY - 1 + top) / 2, z, w, h: top - GY + 1, d: 2 });
      }
    }
  }
  // buttes out on the desert: a skirt of fallen rock, cliffs stepping in, a flat top
  const butte = (x, z, r, h, e, th) => {
    const R = (k, amp) => { const L = lumpy(r * k, amp, [x * .1, z * .1, k]); return a => L(a) * (1 + e * Math.cos(2 * (a - th))); };
    for (const [k, amp, y0, y1] of [[1.55, .16, 0, .1], [1.3, .14, .1, .22], [1, .12, .22, .78], [.86, .12, .78, 1]]) rock.push(...lAt(cellBlob(R(k, amp), GY - 1 + y0 * (h + 1), GY - 1 + y1 * (h + 1), 1), x, 0, z));
  };
  for (const [x, z, r, h, e, th] of [[-34, -214, 15, 24, .35, .2], [6, -228, 11, 21, .2, 1.4], [40, -206, 9, 27, .15, 2], [-6, -188, 6, 15, .3, .6], [70, -230, 14, 20, .4, 0], [-78, -222, 12, 22, .25, 1]]) butte(x, z, r, h, e, th);
  // hoodoos round yours: bulges and necks up to a wider cap
  const hoodoo = (x, z, r, top) => {
    const p = lr(0, 6), n = Math.max(3, Math.round(top - GY));
    for (let k = 0; k < n; k++) { const f = k / n, y0 = GY - 1 + k * (top - GY + 1) / n; rock.push(...lAt(cellBlob(lumpy(r * (1.45 - .55 * f + .2 * Math.sin(f * 10 + p)), .18, [p, p * 2 + k * .4, k * .3]), y0, y0 + (top - GY + 1) / n, .1875), x, 0, z)); }
    rock.push(...lAt(cellBlob(lumpy(r * 1.3, .14, [p, 1, 2]), top, top + .4375, .1875), x, 0, z));
  };
  for (let i = 0; i < 45; i++) { const z = lr(-150, -22), x = xc(z) + lPick([-1, 1]) * lr(4.5, 22), r = 4 + Math.random() * 9 | 0; rock.push(...lAt(pxBlob(lumpy(r, .3, [i * .7, i * 1.3, 2]), GY - .25, GY + snap(r / 22)), x, 0, z)); } // boulders fallen to the floor
  for (let i = 0; i < 9; i++) { // low ledges of slickrock out on the floor
    const z = snap(lr(-140, -40)), x = snap(xc(z) + lPick([-1, 1]) * lr(10, 22)), r = lr(2.5, 5.5), h = snap(lr(.5, 1.1));
    rock.push(...lAt(cellBlob(lumpy(r, .28, [i, i * 1.7, i * .3]), GY - .5, GY + h, .25), x, 0, z));
    if (r > 3.5) rock.push(...lAt(cellBlob(lumpy(r * .55, .3, [i * 2, i, 1]), GY + h, GY + h + snap(lr(.4, .8)), .25), x + snap(lr(-1, 1)), 0, z + snap(lr(-1, 1))));
  }
  for (const [x, z, r, top] of [[-6.5, -7, 1.3, -2.5], [-11.5, -19, 1.8, 2.25], [15.5, -26, 1.3, -1.25], [-17, -36, 1.4, -.5], [12, -44, 1.9, 5.25], [-14, -52, 1.2, -4], [23, -58, 1.6, 1.5], [-26, -72, 1.1, -5.5]]) hoodoo(x, z, r, top);
  // yours: a wide cap of harder rock on a rough neck
  rock.push(...pxBlob(lumpy(36, .2, [1.1, .3, 2.6]), -5, -.375), ...pxBlob(lumpy(33, .22, [2.1, .9, .6]), -9, -5), ...pxBlob(lumpy(40, .2, [.5, 2.3, 1.4]), GY - 1, -9), ...pxBlob(lumpy(46, .07, [.4, 1.3, 2.2]), -.375, .5));
  add(pxBoxes(rock, rockM, RK));
  // flat-topped mesas on the far edge of the desert
  const far = [], M = [...Array(10)].map(() => [lr(-250, 250), lr(10, 34), lr(15, 24)]);
  for (let x = -250; x < 250; x += 2) { let h = 2; for (const [c, w, a] of M) h = Math.max(h, a - Math.max(0, Math.abs(x + 1 - c) - w) * 2.5); h += lr(-.3, .3); far.push({ x: x + 1, y: GY + h / 2 - .5, z: -244, w: 2, h: h + 1, d: 10, c: lPick([0x24345a, 0x22325a]) }); }
  add(pxBoxes(far, glowM(false)));
  // the river, starlight on it
  const rv = [], ri = [];
  for (let k = 0; k <= 135; k++) { const z = 20 - k * 2, w = 3 + Math.sin(z * .09) + Math.max(0, -z) * .012; rv.push(xc(z) - w, GY + .05, z, xc(z) + w, GY + .05, z); if (k) ri.push(2 * k - 2, 2 * k - 1, 2 * k, 2 * k - 1, 2 * k + 1, 2 * k); }
  const rG = new THREE.BufferGeometry(); rG.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rG.setIndex(ri);
  add(new THREE.Mesh(rG, lobWater({ c1: 0x0c1630, c2: 0x182a52, c3: 0x40568a, c4: 0xe0e8ff, sun: .31, sunW: .12, flow: [.04, -.35] })));
  // saguaros and sagebrush down by the river
  const ribs = pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) dot(c, rgb(x % 3 === 0 ? [44, 84, 52] : [72, 122, 70], (Math.random() - .5) * 10), x, y); });
  const cact = [], sag = (x, y, z, h, arms) => {
    x = snap(x); z = snap(z); cact.push({ x, y: y + h / 2, z, w: .5, h, d: .5 }, { x, y: y + h + .0625, z, w: .375, h: .125, d: .375 });
    for (const [dx, dz, ay, up] of arms) cact.push({ x: x + dx * .4375, y: y + ay, z: z + dz * .4375, w: dx ? .375 : .3125, h: .3125, d: dz ? .375 : .3125 }, { x: x + dx * .6875, y: y + ay + up / 2 - .15625, z: z + dz * .6875, w: .3125, h: up, d: .3125 });
  };
  for (let i = 0; i < 22; i++) { const z = lr(-180, -48), x = xc(z) + lPick([-1, 1]) * lr(5, 18); sag(x, GY, z, lr(4, 7), [...Array(1 + (Math.random() * 3 | 0))].map(() => { const [dx, dz] = lPick([[1, 0], [-1, 0], [0, 1], [0, -1]]); return [dx, dz, lr(1.6, 3), lr(1, 2.2)]; })); }
  sag(-3.4, GY, -24, 6.5, [[1, 0, 2.6, 2], [-1, 0, 3.4, 1.6]]); sag(5.5, GY, -33, 7.5, [[-1, 0, 3, 2.2], [0, 1, 4, 1.4]]);
  add(pxBoxes(cact, pxMat(ribs)));
  const bush = [];
  for (let i = 0; i < 70; i++) { const z = lr(-190, -24), x = xc(z) + lPick([-1, 1]) * lr(4.5, 24), r = 5 + Math.random() * 6 | 0; bush.push(...lAt(pxBlob(lumpy(r, .3, [i, 2 * i, 3]), GY, GY + r / 16), x, 0, z).map(b => ({ ...b, c: lPick([0x6a7a58, 0x5a6a4a, 0x7a8a66]) }))); }
  // on your hoodoo: a dead juniper with a lantern hanging from it, a bleached skull, stones
  const stuff = [], warm = [], W = 0x5e4c3a, B = 0xe8dcc4, [T0, T1] = [-2.1, -1.55], LP = [T0 + .72, 1.86, T1], S = [1.75, -1.85];
  const limb = (pts, w) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (w * .7)); for (let k = 0; k <= n; k++) stuff.push({ x: a[0] + (b[0] - a[0]) * k / n, y: a[1] + (b[1] - a[1]) * k / n, z: a[2] + (b[2] - a[2]) * k / n, w, h: w, d: w, c: W }); } };
  limb([[T0, .6, T1], [T0 + .06, 1.2, T1], [T0 + .16, 1.7, T1 + .05], [T0 + .32, 2.02, T1]], .25);
  limb([[T0 + .32, 2.02, T1], [T0 + .52, 2.26, T1], [T0 + .76, 2.3, T1]], .125); limb([[T0 + .52, 2.26, T1], [T0 + .58, 2.6, T1 + .05]], .0625);
  limb([[T0 + .14, 1.72, T1], [T0 - .14, 2.1, T1 - .1], [T0 - .3, 2.5, T1 - .1], [T0 - .24, 2.78, T1 - .15]], .125); limb([[T0 - .14, 2.1, T1 - .1], [T0 - .46, 2.22, T1]], .0625);
  limb([[T0 - .35, .56, T1 + .12], [T0 + .3, .56, T1 - .12]], .125);
  stuff.push({ x: LP[0], y: LP[1] + .3, z: LP[2], w: .0625, h: .2, d: .0625, c: 0x2a2a2a }, { x: LP[0], y: LP[1] + .16, z: LP[2], w: .25, h: .0625, d: .25, c: 0x2a2a2a }, { x: LP[0], y: LP[1] - .16, z: LP[2], w: .25, h: .0625, d: .25, c: 0x2a2a2a });
  warm.push({ x: LP[0], y: LP[1], z: LP[2], w: .1875, h: .25, d: .1875, c: 0xffd27a });
  stuff.push({ x: S[0], y: .62, z: S[1], w: .3125, h: .25, d: .25, c: B }, { x: S[0], y: .58, z: S[1] + .22, w: .1875, h: .1875, d: .25, c: B }, { x: S[0], y: .72, z: S[1] - .05, w: .75, h: .0625, d: .0625, c: B }, { x: S[0] - .375, y: .8, z: S[1] - .05, w: .0625, h: .1875, d: .0625, c: B },
    { x: S[0] + .375, y: .8, z: S[1] - .05, w: .0625, h: .1875, d: .0625, c: B }, { x: S[0] - .08, y: .66, z: S[1] + .13, w: .0625, h: .0625, d: .0625, c: 0x2a2018 }, { x: S[0] + .08, y: .66, z: S[1] + .13, w: .0625, h: .0625, d: .0625, c: 0x2a2018 });
  for (const [x, z, s] of [[-2.4, .4, .25], [-2.2, .75, .1875], [2.3, .2, .3125], [2.05, .65, .1875], [.6, -2.4, .25], [-.9, -2.3, .1875]]) stuff.push({ x, y: .5 + s / 2, z, w: s * 1.25, h: s, d: s, c: lPick([0x8a5a40, 0x9a6a4a, 0x7a4e38]) });
  // a camp down by the river: a tent and a fire
  const CF = [xc(-110) - 4, -110];
  for (let k = 0; k < 6; k++) stuff.push({ x: CF[0] - 2.6, y: GY + .15 + k * .25, z: CF[1] - 1.2, w: 2 - k * .33, h: .25, d: 2.4, c: k % 2 ? 0xc89a62 : 0xb88a56 });
  for (let k = 0; k < 6; k++) { const a = k * 1.05; stuff.push({ x: CF[0] + Math.cos(a) * .55, y: GY + .1, z: CF[1] + Math.sin(a) * .55, w: .3, h: .2, d: .3, r: -a, c: 0x5a5a60 }); }
  warm.push({ x: CF[0], y: GY + .25, z: CF[1], w: .5, h: .3, d: .5, c: 0xff8a2a }, { x: CF[0], y: GY + .55, z: CF[1], w: .25, h: .4, d: .25, c: 0xffd27a });
  add(pxBoxes([...bush, ...stuff], solidM())); add(pxBoxes(warm, glowM()));
  const fireGlow = add(glowSpr(0xff9a40, .8)); fireGlow.scale.setScalar(5); fireGlow.position.set(CF[0], GY + .7, CF[1]);
  const lampGlow = add(glowSpr(0xffc070, .5)); lampGlow.scale.setScalar(1.2); lampGlow.position.set(...LP);
  // a coyote up on a hoodoo under the moon, howling at it now and then
  const yote = rows => add(pxBoxes(pxPic(rows.map(r => r.replace(/\./g, ' ')), { '#': 0x0c0e18 }).map(b => ({ ...b, x: b.x * 2, y: b.y * 2, w: b.w * 2, h: b.h * 2, d: .25 })), glowM(false)));
  const body = ['.........#######.....', '........########.....', '......##########.....', '.....#####.#####.....', '....#####...###......', '....#####...###......', '#...######..###......', '##################...']; // sitting, tail on the rock
  const sit = yote(['..............#.#....', '..............####...', '.............#######.', '.............########', '............#####....', '............####.....', '...........#####.....', '..........######.....', ...body]);
  const howlM = yote(['..................#..', '.................##..', '................###..', '.............#.####..', '............######...', '............#####....', '...........#####.....', '..........######.....', ...body]);
  for (const m of [sit, howlM]) m.position.set(12, 5.25 + .4375 + 1, -44); howlM.visible = false;
  // the moon, the stars and the Milky Way; shooting stars; sparks and smoke from the fire, moths round the lantern
  const moonD = new THREE.Vector3(.3075, .0976, -.9466).normalize(); // up past the coyote's nose
  const moon = add(skyCube(moonFaces([246, 238, 212], [214, 204, 178]), moonD.clone().multiplyScalar(-.5).add(new THREE.Vector3(-.9, .3, 0)), { amb: .12 })); moon.scale.setScalar(4.5); moon.position.copy(moonD).multiplyScalar(200); // a block lit from the left, its right side in shadow
  const halo = add(skyBack(glowSpr(0x8aa0e0, .3))); halo.scale.setScalar(26); halo.position.copy(moonD).multiplyScalar(201);
  const stars = add(skyBack(lobbyMotes({ n: 420, place: () => { const e = Math.asin(lr(.004, .45)), az = Math.PI + lr(-1.3, 1.3); return [Math.sin(az) * Math.cos(e) * 235, 2.6 + Math.sin(e) * 235, Math.cos(az) * Math.cos(e) * 235]; },
    rise: [0, 0, 0], sway: 0, size: [.3, .6], speed: [.05, .2], colors: [0xffffff, 0xdfe8ff, 0xfff0d0, 0xd0dcff], fade: 2 })));
  const mw = add(skyBand(236, 1, MW_FS, { t: LOB_T })); mw.onBeforeRender = (r, s, cam) => mw.matrixWorld.setPosition(cam.position); // all round whoever looks, so it never ends
  const sky = lobStreaks(6); sky.ms.forEach(add);
  const meteor = () => sky.go(lr(-110, 110), lr(20, 30), lr(-225, -205), lPick([-1, 1]) * lr(70, 130), -lr(15, 35), lr(.5, .9));
  const sparks = add(lobbyMotes({ n: 14, box: [CF[0] - .2, CF[0] + .2, GY + .5, GY + .7, CF[1] - .2, CF[1] + .2], rise: [0, 2.5, 0], sway: .2, size: [.08, .12], speed: [.4, .7], colors: [0xffb040, 0xffe08a] }));
  const smoke = add(lobbyMotes({ n: 14, box: [CF[0] - .2, CF[0] + .2, GY + .8, GY + 1, CF[1] - .2, CF[1] + .2], rise: [1.5, 5, -.5], sway: .4, size: [.5, .8], speed: [.08, .12], colors: [0x4a4e60, 0x5a5e70], add: false, a: .3, grow: 1.2, fade: 1 }));
  const moths = add(lobbyMotes({ n: 5, box: [LP[0] - .25, LP[0] + .25, LP[1] - .2, LP[1] + .25, LP[2] - .1, LP[2] + .35], rise: [0, 0, 0], sway: .22, size: [.025, .035], speed: [.3, .5], colors: [0xfff4dc], add: false, a: .9, fade: 2 }));
  const lights = [[0xffb060, 3.5, 6, LP[0], LP[1], LP[2] + .25], [0xff9040, 9, 16, CF[0], GY + 1.2, CF[1] + .6]].map(([c, i, d, x, y, z]) => { const l = add(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  let howl = 0, nextHowl = 6, nextShoot = 2, burst = 0, bt = 0;
  return {
    g, sky: null, fog,
    lit: litOf([0x5868a8, 0x8a5a48, 0xb4c4ec, 0xc0d4ff, 0x9a6a58], [.75, .9, 1.3, .45], [4, 6, 7]),
    hey() { burst = 16; howl = 3; },
    tick(dt, t) {
      lobbyClock(t); [stars, sparks, smoke, moths].forEach(motesQ);
      if ((nextShoot -= dt) < 0) { meteor(); nextShoot = lr(4, 9); }
      if (burst > 0 && (bt -= dt) < 0) { meteor(); burst--; bt = lr(.08, .25); }
      sky.tick(dt);
      if ((nextHowl -= dt) < 0) { howl = 2.6; nextHowl = lr(14, 24); }
      howl = Math.max(0, howl - dt); howlM.visible = howl > 0; sit.visible = !howlM.visible;
      const fl = Math.sin(t * 9) * .5 + Math.sin(t * 23) * .3;
      lights[0].intensity = 3.5 + Math.sin(t * 3.7) * .2; lights[1].intensity = 9 + fl * 1.5; fireGlow.material.opacity = .75 + fl * .1;
    },
  };
};
// ---- the pirate ship: you on deck by the starboard rail at sunset, a skull on the foresail, cannons down both sides, an island off to port
LOBBY_MAKE.pirate = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o), env = new THREE.Group(), put = o => (env.add(o), o); lobbyScene.add(g); g.add(env); // env: all but the ship, rolling round it
  put(lobbyDome([[-1, 0x1a2a40], [-.02, 0xe8a070], [0, 0xffb470], [.02, 0xffc890], [.06, 0xf4a8a0], [.15, 0x9a8ac8], [.4, 0x4a6ab0], [1, 0x2a4080]]));
  const fog = new THREE.Fog(0xf4b080, 60, 330);
  const CX = -2.5, SEA = -4, ST = 5.5, PORTS = [-4.25, -9.75, -15.25], MZ = [-8, -19.5]; // the ship's middle line, the sea, its stern, gunports and masts
  const hw = z => z > -12 ? 3.4 + .6 * Math.sin(Math.PI * (ST - z) / 35) : 4 * Math.sqrt(Math.max(0, 1 - ((z + 12) / 19) ** 2)), top = z => 1.6 + Math.max(0, -z - 12) * .08; // its half width, the top of its rail
  // planks: the deck's along it, the hull's dark with a gold stripe, the bulwarks painted red inside
  const deckT = pxTex(32, 32, c => {
    for (let x = 0; x < 32; x++) { const k = x >> 2, tone = [[150, 110, 70], [140, 102, 64], [158, 116, 74], [146, 106, 68]][k % 4]; for (let y = 0; y < 32; y++) dot(c, rgb(x % 4 === 3 ? [76, 52, 34] : tone, (Math.random() - .5) * 10), x, y); }
    for (let k = 0; k < 8; k++) { const b = (k * 11 + 5) % 32; dot(c, rgb([76, 52, 34]), k * 4, b, 3, 1); dot(c, '#3a2a1e', k * 4 + 1, (b + 2) % 32); dot(c, '#3a2a1e', k * 4 + 1, (b + 30) % 32); }
  });
  const hullT = pxTex(32, 128, c => {
    for (let y = 0; y < 128; y++) { const band = y >= 12 && y < 20, tone = band ? [196, 150, 60] : [[72, 46, 32], [66, 42, 30], [78, 50, 34]][(y >> 2) % 3]; for (let x = 0; x < 32; x++) dot(c, rgb((y % 4 === 3 && !band) || y === 11 || y === 20 ? [40, 26, 18] : tone, (Math.random() - .5) * 10), x, y); }
    for (let i = 0; i < 12; i++) dot(c, '#2a1a12', Math.random() * 32 | 0, (Math.random() * 32 | 0) * 4 + 1);
  });
  const redT = pxTex(32, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) dot(c, rgb(y % 4 === 3 ? [70, 22, 20] : (y >> 2) % 2 ? [128, 40, 34] : [118, 36, 30], (Math.random() - .5) * 10), x, y); });
  const hull = [], bul = [], trim = [], stuff = [], dark = [], warm = [];
  for (let z = ST - .25; z > -31; z -= .5) {
    const w = hw(z); if (w < .3) continue;
    hull.push({ x: CX, y: -2.5, z, w: 2 * w, h: 6, d: .5 });
    for (const s of [-1, 1]) {
      const wi = Math.min(w, hw(z + .5), hw(z - .5)) - .25, x = CX + s * (w + wi) / 2, th = w - wi, t = top(z);
      if (PORTS.some(p => Math.abs(p - z) < .2)) bul.push({ x, y: .65, z, w: th, h: .3, d: .5 }, { x, y: (1.35 + t) / 2, z, w: th, h: t - 1.35, d: .5 });
      else bul.push({ x, y: (.5 + t) / 2, z, w: th, h: t - .5, d: .5 });
      trim.push({ x: CX + s * (w - .1), y: t + .0625, z, w: .375, h: .125, d: .5, c: 0x3a2618 });
    }
  }
  add(pxBoxes(hull, [pxMat(hullT), pxMat(deckT)], { tw: 32, th: 128, end: 'y', ew: 32 })); add(pxBoxes(bul, pxMat(redT), { tw: 32, th: 16 }));
  // the stern: a low rail, its gallery windows lit, gold trim
  for (let x = CX - 3.1; x <= CX + 3.15; x += .4) trim.push({ x, y: .8, z: ST - .1, w: .125, h: .6, d: .125, c: 0x5a3a22 });
  trim.push({ x: CX, y: 1.12, z: ST - .1, w: 6.5, h: .125, d: .25, c: 0x3a2618 }, { x: CX, y: -.4, z: ST + .06, w: 6.4, h: .125, d: .125, c: 0xd8a840 }, { x: CX, y: -1.75, z: ST + .06, w: 6.4, h: .125, d: .125, c: 0xd8a840 });
  for (const dx of [-2.25, -.75, .75, 2.25]) { warm.push({ x: CX + dx, y: -1.08, z: ST + .03, w: .875, h: .875, d: .0625, c: 0xffc068 }); dark.push({ x: CX + dx, y: -1.08, z: ST + .07, w: .0625, h: .875, d: .0625, c: 0x3a2618 }, { x: CX + dx, y: -1.08, z: ST + .07, w: .875, h: .0625, d: .0625, c: 0x3a2618 }, { x: CX + dx, y: -.6, z: ST + .07, w: 1, h: .0625, d: .0625, c: 0x3a2618 }); }
  // masts going up out of sight, yards with their sails furled, the foresail set
  const spar = [], SC = 0xece0c4;
  for (const z of MZ) { spar.push({ x: CX, y: 14.5, z, w: .5, h: 28, d: .5, c: 0x7a5232 }); for (const y of [2.5, 7.2, 11.6]) spar.push({ x: CX, y, z, w: .625, h: .125, d: .625, c: 0x3a2a1e }); }
  for (const [z, y, L, furl] of [[MZ[0], 6.4, 11, 1], [MZ[0], 10.6, 8, 1], [MZ[1], 5.2, 8.5, 0], [MZ[1], 10.1, 7.5, 1]]) {
    spar.push({ x: CX, y, z: z + .35, w: L, h: .25, d: .25, c: 0x6a4428 });
    if (furl) { spar.push({ x: CX, y: y - .26, z: z + .35, w: L - 1, h: .3125, d: .375, c: SC }); for (let x = -L / 2 + 1; x < L / 2 - .9; x += 1) spar.push({ x: CX + x, y: y - .26, z: z + .35, w: .0625, h: .375, d: .4375, c: 0x5a4430 }); }
  }
  spar.push({ x: CX, y: 2.4, z: -33.5, w: .375, h: .375, d: 6, c: 0x7a5232 }); // the bowsprit
  const roger = (c, ox, oy, k, ink) => { // the skull and crossed bones, k pixels to a cell
    const on = new Set(), cut = new Set(), P = (x, y) => on.add(Math.round(x) + ',' + Math.round(y)), disc = (cx, cy, r) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if (Math.hypot(x - cx, y - cy) <= r) P(x, y); };
    for (const [a, b] of [[[2, 4], [21, 17]], [[21, 4], [2, 17]]]) { for (let i = 0; i <= 40; i++) disc(a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40, .8); for (const [x, y] of [a, b]) { disc(x - 1, y, 1.2); disc(x, y + (y < 10 ? -1 : 1), 1.2); } }
    disc(11.5, 8.5, 6.6); for (let y = 12; y <= 16; y++) for (let x = 8; x <= 15; x++) P(x, y);
    for (const [x, y] of [[7, 8], [8, 8], [9, 8], [7, 9], [8, 9], [9, 9], [8, 10], [14, 8], [15, 8], [16, 8], [14, 9], [15, 9], [16, 9], [15, 10], [11, 12], [12, 12], [9, 15], [11, 15], [13, 15], [9, 16], [11, 16], [13, 16], [15, 15], [15, 16]]) cut.add(x + ',' + y);
    c.fillStyle = ink; for (const p of on) if (!cut.has(p)) { const [x, y] = p.split(',').map(Number); c.fillRect(ox + x * k, oy + y * k, k, k); }
  };
  const sail = add(lobCloth(6.5, 2.625, c => { // between the rails and clear above them
    fillN(c, 104, 42, [236, 224, 196], 8);
    for (let x = 12; x < 104; x += 16) for (let y = 0; y < 42; y++) dot(c, rgb([212, 198, 168]), x, y);
    for (const [x, y, w, h] of [[10, 30, 9, 7], [84, 10, 8, 6]]) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) dot(c, rgb([218, 204, 170], (Math.random() - .5) * 8), x + i, y + j);
    roger(c, 29, -1, 2, '#1c1818');
    for (let x = 0; x < 104; x++) if (Math.random() < .3) c.clearRect(x, 41, 1, 1);
  }, true, .14));
  sail.position.set(CX, 5.05, MZ[1] + .1); sail.rotation.y = Math.PI;
  // cannons through their ports, on carriages; a chest of gold, barrels, rope
  for (const z of PORTS) for (const s of [-1, 1]) {
    const xo = CX + s * hw(z);
    dark.push({ x: xo - s * .5, y: 1, z, w: 1.5, h: .3125, d: .3125, c: 0x22222a }, { x: xo + s * .2, y: 1, z, w: .125, h: .4375, d: .4375, c: 0x2a2a32 }, { x: xo - s * 1.2, y: 1, z, w: .1875, h: .375, d: .375, c: 0x22222a });
    stuff.push({ x: xo - s * .85, y: .72, z, w: 1.1, h: .25, d: .75, c: 0x6a4428 });
    for (const dx of [.5, 1.2]) for (const dz of [-.42, .42]) dark.push({ x: xo - s * dx, y: .62, z: z + dz, w: .25, h: .25, d: .125, c: 0x2a2018 });
  }
  const CH = [-1.75, -1.45]; // the chest
  stuff.push({ x: CH[0], y: .78, z: CH[1], w: .875, h: .5625, d: .5625, c: 0x7a4a26 }, { x: CH[0], y: 1.06, z: CH[1] - .34, w: .875, h: .625, d: .125, c: 0x6a3e20 });
  for (const dx of [-.3, .3]) dark.push({ x: CH[0] + dx, y: .75, z: CH[1], w: .0625, h: .5, d: .6875, c: 0x3a3a40 }, { x: CH[0] + dx, y: 1.0625, z: CH[1] - .3625, w: .0625, h: .75, d: .25, c: 0x3a3a40 }); // bands round the chest and over its lid, a pixel out
  warm.push({ x: CH[0], y: 1.08, z: CH[1], w: .75, h: .125, d: .375, c: 0xffd050 }, { x: CH[0] - .1, y: 1.17, z: CH[1], w: .4375, h: .0625, d: .25, c: 0xffe070 }, { x: CH[0] - .05, y: 1.23, z: CH[1] + .02, w: .1875, h: .0625, d: .125, c: 0xfff0a0 }, { x: CH[0] + .25, y: 1.17, z: CH[1] + .1, w: .125, h: .0625, d: .125, c: 0xffc838 }, { x: CH[0] + .4, y: .53, z: CH[1] + .45, w: .125, h: .0625, d: .125, c: 0xffd050 }, { x: CH[0] - .55, y: .53, z: CH[1] + .3, w: .125, h: .0625, d: .125, c: 0xffd050 });
  dark.push({ x: CH[0] + .15, y: 1.22, z: CH[1] - .05, w: .1875, h: .1875, d: .0625, c: 0xc02040 });
  const staveT = pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) dot(c, rgb(x % 3 === 2 ? [98, 64, 36] : [140, 92, 52], (Math.random() - .5) * 12), x, y); }), staves = [];
  const barrel = (x, z, y = .5) => { // bulging in the middle, staves between iron hoops, the lid sunk a pixel
    const R = (r1, r0, k0, k1, c, list = stuff) => list.push(...lAt(pxRing(r1, r0, y + k0 / TX, y + k1 / TX, c ? { c } : {}), x, 0, z)), H = 0x3a3a40;
    R(6, 0, 0, 1, H); R(6, 0, 1, 4, 0, staves); R(7, 0, 4, 5, H); R(7, 0, 5, 10, 0, staves); R(7, 0, 10, 11, H); R(6, 0, 11, 13, 0, staves); R(6, 5, 13, 14, 0, staves); R(5, 0, 13, 14, 0x6a4428); R(6, 5, 14, 15, H);
  };
  barrel(-5.3, -2.1); barrel(-4.4, -2.6); barrel(-5, -3.1); barrel(-4.9, -2.5, 1.4375); // clear of the cannon's wheels barrel(.2, -6.6);
  for (const [x, z, s] of [[-3.6, -12.4, .75], [-4.4, -12.2, .625], [-4, -12.3, .5]]) stuff.push({ x, y: .5 + s / 2 + (s === .5 ? .625 : 0), z, w: s, h: s, d: s, c: 0x9a6a3a });
  for (const [x, z] of [[-.9, -3.3], [-5.4, -6.6]]) for (const [r1, r0, y] of [[7, 3, .5], [6, 2, .5625]]) stuff.push(...lAt(pxRing(r1, r0, y, y + .0625, { c: 0xc8a46a }), x, 0, z));
  stuff.push({ x: CX, y: .55, z: -13.4, w: 1.6, h: .1, d: 1.6, c: 0x5a3a22 }); for (let k = -3; k <= 3; k++) dark.push({ x: CX + k * .22, y: .65625, z: -13.4, w: .0625, h: .0625, d: 1.5, c: 0x3a2a1e }, { x: CX, y: .65625, z: -13.4 + k * .22, w: 1.5, h: .0625, d: .0625, c: 0x3a2a1e }); // a grating
  // lanterns: one on the mainmast, one on the rail beside you
  const lantern = (x, y0, z) => { // glass between four corner posts, a base, a stepped cap and a ring; returns the middle of the glass
    const p = 1 / TX, I = 0x2a2a2a; x = snap(x) + p / 2; z = snap(z) + p / 2; y0 = snap(y0);
    dark.push({ x, y: y0 + p / 2, z, w: 7 * p, h: p, d: 7 * p, c: I }, { x, y: y0 + 6.5 * p, z, w: 7 * p, h: p, d: 7 * p, c: I }, { x, y: y0 + 7.5 * p, z, w: 5 * p, h: p, d: 5 * p, c: I }, { x, y: y0 + 8.5 * p, z, w: 3 * p, h: p, d: 3 * p, c: I },
      { x, y: y0 + 9.5 * p, z: z - p, w: p, h: p, d: p, c: I }, { x, y: y0 + 9.5 * p, z: z + p, w: p, h: p, d: p, c: I }, { x, y: y0 + 10.5 * p, z, w: p, h: p, d: 3 * p, c: I });
    for (const sx of [-3, 3]) for (const sz of [-3, 3]) dark.push({ x: x + sx * p, y: y0 + 3.5 * p, z: z + sz * p, w: p, h: 5 * p, d: p, c: I });
    warm.push({ x, y: y0 + 3.5 * p, z, w: 7 * p, h: 5 * p, d: 5 * p, c: 0xffd27a }, { x, y: y0 + 3.5 * p, z, w: 5 * p, h: 5 * p, d: 7 * p, c: 0xffd27a });
    return [x, y0 + 3.5 * p, z];
  };
  // one hung from an arm on the mainmast, one on a post on the rail beside you
  const L1 = lantern(CX + .625, 2.0625, MZ[0] + .1), L2 = lantern(CX + hw(-1.5) - .1, 2, -1.5), p1 = 1 / TX;
  dark.push({ x: (CX + .25 + L1[0] + p1 / 2) / 2, y: L1[1] + 8 * p1, z: L1[2], w: L1[0] + p1 / 2 - CX - .25, h: p1, d: p1, c: 0x2a2a2a }, { x: CX + .25 + p1 / 2, y: L1[1] + 6.5 * p1, z: L1[2], w: p1, h: 4 * p1, d: 3 * p1, c: 0x2a2a2a });
  dark.push({ x: L2[0], y: 1.75 + p1 / 2, z: L2[2], w: 3 * p1, h: p1, d: 3 * p1, c: 0x2a2a2a }, { x: L2[0], y: (1.75 + p1 + 2) / 2, z: L2[2], w: p1, h: 2 - 1.75 - p1, d: p1, c: 0x2a2a2a });
  add(pxBoxes([...trim, ...spar, ...stuff], solidM())); add(pxBoxes(staves, pxMat(staveT))); add(pxBoxes(dark, solidM())); add(pxBoxes(warm, glowM()));
  const gold = add(glowSpr(0xffc040, .45)); gold.scale.setScalar(1.3); gold.position.set(CH[0], 1.2, CH[1]);
  // rigging: shrouds with ratlines up each mast, stays to the bow
  const rig = [], V = (a, b) => rig.push(...a, ...b);
  for (const [i, z] of MZ.entries()) {
    const yt = i ? 9.9 : 9.4;
    for (const s of [-1, 1]) {
      const sh = [z + 1.2, z + .4, z - .4].map(zz => [[CX + s * (hw(zz) - .1), top(zz) + .12, zz], [CX + s * .3, yt, z]]);
      sh.forEach(([a, b]) => V(a, b));
      for (let y = top(z) + .5; y < yt - .6; y += .45) for (let k = 0; k < 2; k++) { const P = ([a, b]) => { const f = (y - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * f, y, a[2] + (b[2] - a[2]) * f]; }; V(P(sh[k]), P(sh[k + 1])); }
    }
  }
  V([CX, 13, MZ[0]], [CX, 6, MZ[1]]); V([CX, 13.5, MZ[1]], [CX, 2.6, -36.4]); V([CX, 9, MZ[1]], [CX, 2.5, -34]);
  const rG = new THREE.BufferGeometry(); rG.setAttribute('position', new THREE.Float32BufferAttribute(rig, 3));
  add(new THREE.LineSegments(rG, new THREE.LineBasicMaterial({ color: 0x3a2a1e })));
  // the sea, the sun going down over it, clouds lit pink from below
  const sea = put(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lobWater({ c1: 0x1c3a5a, c2: 0x2c5878, c3: 0x9ab8c8, c4: 0xffb860, sun: .3, sunW: .055, flow: [.1, .16] }))); sea.rotation.x = -Math.PI / 2; sea.position.y = SEA;
  const sunD = new THREE.Vector3(.2954, .03, -.9548);
  const sun = put(skyCube(sunFaces([255, 172, 76], [255, 196, 104], [255, 226, 150]), sunD.clone().negate().add(new THREE.Vector3(-.4, .5, 0)), { amb: .6 })); sun.scale.setScalar(8.5); sun.position.copy(sunD).multiplyScalar(205); // a block going down
  const sunHalo = put(skyBack(glowSpr(0xffa050, .7))); sunHalo.scale.setScalar(80); sunHalo.position.copy(sunD).multiplyScalar(206);
  const cloud = [];
  for (const [x, y, w] of [[-70, 9, 50], [-15, 14, 34], [40, 7, 44], [95, 12, 38], [-120, 16, 40], [10, 20, 26], [150, 8, 46]]) { const c = lPick([0xf8b8a0, 0xf0a090, 0xe89aa8, 0xffc8a8]); cloud.push({ x, y, z: -226, w, h: 1.5, d: 4, c }, { x: x + lr(-4, 4), y: y + 1.25, z: -226, w: w * .6, h: 1, d: 3, c }, { x: x + lr(-6, 6), y: y - 1, z: -226, w: w * .45, h: .75, d: 3.5, c: 0xffd8b0 }); }
  put(pxBoxes(cloud, glowM(false)));
  // an island off to port: a beach, a green hill, palms, and a rock like a skull
  const isle = [], IX = -62, IZ = -205, IY = SEA;
  isle.push(...lAt(cellBlob(lumpy(20, .15, [1, 2, 3]), IY - .5, IY + .5, 1), IX, 0, IZ).map(b => ({ ...b, c: 0xe8cc90 })));
  for (const [r, y0, y1] of [[15, .5, 3], [10.5, 3, 6], [6, 6, 8.5]]) isle.push(...lAt(cellBlob(lumpy(r, .2, [r, 1, 2]), IY + y0, IY + y1, 1), IX - 3, 0, IZ - 2).map(b => ({ ...b, c: lPick([0x3a8a4a, 0x2f7a40, 0x46944e]) })));
  for (const [r, y0, y1] of [[5, .5, 4], [4.4, 4, 8], [3.4, 8, 10.5]]) isle.push(...lAt(cellBlob(lumpy(r, .08, [1, 2, 1]), IY + y0, IY + y1, .5), IX + 14, 0, IZ + 4).map(b => ({ ...b, c: lPick([0x8a8478, 0x7a7468]) })));
  for (const [dx, y, w, h] of [[-1.6, 6, 1.5, 1.75], [1.6, 6, 1.5, 1.75], [0, 4.3, .75, .75]]) isle.push({ x: IX + 14 + dx, y: IY + y, z: IZ + 8.6, w, h, d: .5, c: 0x1a1414 });
  for (let k = -3; k <= 3; k++) isle.push({ x: IX + 14 + k * .6, y: IY + 2.2, z: IZ + 8.4, w: .25, h: .75, d: .5, c: 0x2a2422 });
  for (const [x, z, h, lean] of [[-8, 8, 7, .3], [-3, 10, 8.5, -.2], [3, 7, 6, .35], [-14, 3, 7.5, -.3], [8, 5, 5.5, .25]]) {
    const n = Math.round(h * 4); for (let k = 0; k < n; k++) isle.push({ x: IX + x + lean * h * (k / n) ** 2, y: IY + .5 + (k + .5) / 4, z: IZ + z, w: .5, h: .25, d: .5, c: k % 3 ? 0x8a6a42 : 0x76583a });
    const tx = IX + x + lean * h, ty = IY + .5 + h, tz = IZ + z, a0 = lr(0, 1);
    for (let a = 0; a < 7; a++) { const r = (a + a0) * .898, P = j => { const d = .2 + j * .45; return [tx + Math.cos(r) * d, ty + .2 - .06 * d * d, tz + Math.sin(r) * d]; };
      for (let j = 0; j < 6; j++) { const [x0, y0, z0] = P(j), [x1, y1, z1] = P(j + 1); isle.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: .6, h: .25, d: .55 - j * .05, r: -r, c: j % 2 ? 0x2f8a34 : 0x3a9a3a }); } }
    for (const [dx, dz] of [[.2, .1], [-.15, .2], [0, -.2]]) isle.push({ x: tx + dx, y: ty - .05, z: tz + dz, w: .25, h: .25, d: .25, c: 0x5a3a1e });
  }
  put(pxBoxes(isle, solidM()));
  // a ship far off to starboard, against the sunset
  const far = pxPic(['.........#.........#...........', '........###.......###..........', '.......#####.....#####.........', '......#######...#######........', '.....########...########.......', '......#######...#######........', '.........#.........#...........', '.......#####.....#####.........', '......#######...#######........', '.....########...########.......', '.........#.........#...........', '##......########################', '.###############################', '..############################..', '...##########################...'].map(r => r.replace(/\./g, ' ')), { '#': 0x5a4258 });
  put(pxBoxes(far.map(b => ({ ...b, x: b.x * 8 + 92, y: b.y * 8 + SEA + 3.6, w: b.w * 8, h: b.h * 8, z: -212, d: 1 })), glowM(false)));
  // gulls
  const GULL = [[.1, .1, .36, 0, 0, 0, 0, 0xf4f0ec], [.07, .07, .1, 0, .03, -.22, 0, 0xf4f0ec], [.06, .03, .06, 0, .03, -.29, 0, 0xffa030], [.5, .03, .16, -.29, .02, .02, -1, 0xe0dcd8], [.5, .03, .16, .29, .02, .02, 1, 0xe0dcd8]];
  put(lobFlock([{ at: [14, 7, -70], n: 5, r: [8, 16], h: [-1, 2], v: [.25, .4], size: [1.3, 1.7], parts: GULL }, { at: [-20, 8, -120], n: 3, r: [6, 12], h: [-1, 1], v: [.2, .3], size: [1.3, 1.7], parts: GULL }], 6));
  // the salute: cannon fire and smoke, gold out of the chest
  const flashes = PORTS.flatMap(z => [-1, 1].map(s => { const f = add(glowSpr(0xffc060, 0)); f.scale.setScalar(2.4); f.position.set(CX + s * (hw(z) + .5), 1, z); f.visible = false; return { f, s, z, t: -999 }; }));
  const smoke = add(lobbyBits(160, .4, false, .55)), coins = add(lobbyBits(60, .09));
  const lights = [[0xffb060, 4, 8, ...L1], [0xffc070, 3.5, 7, L2[0], L2[1], L2[2] + .1]].map(([c, i, d, x, y, z]) => { const l = add(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  const motes = put(lobbyMotes({ n: 30, box: [-30, 30, SEA + .2, SEA + .6, -60, 0], rise: [0, .3, 0], sway: .5, size: [.08, .14], speed: [.08, .14], colors: [0xffffff, 0xffe8c8], add: false, a: .8 })); // spray glinting on the sea
  return {
    g, sky: null, fog,
    lit: litOf([0xb8a8d8, 0x7a5a48, 0xffd8b0, 0xff9a50, 0xd8a070], [.85, 1.25, 1.4, .5], [5, 5, 6]),
    hey() { flashes.forEach((F, i) => F.t = -i * .3 - .01); for (let i = 0; i < 40; i++) { const a = Math.random() * 6.3, s = lr(.6, 1.8); coins.userData.throw(CH[0], 1.2, CH[1], Math.cos(a) * s, lr(3, 5.5), Math.sin(a) * s, lr(1, 1.6), lPick([0xffd050, 0xffe080, 0xffb830])); } },
    tick(dt, t) {
      lobbyClock(t); motesQ(motes);
      env.rotation.z = Math.sin(t * .55) * .016; env.position.y = Math.sin(t * .8) * .12; // the ship rolls a little on the swell
      for (const F of flashes) {
        if (F.t > -100) { const was = F.t; F.t += dt; if (was < 0 && F.t >= 0) for (let i = 0; i < 18; i++) smoke.userData.throw(F.f.position.x + F.s * lr(0, .6), 1.1 + lr(-.2, .2), F.z + lr(-.4, .4), F.s * lr(.6, 3), lr(0, 1.2), lr(-.7, .7), lr(1.6, 3), lPick([0xe8e0d8, 0xd0c8c0, 0xb8b0a8, 0xa8a098]), 1.2); }
        F.f.material.opacity = F.t >= 0 && F.t < .25 ? 1 - F.t * 4 : 0; F.f.visible = F.f.material.opacity > 0; if (F.t > 3) F.t = -999;
      }
      smoke.userData.tick(dt, -.6); coins.userData.tick(dt, 9);
      lights[0].intensity = 4 + Math.sin(t * 3.1) * .25; lights[1].intensity = 3.5 + Math.sin(t * 4.3 + 1) * .2;
      gold.material.opacity = .4 + Math.sin(t * 2) * .08;
    },
  };
};

// ---- the haunted mansion: you on a broken stone dais in its overgrown yard at night, graves and dead trees round you, the house under the full moon past its iron gate
const MIST_FS = `uniform float t, a; uniform vec3 c; varying vec3 vW;
#include <fog_pars_fragment>
` + LOB_NOISE + `
void main() {
  vec2 q = (floor(vW.xz * 4.) + .5) / 4.;
  float n = vn(q * .12 + vec2(t * .05, t * .02)) * .6 + vn(q * .31 - vec2(t * .04, 0.) + 3.) * .4;
  gl_FragColor = vec4(c, smoothstep(.42, .8, n) * smoothstep(7., 16., length(vW.xz - cameraPosition.xz)) * a); // none close to you
#include <fog_fragment>
}`;
LOBBY_MAKE.mansion = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0x0a0c10], [-.02, 0x34403e], [0, 0x3e4a4a], [.03, 0x2e3644], [.1, 0x1e1a34], [.3, 0x100c20], [1, 0x06040c]]));
  const fog = new THREE.Fog(0x34403e, 25, 200);
  const grassDraw = c => { fillN(c, 16, 16, [50, 62, 46], 12); for (let i = 0; i < 5; i++) dot(c, rgb(lPick([[96, 70, 40], [80, 52, 32], [110, 84, 46]])), Math.random() * 15 | 0, Math.random() * 16 | 0, 2, 1); for (let i = 0; i < 6; i++) dot(c, rgb([36, 46, 34]), Math.random() * 16 | 0, Math.random() * 16 | 0); };
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lam({ map: tex(grassDraw, 600, 600) }))); ground.rotation.x = -Math.PI / 2;
  const stone = pxTex(32, 32, c => { // old blocks, moss in the joints
    const tone = [...Array(32)].map(() => (Math.random() - .5) * 22);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const row = y >> 3, sx = (x + (row & 1) * 8) % 32, b = row * 4 + (sx >> 3), joint = y % 8 === 7 || sx % 8 === 7; dot(c, joint ? rgb(Math.random() < .3 ? [58, 78, 50] : [62, 60, 64], (Math.random() - .5) * 8) : rgb([112, 110, 116], tone[b] + (Math.random() - .5) * 10), x, y); }
  });
  const floor = ringsTex(96, (r, a) => { // the dais: rings of flagstones, a cracked star at its heart
    if (r > 45) return [70, 68, 74];
    const q = Math.abs(Math.cos(2.5 * a)) ** 3;
    if (r < 12) return r < 2 + 9 * q ? [150, 146, 156] : [84, 82, 92];
    if (Math.abs(r - 12.5) < .8 || Math.abs(r - 30) < .7) return [56, 58, 60];
    const k = r < 30 ? 9 : 14, u = a / (Math.PI * 2 / k) + (r < 30 ? .5 : 0), d = ((u % 1) + 1) % 1;
    if (Math.min(d, 1 - d) * Math.PI * 2 / k * r < .7) return Math.random() < .4 ? [62, 86, 52] : [58, 58, 62];
    const v = (((Math.floor(u + 20) * 7 + (r < 30 ? 3 : 5) * 11) % 9) - 4) * 4; return [116 + v, 114 + v, 122 + v];
  });
  const stoneM = pxMat(stone), ST = { tw: 32 };
  add(pxBoxes(pxRing(44, 0, -.5, -.125), stoneM, ST)); add(pxBoxes(pxRing(47, 0, -.125, .5), [stoneM, pxMat(floor)], { end: 'y', ew: 96, tw: 32 }));
  // its two broken columns at the back, a piece of one fallen
  const cols = [], col = (x, z, h, bits, ivy) => { x = snap(x); z = snap(z); cols.push(...lAt(pxRing(7, 0, .5, .625, { c: 0x7a7882 }), x, 0, z), ...lAt(pxRing(6, 0, .625, .75, { c: 0x8a8892 }), x, 0, z), ...lAt(pxRing(5, 0, .75, .75 + h, { c: 0x9a98a2 }), x, 0, z)); for (const [dx, dz, w, hh] of bits) cols.push({ x: x + dx, y: .75 + h + hh / 2, z: z + dz, w, h: hh, d: w, c: 0x9a98a2 }); for (const a of ivy) { const hh = Math.round(lr(.4, Math.min(1.2, h)) * TX) / TX, y = .75 + Math.round(lr(0, h - hh) * TX) / TX, [ix, iz] = pxClear(lAt(pxRing(5, 0, .75, .75 + h), x, 0, z), x, z, y, y + hh, Math.sin(a), Math.cos(a)); cols.push({ x: ix, y: y + hh / 2, z: iz, w: .0625, h: hh, d: .0625, c: lPick([0x3e5a32, 0x4a6a3a]) }); } }; // ivy up them, just clear of the stone
  col(-2.05, -1.75, 2.6, [[-.06, .05, .375, .25], [.1, -.08, .25, .4], [-.12, -.1, .125, .55]], [-1.1, -.3, .45, 1.2]); col(2.1, -1.6, 1.25, [[.08, .02, .4375, .1875], [-.1, .05, .1875, .3125]], [.35, 1.1]);
  cols.push({ x: -3.6, y: .3125, z: -.8, w: 1.25, h: .625, d: .5625, c: 0x9a98a2 }, { x: -3.6, y: .3125, z: -.8, w: 1.375, h: .5, d: .4375, c: 0x8a8892 });
  add(pxBoxes(cols, solidM()));
  // the path to the gate and on up to the door
  const gravel = pxMat(pxTex(16, 16, c => { fillN(c, 16, 16, [98, 92, 86], 18); for (let i = 0; i < 14; i++) dot(c, rgb(lPick([[70, 66, 62], [128, 122, 114]])), Math.random() * 16 | 0, Math.random() * 16 | 0); }));
  const xp = z => 1.2 * Math.sin(z * .06) + (z < -28 ? (z + 28) / -66 * 7 : 0), path = [];
  for (let z = -3.5; z > -95; z -= 1) path.push({ x: xp(z), y: .03, z, w: 2.25, h: .0625, d: 1 });
  add(pxBoxes(path, gravel));
  // graves
  const grave = [], dark = [], warm = [], glow2 = [];
  for (const [x, z, k, r] of [[-5.2, -7, 0, .1], [-7.6, -10, 1, -.2], [-4.6, -12.5, 2, .15], [-9.2, -15, 0, .3], [-12, -8.8, 1, -.1], [-6.8, -18.5, 0, -.25], [5.8, -8.6, 0, -.2], [8.2, -12.8, 1, .1], [5, -16, 0, .2], [10.6, -18, 2, -.1], [-15, -21, 0, .1], [13.5, -9.5, 0, .3]]) {
    const c = lPick([0x8a8890, 0x7a7880, 0x96949c]);
    if (k === 0) grave.push({ x, y: .45, z, w: .625, h: .9, d: .1875, r, c }, { x, y: .95, z, w: .4375, h: .125, d: .1875, r, c }, { x, y: 1.05, z, w: .25, h: .0625, d: .1875, r, c });
    if (k === 1) grave.push({ x, y: .6, z, w: .1875, h: 1.2, d: .1875, r, c }, { x, y: .85, z, w: .625, h: .1875, d: .1875, r, c });
    if (k === 2) grave.push({ x, y: .15, z, w: .5, h: .3, d: .5, c }, { x, y: .95, z, w: .3125, h: 1.3, d: .3125, c }, { x, y: 1.66, z, w: .1875, h: .125, d: .1875, c });
    grave.push({ x, y: .03, z: z + .7, w: .75, h: .0625, d: 1.25, r, c: 0x3e3a30 });
  }
  // dead trees, crooked and forking
  const wood = [], limb = (a, b, w) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / (w * .7)); for (let k = 0; k <= n; k++) wood.push({ x: a[0] + (b[0] - a[0]) * k / n, y: a[1] + (b[1] - a[1]) * k / n, z: a[2] + (b[2] - a[2]) * k / n, w, h: w, d: w, c: lPick([0x2e2a2c, 0x34302e, 0x282426]) }); };
  const grow = (p, dir, len, w, depth) => {
    const q = p.map((v, i) => v + dir[i] * len), m = [(p[0] + q[0]) / 2 + lr(-.1, .1) * len, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2 + lr(-.1, .1) * len];
    limb(p, m, w); limb(m, q, Math.max(.0625, w * .85));
    if (depth > 0) for (let i = 0; i < 2; i++) { const t = lr(0, 6.3), d2 = new THREE.Vector3(dir[0] + Math.cos(t) * .8, dir[1] * lr(.2, .9) + lr(-.15, .25), dir[2] + Math.sin(t) * .5).normalize(); grow(q, d2.toArray(), len * lr(.55, .75), Math.max(.0625, w * .6), depth - 1); }
  };
  for (const [x, z, h, w] of [[-8.5, -9.5, 2.6, .5], [10, -13, 2.4, .5], [-19, -36, 2.8, .625], [21, -42, 2.6, .5625], [-30, -60, 3, .625], [33, -66, 3, .625]]) grow([snap(x), 0, snap(z)], [lr(-.15, .15), 1, lr(-.1, .1)], h, w, 3);
  // the iron fence, its stone posts, the gate standing open
  const iron = [], IZ = -28;
  for (let x = -46; x <= 46; x += .25) { if (Math.abs(x) < 2.4) continue; iron.push({ x, y: 1.05, z: IZ, w: .0625, h: 2.1, d: .0625 }, { x, y: 2.17, z: IZ, w: .125, h: .125, d: .125 }); }
  for (const s of [-1, 1]) for (const y of [.35, 1.8]) iron.push({ x: s * 24.2, y, z: IZ, w: 43.6, h: .0625, d: .0625 });
  for (let x = -44; x <= 44; x += 6) if (Math.abs(x) > 3) grave.push({ x, y: 1.25, z: IZ, w: .5, h: 2.5, d: .5, c: 0x6a686e }, { x, y: 2.55, z: IZ, w: .625, h: .125, d: .625, c: 0x7a787e });
  for (const s of [-1, 1]) {
    grave.push({ x: s * 2.05, y: 1.5, z: IZ, w: .75, h: 3, d: .75, c: 0x6a686e }, { x: s * 2.05, y: 3.06, z: IZ, w: .875, h: .125, d: .875, c: 0x7a787e });
    const th = 1.2, dx = -s * Math.cos(th), dz = Math.sin(th); // a gate leaf swung open toward you
    for (let k = 0; k < 7; k++) { const d = .15 + k * .25; iron.push({ x: s * 1.65 + dx * d, y: 1.1, z: IZ + dz * d, w: .0625, h: 2, d: .0625 }); }
    for (const y of [.4, 1.9]) iron.push({ x: s * 1.65 + dx * .85, y, z: IZ + dz * .85, w: 1.7, h: .0625, d: .0625, r: s * th });
  }
  // jack-o'-lanterns: on the gate posts, by the graves, one beside you
  const JACK = [['  ########  ', ' ########## ', '############', '###f####f###', '##fff##fff##', '##f##ff##f##', '##f#ffff#f##', '###ff##ff###', ' ########## ', '  ########  '],
    [' ###### ', '########', '#ff##ff#', '########', '#f#ff#f#', '##ffff##', ' ###### ']]; // a big face and a small one, 'f' cut through
  const pumpkin = (x, y, z, big) => { // ribbed, its face cut right through the front, the candle's glow a pixel behind
    const R = JACK[big ? 0 : 1], w = R[0].length, n = R.length, p = 1 / TX, D = big ? 10 : 8, zf = snap(z) + D / 2 * p;
    x = snap(x); y = snap(y);
    const tone = i => [0xb85410, 0xd06414, 0xe8801e][Math.min(2, Math.floor(Math.min(i, w - 1 - i) * 3 / (w / 2)))];
    const run = (j, z0, z1, pick) => { for (let i = 0; i < w;) { const a = pick(i); let k = i + 1; while (k < w && pick(k) && a && pick(k)[0] === a[0] && pick(k)[1] === a[1]) k++; if (a) a[0].push({ x: x + ((i + k) / 2 - w / 2) * p, y: y + (n - j - .5) * p, z: (z0 + z1) / 2, w: (k - i) * p, h: p, d: z1 - z0, c: a[1] }); i = k; } };
    R.forEach((r, j) => {
      run(j, zf - p, zf, i => r[i] === '#' && [dark, tone(i)]);
      run(j, zf - 2 * p, zf - p, i => r[i] === 'f' ? [warm, 0xffc030] : r[i] === '#' && [dark, tone(i)]);
      run(j, zf - D * p, zf - 2 * p, i => r[i] !== ' ' && [dark, tone(i)]);
    });
    dark.push({ x, y: y + (n + 1) * p, z: zf - D / 2 * p, w: 2 * p, h: 2 * p, d: 2 * p, c: 0x3a5a22 });
  };
  const P1 = [1.85, .5, -1.05], P2 = [-2.05, 3.125, IZ];
  pumpkin(...P1, 1); pumpkin(...P2); pumpkin(2.05, 3.125, IZ); pumpkin(-6.1, 0, -9.2); pumpkin(6.8, 0, -11); pumpkin(-3.2, 0, -16.5);
  // the house: a tower to the left, three floors and a steep roof in the middle, a lower wing to the right, a porch and steps
  const siding = pxMat(pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) dot(c, rgb(y % 4 === 3 ? [46, 40, 52] : [86, 78, 94], (Math.random() - .5) * 10 - (y % 4) * 3), x, y); }));
  const slate = pxMat(pxTex(16, 16, c => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = y >> 2, sx = (x + (r & 1) * 2) % 4, edge = y % 4 === 3 && (sx === 0 || sx === 3) || y % 4 === 0 && false; dot(c, rgb(edge || y % 4 === 3 ? [26, 26, 34] : [48, 48, 62], (Math.random() - .5) * 10), x, y); } }));
  const B = (x0, x1, y0, y1, z0, z1, c) => ({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, w: x1 - x0, h: y1 - y0, d: z1 - z0, c });
  const walls = [B(1, 13, 1, 10, -108, -100), B(-6, 0, 1, 11, -103, -97), B(0, 1, 1, 10, -103, -100), B(13, 25, 1, 7.5, -106, -101)];
  const roofs = [B(.5, 13.5, 10, 10.5, -108.5, -99.5), B(1.5, 12.5, 10.5, 11.25, -107.5, -100.5), B(2.5, 11.5, 11.25, 12, -106.5, -101.5), B(-6.5, .5, 11, 11.5, -103.5, -96.5), B(-5.75, -.25, 11.5, 12, -102.75, -97.25), B(-5, -1, 12, 12.5, -102, -98), B(-4.25, -1.75, 12.5, 13, -101.25, -98.75)];
  for (let k = 0; k < 5; k++) roofs.push(B(12.6, 25.5, 7.5 + k * .5, 8 + k * .5, -106.5 + k * .55, -100.5 - k * .55));
  const trim = [];
  trim.push(B(-6.6, 25.6, 0, 1, -108.6, -96.6), B(4, 10, 1, 1.25, -100, -96.8), B(3.6, 10.4, 4, 4.4, -100, -96.6), B(5.4, 8.6, 0, .33, -96.6, -95), B(5.4, 8.6, .33, .66, -96.6, -95.6), B(5.4, 8.6, .66, 1, -96.6, -96.2));
  for (const x of [4.2, 6.2, 7.8, 9.8]) trim.push(B(x - .15, x + .15, 1.25, 4, -97.3, -97));
  for (let x = 3; x < 11.5; x += .5) trim.push(B(x - .05, x + .05, 12, 12.5, -104.05, -103.95));
  trim.push(B(-3.125, -2.875, 13, 14, -100.125, -99.875), B(2.5, 3.5, 10, 13.25, -104.5, -103.5, 0x5a3e3a), B(10.5, 11.5, 10, 13.25, -104.5, -103.5, 0x5a3e3a), B(21.5, 22.5, 8, 11, -104, -103, 0x5a3e3a));
  const win = [], lit = [], flick = [];
  const pane = (x, y0, y1, z, face = 1) => { // a tall window, its frame, its glass lit or dark
    trim.push(B(x - .6, x + .6, y0 - .15, y0, z, z + face * .12), B(x - .6, x + .6, y1, y1 + .2, z, z + face * .12));
    const p = B(x - .45, x + .45, y0, y1, z, z + face * .04), r = Math.random(); (r < .22 ? lit : r < .32 ? flick : win).push(p);
    dark.push(B(x - .0625, x + .0625, y0, y1, z, z + face * .125, 0x2a2430), B(x - .4, x + .4, (y0 + y1) / 2 - .03, (y0 + y1) / 2 + .03, z, z + face * .125, 0x2a2430)); // a pixel out from the glass
  };
  for (const x of [2.5, 11.5]) pane(x, 2, 4.2, -100);
  for (const x of [2.5, 5, 7, 9, 11.5]) { pane(x, 5, 7.2, -100); pane(x, 8, 9.6, -100); }
  for (const y of [2, 5, 8]) pane(-3, y, y + 2, -97);
  for (const x of [15, 18, 21, 24]) { pane(x, 2, 4, -101); pane(x, 5, 6.8, -101); }
  for (const x of [4.5, 7, 9.5]) { roofs.push(B(x - .55, x + .55, 10.5, 12, -100.9, -100.1)); pane(x, 10.7, 11.6, -100.1); }
  lit.push(B(6.35, 7.65, 1.25, 3.6, -100.03, -100), B(-3.45, -2.55, 10.05, 10.75, -97.02, -96.98));
  dark.push(B(6.3, 7.7, 1.25, 3.6, -100, -99.9, 0x2a1416));
  add(pxBoxes(walls, siding)); add(pxBoxes(roofs, slate)); add(pxBoxes([...grave, ...trim.map(b => ({ ...b, c: b.c ?? 0x8a8690 }))], solidM()));
  add(pxBoxes([...dark, ...wood], solidM())); add(pxBoxes(iron, lam({ color: 0x16141a })));
  const litM = glowM(), flickM = glowM(), winM = glowM();
  add(pxBoxes([...lit.map(b => ({ ...b, c: lPick([0xffd27a, 0xffc860, 0xb8ff98]) })), ...warm], litM)); add(pxBoxes(flick.map(b => ({ ...b, c: 0xffd27a })), flickM)); add(pxBoxes(win.map(b => ({ ...b, c: 0xffd27a })), winM));
  winM.color.setRGB(.03, .03, .05);
  // the full moon behind the tower, clouds going over; bats round the tower, a ghost among the trees, fog low on the ground, wisps by the graves
  const moonD = new THREE.Vector3(-.0802, .0732, -.994).normalize();
  const moon = add(skyCube(moonFaces([236, 240, 220], [200, 210, 186]), moonD.clone().negate().add(new THREE.Vector3(-.5, .6, 0)), { amb: .3 })); moon.scale.setScalar(10.5); moon.position.copy(moonD).multiplyScalar(210); // full, a block
  const halo = add(skyBack(glowSpr(0xc8ffd0, .32))); halo.scale.setScalar(60); halo.position.copy(moonD).multiplyScalar(211);
  const cl = []; for (const [x, y, w] of [[-60, 18, 40], [-20, 12, 30], [30, 20, 46], [70, 14, 34], [-110, 13, 50]]) cl.push({ x, y, z: -228, w, h: 1.5, d: 2, c: 0x2a2838 }, { x: x + lr(-5, 5), y: y + 1.25, z: -228, w: w * .6, h: 1, d: 2, c: 0x2e2c3e }, { x: x + lr(-6, 6), y: y - 1, z: -228, w: w * .5, h: .75, d: 2, c: 0x26243a });
  const clouds = add(pxBoxes(cl, glowM(false)));
  const stars = add(skyBack(lobbyMotes({ n: 90, place: () => { const e = Math.asin(lr(.01, .13)), az = Math.PI + lr(-1.3, 1.3); return [Math.sin(az) * Math.cos(e) * 235, 2.6 + Math.sin(e) * 235, Math.cos(az) * Math.cos(e) * 235]; }, rise: [0, 0, 0], sway: 0, size: [.3, .5], speed: [.05, .2], colors: [0xdfe8ff, 0xc8d0e8], fade: 2 })));
  const BAT = [[.12, .1, .2, 0, 0, 0, 0, 0x15121a], [.36, .02, .18, -.22, .02, 0, -1, 0x1c1822], [.36, .02, .18, .22, .02, 0, 1, 0x1c1822], [.04, .06, .03, -.04, .08, -.06, 0, 0x15121a], [.04, .06, .03, .04, .08, -.06, 0, 0x15121a]];
  add(lobFlock([{ at: [-3, 12.5, -100], n: 9, r: [3, 8], h: [-2, 3], v: [.6, .9], size: [2.2, 2.8], parts: BAT }, { at: [6, 5, -45], n: 5, r: [10, 18], h: [-1, 2], v: [.35, .6], size: [1.4, 1.8], parts: BAT }], 16));
  const ghostP = pxPic(['  ######  ', ' ######## ', '##########', '##  ##  ##', '##  ##  ##', '##########', '####  ####', '###    ###', '##########', '##########', '##########', '##########', '## ## ## #', '#  #  #   '], { '#': 0xe8f4ff });
  const ghost = add(pxBoxes(ghostP.map(b => ({ ...b, x: b.x * 2, y: b.y * 2, w: b.w * 2, h: b.h * 2, d: .0625 })), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, fog: false })));
  for (const [y, a] of [[.3, .6], [.9, .35]]) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(240, 160), new THREE.ShaderMaterial({ fog: true, transparent: true, depthWrite: false, vertexShader: WATER_VS, fragmentShader: MIST_FS,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), t: LOB_T, a: { value: a }, c: { value: new THREE.Color(0x9aa8b4) }, uvs: { value: new THREE.Vector2() } } }))); m.rotation.x = -Math.PI / 2; m.position.set(0, y, -60); } // mist lying on the ground
  const wisps = add(lobbyMotes({ n: 16, box: [-14, 12, .3, 1.6, -20, -6], rise: [0, .6, 0], sway: .8, size: [.07, .11], speed: [.06, .1], colors: [0x90ff90, 0xb8ffb0], fade: 2 }));
  // lightning far off behind the house now and then
  const sky = add(glowSpr(0xd8e4ff, 0)); sky.scale.set(420, 120, 1); sky.position.set(0, 14, -236); sky.visible = false;
  const bolt = []; let by = 40, bxp = lr(-40, -12);
  while (by > 2) { const ny = by - lr(2, 4), nx = bxp + lr(-2.5, 2.5); bolt.push({ x: (bxp + nx) / 2, y: (by + ny) / 2, z: -230, w: Math.abs(nx - bxp) + .5, h: by - ny, d: .5, c: 0xeef4ff }); by = ny; bxp = nx; }
  const boltM = add(pxBoxes(bolt, glowM(false))); boltM.visible = false;
  const lights = [[0xff9a30, 3.5, 6, P1[0], P1[1] + .3, P1[2]], [0xff9a30, 5, 9, P2[0], P2[1] + .25, P2[2]]].map(([c, i, d, x, y, z]) => { const l = add(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  const lit0 = litOf([0x6a70a8, 0x2a3a2a, 0xb8c8f0, 0x9aff9a, 0x6a5a7a], [.65, .85, 1.2, .4], [-5, 6, 6]);
  let strike = -1, big = false, nextStrike = 6, allLit = 0, gt = 0;
  return {
    g, sky: null, fog, lit: lit0,
    hey() { strike = 0; big = true; allLit = 6; gt = 0; },
    tick(dt, t) {
      lobbyClock(t); [stars, wisps].forEach(motesQ);
      clouds.position.x = Math.sin(t * .012) * 30;
      if ((nextStrike -= dt) < 0) { strike = 0; big = false; nextStrike = lr(12, 24); }
      let f = 0;
      if (strike >= 0) { strike += dt; f = (strike < .1 ? 1 : strike < .18 ? .2 : strike < .3 ? .8 : Math.max(0, 1 - (strike - .3) * 3)) * (big ? 1 : .45); boltM.visible = big && (strike < .1 || (strike > .18 && strike < .3)); if (strike > 1) { strike = -1; boltM.visible = false; } }
      sky.visible = f > 0; sky.material.opacity = f * .35; lit0.i[1] = .85 + f * 1.6;
      allLit = Math.max(0, allLit - dt); const on = Math.min(1, allLit);
      winM.color.setRGB(.03 + .97 * on, .03 + .97 * on, .05 + .95 * on);
      flickM.color.setScalar(Math.sin(t * 13) > .2 || Math.sin(t * 3.1) > .6 ? 1 : .25);
      gt += dt; const gk = (gt % 14) / 14, go = Math.sin(Math.min(1, gk / .7) * Math.PI); // the ghost drifts across and fades
      ghost.material.opacity = go * .55; ghost.visible = go > .01; ghost.position.set(4 + gk * 6, 1.6 + Math.sin(t * 1.7) * .25, -21);
      const fl = Math.sin(t * 9) * .4 + Math.sin(t * 23) * .3;
      lights[0].intensity = 3.5 + fl; lights[1].intensity = 5 + fl * 1.2;
    },
  };
};
// ---- the moon base: you on its landing pad, the Earth over the hills, a rocket on the far pad, domes, a rover
// the moon's sky: stars as square pixels, twinkling, fading as they set; the Milky Way a glowing band of pixels with dark lanes
function moonStars(n, M) { // half along the Milky Way (M turns them onto it), the rest in the belt of sky that ever comes into view
  const pos = [], s = [], c = [], C = new THREE.Color(), R = 250, v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) { const l = Math.random() < .3 ? lr(-.7, .7) : lr(-Math.PI, Math.PI), b = (Math.random() + Math.random() + Math.random() - 1.5) * .16; v.set(Math.cos(l) * Math.cos(b), Math.sin(b), Math.sin(l) * Math.cos(b)).applyMatrix4(M); }
    else { const y = lr(-.3, .5), r = Math.sqrt(1 - y * y), a = lr(0, Math.PI * 2); v.set(r * Math.cos(a), y, r * Math.sin(a)); }
    pos.push(v.x * R, v.y * R, v.z * R);
    const r = Math.random(), big = r > .985 ? 3 : r > .9 ? 2 : 1;
    s.push(big * .19, big > 1 ? lr(.75, 1) : lr(.3, .75), lr(.15, .5), Math.random());
    C.set(Math.random() < .06 ? lPick([0xffc890, 0xffb080]) : lPick([0xffffff, 0xe4ecff, 0xd0dcff, 0xfff4e0])); c.push(C.r, C.g, C.b);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('s', new THREE.Float32BufferAttribute(s, 4)); geo.setAttribute('c', new THREE.Float32BufferAttribute(c, 3));
  const m = skyBack(new THREE.Points(geo, starMat(LOB_T, LOB_K))); m.userData.n = n; return m;
}
LOBBY_MAKE.moon = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0x050507], [0, 0x0e0e16], [.03, 0x060609], [1, 0x000002]]));
  const fog = new THREE.Fog(0x0e0e16, 200, 600);
  const dust = c => { fillN(c, 16, 16, [118, 118, 124], 10); for (let i = 0; i < 7; i++) dot(c, rgb(lPick([[92, 92, 98], [146, 146, 150], [104, 102, 106]])), Math.random() * 16 | 0, Math.random() * 16 | 0); };
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lam({ map: tex(dust, 600, 600) }))); ground.rotation.x = -Math.PI / 2;
  const flat = [], glow = [];
  // craters: a rim, the floor's left side in shadow (the sun is off to the left)
  const crater = (x, z, R, s = 1 / TX) => {
    x = snap(x); z = snap(z); const n = Math.round(R / s), rw = Math.max(2 * s, R * .14), rh = Math.min(.45, .06 + R * .03), c0 = .34 * R;
    for (let j = -n - Math.ceil(rw / s); j < n + Math.ceil(rw / s); j++) {
      const zz = (j + .5) * s, a = Math.sqrt(Math.max(0, R * R - zz * zz)), o = Math.sqrt(Math.max(0, (R + rw) ** 2 - zz * zz)), row = (x0, x1, y0, y1, c) => x1 - x0 > .01 && flat.push({ x: x + (x0 + x1) / 2, y: (y0 + y1) / 2, z: z + zz, w: x1 - x0, h: y1 - y0, d: s, c });
      if (a > 0) { row(-o, -a, 0, rh, 0x8e8e94); row(a, o, 0, rh, 0x9a9aa0); const e = Math.min(a, c0 - a); row(-a, e, 0, .012, 0x46464c); row(e, a, 0, .012, 0x6c6c72); }
      else row(-o, o, 0, rh, 0x949499);
    }
  };
  for (const c of [[-2.5, -13, 1.6], [4.5, -19, 2.4], [1.5, -30, 3.5, .125], [-21, -50, 7, .25], [19, -72, 9, .25], [-6, -96, 12, .5], [-48, -120, 14, .5], [34, -124, 15, .5]]) crater(...c);
  // the rover's tracks, back the way it came
  for (const side of [-.78, .78]) for (let k = 0; k < 120; k++) {
    const t = k / 120, x = -5.6 - 9 * t - 3 * Math.sin(t * Math.PI), z = -5.2 - 30 * t, dx = -9 - 3 * Math.PI * Math.cos(t * Math.PI), dz = -30, l = Math.hypot(dx, dz), r = Math.atan2(-dz, dx);
    flat.push({ x: x - dz / l * side, y: .006, z: z + dx / l * side, w: .25, h: .012, d: .22, r, c: k & 1 ? 0x58585e : 0x626268 });
  }
  // the landing pad: plates, a yellow line, a hazard edge and a ring where you stand; lights round its corners
  const plate = ringsTex(96, (r, a) => {
    const x = r * Math.cos(a) + 160, y = r * Math.sin(a) + 160, da = ((a % 1.0472) + 1.0472) % 1.0472 - .5236, hd = r * Math.cos(da) / .866, tk = ((a - .5236) % 1.0472 + 1.0472) % 1.0472;
    if (hd > 44.5) return [74, 76, 82];
    if (hd > 39) return ((x + y) / 4.5 | 0) % 2 ? [226, 182, 40] : [38, 38, 42];
    if (Math.abs(hd - 33.5) < .9 || Math.abs(r - 19) < 1 || (r > 22 && r < 28 && Math.min(tk, 1.0472 - tk) * r < .9)) return [226, 182, 40];
    if (x % 16 < 1 || y % 16 < 1) return [70, 72, 78];
    if (x % 16 > 2 && x % 16 < 3 && y % 16 > 2 && y % 16 < 3) return [96, 98, 104];
    const v = (((x / 16 | 0) * 7 + (y / 16 | 0) * 13) % 5 - 2) * 4; return [150 + v, 152 + v, 158 + v];
  });
  const side = pxTex(16, 16, c => { fillN(c, 16, 16, [92, 94, 102], 8); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) { dot(c, rgb([156, 158, 164]), x, y); if (x % 8 === 3) dot(c, rgb([58, 60, 66]), x, y + 2); } }); // a bright edge every 4 pixels, so the pad's side shows one
  add(pxBoxes([...pxBlob(hexR(40), -.25, .25).map(b => ({ ...b, c: 0x8a8c94 })), ...pxBlob(hexR(46), .25, .5)], [pxMat(side), pxMat(plate)], { end: 'y', ew: 96 }));
  const PL = [...Array(6)].map((_, k) => ({ x: Math.cos(k * 1.0472) * 2.72, y: .53, z: Math.sin(k * 1.0472) * 2.72, w: .1875, h: .0625, d: .1875, c: 0xffb030 }));
  const padL = add(pxBoxes(PL, glowM()));
  // the floodlight over the pad, and path lights out to the greenhouse
  const FX = 2.9375, FZ = -2.4375;
  flat.push({ x: FX, y: .0625, z: FZ, w: .5, h: .125, d: .5, c: 0x5a5c64 }, { x: FX, y: 1.6875, z: FZ, w: .125, h: 3.125, d: .125, c: 0x7a7c84 }, { x: FX, y: 3.28125, z: FZ, w: .875, h: .0625, d: .125, c: 0x6a6c74 });
  for (const k of [-1, 1]) flat.push({ x: FX + k * .3125, y: 3.1875, z: FZ, w: .25, h: .125, d: .25, c: 0x9a9ca4 }), glow.push({ x: FX + k * .3125, y: 3.09375, z: FZ, w: .125, h: .0625, d: .125, c: 0xf4f8ff });
  const fl = add(glowSpr(0xdce8ff, .3)); fl.scale.setScalar(1.3); fl.position.set(FX, 3.05, FZ);
  for (let k = 0; k < 8; k++) { const t = k / 7, x = -1.8 - 6.2 * t, z = -3.8 - 20 * t; for (const s of [-1.1, 1.1]) { const px = snap(x + s * .96), pz = snap(z - s * .3); flat.push({ x: px, y: .1875, z: pz, w: .125, h: .375, d: .125, c: 0x8a8c94 }, { x: px, y: .53125, z: pz, w: .125, h: .0625, d: .125, c: 0x8a8c94 }); glow.push({ x: px, y: .4375, z: pz, w: .125, h: .125, d: .125, c: 0x8ad0ff }); } } // bollards, their tops lit
  // the greenhouse, the big dome and one off to the right, a tube between the two on the left
  const DL = new THREE.Vector3(-.6, .5, .45).normalize(), dv = new THREE.Vector3(), dc = new THREE.Color();
  const dome = (x, z, R, H, s, base, glass, a0 = 0, a1 = 0) => { // shaded by hand so its steps don't show; its windows are cells of its shell, lit, between angles a0 and a1
    const n = Math.round(H / s);
    for (let k = 0; k < n; k++) {
      const y0 = k * s, r = R * Math.sqrt(1 - (y0 / H) ** 2), gl = glass && k > 1, c = k === 0 ? base : gl ? (k & 1 ? 0x5ab868 : 0x4aa05a) : k % 3 === 2 ? 0xd4d4da : 0xe6e6ea, win = new Set();
      if (y0 <= 1.3 && 1.3 < y0 + s) for (let a = a0; a < a1; a += .16) { let q = ''; for (let d = 0; d < r; d += s / 4) { const i = Math.floor(Math.cos(a) * d / s), j = Math.floor(Math.sin(a) * d / s); if (Math.hypot((i + .5) * s, (j + .5) * s) < r) q = i + ',' + j; } win.add(q); }
      let cells = cellBlob(() => r, y0, y0 + s, s, () => Math.max(0, r - s * 2.5));
      if (win.size) cells = cells.flatMap(b => [...Array(Math.round(b.w / s))].map((_, q) => ({ ...b, x: b.x - b.w / 2 + (q + .5) * s, w: s })));
      glow.push(...lAt(cells.map(b => ({ ...b, c: win.has(Math.floor(b.x / s) + ',' + Math.floor(b.z / s)) ? 0xffd890 : gl ? c : dc.setHex(c).multiplyScalar(.42 + .58 * Math.max(0, dv.set(b.x / R, (y0 + s / 2) / H, b.z / R).normalize().dot(DL))).getHex() })), x, 0, z));
    }
  };
  dome(-8, -28, 3.6, 3, .25, 0x8a8c94, true); dome(-17, -40, 8, 5.2, .4, 0x7a7c84, false, .25, 1.1); dome(15, -36, 5.5, 4, .4, 0x7a7c84, false, 1.5, 2.6);
  for (const [x, z] of [[-8, -24.3], [15, -30.4]]) { const zf = snap(z + 1.1); flat.push({ x, y: .90625, z: zf - .59375, w: 1.75, h: 1.8125, d: 1.1875, c: 0xd0d0d6 }); glow.push({ x, y: .75, z: zf + .03125, w: .75, h: 1.25, d: .0625, c: 0xffcc70 }); } // airlocks
  { const ax = -8 - 3.6 * .6, az = -28 - 3.6 * .8, bx = -17 + 8 * .6, bz = -40 + 8 * .8, l = Math.hypot(bx - ax, bz - az) + 1, r = Math.atan2(-(bz - az), bx - ax);
    for (let j = -11; j < 11; j++) { const y = (j + .5) / TX, h = Math.sqrt(121 - (j + .5) ** 2) / TX; flat.push({ x: (ax + bx) / 2, y: .75 + y, z: (az + bz) / 2, w: l, h: 1 / TX, d: 2 * h, r, c: j > 6 ? 0xe8e8ec : 0xd4d4da }); } }
  // containers, the comms tower and its dish
  { const cb = []; for (const [x, y, c] of [[-1.1875, 0, 0xd86a2a], [1.1875, 0, 0xe4e4e8], [0, 1.25, 0x2a5a9a]]) { cb.push({ x, y: y + .625, z: 0, w: 2.375, h: 1.25, d: 1.25, c }); for (let k = -3; k <= 3; k++) cb.push({ x: x + k * .3125, y: y + .625, z: 0, w: .0625, h: 1.125, d: 1.375, c: new THREE.Color(c).multiplyScalar(.8).getHex() }); }
    const cm = add(pxBoxes(cb, solidM())); cm.position.set(11.5, 0, -24.3); cm.rotation.y = .25; }
  const TW = [22, -46];
  for (const [dx, dz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) flat.push({ x: TW[0] + dx, y: 2.375, z: TW[1] + dz, w: .125, h: 4.75, d: .125, c: 0xb0b2ba });
  for (let y = .8125; y < 4.7; y += .8125) for (const [dx, dz, w, d] of [[0, -.5, .875, .0625], [0, .5, .875, .0625], [-.5, 0, .0625, .875], [.5, 0, .0625, .875]]) flat.push({ x: TW[0] + dx, y, z: TW[1] + dz, w, h: .0625, d, c: 0x9a9ca4 });
  flat.push({ x: TW[0], y: 4.8125, z: TW[1], w: 1.25, h: .125, d: 1.25, c: 0x8a8c94 }, { x: TW[0], y: 5, z: TW[1], w: .125, h: .25, d: .125, c: 0x8a8c94 });
  const dish = new THREE.Group(), dishIn = [];
  for (const [r1, r0, y0] of [[5, 0, 0], [10, 4, .04], [15, 9, .12], [20, 14, .26], [24, 19, .44]]) dishIn.push(...pxRing(r1, r0, y0, y0 + .08, { c: 0xe8e8ec }));
  dishIn.push({ x: 0, y: .5, z: 0, w: .125, h: 1, d: .125, c: 0x8a8c94 }, { x: 0, y: 1, z: 0, w: .25, h: .25, d: .25, c: 0xd8dae0 });
  const dm = pxBoxes(dishIn, solidM()); dm.rotation.x = .85; dish.add(dm); dish.position.set(TW[0], 5.125, TW[1]); add(dish);
  const beacon = add(pxBoxes([{ x: TW[0], y: 4.9375, z: TW[1] + .5, w: .125, h: .125, d: .125, c: 0xff3030 }, { x: 9.1875, y: 6.4625, z: -58, w: .125, h: .125, d: .125, c: 0xff3030 }], glowM()));
  // the rocket on its pad, its gantry beside it
  const RX = 6.5, RZ = -58;
  flat.push(...lAt(cellBlob(hexR(4), 0, .4, .25), RX, 0, RZ).map(b => ({ ...b, c: 0x7c7c82 })), { x: RX, y: .41, z: RZ, w: 1.4, h: .02, d: 1.4, c: 0x2a2a30 });
  for (const [dx, dz] of [[-.55, -.55], [.55, -.55], [-.55, .55], [.55, .55]]) flat.push({ x: RX + 2.7 + dx, y: 3.2, z: RZ + dz, w: .12, h: 6.4, d: .12, c: 0xc8504a });
  for (let y = .6; y < 6.4; y += .6) flat.push({ x: RX + 2.7, y, z: RZ + .55, w: 1, h: .08, d: .08, c: 0xb8443e }, { x: RX + 2.7, y, z: RZ - .55, w: 1, h: .08, d: .08, c: 0xb8443e });
  for (const y of [3.2, 5.4]) flat.push({ x: RX + 1.9, y, z: RZ, w: 1.9, h: .12, d: .3, c: 0x9a9ca4 });
  const rk = new THREE.Group(), rkB = [], rkG = [], ring = (r, y0, y1, c) => rkB.push(...pxRing(r, 0, y0, y1, { c }));
  ring(7, 0, .3, 0x5a5a60); ring(8, .3, .55, 0x4a4a50); ring(9, .55, .8, 0x3e3e44);
  ring(10, .8, 3.4, 0xf0f0f2); ring(11, 3.4, 3.8, 0xd83a2a); ring(10, 3.8, 5.2, 0xf0f0f2);
  for (const [r, y0, y1] of [[9.5, 5.2, 5.55], [8.5, 5.55, 5.9], [7.5, 5.9, 6.2], [6, 6.2, 6.5], [4.5, 6.5, 6.75], [3, 6.75, 6.95], [1.5, 6.95, 7.1]]) ring(r, y0, y1, 0xd83a2a);
  for (let f = 0; f < 4; f++) { const th = .785 + f * 1.5708; for (let k = 0; k < 6; k++) { const e = 1.3 - k * .12, rc = (.55 + e) / 2; rkB.push({ x: Math.cos(th) * rc, y: .325 + k * .35, z: Math.sin(th) * rc, w: e - .55, h: .35, d: .125, r: -th, c: 0xc83426 }); } }
  for (const y of [2.625, 4.4375]) { rkB.push({ x: 0, y, z: .65625, w: .375, h: .375, d: .0625, c: 0x8a8c94 }); rkG.push({ x: 0, y, z: .71875, w: .25, h: .25, d: .0625, c: 0x9ad8ff }); }
  rk.add(pxBoxes(rkB, solidM()), pxBoxes(rkG, glowM()));
  const flame = lobFlame(2.4); flame.rotation.x = Math.PI; flame.visible = false; rk.add(flame);
  rk.position.set(RX, .4, RZ); add(rk);
  // the rover, its camera looking about
  const rv = new THREE.Group(), rvB = [], rvG = [], Q = (x0, x1, y0, y1, z0, z1, c) => ({ x: (x0 + x1) / 32, y: (y0 + y1) / 32, z: (z0 + z1) / 32, w: (x1 - x0) / 16, h: (y1 - y0) / 16, d: (z1 - z0) / 16, c }); // in pixels
  for (const x of [-14, 0, 14]) for (const s of [-1, 1]) rvB.push(Q(x - 4, x + 4, 0, 8, s > 0 ? 10 : -14, s > 0 ? 14 : -10, 0x3a3a3e), Q(x - 1, x + 1, 3, 5, s > 0 ? 14 : -15, s > 0 ? 15 : -14, 0x9a9aa0)); // wheels and hubs
  for (const s of [-1, 1]) rvB.push(Q(-18, 18, 8, 10, s > 0 ? 9 : -10, s > 0 ? 10 : -9, 0x8a8a90)); // the rails they hang from
  rvB.push(Q(-14, 14, 8, 10, -8, 8, 0xd8a840), Q(-15, 15, 10, 18, -9, 9, 0xe8e8ea), Q(-18, 18, 18, 19, -12, 12, 0x3a3e48)); // chassis, body, the panel's frame
  for (const [x0, x1] of [[-17, -11], [-10, -4], [-3, 3], [4, 10], [11, 17]]) for (const [z0, z1] of [[-11, -1], [1, 11]]) rvB.push(Q(x0, x1, 19, 20, z0, z1, 0x2a4a8a)); // its cells
  rvB.push(Q(9, 11, 20, 34, -6, -4, 0xb0b2ba), Q(-15, -14, 20, 30, 7, 8, 0xb0b2ba), Q(-13, -11, 20, 24, 5, 7, 0x8a8c94)); // the camera's mast, an aerial, the dish's post
  rvG.push(Q(15, 16, 13, 15, -8, -5, 0xfff0c0), Q(15, 16, 13, 15, 5, 8, 0xfff0c0)); // headlights
  const rd = pxBoxes([...pxRing(5, 0, 0, 1 / 16, { c: 0xd8dae0 }), ...pxRing(6, 5, 1 / 16, 2 / 16, { c: 0xe8e8ec }), { x: 0, y: .15625, z: 0, w: .125, h: .1875, d: .125, c: 0x8a8c94 }, { x: 0, y: .28125, z: 0, w: .25, h: .0625, d: .25, c: 0x6a6c74 }], solidM()); rd.position.set(-.75, 1.5, .375); rd.rotation.z = .5; // a little dish, its rim, its feed
  const cam = new THREE.Group(); cam.add(pxBoxes([Q(-3, 3, -2, 2, -4, 4, 0xe8e8ea), Q(3, 4, -1, 1, -3, -1, 0x1a1a20), Q(3, 4, -1, 1, 1, 3, 0x1a1a20)], solidM())); // its head, two lenses
  cam.position.set(.625, 2.25, -.3125); rv.add(pxBoxes(rvB, solidM()), pxBoxes(rvG, glowM()), rd, cam);
  rv.position.set(-4.6, 0, -4.4); rv.rotation.y = -.5; add(rv);
  // the Earth, a block lit from the left, turning, its cities lit on the night side
  const ED = new THREE.Vector3(-.0748, .0558, -.9956).multiplyScalar(215).add(new THREE.Vector3(0, 2.58, 7.7)), EF = earthFaces();
  const eh = add(skyBack(glowSpr(0x4a8aff, .22))); eh.scale.setScalar(34); eh.position.copy(ED).multiplyScalar(1.004);
  const earth = add(skyCube(EF.day, new THREE.Vector3(-.8, .25, .55), { amb: .05, night: EF.night, spin: .07, tilt: [.25, .41] })); earth.scale.setScalar(9.5); earth.position.copy(ED);
  // far hills, stars, a satellite going over
  add(pxBoxes([...lobRange(-195, 4, [2.5, 6], { rock: 0x3c3c46, cap: 0x4c4c56, snow: 4, cell: 1, jit: .05 }), ...lobRange(-150, 0, [.6, 2.4], { rock: 0x6a6a72, cap: 0x7a7a84, snow: 1.8, roll: true, cell: 1, jit: .08 })], glowM(false))); // far hills, their crests in the sun
  const sky = add(new THREE.Group()), spin = new THREE.Group(), gal = new THREE.Group(); sky.position.set(0, 2.58, 7.7); sky.add(spin); spin.add(gal);
  sky.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(.5, .866, 0)); gal.rotation.set(.14, 0, 0); gal.updateMatrix(); // the pole up on your right, so the stars set slantwise past the Earth; the Milky Way near its equator, always in view
  const stars = moonStars(30000, gal.matrix); spin.add(stars); gal.add(skyBand(248));
  const sat = add(pxBoxes([{ x: 0, y: 0, z: 0, w: .4, h: .4, d: .4, c: 0xd8b050 }, { x: -.85, y: 0, z: 0, w: 1.2, h: .04, d: .45, c: 0x3a5aa8 }, { x: .85, y: 0, z: 0, w: 1.2, h: .04, d: .45, c: 0x3a5aa8 }, { x: 0, y: .3, z: 0, w: .06, h: .2, d: .06, c: 0xc8c8cc }], glowM(false)));
  add(pxBoxes(flat, solidM())); add(pxBoxes(glow, glowM()));
  const bits = add(lobbyBits(160, .3, false, .9)), fire = add(lobbyBits(90, .35));
  const lights = [[0xdce8ff, 4, 9, 2, 2.6, -1.5], [0xffc070, 3, 7, -3.7, .95, -3.6]].map(([c, i, d, x, y, z]) => { const l = add(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  const lit = litOf([0x5a6070, 0x3a3a40, 0xfff8f0, 0x7a9cff, 0x8a8a90], [.6, 1.9, .55, .45], [-6, 5, 4]);
  const padC = padL.geometry.attributes.color, C = new THREE.Color();
  let ht = -1, satT = 10, ventT = 3;
  return {
    g, sky: null, fog, lit,
    hey() { if (ht < 0) ht = 0; },
    tick(dt, t) {
      lobbyClock(t); motesQ(stars); spin.rotation.y = -t * Math.PI * 2 / 300; // once round every five minutes
      // the rocket: lights, ignition, lift-off, away, then back down
      if (ht >= 0) {
        ht += dt; let y = 0, on = 0;
        if (ht < 1.4) on = Math.min(1, ht / .4);
        else if (ht < 8) { y = 2 * (ht - 1.4) ** 2; on = 1; }
        else if (ht < 12) { y = 99; rk.visible = false; }
        else if (ht < 17) { const s = (ht - 12) / 5; y = 60 * (1 - s) ** 2; on = .7; rk.visible = true; }
        else { ht = -1; rk.visible = true; }
        rk.position.set(RX + (on && y < 1 ? Math.sin(t * 60) * .025 : 0), .4 + y, RZ);
        flame.visible = on > 0 && rk.visible; flame.scale.setScalar(on * (.9 + Math.sin(t * 40) * .1)); flame.userData.tick(t * 1.6);
        if (on && rk.visible) {
          for (let i = 0; i < 2; i++) fire.userData.throw(RX + lr(-.3, .3), .4 + y - .3, RZ + lr(-.3, .3), lr(-.6, .6), lr(-9, -5), lr(-.6, .6), lr(.2, .45), lPick([0xffe090, 0xffa040, 0xff6020]), 0);
          if (y < 3) for (let i = 0; i < 3; i++) { const a = lr(0, 6.28), v = lr(3, 7); bits.userData.throw(RX + Math.cos(a) * 1.2, .5, RZ + Math.sin(a) * 1.2, Math.cos(a) * v, lr(.6, 2.2), Math.sin(a) * v, lr(1.4, 2.4), lPick([0x9a9aa0, 0xb0b0b6, 0x86868c])); }
        }
      } else if ((ventT -= dt) < 0) { ventT = lr(3, 6); for (let i = 0; i < 8; i++) bits.userData.throw(RX + .62, 3.4 + lr(-.1, .1), RZ + .2, lr(.6, 1.6), lr(-.2, .4), lr(-.4, .4), lr(.6, 1.1), 0xf0f4f8); } // venting
      fire.userData.tick(dt, 0); bits.userData.tick(dt, 1.62);
      // pad lights going round (all at once while the rocket goes), the beacons, the dish and the rover's camera
      const fast = ht >= 0 && ht < 8;
      for (let k = 0; k < 6; k++) { const on = fast ? Math.sin(t * 14) > 0 : ((t * 2.4 - k) % 6 + 6) % 6 < 1; C.setHex(fast ? 0x60ff80 : 0xffb030).multiplyScalar(on ? 1 : .18); for (let v = 0; v < 24; v++) padC.setXYZ(k * 24 + v, C.r, C.g, C.b); }
      padC.needsUpdate = true;
      beacon.visible = (t % 1.6) < .25 || fast && Math.sin(t * 9) > 0;
      dish.rotation.y = Math.sin(t * .15) * .6 - .4;
      cam.rotation.y = Math.sin(t * .4) * .9 + Math.sin(t * .13) * .5;
      // the satellite: across the sky, a long wait, across again
      satT += dt; const sk = (satT % 80) / 50; sat.visible = sk < 1; sat.position.set(-90 + sk * 180, 11.5, -120); sat.rotation.y = t * .3;
    },
  };
};
// ---- the reef: you on a brain coral on the sea floor, corals and sponges round you, fish going by, a jellyfish glowing over you, a wreck far off in the blue
const CAUSTIC_VS = `varying vec3 vW; varying float vN;
void main() { vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal).y; gl_Position = projectionMatrix * viewMatrix * w; }`;
const CAUSTIC_FS = `uniform float t, a; uniform vec3 c; varying vec3 vW; varying float vN;
vec2 h22(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float net(vec2 p, float s) { // bright where two cells meet
  vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(x, y), o = .5 + .4 * sin(s + 6.2831 * h22(i + g)); float d = length(g + o - f); d2 = min(d2, max(d1, d)); d1 = min(d1, d); }
  return 1. - smoothstep(0., .09, d2 - d1);
}
void main() {
  vec2 q = (floor(vW.xz * 16.) + .5) / 16.;
  float far = smoothstep(.04, .2, length(fwidth(vW.xz))), k = mix(net(q * 1.2, t * .5) * .7 + net(q * 1.9 + 7., t * .7) * .45, .2, far);
  gl_FragColor = vec4(c, a * k * max(vN, 0.) * (1. - smoothstep(12., 60., length(vW - cameraPosition))));
#include <colorspace_fragment>
}`;
// light coming down through the water in slow shimmering shafts
const RAY_VS = `attribute float ph; varying vec2 vU; varying float vP; void main() { vU = uv; vP = ph; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const RAY_FS = `uniform float t; uniform vec3 c; varying vec2 vU; varying float vP;
void main() { gl_FragColor = vec4(c, smoothstep(0., .1, vU.y) * (1. - smoothstep(.45, 1., vU.y)) * sin(vU.x * 3.1416) * (.45 + .55 * sin(t * .45 + vP * 6.3)) * .14);
#include <colorspace_fragment>
}`;
LOBBY_MAKE.reef = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0x0a3440], [0, 0x1c7484], [.08, 0x2a92a2], [.25, 0x4ab8c4], [1, 0x8ae0e4]]));
  const fog = new THREE.Fog(0x1c7484, 6, 80);
  const sandDraw = c => { fillN(c, 16, 16, [206, 190, 148], 10); for (let x = 0; x < 16; x++) for (const y0 of [4, 12]) { const y = y0 + Math.round(1.5 * Math.sin(x / 16 * Math.PI * 2)); dot(c, rgb([226, 212, 172]), x, y); dot(c, rgb([184, 168, 128]), x, y + 1); } };
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lam({ map: tex(sandDraw, 600, 600) }))); ground.rotation.x = -Math.PI / 2;
  const caM = (a, off) => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: off, polygonOffsetFactor: -1, polygonOffsetUnits: -2, vertexShader: CAUSTIC_VS, fragmentShader: CAUSTIC_FS, uniforms: { t: LOB_T, a: { value: a }, c: { value: new THREE.Color(0xd8fff4) } } });
  const caus = add(new THREE.Mesh(new THREE.PlaneGeometry(160, 160), caM(.24, false))); caus.rotation.x = -Math.PI / 2; caus.position.set(0, .02, -50);
  // the brain coral you stand on: its ridges wander about (a tile that meets itself all round)
  const brain = pxTex(96, 96, c => {
    const L = [...Array(144)].map(() => Math.random()), at = (i, j, N) => L[((j % N + N) % N) * N + ((i % N + N) % N)];
    const pn = (x, y, N) => { const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, U = u * u * (3 - 2 * u), V = v * v * (3 - 2 * v); return (at(i, j, N) * (1 - U) + at(i + 1, j, N) * U) * (1 - V) + (at(i, j + 1, N) * (1 - U) + at(i + 1, j + 1, N) * U) * V; };
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { const f = ((pn(x / 16, y / 16, 6) * .75 + pn(x / 8 + 3, y / 8 + 7, 12) * .25) * 4.5) % 1; dot(c, rgb(f < .2 ? [150, 84, 88] : f < .3 || f > .92 ? [198, 128, 120] : [230, 168, 150], (Math.random() - .5) * 8), x, y); }
  });
  const brainS = pxTex(32, 32, c => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const f = ((x + 2 * Math.sin(y / 16 * Math.PI * 2)) % 8 + 8) % 8; dot(c, rgb(f < 2 ? [150, 84, 88] : f < 3 ? [198, 128, 120] : [218, 156, 140], (Math.random() - .5) * 8), x, y); } });
  const P = [lr(0, 6), lr(0, 6), lr(0, 6)], top = [...pxBlob(lumpy(43, .05, P), .375, .5), ...pxBlob(lumpy(46, .06, [P[1], P[2], P[0]]), .125, .375)];
  add(pxBoxes([...top, ...pxBlob(lumpy(44, .07, [P[2], P[0], P[1]]), -.25, .125)], [pxMat(brainS), pxMat(brain)], { end: 'y', ew: 96, tw: 32 }));
  add(pxBoxes(top, caM(.18, true)));
  const solid = [], sway = [], glow = [], coral = [], tips = [];
  // reef rock, speckled, with corals on it
  const rock = (x, z, R, h, cs) => { const rb = [], bits = []; for (let k = 0, y = 0; y < h; k++, y += .25) { const r = R * Math.sqrt(1 - (y / (h + .25)) ** 2); rb.push(...lAt(cellBlob(lumpy(r, .18, [k * .7, 1 + k * .3, 2]), y, y + .25, .25), x, 0, z).map(b => ({ ...b, c: lPick(cs) }))); } solid.push(...rb); for (let i = 0; i < R * 6; i++) { const a = lr(0, 6.3), y = Math.floor(lr(0, h - .125) * 8) / 8, [bx, bz] = pxClear(rb, x, z, y, y + .125, Math.cos(a), Math.sin(a), 2); if (bits.some(([qx, qy, qz]) => Math.abs(qx - bx) < .125 && Math.abs(qy - y) < .125 && Math.abs(qz - bz) < .125)) continue; bits.push([bx, y, bz]); solid.push({ x: bx, y: y + .0625, z: bz, w: .125, h: .125, d: .125, c: lPick([0xe84a8a, 0x4ad8a0, 0xf0d040, 0x8a5ae8, 0xff8a4a]) }); } }; // with bits of colour growing on its sides
  const RC = [0xa88a96, 0xb89a9a, 0x9a8aa6, 0xc0a090], ROCKS = [[-7, -10, 2.6, 1.5], [7.5, -12, 3, 2], [-3.5, -17, 1.2, .7], [4, -20, 1.4, .8], [-12, -22, 2, 1.4], [13, -24, 2.2, 1.6], [-20, -34, 3.5, 2.4], [17, -34, 3.2, 2.2]];
  for (const r of ROCKS) rock(...r, RC);
  const SPIRES = [[-16, -41, 2, 5, [0xc86a8a, 0xd8905a]], [20, -41, 1.8, 5, [0x8a6ac8, 0x6ab8a8]], [-12, -60, 2, 7, [0xd8a85a, 0xc86a6a]], [14, -60, 2.2, 6.5, [0x6ab88a, 0xc8b86a]], [-34, -36, 2.4, 6.5, [0xc8b86a, 0xc86a8a]], [36, -38, 2, 6, [0xd8905a, 0x8a6ac8]]]; // pinnacles far off
  const room = (x, z) => Math.hypot(x - 4, z + 48) > 13.5 && Math.abs(Math.hypot(x, z + 20) - 13) > 2.5 && (z > -42 || z < -50) && Math.hypot(x + 24, z + 58) > 9.5 && [...ROCKS, ...SPIRES].every(([a, b, r]) => Math.hypot(x - a, z - b) > r * 1.5 + .5); // clear of the manta's and the turtle's rounds, the whale's way, the wreck, rocks and pinnacles
  const stag = (x, y, z, h, c1, c2) => { // antlers branching up, paler at the tips
    const cube = (p, w, c) => (c === c2 ? tips : coral).push({ x: p[0], y: p[1], z: p[2], w, h: w, d: w, c });
    const br = (p, d, len, w, dep) => {
      const n = Math.max(1, Math.round(len / (w * .8)));
      for (let k = 1; k <= n; k++) cube([p[0] + d[0] * len * k / n, p[1] + d[1] * len * k / n, p[2] + d[2] * len * k / n], w, dep === 0 && k > n - 2 ? c2 : c1);
      const q = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
      if (dep > 0) for (let i = 0; i < 2; i++) { const a = lr(0, 6.3); br(q, new THREE.Vector3(d[0] + Math.cos(a) * .7, d[1] + lr(.1, .5), d[2] + Math.sin(a) * .7).normalize().toArray(), len * lr(.6, .8), Math.max(.0625, w * .8), dep - 1); }
      else cube(q, w * 1.1, c2);
    };
    for (let i = 0; i < 3; i++) { const a = lr(0, 6.3); br([x, y, z], new THREE.Vector3(Math.cos(a) * .4, 1, Math.sin(a) * .4).normalize().toArray(), h * .45, .125, 2); }
  };
  for (const [x, y, z, h, c1, c2] of [[-7.2, 1.5, -10.2, 1, 0xf07a3a, 0xffc890], [-5, 0, -21, 1.1, 0x9a4ad8, 0xe0b0ff], [3.8, .8, -20, .9, 0xe8c838, 0xfff0a0], [-11.6, 1.4, -22, 1.2, 0xf07a3a, 0xffc890], [12.6, 1.6, -24, 1.1, 0x9a4ad8, 0xe0b0ff], [-2.6, 0, -9.5, .7, 0x4ad8c0, 0xb0fff0]]) stag(x, y, z, h, c1, c2);
  const table = (x, y, z, R, h, c, rim) => { const p = [lr(0, 6), lr(0, 6), lr(0, 6)]; solid.push(...lAt(pxRing(3, 0, y, y + h, { c }), x, 0, z), ...lAt(pxBlob(lumpy(R, .12, p), y + h, y + h + .0625), x, 0, z).map(b => ({ ...b, c: rim })), ...lAt(pxBlob(lumpy(R - 2, .12, p), y + h + .0625, y + h + .125), x, 0, z).map(b => ({ ...b, c }))); };
  table(7.2, 2, -12.3, 22, .5, 0x3aa88a, 0x8ae0b8); table(-9, 0, -16, 18, .8, 0x4a9ab8, 0x9ad8f0); table(10, 0, -18.5, 16, .6, 0xc89a3a, 0xf0d890);
  const tubes = (x, y, z, n, cs) => { const at = []; for (let i = 0, tries = 0; i < n && tries < 60; tries++) { const r1 = lPick([4, 5]), px = snap(x + lr(-.6, .6)), pz = snap(z + lr(-.6, .6)); if (at.some(([qx, qz, q]) => Math.hypot(qx - px, qz - pz) * TX < r1 + q + 1)) continue; at.push([px, pz, r1]); i++; const h = lr(.5, 1.3), c = lPick(cs); solid.push(...lAt(pxRing(r1, r1 - 2, y, y + h, { c }), px, 0, pz), ...lAt(pxRing(r1 - 2, 0, y + h - .12, y + h - .06, { c: 0x2a1a2a }), px, 0, pz)); } }; // apart, so no two share a wall
  tubes(-5.2, 0, -7.5, 4, [0x8a3ab8, 0x9a4ac8]); tubes(5.8, 0, -8.2, 3, [0xe07030, 0xf08a3a]); tubes(-1.6, 0, -14.5, 3, [0xd8c040, 0xe8d050]);
  for (const [x, z, c] of [[-1.5, -6.5, 0xc8c050], [10.6, -9.2, 0xb8d050], [-8.5, -6.4, 0xd8a8c0], [2.2, -11, 0xa8c8e8]]) for (let k = 0, y = 0; k < 5; k++, y += .125) solid.push(...lAt(pxRing(Math.round(9 * Math.sqrt(1 - (y / .65) ** 2)), 0, y, y + .125, { c: k & 1 ? c : new THREE.Color(c).multiplyScalar(.8).getHex() }), x, 0, z)); // brain corals, little ones
  // sea fans (a net in a half disc, standing up), seagrass, tall weed at the sides, anemones: all swaying
  const fan = (x, y, z, R, r, c) => { for (let j = 0; j < R; j++) for (let i = -R; i < R; i++) { const d = Math.hypot(i + .5, j + .5); if (d < R * (.82 + .18 * Math.cos(Math.atan2(j + .5, i + .5) * 4)) && ((i + j) % 3 === 0 || (i - j) % 3 === 0 || j === 0)) { const u = (i + .5) / 8, v = (j + .5) / 8; sway.push({ x: x + u * Math.cos(r), y: y + v, z: z - u * Math.sin(r), w: .125, h: .125, d: .0625, r, c, b0: y, bh: R / 8 }); } } };
  fan(4.4, 0, -4.6, 10, -.3, 0xc83a6a); fan(-7.6, 1.5, -10.8, 8, .4, 0xe06a3a); fan(8.6, 2, -13.4, 9, -.2, 0x9a3ac8); fan(-3.2, 0, -12.5, 7, .2, 0xe0507a);
  const blade = (x, z, y0, h, w, cs, leaves) => { const n = Math.max(1, Math.round(h / .25)); for (let k = 0; k < n; k++) { const y = y0 + (k + .5) * h / n, c = lPick(cs); sway.push({ x: x + Math.sin(k * .9) * .03, y, z, w, h: h / n, d: w * .6, c, b0: y0, bh: h }); if (leaves && k > 1 && k % 2 === 0) sway.push({ x: x + (k % 4 ? .16 : -.16), y, z, w: .26, h: .06, d: .04, c, b0: y0, bh: h }); } };
  for (let i = 0; i < 34; i++) { const x = lr(-12, 12), z = lr(-30, -5); if (Math.hypot(x, z) < 4) continue; for (let k = 0; k < 5; k++) blade(x + lr(-.3, .3), z + lr(-.3, .3), 0, lr(.3, .8), .0625, [0x4a9a5a, 0x5aaa4a, 0x6ab85a], false); }
  for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { let x, z; do { x = s * lr(10, 18); z = lr(-34, -18); } while (!room(x, z)); blade(x, z, 0, lr(7, 11), .125, [0x6a8a3a, 0x7a9a42, 0x8a7a3a], true); }
  for (let i = 0; i < 28; i++) { let x, z; do { x = lPick([-1, 1]) * lr(14, 46); z = lr(-62, -22); } while (!room(x, z)); blade(x, z, 0, lr(8, 14), .25, [0x4a6a34, 0x5a7a3a, 0x52723a], true); } // a kelp forest farther back
  const anem = (x, z, c, tip) => { solid.push(...lAt(pxRing(5, 0, 0, .14, { c: 0x8a5a7a }), x, 0, z)); for (let i = 0; i < 26; i++) { const a = lr(0, 6.3), r = Math.sqrt(Math.random()) * .28, h = lr(.2, .36); blade(x + Math.cos(a) * r, z + Math.sin(a) * r, .14, h, .0625, [c], false); sway.push({ x: x + Math.cos(a) * r, y: .14 + h + .03, z: z + Math.sin(a) * r, w: .0625, h: .0625, d: .0625, c: tip, b0: .14, bh: h }); } };
  anem(3.2, -2.6, 0xe080c0, 0xffd0f0); anem(-4.4, -2.8, 0x7ac870, 0xd0ffb0);
  // starfish and urchins
  const star = (x, y, z, c) => { const a0 = lr(0, 6.3); solid.push(...lAt(pxBlob(a => 1.8 + 3.8 * ((Math.cos(5 * (a - a0)) + 1) / 2) ** 2, y, y + .04), x, 0, z).map(b => ({ ...b, c }))); };
  star(-1.7, .5, .9, 0xff6a3a); star(-2.8, 0, -4.8, 0xe84a8a); star(1.5, 0, -6.5, 0xffa030); star(6.2, 0, -5.5, 0xd83a3a); star(-6, 1.5, -12.6, 0xff6a3a);
  for (const [x, y, z] of [[2.6, 0, -5.2], [-1.2, 0, -9], [7.2, 0, -7], [-6.4, 1.5, -9]]) { solid.push(...lAt(pxRing(3, 0, y, y + .19, { c: 0x2a1a3a }), x, 0, z)); for (let k = 0; k < 8; k++) { const a = k * .785; solid.push({ x: x + Math.cos(a) * .2, y: y + .1, z: z + Math.sin(a) * .2, w: .25, h: .03, d: .03, r: -a, c: 0x3a2a4a }); } solid.push({ x, y: y + .3, z, w: .03, h: .2, d: .03, c: 0x3a2a4a }); }
  // the giant clam beside you, its pearl glowing; it opens and closes
  const CL = [1.5, -1], lidG = new THREE.Group(), shellB = [], lidB = [];
  const ring = (r, y0, y1, out, y) => out.push(...pxBlob(a => r * (1 - .28 * Math.sin(a) ** 2) + (r > 10 ? Math.sin(a * 9) : 0), y0, y1).map(b => ({ ...b, y: b.y + y, c: Math.round(Math.atan2(b.z, b.x) * 9 / Math.PI) & 1 ? 0xf4e0c0 : 0xdcc0a0 })));
  [[6, 0, .06], [8.5, .06, .12], [10, .12, .19], [11, .19, .25]].forEach(([r, y0, y1]) => ring(r, y0, y1, shellB, 0));
  [[11, 0, .06], [10, .06, .13], [8.5, .13, .19], [6, .19, .25]].forEach(([r, y0, y1]) => ring(r, y0, y1, lidB, 0));
  add(pxBoxes(lAt(shellB, CL[0], .5, CL[1]), solidM()));
  const lid = pxBoxes(lMove(lidB, 0, 0, .5), solidM()); lidG.add(lid); lidG.position.set(snap(CL[0]), .75, snap(CL[1]) - .5); add(lidG);
  glow.push(...lAt(pxBlob(a => 9 * (1 - .28 * Math.sin(a) ** 2) + Math.sin(a * 9), .19, .23), CL[0], .5, CL[1]).map(b => ({ ...b, c: lPick([0x3a5aff, 0x6a3adf, 0x2ad0d0, 0x4a8aff]) })), { x: CL[0], y: .78, z: CL[1], w: .125, h: .125, d: .125, c: 0xf4fbff });
  const pearlH = add(glowSpr(0xc8f8ff, .35)); pearlH.position.set(CL[0], .8, CL[1]);
  // a jellyfish drifting over you, its light on you
  const jf = new THREE.Group(), bell = new THREE.Group(), jB = [];
  [9, 10, 10, 10, 9.5, 9, 8, 7, 5.5, 3.5].forEach((r, k) => jB.push(...pxRing(r, 0, k / TX, (k + 1) / TX, { c: k ? k > 6 ? 0xffc4ec : 0xf49ad8 : 0xffd8f4 })));
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + .4; for (let k = 0; k < 8; k++) jB.push({ x: Math.cos(a) * .12 + Math.sin(k) * .03, y: -.05 - k * .1, z: Math.sin(a) * .12, w: .125, h: .1, d: .125, c: 0xff8ad0 }); }
  for (let i = 0; i < 12; i++) { const a = i * .5236, l = lr(.6, 1.1); for (let k = 0; k < 6; k++) jB.push({ x: Math.cos(a) * .52, y: -(k + .5) * l / 6, z: Math.sin(a) * .52, w: .0625, h: l / 6, d: .0625, c: 0xffc0ec }); }
  const jM = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .6, depthWrite: false, fog: false }), jD = new THREE.MeshBasicMaterial({ transparent: true, colorWrite: false, fog: false }); // see-through in one layer: its depth first, then its colour only on the nearest face
  for (const m of [jM, jD]) { m.onBeforeCompile = sh => { sh.uniforms.jT = LOB_T; sh.vertexShader = 'uniform float jT;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat jd = max(0., -position.y); transformed.x += sin(position.y * 3. + jT * 2.) * .08 * jd; transformed.z += cos(position.y * 2.6 + jT * 1.7) * .06 * jd;'); }; m.customProgramCacheKey = () => 'jelly'; }
  const jG = pxBoxes(jB, jM), jZ = new THREE.Mesh(jG.geometry, jD); jZ.renderOrder = 1; jG.renderOrder = 2; bell.add(jZ, jG); jf.add(bell); jf.scale.setScalar(.8); add(jf);
  const jH = glowSpr(0xff8ad8, .22); jH.scale.setScalar(2.6); jH.position.y = .25; jf.add(jH);
  // the wreck, far off and tilted in the sand
  const wk = [];
  for (let k = 0; k < 15; k++) { const z = k - 7, w = k < 4 ? 3.4 * (k + 1) / 4.5 : 3.4; wk.push({ x: 0, y: 1.3, z, w, h: 2.6, d: 1.02, c: 0x3a3428 }, { x: 0, y: 2.7, z, w: w + .2, h: .2, d: 1.02, c: 0x4a4232 }); }
  wk.push({ x: 0, y: 3, z: 4.5, w: 3.4, h: 1.2, d: 3, c: 0x3a3428 }, { x: 0, y: 5.2, z: -1.5, w: .4, h: 5, d: .4, c: 0x2e2a22 }, { x: 0, y: 7.4, z: -1.5, w: 3.2, h: .25, d: .25, c: 0x2e2a22 }, { x: 0, y: 3.6, z: 2.5, w: .4, h: 1.8, d: .4, c: 0x2e2a22 });
  const wr = add(pxBoxes(wk, solidM())); wr.position.set(-24, -.6, -58); wr.rotation.set(0, .9, .2);
  // far off in the blue: the reef wall in rounded lumps, pinnacles of reef rock with coral heads on top
  const far = [], FC = [0x4e6270, 0x566a78, 0x5e6a7e];
  for (let i = 0; i < 14; i++) { const x = -65 + i * 10 + lr(-3, 3), z = -76 + lr(-2, 2), R = lr(6, 8), H = lr(4, 9); for (let y = -lr(0, 1); y < H; y++) far.push(...lAt(cellBlob(lumpy(R * Math.sqrt(1 - (Math.max(0, y) / H) ** 2), .2, [i, y, 1]), y, y + 1, 1), x, 0, z).map(b => ({ ...b, c: lPick(FC) }))); }
  for (const [x, z, R, h, cap] of SPIRES) {
    for (let y = 0, k = 0; y < h; k++, y += .5) far.push(...lAt(cellBlob(lumpy(R * (1 - .35 * y / h) * (1 + .15 * Math.sin(k * .9 + x)), .25, [k * .4 + x, z, k * .3]), y, y + .5, .5), x, 0, z).map(b => ({ ...b, c: lPick(RC) })));
    far.push(...lAt(cellBlob(lumpy(R * .8, .3, [x, 1, 2]), h, h + .5, .5), x, 0, z).map(b => ({ ...b, c: lPick(cap) })), ...lAt(cellBlob(lumpy(R * .45, .3, [x, 2, 1]), h + .5, h + 1, .5), x, 0, z).map(b => ({ ...b, c: lPick(cap) })));
  }
  add(pxBoxes(far, solidM()));
  // shafts of light
  const rp = [], ru = [], rph = [], ri = [];
  for (let i = 0; i < 10; i++) { const pg = new THREE.PlaneGeometry(lr(1.2, 3.6), 28); pg.rotateZ(-.2); pg.translate(lr(-24, 24), 12.5, lr(-46, -12)); const v0 = rp.length / 3, Pp = pg.attributes.position, U = pg.attributes.uv, ph = Math.random(); for (let j = 0; j < Pp.count; j++) { rp.push(Pp.getX(j), Pp.getY(j), Pp.getZ(j)); ru.push(U.getX(j), U.getY(j)); rph.push(ph); } for (const j of pg.index.array) ri.push(v0 + j); pg.dispose(); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('uv', new THREE.Float32BufferAttribute(ru, 2)); rg.setAttribute('ph', new THREE.Float32BufferAttribute(rph, 1)); rg.setIndex(ri);
  const rays = add(new THREE.Mesh(rg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, vertexShader: RAY_VS, fragmentShader: RAY_FS, uniforms: { t: LOB_T, c: { value: new THREE.Color(0xc8fff4) } } }))); rays.frustumCulled = false;
  // fish: a school going round behind you, yellow and pink ones round the rocks, a stripy few round the anemone, a silver shoal far off; a turtle and a manta ray
  const FISH = (c1, c2) => [[.06, .14, .22, 0, 0, 0, 0, c1], [.02, .1, .07, 0, 0, .14, 2, c2], [.02, .05, .1, 0, .09, .01, 0, c2]];
  const STRIPY = [[.06, .1, .18, 0, 0, 0, 0, 0xff7a20], [.065, .105, .025, 0, 0, -.03, 0, 0xffffff], [.065, .105, .025, 0, 0, .05, 0, 0xffffff], [.02, .08, .05, 0, 0, .11, 2, 0xff7a20]];
  const SILVER = [[.04, .07, .18, 0, 0, 0, 0, 0xc0d4dc], [.015, .05, .05, 0, 0, .11, 2, 0xa8bcc8]];
  const TURTLE = [[.6, .16, .8, 0, 0, 0, 0, 0x5a4a2e], [.42, .1, .6, 0, .12, 0, 0, 0x7a6a42], [.16, .14, .2, 0, 0, -.48, 0, 0x8a9a6a], [.5, .04, .18, -.5, 0, -.2, -1, 0x8a9a6a, -.26], [.5, .04, .18, .5, 0, -.2, 1, 0x8a9a6a, .26], [.2, .04, .14, -.26, 0, .38, -1, 0x7a8a5a, -.28], [.2, .04, .14, .26, 0, .38, 1, 0x7a8a5a, .28]];
  const MANTA = [[.8, .12, .9, 0, 0, 0, 0, 0x1a2a3a], [.7, .02, .7, 0, -.07, 0, 0, 0xc8d4dc], ...[-1, 1].flatMap(s => [[.8, .06, .8, s * .8, 0, .05, s, 0x1a2a3a, s * .4], [.6, .05, .4, s * 1.5, 0, .2, s, 0x1a2a3a, s * .4]]), [.1, .06, .25, -.3, 0, -.55, 0, 0x1a2a3a], [.1, .06, .25, .3, 0, -.55, 0, 0x1a2a3a], [.03, .03, 1.2, 0, 0, 1, 2, 0x1a2a3a]];
  const fT = { value: 0 };
  add(lobFlock([{ at: [0, 2.6, -14], n: 36, r: [3.5, 6], h: [-1, 1.4], v: [.3, .42], dir: 1, size: [.9, 1.2], parts: FISH(0x3a7ae8, 0x2a5ad0) }, { at: [7.5, 2.8, -12], n: 8, r: [1.4, 2.6], h: [0, 1], v: [.4, .6], size: [1.1, 1.3], parts: FISH(0xf8d830, 0xf0c020) },
    { at: [-7, 2.6, -10], n: 6, r: [1.5, 2.5], h: [0, 1], v: [.35, .5], size: [1.1, 1.4], parts: FISH(0xe85a8a, 0xd04a7a) }, { at: [3.2, .45, -2.6], n: 3, r: [.3, .45], h: [0, .25], v: [.9, 1.2], size: [1, 1.1], parts: STRIPY },
    { at: [-6, 3.6, -38], n: 60, r: [2, 4.5], h: [-1.5, 1.5], v: [.55, .7], dir: -1, size: [1, 1.3], parts: SILVER }], 9, fT));
  add(lobFlock([{ at: [0, 3.4, -20], n: 1, r: [13, 13], h: [0, 0], v: [.07, .07], dir: 1, parts: TURTLE }, { at: [4, 3.2, -48], n: 1, r: [9, 9], h: [0, 0], v: [.07, .07], dir: -1, size: [1.6, 1.6], parts: MANTA }], 1.8, fT));
  // a whale going by far off now and then, beating its tail
  const wb = (x0, x1, y0, y1, z0, z1, c) => ({ x: (x0 + x1) / 2 / TX, y: (y0 + y1) / 2 / TX, z: (z0 + z1) / 2 / TX, w: (x1 - x0) / TX, h: (y1 - y0) / TX, d: (z1 - z0) / TX, c }), WB = 0x3a4a5e, WF = 0x34445a, wM = solidM();
  const whale = add(pxBoxes([wb(-12, 12, -10, 10, -44, 32, WB), wb(-10, 10, -8, 8, 32, 48, WB), wb(-9, 9, -9, 5, -64, -44, WB), wb(-10, 10, -13, -9, -60, 28, 0x8a98a6), wb(-1, 1, 10, 13, 22, 32, WF)], wM)); whale.rotation.y = -Math.PI / 2;
  const wTail = pxBoxes([wb(-7, 7, -6, 6, -4, 22, WB), wb(-22, 22, -1, 2, 18, 30, WF)], wM); wTail.position.z = 46 / TX; whale.add(wTail);
  const wFins = [-1, 1].map(s => { const f = pxBoxes([wb(s < 0 ? -30 : -2, s < 0 ? 2 : 30, -1, 2, -6, 6, WF)], wM); f.position.set(s * .75, -.375, -1.5); f.rotation.y = -s * .4; whale.add(f); return f; });
  // bubbles from the clam and the sponges, bits drifting down
  const vents = [[CL[0], .9, CL[1]], [-5.2, 1.2, -7.5], [6.5, .1, -15], [-1.6, 1, -14.5]];
  const bubbles = add(lobbyMotes({ n: 60, place: () => { const v = lPick(vents); return [v[0] + lr(-.1, .1), v[1], v[2] + lr(-.1, .1)]; }, rise: [0, 6, 0], sway: .12, size: [.04, .09], speed: [.12, .25], colors: [0xe8ffff, 0xc8f0ff] }));
  const snowM = add(lobbyMotes({ n: 120, box: [-15, 15, 0, 9, -30, 5], rise: [.3, -.8, 0], sway: .4, size: [.03, .06], speed: [.03, .06], colors: [0xe0f0f0], a: .5 }));
  const swM = lam({ vertexColors: true });
  swM.onBeforeCompile = sh => { sh.uniforms.sT = LOB_T; sh.vertexShader = 'uniform float sT; attribute float sw;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(sT * .9 + position.z * .35 + position.x * .2) * sw * .4; transformed.z += cos(sT * .7 + position.x * .3) * sw * .25;'); };
  swM.customProgramCacheKey = () => 'reefsway';
  const swMesh = add(pxBoxes(sway, swM)), sp = swMesh.geometry.attributes.position, sw = new Float32Array(sp.count);
  sway.forEach((b, i) => { for (let v = 0; v < 24; v++) { const f = THREE.MathUtils.clamp((sp.getY(i * 24 + v) - b.b0) / b.bh, 0, 1); sw[i * 24 + v] = f * f * Math.min(1.5, b.bh * .5); } });
  swMesh.geometry.setAttribute('sw', new THREE.BufferAttribute(sw, 1));
  const over = n => { const m = solidM(); m.polygonOffset = true; m.polygonOffsetFactor = m.polygonOffsetUnits = -n; return m; }; // branching corals over the rock they grow from, their pale tips over their branches
  add(pxBoxes(solid, solidM())); add(pxBoxes(coral, over(1))); add(pxBoxes(tips, over(2))); add(pxBoxes(glow, glowM()));
  const bub = add(lobbyBits(120, .1, true, .8));
  const lights = [[0xc8f0ff, 1.6, 6, CL[0] - .4, 1.5, CL[1] + .7], [0xff8ad8, 2.5, 7, -2.4, 3.3, -6]].map(([c, i, d, x, y, z]) => { const l = add(new THREE.PointLight(c, i, d)); l.position.set(x, y, z); return l; });
  const lit = litOf([0x7adcf0, 0x3a6a72, 0xd0f8ff, 0x40c0ff, 0x88c8c0], [1, 1.1, .9, .5], [2, 7, 5]);
  let boost = 0;
  return {
    g, sky: null, fog, lit,
    hey() { boost = 1.6; for (let i = 0; i < 80; i++) { const a = lr(0, 6.3), r = lr(.3, 1.6); bub.userData.throw(Math.cos(a) * r, lr(.5, 1.2), Math.sin(a) * r, lr(-.3, .3), lr(.4, 1.4), lr(-.3, .3), lr(2.2, 3.6), lPick([0xd8ffff, 0xa8f0ff, 0xffffff]), .5); } },
    tick(dt, t) {
      lobbyClock(t); [bubbles, snowM].forEach(motesQ);
      boost = Math.max(0, boost - dt * .3); fT.value += dt * (1 + boost * 2.5); // the fish dash about after a buy
      lidG.rotation.x = -(.55 + .12 * Math.sin(t * .35) + Math.min(1, boost) * .35);
      const pulse = Math.sin(t * 2.2); bell.scale.set(1 + pulse * .08, 1 - pulse * .1, 1 + pulse * .08);
      whale.position.set((t * 2.2 + 70) % 220 - 110, 6.2 + Math.sin(t * .5) * .15, -46); wTail.rotation.x = Math.sin(t * 1.3) * .22; wFins.forEach((f, i) => f.rotation.z = (i ? -1 : 1) * (.25 + Math.sin(t * 1.3 + 1) * .1));
      jf.position.set(-2.4 + Math.sin(t * .13) * .5, 2.9 + Math.sin(t * .3) * .35, -6); lights[1].position.set(jf.position.x, jf.position.y - .1, -6);
      const pf = Math.sin(t * 1.3) * .08; lights[0].intensity = 1.6 + boost * 4 + pf * 3; pearlH.scale.setScalar(.6 + boost * 1.2 + pf);
      bub.userData.tick(dt, -2.5);
    },
  };
};
// ---- candy: you on a frosted cake between two candles, a chocolate river running through a doughnut from a fudge waterfall, lollipops, a gingerbread house, a rainbow
const BOW_VS = `varying vec3 vL; varying float vY; void main() { vL = position; vY = (modelMatrix * vec4(position, 1.)).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const BOW_FS = `uniform vec3 cols[7]; uniform float r0, r1; varying vec3 vL; varying float vY;
void main() { float k = clamp((length(vL.xy) - r0) / (r1 - r0), 0., .999); gl_FragColor = vec4(cols[int(k * 7.)], .5 * smoothstep(0., 9., vY));
#include <colorspace_fragment>
}`;
LOBBY_MAKE.candy = () => {
  const g = new THREE.Group(), add = o => (g.add(o), o); lobbyScene.add(g);
  add(lobbyDome([[-1, 0xc8f0dc], [0, 0xffd8ec], [.06, 0xffcce8], [.2, 0xd8c4ff], [1, 0xa0d0ff]]));
  const fog = new THREE.Fog(0xffd8ec, 20, 380);
  const SPR = [[255, 90, 90], [255, 220, 80], [100, 200, 255], [140, 230, 120], [190, 130, 255], [255, 255, 255]];
  const mintT = pxTex(64, 64, c => { fillN(c, 64, 64, [146, 230, 192], 8); for (let i = 0; i < 14; i++) { const x = Math.random() * 63 | 0, y = Math.random() * 64 | 0, s = lPick(SPR); Math.random() < .5 ? dot(c, rgb(s), x, y, 2, 1) : dot(c, rgb(s), x, y, 1, 2); } });
  mintT.repeat.set(150, 150);
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600), lam({ map: mintT }))); ground.rotation.x = -Math.PI / 2;
  // the cake: layers down its side, pink frosting and sprinkles on top, piping round its edge
  const icing = ringsTex(96, (r, a) => r > 44 ? [255, 246, 236] : r > 40 ? (Math.cos(a * 28) > .2 ? [255, 248, 240] : [255, 214, 228]) : Math.random() < .035 ? lPick(SPR) : r % 9 < 1 ? [246, 162, 194] : [255, 176, 206]);
  const layers = pxTex(16, 16, c => { for (let y = 0; y < 16; y++) { const col = y >= 13 ? [110, 64, 40] : y === 12 || y === 9 ? [255, 240, 220] : y >= 10 ? [255, 190, 200] : y === 8 ? [255, 176, 206] : [110, 64, 40]; for (let x = 0; x < 16; x++) dot(c, rgb(col, (Math.random() - .5) * 8), x, y); } for (let i = 0; i < 4; i++) dot(c, rgb([70, 36, 20]), Math.random() * 16 | 0, 13 + (Math.random() * 3 | 0)); });
  const cake = pxBlob(() => 46, -.25, .5); add(pxBoxes(cake, [pxMat(layers), pxMat(icing)], { end: 'y', ew: 96 }));
  const solid = [], glow = [];
  for (let k = 0; k < 24; k++) { const a = k * .2618 + .13, x = Math.cos(a) * 2.68, z = Math.sin(a) * 2.68, c = k & 1 ? 0xfff6ee : 0xffc8dc; solid.push({ x, y: .55, z, w: .25, h: .1, d: .25, c }, { x, y: .64, z, w: .19, h: .08, d: .19, c }, { x, y: .71, z, w: .1, h: .06, d: .1, c }); if (k % 4 === 1) solid.push({ x, y: .81, z, w: .14, h: .14, d: .14, c: 0xd81830 }, { x: x + .03, y: .92, z, w: .03, h: .1, d: .03, c: 0x4a7a2a }); }
  for (let k = 0; k < 64; k++) { const a = k * .0982 + lr(-.03, .03), l = Math.round(lr(.08, .3) * TX) / TX, [x, z] = pxClear(cake, 0, 0, .5 - l, .5, Math.cos(a), Math.sin(a)); solid.push({ x, y: .5 - l / 2, z, w: 1 / TX, h: l, d: 1 / TX, c: 0xffc0d8 }); } // drips, just clear of its side
  // two candles behind you
  const flames = [], CN = [[-1.3, -1.9], [1.3, -1.9]];
  for (const [x, z] of CN) {
    for (let k = 0; k < 7; k++) solid.push({ x, y: .5625 + k * .125, z, w: .14, h: .125, d: .14, c: k & 1 ? 0xfff8f0 : x < 0 ? 0x7ac8ff : 0xff8ac8 });
    const f = add(pxBoxes([{ x: 0, y: .5 / TX, z: 0, w: .125, h: 1 / TX, d: .125, c: 0xfffbe0 }, { x: 0, y: 2 / TX, z: 0, w: .125, h: 2 / TX, d: .125, c: 0xffe070 }, { x: 0, y: 3.5 / TX, z: 0, w: .125, h: 1 / TX, d: .125, c: 0xff9a30 }], glowM())); // white at its foot, orange at its tip
    f.position.set(snap(x), 1.375, snap(z)); flames.push(f);
  }
  // the river of chocolate: from the fall at the back, through the doughnut, round in front of you and away to the right
  const curve = new THREE.CatmullRomCurve3([[-18, -40], [-14, -32], [-9, -26], [-6, -22], [-4, -16], [1, -12.5], [8, -12], [16, -14], [26, -19], [38, -26]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const rv = [], ri = [], N = 160, RW = 1.8;
  for (let i = 0; i <= N; i++) { const p = curve.getPoint(i / N), d = curve.getTangent(i / N); for (const s of [-1, 1]) rv.push(p.x - d.z * RW * s, .02, p.z + d.x * RW * s); if (i < N) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); for (const s of [-1, 1]) { const x = p.x - d.z * (RW + .1) * s, z = p.z + d.x * (RW + .1) * s; if ((Math.hypot(x + 6, .7) - 2.8) ** 2 + (z + 22) ** 2 > 1.44) solid.push({ x, y: i & 1 ? .07 : .1, z, w: .3, h: i & 1 ? .14 : .2, d: .3, c: 0xfff6ee }); } } // the bank, round the doughnut's legs
  const bank = curve.getPoints(80), rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); rg.setIndex(ri); rg.computeVertexNormals();
  const choc = { c1: 0x4a2414, c2: 0x6a3a1e, c3: 0xa86a3a, c4: 0xffe0b8, sun: .3, sunW: .2, gli: .5 };
  add(new THREE.Mesh(rg, lobWater({ ...choc, flow: [.12, -.06] })));
  const pool = add(new THREE.Mesh(pxDisc(3, 24), lobWater({ ...choc, flow: [.05, .08] }))); pool.rotation.x = -Math.PI / 2; pool.position.set(-18, .025, -40.2);
  const fall = add(new THREE.Mesh(new THREE.PlaneGeometry(2.5, 7.25), lobWater({ ...choc, uvs: [2.5, 7.25], flow: [0, .9], gli: .2 }))); fall.position.set(-18, 3.625, -42.3);
  // the fudge cliff it pours from, icing on top
  const FR = lumpy(4.5, .14, [1, 2, 0]), FX = -18, FZ = -46.5;
  const fc = []; for (let y = 0; y < 7.5; y += .5) fc.push(...lAt(cellBlob(a => FR(a) * (y < 1 ? 1.15 : 1), y, y + .5, .5), FX, 0, FZ).map(b => ({ ...b, c: lPick([0x6a3a20, 0x5a3018, 0x7a4426]) }))); solid.push(...fc);
  solid.push(...lAt(cellBlob(a => FR(a) + .3, 7.5, 7.75, .5), FX, 0, FZ).map(b => ({ ...b, c: 0xfff6ee })));
  for (let i = 0; i < 22; i++) { const a = lr(.3, 2.85), l = Math.round(lr(.3, 1.4) * TX) / TX; if (Math.abs(a - 1.5708) > .2) { const [x, z] = pxClear(fc, FX, FZ, 7.5625 - l, 7.5, Math.cos(a), Math.sin(a), 6); solid.push({ x, y: 7.5625 - l / 2, z, w: .375, h: l, d: .375, c: 0xfff6ee }); } } // icing dripping down, just clear of the fudge
  // the doughnut standing in the river, frosted on the side toward you
  { const R = 2.8, r = .9, s = .25, dn = [], L = [], used = new Set();
    for (let y = -r + s / 2; y < r; y += s) { const h = Math.sqrt(r * r - y * y); L.push([y, h]); dn.push(...cellBlob(() => R + h, y - s / 2, y + s / 2, s, () => R - h).map(b => ({ ...b, c: y > .1 ? 0xff9ac8 : 0xd8a060 }))); }
    for (let n = 0; n < 400 && used.size < 80; n++) { // sprinkles lying on the frosting, one to a cell, none under the ground
      const th = lr(0, 6.3), u = lr(-.75, .75), i = Math.floor((R + u) * Math.cos(th) / s), j = Math.floor((R + u) * Math.sin(th) / s), x = (i + .5) * s, z = (j + .5) * s, rc = Math.hypot(x, z);
      let top = null; for (const [y, h] of L) if (rc >= R - h && rc < R + h) top = y;
      if (top === null || top < .1 || z > .6 || used.has(i + ',' + j)) continue;
      used.add(i + ',' + j); dn.push({ x, y: Math.round((top + s / 2) * TX) / TX + .5 / TX, z, w: .16, h: 1 / TX, d: 1 / TX, r: lr(0, 3.14), c: lPick([0xff5a5a, 0xffdc50, 0x64c8ff, 0x8ce678, 0xffffff]) });
    }
    const dm = add(pxBoxes(dn, solidM())); dm.rotation.x = Math.PI / 2; dm.position.set(-6, .8, -22); }
  // a gingerbread house
  { const H = [12, -26], hs = [];
    hs.push({ x: H[0], y: 1.3, z: H[1], w: 4, h: 2.6, d: 3, c: 0xb8742e });
    for (let k = 0; k < 7; k++) hs.push({ x: H[0], y: 2.7 + k * .25, z: H[1], w: 4.4, h: .25, d: 3.4 - k * .5, c: 0x5a3018 }, { x: H[0], y: 2.6 + k * .25, z: H[1] + (1.7 - k * .25), w: 4.5, h: .08, d: .12, c: 0xfff6ee });
    for (let k = 0; k < 6; k++) hs.push({ x: H[0] - 1.75 + k * .7, y: 4.45, z: H[1], w: .24, h: .24, d: .24, c: lPick([0xff5a7a, 0x5ad87a, 0xffd040, 0x8a6aff]) });
    hs.push({ x: H[0], y: .7, z: H[1] + 1.52, w: .8, h: 1.4, d: .06, c: 0x6a3a1e }, { x: H[0] + 1.2, y: 3.8, z: H[1] - .4, w: .5, h: 1.2, d: .5, c: 0xfff6ee }, { x: H[0] + 1.2, y: 4.45, z: H[1] - .4, w: .6, h: .1, d: .6, c: 0xff5a7a });
    for (let k = 0; k < 11; k++) for (const s of [-1, 1]) hs.push({ x: H[0] + s * .44, y: .06 + k * .13, z: H[1] + 1.55, w: .08, h: .13, d: .06, c: k & 1 ? 0xfff6ee : 0xe82a3a });
    for (const s of [-1, 1]) { glow.push({ x: H[0] + s * 1.25, y: 1.5, z: H[1] + 1.52, w: .7, h: .7, d: .04, c: 0xffe08a }); hs.push({ x: H[0] + s * 1.25, y: 1.5, z: H[1] + 1.5625, w: .125, h: .6, d: .125, c: 0xfff6ee }, { x: H[0] + s * 1.25, y: 1.5, z: H[1] + 1.5625, w: .6, h: .125, d: .125, c: 0xfff6ee }, { x: H[0] + s * 1.25, y: 1.1, z: H[1] + 1.56, w: .9, h: .1, d: .06, c: 0xfff6ee }); }
    for (let k = 0; k < 18; k++) hs.push({ x: H[0] - 2 + k * .235, y: 2.55 - (k % 3) * .05, z: H[1] + 1.72, w: .14, h: .1 + (k % 3) * .1, d: .06, c: 0xfff6ee });
    solid.push(...hs); }
  // lollipops, candy canes, gumdrops
  const stems = [], lolly = (x, z, h, R, c1, c2) => { stems.push([x, z]); // a stick and a swirl, as rows of runs
    solid.push({ x, y: h / 2, z, w: .1, h, d: .1, c: 0xfff8f0 });
    for (let j = -R; j < R; j++) {
      const hw = Math.round(Math.sqrt(R * R - (j + .5) ** 2)), col = i => Math.floor((Math.atan2(j + .5, i + .5) / Math.PI + Math.hypot(i + .5, j + .5) / 6) * 2) & 1 ? c1 : c2;
      for (let i = -hw + 1, run = -hw; i <= hw; i++) if (i === hw || col(i) !== col(run)) { solid.push({ x: x + (run + i) / 2 / TX, y: h + (R + j + .5) / TX, z, w: (i - run) / TX, h: 1 / TX, d: .125, c: col(run) }); run = i; }
    }
  };
  for (const [x, z, h, R, c1, c2] of [[-7, -8, 2.4, 12, 0xff5a8a, 0xfff6ee], [3.5, -8.5, 2, 10, 0x5ac8ff, 0xfff6ee], [8, -20, 3.2, 14, 0xffa030, 0xfff0a0], [-13, -18, 3, 13, 0x9a6aff, 0xffd0f0], [16, -30, 3.6, 14, 0x5ad87a, 0xfff6ee], [-18, -28, 3.4, 12, 0xff5a5a, 0xffd040],
    [-26, -44, 4.5, 18, 0xffa030, 0xfff0a0], [-16, -64, 5.5, 22, 0x5ac8ff, 0xfff6ee], [-30, -70, 4.5, 18, 0xff5a8a, 0xffd0f0], [28, -42, 5, 20, 0x9a6aff, 0xfff6ee], [18, -64, 6, 22, 0xff5a5a, 0xfff6ee], [32, -72, 4.5, 18, 0x5ad87a, 0xfff0a0]]) lolly(x, z, h, R, c1, c2);
  const cane = (x, z, h, flip) => { stems.push([x, z]); // a striped stem, its crook drawn pixel by pixel
    const x0 = Math.floor(x * TX) / TX + .5 / TX, z0 = Math.floor(z * TX) / TX + .5 / TX, n = Math.ceil(h / .125), top = n * .125, s = flip ? -1 : 1, R = 5, col = k => k & 1 ? 0xfff6ee : 0xe82a3a;
    for (let k = 0; k < n; k++) solid.push({ x: x0, y: .0625 + k * .125, z: z0, w: 3 / TX, h: .125, d: 3 / TX, c: col(k) });
    for (let j = -3; j < R + 2; j++) for (let i = -2, run = null, rc = 0; i <= 2 * R + 2; i++) {
      const cx = i - R, cy = j + .5, on = i <= 2 * R + 1 && Math.abs(Math.hypot(cx, cy) - R) < 1.5 && (cy > 0 || cx > 0), c = on ? col(Math.floor((Math.PI - Math.atan2(cy, cx)) / (Math.PI / 7)) + n) : -1;
      if (run !== null && c !== rc) { solid.push({ x: x0 + s * (run + i - 1) / 2 / TX, y: top + cy / TX, z: z0, w: (i - run) / TX, h: 1 / TX, d: 3 / TX, c: rc }); run = null; }
      if (on && run === null) { run = i; rc = c; }
    }
  };
  cane(-3, -10.5, 2, false); cane(6, -8.6, 1.8, true); cane(-9.4, -14, 2.4, false); cane(11, -17.8, 2.2, true);
  const drops = []; for (let i = 0; i < 26; i++) { const x = lr(-16, 16), z = lr(-34, -5), c = lPick([0xff4a6a, 0x4ad86a, 0xffc830, 0x9a5aff, 0xff8a30, 0x4ac8ff]); if (Math.hypot(x, z) < 4.5 || Math.abs(x) < 2.5 || bank.some(p => Math.hypot(p.x - x, p.z - z) < 3) || drops.some(([a, b]) => Math.hypot(a - x, b - z) < 1.25) || stems.some(([a, b]) => Math.hypot(a - x, b - z) < 1)) continue; drops.push([x, z]); const gd = []; [9, 9, 8.5, 7.5, 6, 3.5].forEach((r, k) => gd.push(...lAt(pxRing(r, 0, k * .125, k * .125 + .125, { c: k === 5 ? new THREE.Color(c).lerp(new THREE.Color(0xffffff), .3).getHex() : c }), x, 0, z))); solid.push(...gd); for (let k = 0; k < 6; k++) { const a = lr(0, 6.3), y = Math.floor(lr(0, .6) * TX) / TX, [sx, sz] = pxClear(gd, x, z, y, y + 1 / TX, Math.cos(a), Math.sin(a)); solid.push({ x: sx, y: y + .5 / TX, z: sz, w: 1 / TX, h: 1 / TX, d: 1 / TX, c: 0xffffff }); } } // gumdrops, sugar stuck on them
  // frosted mountains, candy hills in two rows with frosting on top (some in layers), cotton candy clouds, a rainbow
  add(pxBoxes(lobRange(-215, 8, [12, 24], { rock: 0xb8a0e0, cap: 0xfff4fa, snow: 17, cell: 2, jit: .4 }), glowM()));
  const hl = [], hill = (x, z, R, H, s, c, c2, y0) => { const L = lumpy(1, .1, [x * .1, z * .1, R]); for (let y = y0, k = 0; y < H; y += s, k++) { const r = R * Math.sqrt(1 - (Math.max(0, y) / (H + s / 2)) ** 2); hl.push(...lAt(cellBlob(a => r * L(a), y, y + s, s), x, 0, z).map(b => ({ ...b, c: y >= H - 2 * s ? 0xfff4fa : c2 && k & 1 ? c2 : c }))); } };
  [[-118.5, -104.5, 26, 8, 0xf0e070], [-78, -96, 24, 7, 0x8ad8a8, 0xa8e8c0], [-40.5, -108.5, 20, 6, 0xff9ac8, 0xffb8d8], [40.5, -104.5, 20, 6, 0xc8a8f0], [76, -94, 24, 7, 0xffb890, 0xffd0a8], [116.5, -108.5, 26, 8, 0x8ad8d8, 0xa8e8e8]].forEach(([x, z, R, H, c, c2], i) => hill(x, z, R, H, 1, c, c2, i % 3 === 1 ? -.5 : 0)); // cells and layers offset by half from their neighbours', so no faces meet
  [[-149.75, -148.75, 32, 12, 0xc8f0a0], [-94.75, -159.75, 34, 12, 0xffb8d8], [-37.75, -150.75, 30, 10, 0xb8e8c8, 0xd0f0dc], [19.25, -167.75, 34, 14, 0xd8c0f8, 0xe8d8ff], [72.25, -152.75, 30, 11, 0xffd0a8], [131.25, -165.75, 36, 14, 0xffb8d8, 0xffd0e4]].forEach(([x, z, R, H, c, c2], i) => hill(x, z, R, H, 2, c, c2, i & 1 ? -.75 : -1.75));
  const brightM = lam({ vertexColors: true }); brightM.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * .45;'); }; brightM.customProgramCacheKey = () => 'candybright'; // pastels partly lit by themselves, so white stays white
  add(pxBoxes(hl, brightM));
  // a candy castle out on the plain, pink and white with lilac roofs
  { const X = 10, Z = -100, PK = 0xffb0d4, PW = 0xfff6fa, cs = [];
    cs.push({ x: X, y: 2.5, z: Z, w: 7, h: 5, d: 6, c: PK }, { x: X, y: 5.125, z: Z, w: 7.25, h: .25, d: 6.25, c: PW }, { x: X, y: 1.25, z: Z + 3.0625, w: 1.6, h: 2.5, d: .125, c: 0x6a3a1e });
    for (let k = 0; k < 6; k++) for (const sz of [-1, 1]) cs.push({ x: X - 3 + k * 1.2, y: 5.5, z: Z + sz * 3, w: .6, h: .5, d: .25, c: PW });
    const tower = (x, z, r, y0, y1, roof) => {
      for (let y = y0, k = 0; y < y1; y++, k++) cs.push(...lAt(cellBlob(() => r, y, Math.min(y + 1, y1), .25), x, 0, z).map(b => ({ ...b, c: k & 1 ? PW : PK })));
      cs.push(...lAt(cellBlob(() => r + .2, y1, y1 + .25, .25), x, 0, z).map(b => ({ ...b, c: PW })));
      for (let k = 0; k < 6; k++) cs.push(...lAt(cellBlob(() => (r + .3) * (1 - k / 6), y1 + .25 + k * roof / 6, y1 + .25 + (k + 1) * roof / 6, .25), x, 0, z).map(b => ({ ...b, c: 0xb898f0 })));
      cs.push({ x, y: y1 + roof + .5, z, w: .5, h: .5, d: .5, c: 0xffd040 });
    };
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(X + sx * 3.5, Z + sz * 3, 1.3, 0, 7.5, 3);
    tower(X, Z, 1.5, 5.25, 9, 3.5);
    for (const sx of [-1, 1]) glow.push({ x: X + sx * 1.4, y: 3.4, z: Z + 3.0625, w: .6, h: .9, d: .125, c: 0xffe8a0 });
    add(pxBoxes(cs, brightM)); }
  const cl = [];
  for (const [x, y, z, R] of [[-60, 15, -170, 7], [-18, 17, -185, 9], [30, 14, -160, 6], [75, 16, -180, 8], [-100, 14, -175, 7]]) { const c = lPick([0xffc0e4, 0xc8e4ff, 0xffd8f0]); [[.75, 0], [1, 1], [.8, 2], [.45, 3]].forEach(([k, j]) => cl.push(...lAt(cellBlob(lumpy(R * k, .2, [x, j, 3]), y + j, y + j + 1, 1), x, 0, z).map(b => ({ ...b, c: j === 3 ? 0xfff4fa : c })))); }
  const clouds = add(pxBoxes(cl, glowM(false)));
  const bow = add(new THREE.Mesh(new THREE.RingGeometry(54, 62, 96, 1, 0, Math.PI), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: BOW_VS, fragmentShader: BOW_FS,
    uniforms: { r0: { value: 54 }, r1: { value: 62 }, cols: { value: [0xc89aff, 0x8aa8ff, 0x7ad8ff, 0x8ae8a0, 0xfff07a, 0xffb86a, 0xff7a8a].map(c => new THREE.Color(c)) } } })));
  bow.position.set(-10, -44, -200);
  // sprinkles drifting down; candy fireworks and confetti when you buy it
  const SC = [0xff5a5a, 0xffdc50, 0x64c8ff, 0x8ce678, 0xbe82ff, 0xffffff];
  const spr = add(lobbyMotes({ n: 90, box: [-14, 14, 0, 10, -26, 4], rise: [0, -10, 0], sway: .5, size: [.05, .09], speed: [.06, .1], colors: SC, add: false }));
  add(pxBoxes(solid, solidM())); add(pxBoxes(glow, glowM()));
  const balloons = [[0xff7aa8, 0xfff0a0, -20, 3.5, -55, .5], [0x8ad0ff, 0xffffff, 30, 11, -75, -.4], [0xb88aff, 0xffc8e0, -50, 15, -42, .35]].map(([c1, c2, x, y, z, v]) => { // hot air balloons drifting by, in bands
    const b = [{ x: 0, y: .25, z: 0, w: .5, h: .5, d: .5, c: 0x8a5a2a }];
    [.45, .7, .95, 1.2, 1.4, 1.55, 1.65, 1.7, 1.7, 1.6, 1.45, 1.2, .8].forEach((r, k) => b.push(...cellBlob(() => r, 1 + k * .25, 1.25 + k * .25, .125).map(q => ({ ...q, c: k & 2 ? c1 : c2 }))));
    for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) b.push({ x: sx * .22, y: .75, z: sz * .22, w: .0625, h: .5, d: .0625, c: 0x5a3a1a });
    const m = add(pxBoxes(b, solidM())); m.position.set(x, y, z); return { m, x, y, v };
  });
  const fw = add(lobbyBits(260, .22)), conf = add(lobbyBits(160, .055, false));
  const lights = CN.map(([x, z]) => { const l = add(new THREE.PointLight(0xffb060, 1.6, 5)); l.position.set(x, 1.65, z); return l; });
  const lit = litOf([0xffe0f0, 0x9ad8b8, 0xfff4e8, 0xffa8d8, 0xc8f0d8], [1, 1.3, .7, .5], [-3, 6, 6]);
  let shows = [];
  return {
    g, sky: null, fog, lit,
    hey() { shows = [0, .5, 1, 1.6, 2.1, 2.8].map(d => ({ t: -d, x: lr(-16, 16), y: lr(4.5, 6.5), z: lr(-50, -35), c: [lPick(SC), lPick(SC)] })); for (let i = 0; i < 120; i++) { const a = lr(0, 6.3); conf.userData.throw(Math.cos(a) * 2.6, .7, Math.sin(a) * 2.6, Math.cos(a) * lr(.5, 2), lr(3, 6), Math.sin(a) * lr(.5, 2), lr(2.5, 4), lPick(SC), 1.6); } },
    tick(dt, t) {
      lobbyClock(t); motesQ(spr);
      clouds.position.x = Math.sin(t * .015) * 25;
      for (const B of balloons) B.m.position.set(((B.x + t * B.v + 70) % 140 + 140) % 140 - 70, B.y + Math.sin(t * .4 + B.x) * .25, B.m.position.z);
      flames.forEach((f, i) => { const k = 1 + Math.sin(t * 11 + i * 2) * .12 + Math.sin(t * 23 + i) * .06; f.scale.set(1, k, 1); f.position.x = snap(CN[i][0]) + Math.sin(t * 7 + i) * .01; lights[i].intensity = 1.4 + (k - 1) * 2; });
      for (const s of shows) if (s.t < 0 && (s.t += dt) >= 0) for (let i = 0; i < 40; i++) { const a = lr(0, 6.3), e = lr(-1, 1), v = lr(3, 5.5); fw.userData.throw(s.x, s.y, s.z, Math.cos(a) * Math.sqrt(1 - e * e) * v, e * v, Math.sin(a) * Math.sqrt(1 - e * e) * v, lr(1, 1.8), s.c[i & 1], 1.2); }
      if (shows.length && shows.every(s => s.t >= 0)) shows = [];
      fw.userData.tick(dt, 3); conf.userData.tick(dt, 2.5);
    },
  };
};
lobbyUse(lobbyMine().id); // yours, now every world can be made
