function overlaps(s, x, z, r) { return x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ; }
function blocked(x, z, r, feet) { return solids.some(s => feet < s.top - 0.05 && overlaps(s, x, z, r)); }
function groundAt(x, z, r, feet) { let g = 0; for (const s of solids) if (s.top <= feet + 0.05 && overlaps(s, x, z, r)) g = Math.max(g, s.top); return g; }

// max HP is always 100. Armor is a second health bar that soaks damage before HP does (unless the damage pierces)
const ARMOR_CAP = 100; // most armor you can buy up to (4 shop buys)
const P = { pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, onGround: true, kx: 0, kz: 0 }; // kx/kz = knockback
const keys = {};
let locked = false, dead = false, inLobby = true;
let mode = 'zombies'; // which mode you picked in the lobby: 'zombies' or 'dm' (deathmatch)
let mapId = localStorage.getItem('voxelstrike-map') || 'yard';
let respawnT = 0, matchOver = false; // deathmatch: seconds until you respawn (0 = alive), and whether the timer has run out
