// the target range: you alone with dummies, any gun off the rack, nothing paid or counted
let rangeDummies = [], rangeT = 0, rangeGun = null, rackCat = null, rangeNums = [], rangeBurst = null, rangeTop = '';
// a straw dummy's skin: burlap, button eyes, a stitched mouth, a target on its chest and rope at the waist and wrists
let dummySkin = null;
function dummySkinTex() {
  if (dummySkin) return dummySkin;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const n = (Math.random() - .5) * 26 - ((x + y) % 2 ? 6 : 0); px(x, y, `rgb(${200 + n | 0},${166 + n | 0},${110 + n * .8 | 0})`); }
  for (const [x, y] of [[9, 11], [13, 11]]) { g.fillStyle = '#2a2018'; g.fillRect(x, y, 2, 2); px(x, y, '#5a4a3a'); } // button eyes
  for (let x = 10; x < 14; x++) px(x, 14, x % 2 ? '#5a3a22' : '#7a5232'); // stitched mouth
  for (let y = 21; y < 31; y++) for (let x = 20; x < 28; x++) { const d = Math.hypot(x - 23.5, y - 25.5); if (d < 3.9) px(x, y, d < 1.3 ? '#d8282a' : Math.floor((3.9 - d) / 1.3) % 2 ? '#f2ece0' : '#d8282a'); } // the target
  const rope = (x0, x1, y) => { for (let x = x0; x < x1; x++) { px(x, y, '#7a5a32'); px(x, y + 1, x % 2 ? '#5e4424' : '#8a6a3c'); } };
  rope(16, 40, 30); rope(40, 56, 29); rope(32, 48, 61); // waist and wrists
  g.fillStyle = 'rgba(90,60,30,.35)'; g.fillRect(34, 24, 3, 4); // a patch on its back
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  return dummySkin = t;
}
let dummyTag = null;
// off you go: gun = a gun to hold (the armory's TRY)
let rangeFrom = null;
function startRange(gun = null) {
  if (mode !== 'range') rangeFrom = [mode, mapId];
  rangeGun = gun; mode = 'range'; mapId = 'range';
  restart(); showLobby(false); lockMouse();
}
// called at the end of setupMode
function rangeSetup() {
  rangeClear(); rangeT = 0; rangeBurst = null; rangeTop = ''; rackCat = null;
  const [x, z] = MAP.spawn; respawnYou(x, z, 0);
  if (rangeGun !== null) { rangeTake(rangeGun, true); rangeGun = null; }
  dummyTag ??= tagMat('DUMMY', '#e8c23a');
  rangeDummies = MAP.dummies.map(([x, d, kind], i) => ({ x, z: RANGE_FL - d, kind: kind || '', b: null, back: .2 + i * .06, hitAt: -9, ph: i * 1.7, sp: d > 20 ? .55 : .9 }));
}
function rangeLeave() { if (mode === 'range' && rangeFrom) [mode, mapId] = rangeFrom; }
function rangeClear() {
  for (const n of rangeNums) { n.s.parent?.remove(n.s); n.s.material.map.dispose(); n.s.material.dispose(); }
  rangeNums = []; rangeDummies = [];
}
function dummyRec(kind) {
  const armor = kind === 'armor' ? 4 : 0;
  return { name: 'DUMMY', quiet: true, css: '#e8c23a', look: randomLook('dummy', 0xc8a66e), tag: dummyTag.mat, tagW: dummyTag.w, score: 0, kills: 0, deaths: 0, streak: 0, b: null, wait: 0, skill: SKILL_MID,
    ...botLoadout(true), armor, boots: null, hat: null, kfx: '', fx: armorFx(gearFx(null, null), armor, null, null) };
}
function dummyBar(b) { // health (and armor) over its head
  const c = b.barC, g = c.getContext('2d'), f = Math.max(0, b.hp / b.maxHp), a = b.maxArmor ? Math.max(0, b.armor / b.maxArmor) : -1;
  g.clearRect(0, 0, 34, 8); g.fillStyle = '#000'; g.fillRect(0, a < 0 ? 4 : 0, 34, a < 0 ? 4 : 8);
  if (a >= 0) { g.fillStyle = '#c9ced6'; g.fillRect(1, 1, Math.round(32 * a), 2); }
  g.fillStyle = f > .5 ? '#5ad04a' : f > .25 ? '#e8c23a' : '#e0453a'; g.fillRect(1, 5, Math.round(32 * f), 2);
  b.bar.material.map.needsUpdate = true;
}
function spawnDummy(D) {
  const b = makeBot(dummyRec(D.kind), { x: D.x, z: D.z, yaw: 0 });
  b.dummy = D; D.b = b; b.tag.visible = false; if (b.gunM) b.gunM.visible = false; b.g.position.y = groundAt(D.x, D.z, .35, .5); // on its base
  b.mats[0].map = dummySkinTex();
  b.aim.rotation.set(0, 0, 0); b.armR.rotation.set(0, 0, -1.3); b.armL.rotation.set(0, 0, 1.3); b.headPiv.rotation.set(.08, 0, 0); // arms out, like it's tied to its post
  const c = b.barC = document.createElement('canvas'); c.width = 34; c.height = 8;
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
  b.bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); b.bar.scale.set(.85, .2, 1); b.bar.position.y = 2.2; b.g.add(b.bar);
  dummyBar(b);
  kBits(WIND_MATS, scene, _kv.set(D.x, b.g.position.y + 1, D.z), 8, 1.5, .4, .35, .25); // pops up
}
// a hit on a dummy: a number where it landed, and the burst so far
function rangeHit(b, dmg, head, quiet, at) {
  const D = b.dummy; D.hitAt = rangeT;
  if (!rangeBurst || rangeT - rangeBurst.last > 1.5) rangeBurst = { dmg: 0, t0: rangeT, last: rangeT };
  rangeBurst.dmg += dmg; rangeBurst.last = rangeT;
  dummyBar(b);
  const old = rangeNums.find(n => n.b === b && n.t < .15 && n.head === head && n.quiet === quiet);
  if (old) { old.v += dmg; old.t = 0; numDraw(old); return; }
  if (rangeNums.length > 24) { const n = rangeNums.shift(); scene.remove(n.s); n.s.material.map.dispose(); n.s.material.dispose(); }
  const c = document.createElement('canvas'); c.width = 96; c.height = 40;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, sizeAttenuation: false, depthTest: false, transparent: true, fog: false }));
  const p = at ? at.clone() : b.g.position.clone().setY(b.g.position.y + 1.3);
  p.x += (Math.random() - .5) * .3; s.position.copy(p); s.renderOrder = 9; scene.add(s);
  const n = { b, s, c, v: dmg, head, quiet, t: 0, rise: .06 * Math.max(4, p.distanceTo(camera.position)) };
  numDraw(n); rangeNums.push(n);
}
function numDraw(n) {
  const g = n.c.getContext('2d'), txt = String(Math.max(1, Math.round(n.v))), big = n.head ? 34 : n.quiet ? 22 : 28;
  g.clearRect(0, 0, 96, 40); g.font = `bold ${big}px monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(txt, 48, 21); g.fillStyle = n.head ? '#ffd23a' : n.quiet ? '#ff9a4a' : '#ffffff'; g.fillText(txt, 48, 21);
  n.s.material.map.needsUpdate = true; n.s.scale.set(.096, .04, 1);
}
// a dummy went down: your kill effect, then it pops back up
function rangeDown(b) {
  botDownFx(b, false, wornKfx());
  b.dummy.back = 1; rangeBurst && (rangeBurst.kill = true);
  sfx('kill');
}
function rangeTick(dt) {
  rangeT += dt;
  for (const D of rangeDummies) {
    const b = D.b;
    if (!b) { if ((D.back -= dt) <= 0) spawnDummy(D); continue; }
    if (b.dead) { if (!zombies.includes(b)) D.b = null; continue; }
    if (b.slowT > 0) b.slowT -= dt;
    stunTick(b, dt, !b.vy); settle(b, dt); botGlow(b, dt);
    if (rangeT - D.hitAt > 3 && (b.hp < b.maxHp || b.armor < b.maxArmor)) { b.hp = b.maxHp; b.armor = b.maxArmor; dummyBar(b); } // left alone, it mends
    const p = b.g.position, hx = D.kind === 'slide' ? D.x + Math.sin(rangeT * D.sp + D.ph) * 2.6 : D.x;
    if (D.kind === 'slide') { const run = Math.cos(rangeT * D.sp + D.ph); b.pivR.rotation.x = Math.sin(rangeT * 9) * .45 * Math.abs(run); b.pivL.rotation.x = -b.pivR.rotation.x; }
    p.x += (hx - p.x) * Math.min(1, dt * (D.kind === 'slide' ? 20 : 3)); p.z += (D.z - p.z) * Math.min(1, dt * 3); // back on its spot after a blast
  }
  for (let i = rangeNums.length - 1; i >= 0; i--) {
    const n = rangeNums[i]; n.t += dt; n.s.position.y += n.rise * dt; n.s.material.opacity = Math.min(1, 3 * (1 - n.t / .9));
    if (n.t > .9) { scene.remove(n.s); n.s.material.map.dispose(); n.s.material.dispose(); rangeNums.splice(i, 1); }
  }
  for (const g of slotGun) if (g >= 0 && !BASE[g].inf) reserve[g] = resMax(g); // ammo never runs out
  const B = rangeBurst, dur = B ? B.last - B.t0 : 0;
  const top = `<div class="place">TARGET RANGE</div><div class="place rgStat">${B ? `${Math.round(B.dmg)} DAMAGE${dur > .25 ? ` IN ${dur.toFixed(1)} S · ${Math.round(B.dmg / dur)} A SECOND` : ''}` : `${TOUCH ? 'PAUSE' : 'ESC'} TO PICK A GUN`}</div>`;
  if (top !== rangeTop) $('top').innerHTML = rangeTop = top;
}
// the rack in the menu: every gun, by slot
function renderRack() {
  const el = $('rack'); $('menu').classList.toggle('rk', mode === 'range');
  if (mode !== 'range') { el.style.display = 'none'; el.innerHTML = ''; return; }
  rackCat ??= BASE[cur].cat;
  const list = BASE.map((w, i) => i).filter(i => BASE[i].cat === rackCat && (!BASE[i].season || hasGun(i) || seasonOn(BASE[i].season))).sort((a, b) => listAt(a) - listAt(b)); // a season's guns in their month, or once they're yours
  el.style.display = '';
  el.innerHTML = `<div class="rkTabs">${CATS.map(([c, n]) => `<button data-rc="${c}"${c === rackCat ? ' class="on"' : ''}>${n}</button>`).join('')}</div>` +
    `<div class="rkList">${list.map(i => { const held = slotGun[slotOf(i)] === i;
      return `<button data-rg="${i}" class="rk${held ? ' on' : ''}${rarCls(BASE[i])}"><img src="${gunPic(i)}" alt=""><b>${BASE[i].name}</b><small>${held ? 'IN HAND' : hasGun(i) ? 'YOURS' : 'TRY IT'}</small></button>`; }).join('')}</div>`;
}
$('rack').addEventListener('click', e => {
  const t = e.target.closest('[data-rc]');
  if (t) { e.stopPropagation(); rackCat = t.dataset.rc; renderRack(); sfx('ui'); return; }
  const b = e.target.closest('[data-rg]');
  if (!b) { e.stopPropagation(); return; }
  rangeTake(+b.dataset.rg); // and on to the menu, which goes back to the range
});
// a gun into its slot: yours at your stars, anyone else's at its first
function rangeTake(g, now = false) {
  if (hasGun(g)) giveGun(g); else { lvl[g] = 0; applyLvl(g); owned[g] = true; ammo[g] = WEAPONS[g].mag; reserve[g] = resMax(g); }
  if (now) { slotGun[slotOf(g)] = g; cur = g; buildGun(); renderHotbar(); return; }
  equip(g);
}
