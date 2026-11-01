// deathmatch mode: a 4 minute free-for-all between you and bots. Everyone respawns. Highest score at the end wins.
// The match starts with you + 1 bot, and the rest join over the first minute until the map's lobby is full.
// Bots live in the zombies list (type 'bot'), so your bullets, knife, fire and rockets already hurt them.
// react = how long a bot has to see its target before it shoots. turn = how fast its aim catches up (higher = snappier).
// lead = how far ahead of a moving target it aims. aimErr = random wobble on each shot, in radians.
// dmgMul = bot guns do this much of their normal damage (to you and to other bots).
// moveErr = extra wobble when the target is running (at full speed), so strafing really does make it miss more.
const BOT = { hp: 100, speed: 5, react: .45, turn: 8, lead: .05, aimErr: .025, moveErr: .045, dmgMul: .5, respawn: 1.5 };
const SNIPE_T = .9; // a sniper bot lines up its shot this long before it fires
const MATCH_T = 240, YOU_RESPAWN = 3, JOIN_T = 60; // match length (s), your respawn wait (s), bots finish joining by this time (s)
let BOT_COUNT = 3; // fill the lobby: 3 bots on small maps like the yard, 7 on bigger ones (set in setupMode from the map)
// score: every kill is worth KILL_PTS, a headshot kill adds HEAD_PTS.
// Streaks (kills in a row without dying) add a one-time bonus on the kill that reaches them.
// Once you're past ACE, every kill that doesn't land on a named streak gets STREAK_PTS instead (so 65 instead of 50).
// So your 20th kill in a row is worth 50 + 200 = 250 on its own (plus 50 more if it's a headshot), and your 7th is worth 65.
const KILL_PTS = 50, HEAD_PTS = 50, STREAK_PTS = 15, STREAK_PTS_AFTER = 5;
const STREAKS = {
  2: [25, 'DOUBLE KILL'],
  3: [35, 'TRIPLE KILL'],
  4: [45, 'MONSTER KILL'],
  5: [50, 'ACE'],
  10: [100, 'FURY'],
  20: [200, 'RAMPAGE'],
  50: [1000, 'VIOLENCE'],
};
// match rewards by map size: [xp, coins] for each place, the last entry covers every place below it
const REWARDS = {
  small:  [[30, 5], [15, 2]],                    // 1st, everyone else
  medium: [[40, 8], [30, 5], [30, 5], [15, 2]],  // 1st, 2nd, 3rd, everyone else
  large:  [[40, 8], [30, 5], [30, 5], [15, 2]],
};
const rewardFor = place => { const t = REWARDS[MAP.size]; return t[Math.min(place, t.length) - 1]; };
// guns a bot can spawn with, and the distance it tries to keep from its target with each one [closest, furthest]
const BOT_GUNS = {
  voxel: [6, 13],
  shotgun: [2.5, 6], // rushes in
  ar: [8, 16],
  sniper: [16, 32],  // hangs back
  eradicator: [6, 12],
};

