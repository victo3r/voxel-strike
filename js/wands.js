// wands: bolts that fly to where a shot landed, the Ancient Wand's spells, stuns and the Soul Wand's heal
const PUFF_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d');
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const r = Math.hypot(x - 3.5, y - 3.5); if (r > 3.9) continue; const v = r < 1.6 ? 255 : r < 2.8 ? 190 : 110; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
})();
const puffMats = cs => cs.map(c => bitMat(c, PUFF_TEX));
const EMBER_MATS = puffMats([0xff5a1a, 0xff9a2a, 0xffd060]), WIND_MATS = puffMats([0xffffff, 0xd8f2ff, 0xa8dcff]), SOUL_MATS = puffMats([0x6fffd8, 0xb8fff0, 0x2fc8a0]);
const SPARK_MATS = [0xffe14a, 0xffffff, 0xfff08a].map(c => bitMat(c, SHARD_TEX));
const ICE_MATS = [0x9fe8ff, 0xe8fbff, 0x5fb8ff].map(c => bitMat(c, SHARD_TEX)), RUNE_MATS = [0xffe08a, 0xffd060, 0xfff4c0].map(c => bitMat(c, STAR_MATS[0].map));
// bits off a wand: [mats, count, speed, spread, life, size, gravity]
const WAND_BITS = { ember: [EMBER_MATS, 7, 2.5, 1.6, .35, .09, -3], wind: [WIND_MATS, 8, 3, 2.4, .3, .1, 0], soul: [SOUL_MATS, 6, 1.5, 1.2, .5, .08, -2], rune: [RUNE_MATS, 7, 2.5, 2.2, .4, .09, 0], ice: [ICE_MATS, 7, 2.5, 2.2, .4, .09, 6], spark: [SPARK_MATS, 8, 4, 3.2, .22, .08, 0] };
function wandBits(k, at, sc, n, spread, size = 1) {
  const [mats, , , , life, sz, g] = WAND_BITS[k];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(mats[Math.random() * mats.length | 0]); s.position.copy(at); s.scale.setScalar(sz * size * (.7 + Math.random() * .6)); sc.add(s);
    starBits.push({ s, sc, v: new THREE.Vector3(Math.random() - .5, Math.random() - .3, Math.random() - .5).multiplyScalar(spread), life: life * (.8 + Math.random() * .4), k: s.scale.x, g });
  }
}

// bolts: just for show, the hit already happened (the Ancient Wand's spell goes off when it lands)
const WAND_BOLT = {
  flame: { spd: 120, glow: 0xff6a1a, core: 0xffd070, size: .26, bits: 'ember', gap: .5 },
  wind: { spd: 90, glow: 0xbfe8ff, core: 0xffffff, size: .3, bits: 'wind', gap: .5 },
  soul: { spd: 260, glow: 0x3fe8c0, core: 0xe0fff6, size: .2, bits: 'soul', gap: .6 },
  stun: { spd: 50, glow: 0xffd23a, core: 0xffffff, size: .3, bits: 'spark', gap: .25 },
  spell0: { spd: 160, glow: 0xff4a2a, core: 0xffd070, size: .34, bits: 'ember', gap: .4 },
  spell1: { spd: 160, glow: 0x6fc8ff, core: 0xf0fcff, size: .34, bits: 'ice', gap: .4 },
  spell2: { spd: 160, glow: 0xd8f6ff, core: 0xffffff, size: .34, bits: 'wind', gap: .4 },
};
for (const K of Object.values(WAND_BOLT)) { K.mg = bitMat(K.glow, PUFF_TEX); K.mc = bitMat(K.core, PUFF_TEX); }
const bolts = [], _bp = new THREE.Vector3(), _bt = new THREE.Vector3();
function wandBolt(kind, from, to, sc = scene, onArrive = null, size = 1) {
  const K = WAND_BOLT[kind], len = Math.max(.01, from.distanceTo(to));
  const ms = [K.mg, K.mc].map((m, j) => { const s = new THREE.Sprite(m); s.scale.setScalar(K.size * size * (j ? .5 : 1)); s.position.copy(from); sc.add(s); return s; });
  const b = { ms, K, sc, from: from.clone(), to: to.clone(), dir: to.clone().sub(from).divideScalar(len), len, d: 0, gap: 0, size, onArrive, ghost: 0 };
  bolts.push(b); return b;
}
function boltTick(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i], K = b.K, was = b.d; b.d = Math.min(b.len, b.d + K.spd * dt);
    _bp.copy(b.from).addScaledVector(b.dir, b.d);
    for (const m of b.ms) m.position.copy(_bp);
    for (b.gap += b.d - was; b.gap >= K.gap; b.gap -= K.gap) wandBits(K.bits, _bt.copy(b.from).addScaledVector(b.dir, b.d - b.gap), b.sc, 1, .5, b.size * .8); // a trail
    if (b.d < b.len) continue;
    for (const m of b.ms) b.sc.remove(m);
    bolts.splice(i, 1);
    if (b.ghost) continue; // someone else's spell: the server says where it went off
    wandBits(K.bits, b.to, b.sc, 8, 3.5, b.size);
    b.onArrive?.(b.to);
  }
  stunStars(); spellOrbTick();
}
function clearBolts(sc) { for (let i = bolts.length - 1; i >= 0; i--) if (!sc || bolts[i].sc === sc) { bolts[i].ms.forEach(m => bolts[i].sc.remove(m)); bolts.splice(i, 1); } }

