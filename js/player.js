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
function blocked(x, z, r, feet) { return solids.some(s => overlaps(s, x, z, r) && feet < topAt(s, x, z, r) - 0.05 && feet + BODY > (s.bot || 0)); }
function groundAt(x, z, r, feet) { let g = 0; for (const s of solids) if (overlaps(s, x, z, r)) { const t = topAt(s, x, z, r); if (t <= feet + 0.05) g = Math.max(g, t); } return g; }
// lowest ceiling between feet+BODY and feet+BODY+rise, or Infinity
function ceilingAt(x, z, r, feet, rise) { let c = Infinity; for (const s of solids) { const b = s.bot || 0; if (b > feet + BODY - .1 && b < feet + BODY + rise && overlaps(s, x, z, r)) c = Math.min(c, b); } return c; }
// move a walker (you, a bot, a zombie) to nx, nz. Walks up anything up to STEP high if it's standing on something.
function walkTo(pos, nx, nz, r, grounded) {
  if (!blocked(nx, nz, r, pos.y)) { pos.x = nx; pos.z = nz; return true; }
  if (!grounded) return false;
  const up = groundAt(nx, nz, r, pos.y + STEP);
  if (up > pos.y && !blocked(nx, nz, r, up)) { pos.x = nx; pos.z = nz; pos.y = up; return true; }
  return false;
}
// gravity for bots and zombies: drop to the floor, snapping down stairs instead of falling off each step.
// A positive vy is a jump in progress.
function settle(o, dt) {
  const p = o.g.position, gy = groundAt(p.x, p.z, o.r, p.y);
  if (!o.vy && p.y - gy <= STEP) { p.y = gy; return; }
  const prev = p.y;
  o.vy = (o.vy || 0) - 25 * dt; p.y = Math.max(gy, p.y + o.vy * dt);
  if (o.vy > 0) { const c = ceilingAt(p.x, p.z, o.r, prev, p.y - prev); if (p.y + BODY > c) { p.y = c - BODY; o.vy = -.01; } }
  if (p.y === gy) o.vy = 0;
}

// max HP is always 100. Armor is a second health bar that soaks damage before HP does (unless the damage pierces)
const ARMOR_CAP = 100; // most armor you can buy up to (4 shop buys)
const P = { pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, onGround: true, kx: 0, kz: 0 }; // kx/kz = knockback
const keys = {};
let locked = false, dead = false, inLobby = true;
let mode = 'zombies'; // which mode you picked in the lobby: 'zombies' or 'dm' (deathmatch)
let mapId = localStorage.getItem('voxelstrike-map') || 'yard';
let respawnT = 0, matchOver = false; // deathmatch: seconds until you respawn (0 = alive), and whether the timer has run out
