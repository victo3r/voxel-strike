// A solid fills the space from s.bot (0 if not set) up to s.top, so floors can hang over your head.
// A ramp (stairs) has a sloped top: s.ramp = { ax: 'x' | 'z', a, b } where its top is s.bot at coordinate a and s.top at b.
// For a ramp, the height that counts is the highest point under you, so you walk up it like steps.
const BODY = 1.8, STEP = .5; // how tall you are for bumping your head, and the tallest ledge you walk up without jumping
function overlaps(s, x, z, r) { return x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ; }
function topAt(s, x, z, r) {
  const R = s.ramp; if (!R) return s.top;
  const c = R.ax === 'x' ? x : z, h = v => s.bot + (s.top - s.bot) * Math.max(0, Math.min(1, (v - R.a) / (R.b - R.a)));
  return Math.max(h(c - r), h(c + r));
}
const hits = (s, x, z, r, feet) => overlaps(s, x, z, r) && feet < topAt(s, x, z, r) - 0.05 && feet + BODY > (s.bot || 0);
// how far into s you are sideways (the shortest way out)
const depth = (s, x, z, r) => Math.min(x + r - s.minX, s.maxX - x + r, z + r - s.minZ, s.maxZ - z + r);
// from = where you are now. If you're already stuck inside something, moves that don't take you deeper into it are allowed,
// so you can always walk back out
function blocked(x, z, r, feet, from) {
  return solids.some(s => hits(s, x, z, r, feet) && !(from && hits(s, from.x, from.z, r, from.y) && depth(s, x, z, r) <= depth(s, from.x, from.z, r) + 1e-6));
}
// set by groundAt: whether the floor it found is a stair slope, and the solid it is (null = the map's ground)
let groundRamp = false, groundSolid = null;
function groundAt(x, z, r, feet) {
  let g = MAP.floor ? MAP.floor(x, z) : 0; groundRamp = false; groundSolid = null; // the map's ground is at 0, except where it says (deep water)
  for (const s of solids) if (overlaps(s, x, z, r)) {
    const t = topAt(s, x, z, r);
    if (t > feet + 0.05 || t < g) continue;
    if (t > g) { g = t; groundRamp = !!s.ramp; groundSolid = s; } else if (s.ramp) groundRamp = true;
  }
  return g;
}
// walking down stairs keeps you on your feet. Off any other edge you fall, unless the drop is too small to notice
const sticks = (drop, wasRamp) => drop <= STEP && (groundRamp || wasRamp || drop < .06);
// stepping up a ledge moves you up at once, but what you see (your camera, a bot's body) catches up over a moment.
// pos.lag = how far below the real height it's drawn right now
function easeLag(pos, dt) { if (pos.lag) { pos.lag *= Math.exp(-14 * dt); if (pos.lag < .005) pos.lag = 0; } }
// lowest ceiling between feet+BODY and feet+BODY+rise, or Infinity
function ceilingAt(x, z, r, feet, rise) { let c = Infinity; for (const s of solids) { const b = s.bot || 0; if (b > feet + BODY - .1 && b < feet + BODY + rise && overlaps(s, x, z, r)) c = Math.min(c, b); } return c; }
// move a walker (you, a bot, a zombie) to nx, nz. Walks up anything up to STEP high if it's standing on something.
function walkTo(pos, nx, nz, r, grounded) {
  if (!blocked(nx, nz, r, pos.y, pos)) {
    // the floor can be a hair higher than you there (going up a stair slope), and you get lifted onto it. Check your head still fits
    const g = groundAt(nx, nz, r, pos.y);
    if (g <= pos.y || !blocked(nx, nz, r, g, pos)) { pos.x = nx; pos.z = nz; return true; }
    return slideOut(pos, nx, nz, r, g);
  }
  if (!grounded) return false;
  const up = groundAt(nx, nz, r, pos.y + STEP);
  if (up > pos.y && !blocked(nx, nz, r, up, pos)) { if (!groundRamp) pos.lag = Math.min(STEP * 1.5, (pos.lag || 0) + up - pos.y); pos.x = nx; pos.z = nz; pos.y = up; return true; }
  return up > pos.y && slideOut(pos, nx, nz, r, up);
}
// climbing to height h at nx, nz would put your head in something overhead (like the edge of the floor above the stairs).
// If you're only just under its edge, slide sideways out from under it instead of stopping dead, the way you slide along a wall
function slideOut(pos, nx, nz, r, h) {
  const s = solids.find(s => (s.bot || 0) > h + STEP && hits(s, nx, nz, r, h));
  if (!s) return false;
  const dx = nx - pos.x, dz = nz - pos.z, len = Math.hypot(dx, dz), side = Math.abs(dz) >= Math.abs(dx) ? 'x' : 'z';
  const c = pos[side], lo = side === 'x' ? s.minX : s.minZ, hi = side === 'x' ? s.maxX : s.maxZ;
  const a = lo - (c + r), b = hi - (c - r), out = Math.abs(a) < Math.abs(b) ? a : b; // shortest way out from under it
  if (Math.abs(out) > .3) return false;
  const m = Math.sign(out) * Math.min(len, Math.abs(out) + .002);
  const tx = side === 'x' ? pos.x + m : pos.x, tz = side === 'z' ? pos.z + m : pos.z;
  if (blocked(tx, tz, r, pos.y, pos) || groundAt(tx, tz, r, pos.y) > pos.y + .001) return false;
  pos.x = tx; pos.z = tz; return true;
}
// deep water (MAP.water): nobody can swim, so whoever ends up in it drowns. Only your middle counts, so you can stand right at the edge
const inWater = (x, z, feet) => !!MAP.water?.(x, z, feet);
// walkTo for bots and zombies: they won't step into water themselves, or jump over it (they check where they'd land)
const overWater = (x, z, feet) => MAP.water && inWater(x, z, groundAt(x, z, 0, feet));
function walkDry(pos, nx, nz, r, grounded) {
  const ox = pos.x, oy = pos.y, oz = pos.z, lag = pos.lag;
  if (!walkTo(pos, nx, nz, r, grounded)) return false;
  if (!overWater(pos.x, pos.z, pos.y) || overWater(ox, oz, oy)) return true;
  pos.x = ox; pos.y = oy; pos.z = oz; pos.lag = lag; return false;
}
// gravity for bots and zombies, the same as yours: walking off an edge they fall, but they stay on their feet down stairs.
// A positive vy is a jump in progress, a negative one a fall.
function settle(o, dt) {
  const p = o.g.position, gy = groundAt(p.x, p.z, o.r, p.y);
  if (!o.vy && sticks(p.y - gy, o.onRamp)) { p.y = gy; o.onRamp = groundRamp; return; }
  const prev = p.y;
  o.vy = (o.vy || 0) - 25 * dt; p.y = Math.max(gy, p.y + o.vy * dt);
  if (o.vy > 0) { const c = ceilingAt(p.x, p.z, o.r, prev, p.y - prev); if (p.y + BODY > c) { p.y = c - BODY; o.vy = -.01; } }
  if (p.y === gy) { o.vy = 0; o.onRamp = groundRamp; }
}

// max HP is always 100. Armor is a second health bar that soaks damage before HP does (unless the damage pierces)
const ARMOR_CAP = 100; // most armor you can buy up to (4 shop buys)
const P = { pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, onGround: true, kx: 0, kz: 0 }; // kx/kz = knockback
const keys = {};
let locked = false, dead = false, inLobby = true;
let mode = 'zombies'; // which mode you picked in the lobby: 'zombies' or 'dm' (deathmatch)
let mapId = localStorage.getItem('voxelstrike-map') || 'yard';
let respawnT = 0, matchOver = false; // deathmatch: seconds until you respawn (0 = alive), and whether the timer has run out
