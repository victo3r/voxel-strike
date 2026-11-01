function overlaps(s, x, z, r) { return x + r > s.minX && x - r < s.maxX && z + r > s.minZ && z - r < s.maxZ; }
function blocked(x, z, r, feet) { return solids.some(s => feet < s.top - 0.05 && overlaps(s, x, z, r)); }
function groundAt(x, z, r, feet) { let g = 0; for (const s of solids) if (s.top <= feet + 0.05 && overlaps(s, x, z, r)) g = Math.max(g, s.top); return g; }

let ac;
function shotSound(vol = .3, len = .15, cutoff = 1800) {
  ac ??= new AudioContext();
  const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = buf; f.type = 'lowpass'; f.frequency.value = cutoff; g.gain.value = vol;
  src.connect(f).connect(g).connect(ac.destination); src.start();
}
function beep(freq, dur, type = 'square', vol = .1) {
  ac ??= new AudioContext();
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * .4, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(); o.stop(t + dur);
}

// max HP is always 100. Armor is a second health bar that soaks damage before HP does (unless the damage pierces)
const ARMOR_CAP = 100; // most armor you can buy up to (4 shop buys)
const P = { pos: new THREE.Vector3(), vy: 0, yaw: 0, pitch: 0, hp: 100, max: 100, armor: 0, maxArmor: 0, onGround: true, kx: 0, kz: 0 }; // kx/kz = knockback
const keys = {};
let locked = false, dead = false, inLobby = true;
let mode = 'zombies'; // which mode you picked in the lobby: 'zombies' or 'dm' (deathmatch)
let mapId = localStorage.getItem('voxelstrike-map') || 'yard';
let respawnT = 0, matchOver = false; // deathmatch: seconds until you respawn (0 = alive), and whether the timer has run out
