// collision and movement
const BODY = 1.8, STEP = .5; // player height, tallest ledge you can step up
function overlaps(s, x, z, r) {
  return x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ && !(s.round && Math.hypot(x - (s.minX + s.maxX) / 2, z - (s.minZ + s.maxZ) / 2) > s.round + r);
}
function topAt(s, x, z, r) {
  const K = s.peak;
  if (K) {
    const u = Math.max(0, Math.abs(x - K.x) - r) / K.rx, v = Math.max(0, Math.abs(z - K.z) - r) / K.rz;
    return s.top - (s.top - K.edge) * Math.min(1, s.round ? Math.hypot(u, v) : Math.max(u, v));
  }
  const R = s.ramp; if (!R) return s.top;
  const c = R.ax === 'x' ? x : z, h = v => s.bot + (s.top - s.bot) * Math.max(0, Math.min(1, (v - R.a) / (R.b - R.a)));
  return Math.max(h(c - r), h(c + r));
}
// solids near a spot: a 2 m grid per map, each square holding what's within 1 m of it
const SG = 2, SM = 1;
let sg = null;
function solidGrid(list) {
  const x0 = -((MAP?.half ?? 24) + 4), n = Math.ceil(-x0 * 2 / SG), cells = Array.from({ length: n * n }, () => []);
  const ci = v => Math.max(0, Math.min(n - 1, Math.floor((v - x0) / SG)));
  for (const s of list) for (let j = ci(s.minZ - SM); j <= ci(s.maxZ + SM); j++) for (let i = ci(s.minX - SM); i <= ci(s.maxX + SM); i++) cells[j * n + i].push(s);
  return { list, len: list.length, n, x0, cells };
}
function solidsNear(x, z, r) {
  if (sg?.list !== solids || sg.len !== solids.length) sg = solidGrid(solids);
  const i = Math.floor((x - sg.x0) / SG), j = Math.floor((z - sg.x0) / SG);
  return r > SM || i < 0 || j < 0 || i >= sg.n || j >= sg.n ? solids : sg.cells[j * sg.n + i];
}
const hits = (s, x, z, r, feet) => overlaps(s, x, z, r) && feet < topAt(s, x, z, r) - 0.05 && feet + BODY > (s.bot || 0);
const depth = (s, x, z, r) => Math.min(x + r - s.minX, s.maxX - x + r, z + r - s.minZ, s.maxZ - z + r);
// a small thing (a rock, a glob) inside something solid
const solidAt = (x, y, z, r) => solidsNear(x, z, r).some(s => overlaps(s, x, z, r) && y < topAt(s, x, z, r) && y > (s.bot || 0));
// if you're stuck inside something, let moves that don't go deeper
function blocked(x, z, r, feet, from) {
  return solidsNear(x, z, r).some(s => hits(s, x, z, r, feet) && !(from && hits(s, from.x, from.z, r, from.y) && depth(s, x, z, r) <= depth(s, from.x, from.z, r) + 1e-6));
}
let groundRamp = false, groundSolid = null;
function groundAt(x, z, r, feet) {
  let g = MAP.floor ? MAP.floor(x, z) : 0; groundRamp = false; groundSolid = null;
  for (const s of solidsNear(x, z, r)) if (overlaps(s, x, z, r)) {
    const t = topAt(s, x, z, r);
    if (t > feet + 0.05 || t < g) continue;
    const slope = !!(s.ramp || s.peak);
    if (t > g) { g = t; groundRamp = slope; groundSolid = s; } else if (slope) groundRamp = true;
  }
  return g;
}
// the terrain height where spawns look for ground (maps with raised land)
const floorY = (x, z) => MAP.top?.(x, z) ?? 0;
// stay on your feet down stairs, fall off other edges
const sticks = (drop, wasRamp) => drop <= STEP && (groundRamp || wasRamp || drop < .06);
// smooth out the camera when stepping up a ledge
function easeLag(pos, dt) { if (pos.lag) { pos.lag *= Math.exp(-14 * dt); if (pos.lag < .005) pos.lag = 0; } }
function ceilingAt(x, z, r, feet, rise) { let c = Infinity; for (const s of solidsNear(x, z, r)) { const b = s.bot || 0; if (b > feet + BODY - .1 && b < feet + BODY + rise && overlaps(s, x, z, r)) c = Math.min(c, b); } return c; }
// move a player, bot or zombie, stepping up small ledges
function walkTo(pos, nx, nz, r, grounded, step = STEP) {
  if (!blocked(nx, nz, r, pos.y, pos)) {
    const g = groundAt(nx, nz, r, pos.y);
    if (g <= pos.y || !blocked(nx, nz, r, g, pos)) { pos.x = nx; pos.z = nz; return true; }
    return slideOut(pos, nx, nz, r, g);
  }
  if (!grounded) return false;
  const up = groundAt(nx, nz, r, pos.y + step);
  if (up > pos.y && !blocked(nx, nz, r, up, pos)) { if (!groundRamp) pos.lag = Math.min(STEP * 1.5, (pos.lag || 0) + up - pos.y); pos.x = nx; pos.z = nz; pos.y = up; return true; }
  return up > pos.y && slideOut(pos, nx, nz, r, up);
}
// slide out from under a low edge instead of getting stuck
function slideOut(pos, nx, nz, r, h) {
  const s = solidsNear(nx, nz, r).find(s => (s.bot || 0) > h + STEP && hits(s, nx, nz, r, h));
  if (!s) return false;
  const dx = nx - pos.x, dz = nz - pos.z, len = Math.hypot(dx, dz), side = Math.abs(dz) >= Math.abs(dx) ? 'x' : 'z';
  const c = pos[side], lo = side === 'x' ? s.minX : s.minZ, hi = side === 'x' ? s.maxX : s.maxZ;
  const a = lo - (c + r), b = hi - (c - r), out = Math.abs(a) < Math.abs(b) ? a : b;
  if (Math.abs(out) > .3) return false;
  const m = Math.sign(out) * Math.min(len, Math.abs(out) + .002);
  const tx = side === 'x' ? pos.x + m : pos.x, tz = side === 'z' ? pos.z + m : pos.z;
  if (blocked(tx, tz, r, pos.y, pos) || groundAt(tx, tz, r, pos.y) > pos.y + .001) return false;
  pos.x = tx; pos.z = tz; return true;
}
// water: in the sea you sink slowly (slower holding jump) and swim slower, deep water drowns you near the bottom
const SINK = 1.9, SINK_KICK = .7, SWIM_MUL = .6;
const inWater = (x, z, feet) => !!MAP.water?.(x, z, feet);
const inSea = (x, z, feet) => !!(MAP.sea ?? MAP.water)?.(x, z, feet);
const swimAt = (x, z, feet) => !MAP.void && inSea(x, z, feet);
const overWater = (x, z, feet) => MAP.water && inSea(x, z, groundAt(x, z, MAP.edgeR ?? 0, feet));
const overDeep = (x, z, feet) => MAP.water && inWater(x, z, groundAt(x, z, MAP.edgeR ?? 0, feet));
const poolAt = (x, z) => !!MAP.wet?.(x, z, groundAt(x, z, 0, floorY(x, z)));
// splash when going into water, at most every half second
function wetCheck(o, p) {
  const wet = !!MAP.wet?.(p.x, p.z, p.y), now = performance.now();
  if (wet && !o.wet && !(now - (o.splashAt || -1e9) < 500)) { o.splashAt = now; sfx('splash', o === P ? { v: .55 } : { at: p, far: 30, v: .55 }); splash(p); }
  o.wet = wet;
}
const dropsIn = (x, z, r, feet) => MAP.trapped({ x, y: groundAt(x, z, r, feet), z });
// walkTo for bots and zombies, keeping them out of the water
function walkDry(pos, nx, nz, r, grounded, into, step) {
  const ox = pos.x, oy = pos.y, oz = pos.z, lag = pos.lag, wasIn = !into && MAP.trapped?.(pos);
  if (!walkTo(pos, nx, nz, r, grounded, step)) return false;
  const sea = overWater(pos.x, pos.z, pos.y) && !overWater(ox, oz, oy) || overDeep(pos.x, pos.z, pos.y) && !overDeep(ox, oz, oy);
  if (!sea && (into || !MAP.trapped || wasIn || !dropsIn(pos.x, pos.z, r, pos.y))) return true;
  pos.x = ox; pos.y = oy; pos.z = oz; pos.lag = lag; return false;
}
// gravity for bots and zombies
function settle(o, dt) {
  const p = o.g.position, gy = groundAt(p.x, p.z, o.r, p.y);
  if (!o.vy && sticks(p.y - gy, o.onRamp)) { p.y = gy; o.onRamp = groundRamp; wetCheck(o, p); return; }
  const prev = p.y;
  o.vy = (o.vy || 0) - 25 * dt; if (o.glide && o.vy < -GLIDE_FALL) o.vy = -GLIDE_FALL; // a Skyrunner bot floats down
  if (swimAt(p.x, p.z, p.y)) o.vy = Math.max(o.vy, -SINK);
  p.y = Math.max(gy, p.y + o.vy * dt);
  if (o.vy > 0) { const c = ceilingAt(p.x, p.z, o.r, prev, p.y - prev); if (p.y + BODY > c) { p.y = c - BODY; o.vy = -.01; } }
  if (p.y === gy) { o.vy = 0; o.onRamp = groundRamp; }
  wetCheck(o, p);
}

// player state
const ARMOR_CAP = 150; // max armor with zombie shop plates
const P = { pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, dr: 0, onGround: true, kx: 0, kz: 0, mvx: 0, mvz: 0 };
const MOVE_EASE = 15; // how fast your speed catches up with the keys
// offline stand-in for online play (net.js replaces it)
let net = { on: false, pvp: false, coop: false, host: false, serverPads: false, claim() {}, burn() {}, shot() {}, launch() { return 0; }, boom() {}, ev() {}, matchTick() {}, banner: '', again() {}, leave() {}, roster() {}, applyRemote() {}, pick() {} };
const keys = {};
let locked = false, dead = false, inLobby = true;
// game mode: zombies, dm, team, blitz or blitzTeam
let mode = 'zombies';
const pvp = () => mode !== 'zombies';
const teamMode = () => mode === 'team' || mode === 'blitzTeam';
let mapId = localStorage.getItem('voxelstrike-map') || 'yard';
let respawnT = 0, matchOver = false;
