// duels: the two of you face off, then fight (net.js runs the match, RULES.duel its rules)
const DUEL_FOV = 36;
const duelEl = $('duel');
let duelHideT = 0;
// the standoff starts (standoff is declared in deathmatch.js): info is the welcome's duel clock
function duelStand(info) {
  duelExit();
  clearTimeout(duelHideT);
  standoff = { t: 0, slot: -1, bodies: new Map(), self: null, stand: info.stand || 0, count: info.count || 0, text: '', mid: '', push: 0 };
  document.body.classList.add('standoff');
  duelEl.className = ''; duelEl.style.display = 'flex';
  if (locked) unlockMouse(); // the buttons need the mouse
  duelRoster();
}
// who's standing there: you and your rival (rebuild: their look changed)
function duelRoster(rebuild = false) {
  const S = standoff, D = MAP.duel; if (!S || !D) return;
  const riv = net.rival(), slot = net.slot, want = new Set([net.pid, riv?.pid]);
  if (rebuild || slot !== S.slot) { for (const b of S.bodies.values()) duelDrop(b); S.bodies.clear(); }
  for (const [p, b] of S.bodies) if (!want.has(p)) { duelDrop(b); S.bodies.delete(p); }
  S.slot = slot;
  const mine = D.stand[slot], theirs = D.stand[1 - slot];
  if (!S.bodies.has(net.pid)) S.bodies.set(net.pid, duelStatue(S.self ??= net.selfRec(), mine, theirs));
  if (riv && !S.bodies.has(riv.pid)) {
    const b = duelStatue(riv, theirs, mine); S.bodies.set(riv.pid, b);
    if (!rebuild) { for (let i = 0; i < 3; i++) burst(b.g.position.clone().setY(.2 + i * .3), D.puff ?? 0xd6dce4, 6); sfx('join'); } // turns up in a puff (the map's colour)
  }
  duelPanel();
}
// one of them, gun in hand and pointed at the ground
function duelStatue(rec, [x, z], [fx, fz]) {
  const yaw = Math.atan2(fx - x, fz - z), b = makeBot(rec, { x, z, yaw });
  zombies.splice(zombies.indexOf(b), 1); rec.b = null;
  for (const m of b.glowMs || []) m.layers.disable(GLOW_LAYER);
  b.glowMs = null; b.tag.visible = false;
  const side = rec.load[1]; if (side !== undefined && side !== b.gun) { b.gun = side; holdGun(b); } // the backup, a sidearm
  b.g.rotation.y = yaw - b.holdTurn; b.headPiv.rotation.y = b.holdTurn;
  b.pivR.rotation.z = -LEG_SPREAD * 2; b.pivL.rotation.z = LEG_SPREAD * 2;
  b.ph = Math.random() * 7;
  return b;
}
function duelDrop(b) {
  scene.remove(b.g); b.core?.dispose();
  b.gunM?.traverse(o => { if (o.geometry && o !== b.flashM && !o.userData.shared) o.geometry.dispose(); });
}
// the server's clock for the standoff: wait (and when it starts by itself), then the count
function duelPhase(m) {
  const S = standoff; if (!S) return;
  if (m.phase === 'wait') { S.stand = m.stand || 0; S.count = 0; }
  else if (m.phase === 'count') { S.count = m.at || net.now() + 3000; S.stand = 0; }
  duelPanel();
}
function duelRdy(who) { if (who !== net.pid) sfx('ui'); duelPanel(); }
// the start: out of the standoff and into the fight
function duelGo() {
  if (!standoff) return;
  duelExit(true);
  sfx(MAP.duel?.go || 'waveStart'); // the map's own start sound, the ghost town's bell
  if (!locked) showAway(true); // a click to grab the mouse
}
function duelExit(fight = false) {
  const S = standoff; if (!S) return;
  standoff = null;
  for (const b of S.bodies.values()) duelDrop(b);
  if (S.self?.tag?.map) { S.self.tag.map.dispose(); S.self.tag.dispose(); }
  document.body.classList.remove('standoff');
  camera.fov = fovBase; camera.updateProjectionMatrix();
  clearTimeout(duelHideT);
  if (fight) duelFlash('FIGHT!'); else duelEl.style.display = 'none';
}
// big gold words over the fight: FIGHT! and SUDDEN DEATH
function duelFlash(text, long = false) {
  clearTimeout(duelHideT);
  const el = $('duelMid');
  duelEl.className = long ? 'flash long' : 'flash'; duelEl.style.display = 'flex';
  el.textContent = text; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  duelHideT = setTimeout(() => { if (!standoff) duelEl.style.display = 'none'; }, 1100);
}
// names, READY and what you're waiting for
function duelPanel() {
  const S = standoff; if (!S) return;
  const riv = net.rival(), me = youRec || {}, plate = (el, name, css, lv, rdy) => {
    el.innerHTML = `<b style="color:${css}">${name}</b><small>LVL ${lv}</small><i>READY</i>`;
    el.classList.toggle('rdy', !!rdy); el.classList.toggle('none', !name);
  };
  plate($('duelA'), myName, '#8ff0b6', prof.lv, me.rdy);
  if (riv) plate($('duelB'), riv.name, riv.css, riv.lv, riv.rdy);
  else { $('duelB').innerHTML = '<b>???</b><small>ON THE WAY</small><i></i>'; $('duelB').className = 'dpl none'; }
  const go = $('duelGo');
  go.style.display = riv && !locked ? '' : 'none';
  go.textContent = me.rdy ? 'READY!' : 'READY'; go.classList.toggle('on', !!me.rdy);
  $('duelX').style.display = locked ? 'none' : '';
  $('duelInv').style.display = net.code && !riv && !locked ? '' : 'none';
  S.text = null; // the message line, next frame
}
function duelLine() {
  const S = standoff, riv = net.rival(), me = youRec || {};
  if (!riv) return net.code ? `Waiting for your friend  ·  ROOM CODE ${net.code}` : 'Waiting for a rival to show up';
  if (S.count) return '';
  const left = S.stand ? Math.max(0, Math.ceil((S.stand - net.now()) / 1000)) : 0, auto = left ? `  ·  STARTS IN ${left}` : '';
  if (me.rdy) return (riv.rdy ? 'Steady now' : `Waiting on ${riv.name}`) + auto;
  return "Hit READY when you're good to go" + auto;
}
// each frame of the standoff: the camera over your shoulder, them breathing, the countdown
const _dcT = new THREE.Vector3();
function duelCam(dt) {
  const S = standoff, D = MAP.duel; if (!D) return;
  S.t += dt;
  vm.visible = false;
  const k = Math.max(0, S.slot), [yx, yz] = D.stand[k], [rx, rz] = D.stand[1 - k];
  const L = Math.hypot(rx - yx, rz - yz), fx = (rx - yx) / L, fz = (rz - yz) / L, ex = -fz, ez = fx; // ahead and to your right
  const left = S.count ? (S.count - net.now()) / 1000 : 9, tense = S.count ? Math.min(1, Math.max(0, 1 - left / 3)) : 0;
  S.push += ((S.count ? .55 * tense : 0) - S.push) * Math.min(1, dt * 3);
  const wide = Math.min(1, Math.max(0, camera.aspect - .6)); // an upright phone: in behind you rather than off your shoulder
  const y0 = S.bodies.get(net.pid)?.g.position.y ?? 0, back = 3.7 - S.push - Math.min(1, S.t / 40) * .25, side = .7 + 1.3 * wide + Math.sin(S.t * .45) * .05;
  camera.position.set(yx + ex * side - fx * back, y0 + 1.85 + Math.sin(S.t * .37) * .025, yz + ez * side - fz * back);
  // you on the left, them a little right of the middle
  const a = .04 + .24 * wide, dx = fx * Math.cos(a) - ex * Math.sin(a), dz = fz * Math.cos(a) - ez * Math.sin(a);
  camera.lookAt(_dcT.set(camera.position.x + dx * 12, camera.position.y - .62, camera.position.z + dz * 12));
  const fov = Math.min(60, DUEL_FOV * Math.max(1, 1.6 / camera.aspect));
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  for (const b of S.bodies.values()) { // breathing, the gun hand creeping up as the count runs out
    const t = S.t + b.ph;
    b.aim.rotation.x = .62 - .14 * tense + Math.sin(t * 1.3) * .025;
    b.aim.position.y = 22 * BOT_U + Math.sin(t * 2.1) * .006;
    b.headPiv.rotation.x = Math.sin(t * .7) * .03 - .04 * tense;
  }
  // the big countdown
  const n = S.count ? Math.ceil(left) : 0, mid = !S.count ? '' : n > 0 ? String(Math.min(3, n)) : 'FIGHT!';
  if (mid !== S.mid) { S.mid = mid; const el = $('duelMid'); el.textContent = mid; el.classList.remove('pop'); void el.offsetWidth; if (mid) { el.classList.add('pop'); if (n > 0) sfx('tick'); } }
  const text = duelLine();
  if (text !== S.text) { S.text = text; $('duelMsg').textContent = text; }
}
$('duelGo').addEventListener('click', e => {
  e.stopPropagation();
  if (!standoff) return;
  if (!youRec?.rdy && net.phase === 'wait') { net.rdy(); if (youRec) youRec.rdy = true; sfx('ui'); }
  lockMouse(); duelPanel();
});
$('duelX').addEventListener('click', e => { e.stopPropagation(); sfx('ui'); net.leave(); restart(); showLobby(true); });
$('duelInv').addEventListener('click', e => { e.stopPropagation(); $('inviteBtn').click(); });
addEventListener('keydown', e => { if (standoff && !locked && !chatting && (e.code === 'Enter' || e.code === 'Space') && $('duelGo').style.display !== 'none') { e.preventDefault(); $('duelGo').click(); } });
document.addEventListener('pointerlockchange', () => { if (standoff) duelPanel(); }); // READY and LEAVE hide while the mouse is held