// ---------- the bots' look: Minecraft-style players, each with their own shirt color ----------
const SKIN_C = [214, 163, 124];
const botSkinT = tex(g => noise(g, SKIN_C, 14));
const botHairT = tex(g => noise(g, [62, 42, 26], 20));
const botSideT = tex(g => { noise(g, SKIN_C, 14); g.fillStyle = '#3e2a1a'; g.fillRect(0, 0, 16, 5); });
const botFaceT = tex(g => {
  noise(g, SKIN_C, 14); g.fillStyle = '#3e2a1a'; g.fillRect(0, 0, 16, 4); g.fillRect(0, 4, 2, 2); g.fillRect(14, 4, 2, 2);
  g.fillStyle = '#fff'; g.fillRect(3, 7, 3, 2); g.fillRect(10, 7, 3, 2);
  g.fillStyle = '#222'; g.fillRect(5, 7, 1, 2); g.fillRect(10, 7, 1, 2);
  g.fillStyle = '#b06a50'; g.fillRect(7, 10, 2, 1); g.fillStyle = '#8a4a3a'; g.fillRect(5, 12, 6, 1);
});
const BOT_LOOKS = [ // shirt color, name color (used on the tag, leaderboard and kill feed)
  { shirt: [185, 40, 40], css: '#ff6a6a' },
  { shirt: [205, 120, 30], css: '#ffa94a' },
  { shirt: [120, 55, 175], css: '#c08aff' },
  { shirt: [40, 130, 60], css: '#6fdc7f' },
  { shirt: [40, 90, 190], css: '#6aa8ff' },
  { shirt: [30, 150, 150], css: '#5fe0d8' },
  { shirt: [200, 190, 50], css: '#f0e45a' },
];
const shirtTs = BOT_LOOKS.map(l => tex(g => { noise(g, l.shirt, 26); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 15, 16, 1); }));
const TAG_FONT = 'bold 13px monospace';
function tagMat(name, css) { // name tag floating over its head, as wide as the name needs. Returns { mat, w } (w in world units)
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = TAG_FONT; c.width = Math.ceil(g.measureText(name).width) + 6; c.height = 16;
  g.font = TAG_FONT; g.textAlign = 'center'; // resizing the canvas resets the font
  g.fillStyle = '#000'; g.fillText(name, c.width / 2 + 1, 13); g.fillStyle = css; g.fillText(name, c.width / 2, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return { mat: new THREE.SpriteMaterial({ map: t, transparent: true }), w: c.width / 64 }; // 64 canvas px = 1 block, same as before
}

// ---------- the match: one record per player on the leaderboard ----------
const YOU_T = { you: true }; // stands in for you whenever a bot is picking or tracking a target
let recs = [], youRec = null, matchT = 0, killedBy = '', joins = [];
function makeRecs() {
  youRec = { name: myName, you: true, css: '#ffd23f', score: 0, kills: 0, deaths: 0, streak: 0 };
  recs = [youRec]; joins = [];
  // bot 1 is there from the start and has a plain NATO-alphabet name like "Foxtrot" (it never chats).
  // Later, its playstyle can be picked from that name (js/names.js BOT_DEFAULTS).
  // The others join spread across the first minute, a little randomly, with real-looking names (js/names.js).
  const next = nameMaker([myName]);
  for (let i = 0; i < BOT_COUNT; i++) {
    const at = i === 0 ? 0 : Math.min(JOIN_T - 2, Math.max(5, JOIN_T * i / BOT_COUNT + (Math.random() - .5) * 10));
    const nm = i === 0 ? { name: defaultBotName(myName), lang: 'en', quiet: true } : next();
    joins.push({ i, at, ...nm });
  }
  joins.sort((a, b) => a.at - b.at);
}
function joinBot(j) {
  const n = j.i % BOT_LOOKS.length, look = BOT_LOOKS[n], tag = tagMat(j.name, look.css);
  const r = { name: j.name, lang: j.lang, quiet: !!j.quiet, css: look.css, look: n, tag: tag.mat, tagW: tag.w,
    score: 0, kills: 0, deaths: 0, streak: 0, b: null, wait: .5 };
  recs.push(r);
  if (MATCH_T - matchT > 1) { feed(`${nameTag(r)} joined`); beep(520, .1, 'triangle', .06); } // no message for the one that starts with you
}
const ranked = () => [...recs].sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH');
const nameTag = r => `<b style="color:${r.css}">${r.name}</b>`;
function boardHTML() {
  const head = '<div class="r h"><span>#</span><span>PLAYER</span><span>SCORE</span><span>KILLS</span><span>DEATHS</span></div>';
  return head + ranked().map((r, i) => `<div class="r${r.you ? ' you' : ''}"><span>${i + 1}</span><span style="color:${r.css}">${r.name}</span><span>${r.score}</span><span>${r.kills}</span><span>${r.deaths}</span></div>`).join('');
}
function feed(html) { // kill feed, top right
  const d = document.createElement('div'); d.className = 'kf'; d.innerHTML = html; $('feed').append(d);
  while ($('feed').children.length > 5) $('feed').firstChild.remove();
  setTimeout(() => d.remove(), 5000);
}
// someone died. killer = a record, or null if nobody gets credit (your own rocket)
function scoreKill(killer, victim, head) {
  victim.deaths++; victim.streak = 0;
  if (killer && killer !== victim) {
    killer.kills++; killer.streak++;
    const st = STREAKS[killer.streak];
    const pts = KILL_PTS + (head ? HEAD_PTS : 0) + (st ? st[0] : killer.streak > STREAK_PTS_AFTER ? STREAK_PTS : 0);
    killer.score += pts;
    if (killer.you) {
      toast(`+${pts}${head ? ' HEADSHOT' : ''}${st ? ' · ' + st[1] : ''}`, '#ffd23f');
      beep(st ? 260 + Math.min(killer.streak, 20) * 20 : 180, .3, 'sawtooth', .12); // streak kills sound higher
    }
  }
  feed(killer && killer !== victim ? `${nameTag(killer)} ${head ? '⌖' : '✖'} ${nameTag(victim)}` : `${nameTag(victim)} ✖`);
  const st = killer && killer !== victim && STREAKS[killer.streak];
  if (st) feed(`${nameTag(killer)} <b style="color:#ffd23f">${st[1]}!</b>`); // everyone sees streaks in the feed
  // bots only talk when you say something first (js/chat.js botsHear), not on their own
}

// ---------- spawning: somewhere open, as far from everyone else as it can find ----------
function spawnSpot(skip) {
  const others = [];
  if (skip !== YOU_T && respawnT <= 0) others.push(P.pos);
  for (const z of zombies) if (z !== skip && !z.dead) others.push(z.g.position);
  let best = null, bestD = -1;
  for (let tries = 0; tries < 60; tries++) {
    const x = (Math.random() * 2 - 1) * (A - 2), z = (Math.random() * 2 - 1) * (A - 2);
    if (blocked(x, z, .45, 0)) continue;
    const d = others.length ? Math.min(...others.map(o => Math.hypot(x - o.x, z - o.z))) : 99;
    if (d > bestD) { bestD = d; best = [x, z]; }
  }
  return best ?? [0, 0];
}
function makeBot(rec) {
  const [x, z] = spawnSpot();
  const keys = Object.keys(BOT_GUNS), gun = gi(keys[Math.random() * keys.length | 0]), W = BASE[gun];
  const skin = lam({ map: botSkinT }), side = lam({ map: botSideT }), face = lam({ map: botFaceT }), hair = lam({ map: botHairT });
  const shirt = lam({ map: shirtTs[rec.look] }), pants = lam({ map: pantsTex });
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; g.position.set(x, 0, z);
  const head = box(.5, .5, .5, [side, side, hair, skin, face, hair]); head.position.y = 1.6; head.userData.head = true;
  const body = box(.5, .7, .3, shirt); body.position.y = 1.0;
  const armL = box(.18, .18, .65, skin); armL.position.set(-.34, 1.25, .25); // both arms out front holding the gun
  const armR = box(.18, .18, .65, skin); armR.position.set(.34, 1.25, .25);
  const mkLeg = sx => { const piv = new THREE.Group(); piv.position.set(sx, .65, 0); const l = box(.22, .65, .25, pants); l.position.y = -.325; piv.add(l); return [piv, l]; };
  const [pivL, legL] = mkLeg(-.13), [pivR, legR] = mkLeg(.13);
  const gunM = box(.09, .13, W.len, lam({ color: W.color })); gunM.position.set(.16, 1.33, .42 + W.len / 2);
  const flashM = box(.14, .14, .14, new THREE.MeshBasicMaterial({ color: 0xffdd55 })); flashM.position.set(.16, 1.33, .47 + W.len); flashM.visible = false;
  const tag = new THREE.Sprite(rec.tag); tag.scale.set(rec.tagW, .25, 1); tag.position.y = 2.25;
  g.add(head, body, armL, armR, pivL, pivR, gunM, flashM, tag); scene.add(g);
  const yaw = Math.atan2(-x, -z); // face the middle of the map
  g.rotation.y = yaw;
  const b = { g, head, flashM, tag, pivL, pivR, parts: [head, body, armL, armR, legL, legR], mats: [skin, side, face, hair, shirt, pants], rec,
    type: 'bot', hp: BOT.hp, maxHp: BOT.hp, scale: 1, r: .3, coins: 0, t: 0, flash: 0, dead: 0, burn: 0,
    gun, ammo: W.mag, reload: 0, cd: .3, burst: 5, muzzle: 0, seeT: 0, aimT: 0, aimYaw: yaw, aimPitch: 0,
    strafe: 1, strafeT: 0, detour: 0, detourDir: 1, tgt: null, scanT: 0, hitBy: null, hitByT: 0, lpx: 0, lpz: 0, pvx: 0, pvz: 0 };
  b.parts.forEach(p => p.userData.zombie = b);
  zombies.push(b); rec.b = b;
  return b;
}
// a bot died (called from hurtZombie). by = the bot that killed it, or null if it was you
function botDown(b, by, head) {
  b.tag.visible = false; b.flashM.visible = false; b.rec.wait = BOT.respawn + 1.5; // its body takes 1.5s to fall
  scoreKill(by ? by.rec : youRec, b.rec, head);
}
// you died in deathmatch (called from hurtPlayer). by = the bot that got you, or nothing if it was your own rocket
function youDown(by) {
  respawnT = YOU_RESPAWN; killedBy = by ? by.rec.name : '';
  scoreKill(by ? by.rec : null, youRec, false);
}
function respawnYou() {
  const [x, z] = spawnSpot(YOU_T);
  Object.assign(P, { vy: 0, kx: 0, kz: 0, hp: P.max, armor: P.maxArmor, yaw: Math.atan2(x, z), pitch: 0 }); P.pos.set(x, groundAt(x, z, .35, 0), z);
  WEAPONS.forEach((w, i) => { if (owned[i]) { ammo[i] = w.mag; if (!BASE[i].inf) reserve[i] = resMax(i); } });
  reloading = 0; vm.visible = true; $('cross').style.display = ''; $('banner').style.opacity = 0;
}

// ---------- seeing and shooting ----------
const eye = new THREE.Vector3(), aimV = new THREE.Vector3(), dirV = new THREE.Vector3(), hitV = new THREE.Vector3(), losDir = new THREE.Vector3();
const losRay = new THREE.Raycaster(), pBox = new THREE.Box3();
function clearLine(a, c) { // nothing solid between two points (crates block, the see-through fence doesn't)
  losDir.subVectors(c, a); const d = losDir.length(); if (d < .01) return true;
  losRay.set(a, losDir.divideScalar(d)); losRay.far = d;
  return !losRay.intersectObjects(crateMeshes, false).length;
}
const aimDir = (yaw, pitch, out) => out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
const tPos = t => t.you ? P.pos : t.g.position;
const tAlive = t => t.you ? respawnT <= 0 : !t.dead && zombies.includes(t);
function canSee(t) { // from the eye set up in updateBot: can it see the target's chest or head?
  const p = tPos(t);
  return clearLine(eye, aimV.set(p.x, p.y + 1.1, p.z)) || clearLine(eye, aimV.set(p.x, p.y + 1.6, p.z));
}
// pick who to fight: whoever just shot it (if it can see them), else keep its target while it can see it,
// else the closest one it can see, else go hunting for the closest one
function pickTarget(b) {
  const pos = b.g.position, enemies = [];
  if (respawnT <= 0) enemies.push(YOU_T);
  for (const z of zombies) if (z !== b && !z.dead) enemies.push(z);
  if (!enemies.length) return null;
  const d = t => Math.hypot(tPos(t).x - pos.x, tPos(t).z - pos.z);
  if (b.hitBy && b.hitByT > 0 && tAlive(b.hitBy) && canSee(b.hitBy)) return b.hitBy;
  const seen = enemies.filter(canSee).sort((a, c) => d(a) - d(c));
  if (b.tgt && tAlive(b.tgt) && seen.includes(b.tgt) && !(seen[0] !== b.tgt && d(seen[0]) < d(b.tgt) * .5)) return b.tgt;
  if (seen.length) return seen[0];
  return enemies.sort((a, c) => d(a) - d(c))[0];
}

function botFire(b, W, dist) {
  b.ammo--; b.muzzle = .05;
  if (W.auto) { b.cd = W.rate; if (--b.burst <= 0) { b.burst = 4 + (Math.random() * 6 | 0); b.cd = .35 + Math.random() * .35; } } // fires in bursts
  else b.cd = W.rate * 1.5 + Math.random() * .15; // semi-auto guns: a bit slower than you can click
  if (W.scope) b.aimT = 0; // has to line up the next sniper shot from scratch
  if (b.ammo <= 0) b.reload = W.reload * 1.2;
  const youD0 = Math.hypot(P.pos.x - eye.x, P.pos.z - eye.z);
  shotSound(W.vol * Math.max(.15, 1 - youD0 / 45), .15, W.cut);
  const youUp = respawnT <= 0;
  pBox.min.set(P.pos.x - .35, P.pos.y, P.pos.z - .35); pBox.max.set(P.pos.x + .35, P.pos.y + 1.85, P.pos.z + .35);
  const others = []; for (const z of zombies) if (z !== b && !z.dead) others.push(...z.parts); // shots can hit any bot in the way, not just its target
  // the sniper's listed spread is its unscoped hip-fire, but the bot lines up its shots, so it gets a tighter cone
  const err = BOT.aimErr + BOT.moveErr * Math.min(1, Math.hypot(b.pvx, b.pvz) / 6) + W.spread * (W.scope ? .1 : .8), walls = [ground, ...crateMeshes];
  for (let i = 0; i < W.pellets; i++) {
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    losRay.set(eye, dirV); losRay.far = 90;
    const wall = losRay.intersectObjects(walls, false)[0], wallD = wall ? wall.distance : Infinity;
    const bot = others.length ? losRay.intersectObjects(others, false)[0] : null, botD = bot ? bot.distance : Infinity;
    const onYou = youUp && losRay.ray.intersectBox(pBox, hitV), youD = onYou ? eye.distanceTo(hitV) : Infinity;
    const near = Math.min(wallD, botD, youD);
    if (near === Infinity) continue;
    if (near === youD) {
      const head = hitV.y > P.pos.y + 1.45;
      hurtPlayer(Math.max(1, Math.round(W.dmg * BOT.dmgMul * (head ? 1.5 : 1))), false, b);
    } else if (near === botD) {
      const zz = bot.object.userData.zombie, head = !!bot.object.userData.head;
      if (!zz.dead) hurtZombie(zz, W.dmg * BOT.dmgMul * (head ? 1.5 : 1), bot.point, head, false, b);
    } else burst(wall.point, 0x999999, 2);
  }
}

function updateBot(b, dt) {
  const W = BASE[b.gun], keep = BOT_GUNS[W.id], pos = b.g.position, sniper = !!W.scope;
  eye.set(pos.x, 1.6, pos.z);
  b.hitByT -= dt;
  if ((b.scanT -= dt) <= 0 || !b.tgt || !tAlive(b.tgt)) { // look around for who to fight a few times a second
    b.scanT = .3;
    const t = pickTarget(b);
    if (t !== b.tgt) { b.tgt = t; b.seeT = 0; b.aimT = 0; b.pvx = b.pvz = 0; if (t) { b.lpx = tPos(t).x; b.lpz = tPos(t).z; } }
  }
  const t = b.tgt;
  if (!t) { b.pivL.rotation.x *= .8; b.pivR.rotation.x *= .8; return; }
  const tp = tPos(t), dx = tp.x - pos.x, dz = tp.z - pos.z, dist = Math.hypot(dx, dz) || .001;
  const sees = canSee(t);
  b.seeT = sees ? b.seeT + dt : 0;

  // aim: turns toward the target's chest and leads it a little, but lags behind. Changing direction makes it miss.
  if (dt > 0) { b.pvx += ((tp.x - b.lpx) / dt - b.pvx) * Math.min(1, dt * 8); b.pvz += ((tp.z - b.lpz) / dt - b.pvz) * Math.min(1, dt * 8); }
  b.lpx = tp.x; b.lpz = tp.z;
  const tx = dx + b.pvx * BOT.lead, tz = dz + b.pvz * BOT.lead;
  const wantYaw = Math.atan2(tx, tz), wantPitch = Math.atan2(tp.y + 1.1 - 1.6, Math.hypot(tx, tz)), k = Math.min(1, dt * BOT.turn);
  b.aimYaw += Math.atan2(Math.sin(wantYaw - b.aimYaw), Math.cos(wantYaw - b.aimYaw)) * k;
  b.aimPitch += (wantPitch - b.aimPitch) * k;
  b.g.rotation.y = b.aimYaw; b.head.rotation.x = -b.aimPitch;

  // shooting
  b.cd -= dt; b.muzzle -= dt; b.flashM.visible = b.muzzle > 0;
  if (b.reload > 0 && (b.reload -= dt) <= 0) b.ammo = W.mag;
  const ready = sees && b.seeT >= BOT.react && b.reload <= 0;
  b.aimT = ready && sniper ? b.aimT + dt : 0;
  if (ready && b.cd <= 0 && (!sniper || b.aimT >= SNIPE_T)) botFire(b, W, dist);

  // moving: keep the distance its gun likes, strafe side to side while fighting, go looking when it can't see anyone
  let radial = 1, side = 0;
  if (sees) {
    radial = dist > keep[1] ? 1 : dist < keep[0] ? -1 : 0;
    if (b.reload > 0 && dist < keep[1] + 4) radial = -1; // backs off while it reloads
    if ((b.strafeT -= dt) <= 0) { b.strafeT = .4 + Math.random() * 1.1; b.strafe = Math.random() < .15 ? 0 : Math.random() < .5 ? -1 : 1; }
    side = b.strafe * (sniper && b.aimT > 0 ? .3 : 1); // a sniper holds fairly still while lining up
  }
  if (dist < 1.5) radial = -1;
  if (b.detour > 0) { b.detour -= dt; side = b.detourDir; radial *= .3; } // stuck on a crate: sidestep around it
  const ux = dx / dist, uz = dz / dist;
  let mx = ux * radial + uz * side, mz = uz * radial - ux * side;
  for (const o of zombies) { // don't walk into other bots
    if (o === b || o.dead) continue;
    const ox = pos.x - o.g.position.x, oz = pos.z - o.g.position.z, od = Math.hypot(ox, oz);
    if (od < .8 && od > 0) { mx += ox / od; mz += oz / od; }
  }
  const ml = Math.hypot(mx, mz);
  if (ml > .05) {
    const s = BOT.speed * dt / ml; mx *= s; mz *= s;
    const ox = pos.x, oz = pos.z; let bump = false;
    if (!blocked(pos.x + mx, pos.z, b.r, 0)) pos.x += mx; else bump = true;
    if (!blocked(pos.x, pos.z + mz, b.r, 0)) pos.z += mz; else bump = true;
    if (bump && sees) b.strafe = -b.strafe; // strafed into a crate: go the other way
    if (Math.hypot(pos.x - ox, pos.z - oz) < BOT.speed * dt * .3 && b.detour <= 0) { b.detour = .5 + Math.random() * .4; b.detourDir = Math.random() < .5 ? -1 : 1; }
    b.t += dt * BOT.speed * 2.2;
    b.pivL.rotation.x = Math.sin(b.t) * .6; b.pivR.rotation.x = -Math.sin(b.t) * .6;
  } else { b.pivL.rotation.x *= .8; b.pivR.rotation.x *= .8; }

  // red flash when hit, orange flicker when burning
  b.flash -= dt;
  const e = b.flash > 0 ? 0x880000 : b.burn > 0 ? (Math.sin(performance.now() * .03) > 0 ? 0x993300 : 0x441100) : 0;
  b.mats.forEach(m => m.emissive.setHex(e));
}

// ---------- per-frame upkeep: respawns, timer, HUD ----------
// while you're dead: camera drops to the floor, the banner counts down, then you respawn. Returns true while you're down.
function dmDown(dt) {
  if (respawnT <= 0) return false;
  respawnT -= dt;
  if (respawnT <= 0) { respawnYou(); return false; }
  adsT = 0; if (camera.fov !== 75) { camera.fov = 75; camera.updateProjectionMatrix(); }
  $('scope').style.display = 'none'; $('cross').style.display = 'none'; vm.visible = false;
  camera.position.set(P.pos.x, P.pos.y + .35, P.pos.z); camera.rotation.set(P.pitch, P.yaw, .4);
  const b = $('banner'); b.textContent = `${killedBy ? 'KILLED BY ' + killedBy : 'YOU DIED'}\n${Math.ceil(respawnT)}`; b.style.opacity = 1;
  return true;
}
let lastTop = '', lastBoard = '', lastSec = 0;
function updateDM(dt) {
  if (matchOver) return; // the mouse can stay locked for a frame or two after the end, don't pay out twice
  while (joins.length && MATCH_T - matchT >= joins[0].at) joinBot(joins.shift()); // new bots joining
  chatTick(dt); // bot chat lines that are due
  for (const r of recs) if (!r.you && (!r.b || r.b.dead) && (r.wait -= dt) <= 0) makeBot(r); // bots come back after their body falls
  matchT -= dt;
  const sec = Math.max(0, Math.ceil(matchT));
  if (sec <= 10 && sec !== lastSec && sec > 0) beep(880, .08, 'square', .08); // last 10 seconds tick
  lastSec = sec;
  // top middle: time left and where you are on the leaderboard
  const place = ranked().indexOf(youRec) + 1;
  const top = `<div class="clock${sec <= 10 ? ' low' : ''}">${sec / 60 | 0}:${String(sec % 60).padStart(2, '0')}</div><div class="place">${ord(place)} OF ${recs.length}  ·  ${youRec.score} PTS  ·  ${youRec.kills} KILLS</div>`;
  if (top !== lastTop) { $('top').innerHTML = lastTop = top; }
  // hold Tab: full leaderboard under it
  const show = held('board');
  $('board').style.display = show ? 'grid' : 'none';
  if (show) { const h = boardHTML(); if (h !== lastBoard) $('board').innerHTML = lastBoard = h; }
  if (matchT <= 0) endMatch();
}
// time's up: post-game screen with the final leaderboard and what you earned
function endMatch() {
  matchOver = true; closeChat(); $('board').style.display = 'none'; $('banner').style.opacity = 0;
  const place = ranked().indexOf(youRec) + 1;
  $('postPlace').textContent = place === 1 ? '1ST PLACE!' : ord(place) + ' PLACE';
  $('postBoard').innerHTML = boardHTML();
  const [xp, gold] = rewardFor(place), { ups, bonus } = grant(xp, gold);
  $('rewards').innerHTML = `<div class="rw"><span class="rx">+${xp} XP</span><span class="pc">+${gold} ◆</span></div>`
    + (ups ? `<div class="lvup">LEVEL UP! LVL ${prof.lv} · +${bonus} ◆</div>` : `<div class="rl">LVL ${prof.lv} · ${xpText()}</div>`) + xpBar();
  $('post').style.display = 'flex';
  beep(place === 1 ? 880 : 330, .6, 'triangle', .15);
  if (ups) setTimeout(() => beep(1040, .4, 'triangle', .14), 350); // extra chime for a level up
  document.exitPointerLock();
}
$('againBtn').addEventListener('click', () => { restart(); renderer.domElement.requestPointerLock()?.catch?.(() => {}); });
$('postLobby').addEventListener('click', () => { restart(); showLobby(true); });

// called at the end of restart(): sets up whichever mode you picked in the lobby
function setupMode() {
  matchOver = false; respawnT = 0; lastTop = lastBoard = ''; killedBy = '';
  BOT_COUNT = MAX_PLAYERS[MAP.size] - 1;
  $('post').style.display = 'none'; $('board').style.display = 'none'; $('banner').style.opacity = 0; // clears "KILLED BY" if you left while dead
  $('feed').innerHTML = ''; $('top').innerHTML = ''; resetChat();
  $('chat').style.display = mode === 'dm' ? '' : 'none'; // nobody to talk to in zombie waves
  if (mode === 'dm') { // every starter weapon, plus any unlockable guns saved on your account (prof.guns: id -> stars 1-3)
    makeRecs(); matchT = MATCH_T;
    BASE.forEach((w, g) => {
      const st = prof.guns[w.id];
      if (!w.start && !st) return;
      if (st) { lvl[g] = Math.min(2, st - 1); applyLvl(g); ammo[g] = WEAPONS[g].mag; }
      owned[g] = true; reserve[g] = resMax(g);
      if (slotGun[slotOf(g)] < 0) slotGun[slotOf(g)] = g; // first one in each category goes in the slot
    });
    slotGun[slotOf(gi('ar'))] = gi('ar'); // assault rifle in hand to start; press the primary key again for the shotgun
    cur = gi('ar'); buildGun(); renderHotbar();
  }
  const tab = binds.board.filter(Boolean).map(nice).join('/') || 'the scoreboard key';
  const tips = mode === 'dm'
    ? [`Free-for-all, up to ${BOT_COUNT + 1} players. More bots join in the first minute. Highest score wins`, `Headshots and kill streaks score extra. Hold ${tab} for the leaderboard`]
    : ['Kill zombies for coins, then spend them in the shop after each wave', 'Grab health, ammo and armor pickups from the pads around the map'];
  $('tip1').textContent = tips[0]; $('tip2').textContent = tips[1];
}