// wand effects: the Arcane set makes them last longer, Ironclad shrugs them off, the Arcane Hat sometimes does
const rlOf = (w, fx) => w.reload * (1 - (fx?.rl || 0)); // Arcane Boots reload faster
const fxOf = o => o === P ? youFx() : o?.rec?.fx;
const longOf = (fx, w) => w?.wand ? 1 + (fx?.long || 0) : 1;
function shrugs(o, key, t) {
  const p = fxOf(o)?.shrug; if (!p || o.remote) return false; // other players roll for themselves
  const S = o.shrugT ??= {}, now = performance.now() / 1000;
  if (S[key] > now) return true;
  if (key === 'slow' ? o.slowT > 0 : key === 'stun' ? o.stunT > 0 : o.burn > 0) return false; // already on: nothing new to roll
  if (Math.random() >= p) return false;
  S[key] = now + t;
  if (o === P) { toast('SHOOK IT OFF', '#c8b0ff'); sfx('shrug'); }
  return true;
}
// a wand bolt's extras on whoever it hit: burn, a push
function wandHit(w, o, from, by) {
  if (o === P ? respawnT > 0 : o.dead) return;
  if (w.burn) applyBurn(o, w.burnT * longOf(by ? by.rec?.fx : youFx(), w), w.burn, by, w.id, true);
  if (w.knock && !net.pvp) launch(o, o === P ? new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z) : o.g.position.clone().setY(o.g.position.y + 1), from, w.knock, false); // online the server sends the push
}

// the Stun Wand's swing throws a little crackling blast, as far as it reaches
function zapEnd(w, eye, dir, by) {
  ray2.set(eye, dir); ray2.far = w.range;
  const hit = ray2.intersectObjects(targetsFor(by, ray2), false)[0];
  let d = hit ? hit.distance : w.range;
  if (by) d = Math.min(d, rayHitsYou(ray2.ray, d));
  return eye.clone().addScaledVector(dir, d);
}
function stunZap(from, to, sc = scene, size = 1) {
  wandBolt('stun', from, to, sc, sc !== scene ? null : p => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: .6 }));
    m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R: 1 });
  }, size);
}

// stuns: frozen in place until a moment after landing, then a short spell where it can't happen again
const STUN_CD = 2;
function stunHit(o, t) {
  if (o?.mirror) { if (!o.dead) net.zHit(o, { st: t }); return; } // co-op: the host stuns it
  if (!o || o.stunT > 0 || o.stunCD > 0 || o.dead || fxOf(o)?.steady || shrugs(o, 'stun', t)) return;
  o.stunT = o.boss ? t / 2 : t;
  if (o === P) { toast('STUNNED', '#ffd23a'); sfx('stunned'); }
  else sfx('stunned', { at: o.g.position, far: 25, v: .7 });
}
function stunTick(o, dt, grounded) {
  if (o.stunT > 0) {
    if (grounded) o.stunT -= dt;
    if (o.stunT > 0) return true;
    o.stunT = 0; o.stunCD = STUN_CD; return false;
  }
  if (o.stunCD > 0) o.stunCD -= dt;
  return false;
}
// little stars round a stunned head
const stunBits = new Map();
function stunStars() {
  const t = performance.now() / 1000;
  for (const o of zombies) {
    if (!(o.stunT > 0) || o.dead) continue;
    const sc = o.scale || 1;
    let st = stunBits.get(o);
    if (!st) { st = [0, 1, 2].map(() => { const s = new THREE.Sprite(STAR_MATS[0]); s.scale.setScalar(.16 * sc); scene.add(s); return s; }); stunBits.set(o, st); }
    const p = o.g.position;
    st.forEach((s, k) => { const a = t * 5 + k * 2.094; s.position.set(p.x + Math.cos(a) * .32 * sc, p.y + 2.1 * sc + Math.sin(a * 2) * .04, p.z + Math.sin(a) * .32 * sc); });
  }
  for (const [o, st] of stunBits) if (!(o.stunT > 0) || o.dead || !zombies.includes(o)) { st.forEach(s => s.parent?.remove(s)); stunBits.delete(o); }
}

// the Soul Wand: a kill gives some health back
const SOUL_Z = 10; // in zombie waves
function soulHeal(by, from, n) {
  if (by) { if (by.dead) return; by.hp = Math.min(by.maxHp, by.hp + n); soulFly(from, by.g.position.clone().setY(by.g.position.y + 1.2)); return; }
  if (respawnT > 0 || dead) return;
  P.hp = Math.min(P.max, P.hp + n); toast('+' + n + ' HP', '#6fffd8'); sfx('soulHeal'); soulFly(from, null);
}
function soulFly(from, to) { // wisps from the body to whoever took the soul
  const at = to ?? camera.position;
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(SOUL_MATS[i % 3]); s.position.copy(from).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(.5)); s.scale.setScalar(.12); scene.add(s);
    const life = .45 + Math.random() * .15, v = at.clone().sub(s.position).multiplyScalar(1.7 / life).add(new THREE.Vector3(Math.random() - .5, Math.random(), Math.random() - .5).multiplyScalar(1.5));
    starBits.push({ s, sc: scene, v, life, k: .12 });
  }
}

// the Ancient Wand: fire, ice or wind, nobody knows which until it's cast
const SPELL_FAR = 80, SPELL_GUST = 1.5, FROST = { frost: true };
const rollEl = () => Math.random() * 3 | 0;
let spellNext = rollEl();
const _st = new THREE.Vector3();
function castSpell(w, eye, dir, by, tip) {
  const el = by ? by.spellEl ?? rollEl() : spellNext;
  if (by) by.spellEl = rollEl(); else spellNext = rollEl();
  ray2.set(eye, dir); ray2.far = SPELL_FAR;
  const hit = ray2.intersectObjects(targetsFor(by, ray2), false)[0];
  let d = hit ? hit.distance : SPELL_FAR;
  if (by && !friendly(by, YOU_T)) d = Math.min(d, rayHitsYou(ray2.ray, d));
  const at = eye.clone().addScaledVector(dir, d), id = net.launch(w.id, eye, dir, by, el);
  wandBolt('spell' + el, tip.getWorldPosition(_st), at, scene, p => { net.boom(id, p, by); blast(p, ROCKET_R, w.dmg, by ? w.dmg : 0, null, by, w.id, id, el); });
}
const SPELL_FX = [[0xff8a2a, 0xff4a1a, 'spellFire', 'ember'], [0xcff4ff, 0x6fc8ff, 'spellIce', 'ice'], [0xffffff, 0xbfe8ff, 'spellWind', 'wind']];
function spellFx(p, el) {
  const [a, c, snd, bits] = SPELL_FX[el] ?? SPELL_FX[0];
  burst(p, a, 18); burst(p, c, 10); wandBits(bits, p, scene, 16, 7);
  sfx(snd, { at: p, far: 100 });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: a, transparent: true, opacity: .6 }));
  m.position.copy(p); scene.add(m); booms.push({ m, t: 0, R: ROCKET_R });
}
// the next spell glows in the crystal
const ORB_MATS = [0xff5a2a, 0x8fe0ff, 0xf4fff8].map(c => { const m = bitMat(c, PUFF_TEX); m.depthTest = false; return m; });
const spellOrb = new THREE.Sprite(ORB_MATS[0]); spellOrb.renderOrder = 8; spellOrb.userData.shared = true;
function spellOrbTick() {
  const on = !inLobby && !!BASE[cur]?.spell && gunShown === cur && vm.visible;
  if (on && spellOrb.parent !== vm) vm.add(spellOrb);
  spellOrb.visible = on; if (!on) return;
  spellOrb.material = ORB_MATS[spellNext];
  spellOrb.position.copy(flashMesh.position); spellOrb.position.z += .015 + 5.5 * gunPx(cur);
  spellOrb.scale.setScalar(.05 * (1 + .12 * Math.sin(performance.now() * .008)));
}
