// bot matches: you plus one bot, the rest join over the first minute
const BOT = { hp: 100, speed: 6, dmgMul: 1, respawn: 1.5 };
// bot skill levels: 0 is a beginner, 2 is normal, 4 rarely misses
const SKILLS = [
  { react: .8,  turn: 5.2, lead: .2,  self: 0,   aimErr: .06,  moveErr: .08,  spd: .75,  flick: .1,  stand: .7,  strafeT: [1.2, 1.8], plant: true,  jumpF: [6, 8],     jumpR: [10, 15], chain: 0,   gaze: [1.5, 3],  rest: [5, 6, 1, 1.5],   idle: true },
  { react: .62, turn: 6,   lead: .28, self: 0,   aimErr: .05,  moveErr: .07,  spd: .9,   flick: .2,  stand: .4,  strafeT: [.7, 1.4],  plant: false, jumpF: [3, 5],     jumpR: [6, 10],  chain: .15, gaze: [1, 2.8],  rest: [10, 10, .8, 1], idle: true },
  { react: .48, turn: 7.7, lead: .36, self: 0,   aimErr: .028, moveErr: .05,  spd: 1,    flick: .3,  stand: .15, strafeT: [.4, 1.1],  plant: false, jumpF: [1.5, 3.5], jumpR: [4, 8],   chain: .3,  gaze: [.8, 2.4], rest: null,             idle: true },
  { react: .36, turn: 9.5, lead: .6,  self: .42, aimErr: .022, moveErr: .035, spd: 1.15, flick: .45, stand: .08, strafeT: [.35, .9],  plant: false, jumpF: [1.1, 2.4], jumpR: [2.5, 5], chain: .4,  gaze: [.6, 1.8], rest: null,             idle: true },
  { react: .26, turn: 11,  lead: 1,   self: 1,   aimErr: .012, moveErr: .018, spd: 1.35, flick: .6,  stand: 0,   strafeT: [.25, .6],  plant: false, jumpF: [.6, 1.1],  jumpR: [1, 2.2], chain: .5,  gaze: [.35, .9], rest: null,             idle: false },
];
const SKILL_MID = 2, skillOf = b => SKILLS[b.rec.skill ?? SKILL_MID] ?? SKILLS[SKILL_MID];
// skill levels for a lobby, shuffled so the best one isn't always first
const CRACKED_P = .4;
function rollSkills(n) {
  const out = [], most = n <= 3 ? 1 : 2;
  const some = (lvl, p1, p2) => { const r = Math.random(); for (let c = Math.min(most, r < p2 ? 2 : r < p2 + p1 ? 1 : 0); c > 0; c--) out.push(lvl); };
  if (Math.random() < CRACKED_P) out.push(4);
  some(0, .45, .2); some(3, .3, .08); some(1, .35, .12);
  out.length = Math.min(out.length, Math.max(0, n >= 3 ? n - 1 : n));
  while (out.length < n) out.push(SKILL_MID);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
// bots stick with their target until they lose it or get shot hard
const LOSE_T = 2.5, SWITCH_DMG = 40;
const SNIPE_T = .9; // sniper bots line up their shot first
// hurt bots go for health pads
const PAD_LOW = 60, PAD_NEAR = 8, PAD_FAR = 30;
// match rules for each mode
const RULES = {
  dm:        { name: 'DEATHMATCH', t: 240, you: 3, bot: 1.5, join: 60, kills: false, team: false, players: { small: 4, medium: 6, large: 8 } },
  team:      { name: 'TEAM FIGHT', t: 240, you: 3, bot: 1.5, join: 60, kills: true,  team: true,  players: { small: 4, medium: 6, large: 8 } },
  blitz:     { name: 'BLITZ',      t: 90,  you: 1.5, bot: .5, join: 20, kills: true,  team: false, players: { small: 4, medium: 6, large: 8 } },
  blitzTeam: { name: 'TEAM BLITZ', t: 90,  you: 1.5, bot: .5, join: 20, kills: true,  team: true,  players: { small: 4, medium: 6, large: 6 } },
};
const DIE_T = 1.5; // how long a body stays
let MR = RULES.dm, MATCH_T = 240, YOU_RESPAWN = 3, JOIN_T = 60;
let BOT_COUNT = 3;
// teams: 0 = blue (yours), 1 = red
const TEAMS = [
  { name: 'BLUE', css: '#6aa8ff', shirts: [[40, 90, 190], [30, 70, 160], [60, 110, 210], [35, 100, 175]] },
  { name: 'RED', css: '#ff6a6a', shirts: [[185, 40, 40], [160, 30, 35], [205, 60, 50], [175, 45, 30]] },
];
const teamOf = t => t === YOU_T || t?.you ? 0 : t?.rec ? t.rec.team : t?.team;
// are a and c on the same team
function friendly(a, c) { a ??= YOU_T; c ??= YOU_T; return teamMode() && a !== c && teamOf(a) === teamOf(c); }
// scoring: kills, headshots and streaks
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
// match rewards by map size: [xp, coins] per place
const REWARDS = {
  small:  [[30, 5], [15, 2]],
  medium: [[40, 8], [30, 5], [30, 5], [15, 2]],
  large:  [[40, 8], [30, 5], [30, 5], [15, 2]],
};
// blitz is shorter, so it pays about half
const BLITZ_REWARDS = {
  small:  [[15, 3], [8, 1]],
  medium: [[20, 4], [15, 3], [15, 3], [8, 1]],
  large:  [[20, 4], [15, 3], [15, 3], [8, 1]],
};
const rewardTable = () => (mode === 'blitz' || mode === 'blitzTeam' ? BLITZ_REWARDS : REWARDS)[MAP.size];
const rewardFor = place => { const t = rewardTable(); return t[Math.min(place, t.length) - 1]; };
// team modes: winners get 1st place pay
const teamReward = res => { const t = rewardTable(); return res > 0 ? t[0] : res === 0 ? t[1] : t[t.length - 1]; };
// bot loadouts: one gun per category, rarer guns less often
const botGun = c => pickRare(BASE.filter(w => w.cat === c)).id;
// how far a bot likes to stay from its target with each gun
const BOT_KEEP = {
  voxel: [5, 12], hitman: [6, 16], shotgun: [2.5, 6], ar: [8, 16], thrasher: [9, 18], eradicator: [6, 12], sniper: [16, 32], semisniper: [14, 28],
  knife: [.9, 1.6], flame: [2, 5], heatray: [6, 18], rocket: [9, 18], flare: [7, 16],
  herosword: [1, 2], warhammer: [1, 2], frostwand: [6, 16], blazesaber: [1, 2], windsaber: [1, 2.2], trex: [2.5, 6.5], starsmasher: [9, 20], shockbeam: [6, 16], tigerbite: [18, 34], executioner: [8, 20], crossbow: [12, 28], grenade: [7, 16], aerial: [8, 18],
  rubypierce: [10, 24], paragon: [18, 36],
};
// how good each gun is at a distance
const GUN_FIT = {
  knife: d => d < 2.2 ? 1.25 : d < 4 ? .35 : 0,
  herosword: d => d < 2.8 ? 1.3 : d < 4.5 ? .4 : 0,
  blazesaber: d => d < 2.8 ? 1.32 : d < 4.5 ? .4 : 0,
  warhammer: d => d < 2.6 ? 1.3 : d < 4.2 ? .35 : 0,
  frostwand: d => d < 3 ? .55 : d < 22 ? .9 : .2,
  windsaber: d => d < 3 ? 1.35 : d < 4.8 ? .45 : 0,
  trex: d => d < 5.5 ? 1.05 : d < 10 ? .9 : d < 15 ? .32 : .05,
  starsmasher: d => d < 3 ? .6 : d < 28 ? .95 : .7,
  executioner: d => d < 24 ? .75 : .55,
  rubypierce: d => d < 4 ? .5 : d < 30 ? .85 : .7,
  paragon: d => d > 20 ? 1.2 : d > 14 ? .7 : d > 8 ? .3 : .1,
  shockbeam: d => d < 3 ? .55 : d < 24 ? .88 : .2,
  tigerbite: d => d > 20 ? 1.15 : d > 14 ? .65 : d > 8 ? .25 : .1,
  shotgun: d => d < 5 ? 1 : d < 9 ? .85 : d < 14 ? .3 : .05,
  flame: d => d < 5 ? 1.05 : d < 6.5 ? .5 : 0,
  voxel: d => d < 14 ? .5 : .3,
  hitman: d => d < 18 ? .55 : .4,
  heatray: d => d < 3 ? .5 : d < 25 ? .85 : .2,
  ar: d => d < 3 ? .6 : d < 20 ? .9 : .55,
  thrasher: d => d < 3 ? .6 : d < 24 ? .92 : .65,
  eradicator: d => d < 16 ? .95 : .5,
  sniper: d => d > 20 ? 1.1 : d > 14 ? .6 : d > 8 ? .25 : .1,
  semisniper: d => d > 18 ? 1.05 : d > 12 ? .7 : d > 7 ? .35 : .15,
  rocket: d => d < 5 ? 0 : d < 22 ? .72 : .4,
  grenade: d => d < 5 ? 0 : d < 18 ? .75 : .2,
  aerial: d => d < 5 ? 0 : d < 22 ? .8 : .45,
  crossbow: d => d > 14 ? .95 : d > 8 ? .55 : .2,
  flare: d => d < 3 ? .1 : d < 20 ? .6 : .35,
};
const HUNT_D = 8;
const pickOf = list => list[Math.random() * list.length | 0];
// taste: each bot leans towards one kind of gun
function tasteFor(load) {
  const fav = pickOf(['primary', 'primary', 'sniper', 'melee', 'special', 'premium']), taste = {};
  for (const g of load) taste[BASE[g].id] = (.85 + Math.random() * .3) * (BASE[g].cat === fav ? 1.3 : 1);
  return taste;
}
// bots' armor, boots and hat, sometimes a full set
function botWear() {
  const armor = botArmor(), T = armorOf(armor);
  let boots = botBoots(), hat = botHat();
  if (T?.suit && Math.random() < .5) {
    boots = { id: T.suit, st: 1 + (Math.random() * Math.max(1, bootStars(T.suit)) | 0) };
    hat = { id: T.suit, st: 1 + (Math.random() * Math.max(1, hatStars(T.suit)) | 0) };
  }
  return { armor, boots, hat };
}
// online the host makes the room's bots
function botGearNet() {
  const load = CATS.map(([c]) => botGun(c)), stars = {};
  for (const id of load) { const top = Math.max(0, gunUse(gi(id)) - 1); stars[id] = Math.random() * (top + 1) | 0; }
  return { ...botWear(), stars, load };
}
function botLoadout() {
  const load = CATS.map(([c]) => gi(botGun(c))), taste = tasteFor(load);
  // stars: never more than you use on that gun
  const stars = {}, W = {};
  for (const g of load) { const top = Math.max(0, gunUse(g) - 1); stars[g] = Math.random() * (top + 1) | 0; W[g] = statsAt(g, stars[g]); }
  const { armor, boots, hat } = botWear();
  return { load, taste, stars, W, armor, boots, hat, fx: armorFx(gearFx(boots, hat), armor, boots, hat) };
}

const BOT_U = 1.85 / 33; // one skin pixel, so bots are as tall as you
const BOT_LOOKS = [
  { shirt: [185, 40, 40], css: '#ff6a6a' },
  { shirt: [205, 120, 30], css: '#ffa94a' },
  { shirt: [120, 55, 175], css: '#c08aff' },
  { shirt: [40, 130, 60], css: '#6fdc7f' },
  { shirt: [40, 90, 190], css: '#6aa8ff' },
  { shirt: [30, 150, 150], css: '#5fe0d8' },
  { shirt: [200, 190, 50], css: '#f0e45a' },
];
const TAG_FONT = 'bold 13px monospace';
function tagMat(name, css) { // name tag over its head
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = TAG_FONT; c.width = Math.ceil(g.measureText(name).width) + 6; c.height = 16;
  g.font = TAG_FONT; g.textAlign = 'center'; // resizing the canvas resets the font
  g.fillStyle = '#000'; g.fillText(name, c.width / 2 + 1, 13); g.fillStyle = css; g.fillText(name, c.width / 2, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return { mat: new THREE.SpriteMaterial({ map: t, transparent: true }), w: c.width / 64 };
}

const YOU_T = { you: true }; // stands in for you when a bot picks a target
let recs = [], youRec = null, matchT = 0, killedBy = '', joins = [];
const youHelpers = new Set(); // for assists
// killCam: the bot that killed you, the camera watches it
let killCam = null;
const ASSIST_PTS = 15;
function makeRecs() {
  youRec = { name: myName, you: true, team: 0, css: '#8ff0b6', score: 0, kills: 0, deaths: 0, streak: 0 };
  recs = [youRec]; joins = [];
  // bot 1 starts with you, the others join over the first minute
  const next = nameMaker([myName]), skills = rollSkills(BOT_COUNT);
  for (let i = 0; i < BOT_COUNT; i++) {
    const at = i === 0 ? 0 : Math.min(JOIN_T - 2, Math.max(JOIN_T / 12,JOIN_T * i / BOT_COUNT + (Math.random() - .5) * JOIN_T / 6));
    const nm = i === 0 ? { name: defaultBotName(myName), lang: 'en', quiet: true } : next();
    joins.push({ i, at, skill: skills[i], ...nm });
  }
  joins.sort((a, b) => a.at - b.at);
}
function joinBot(j) {
  // team colors, teammates' tags show through walls
  const team = teamMode() ? (j.i % 2 ? 0 : 1) : undefined, T = TEAMS[team];
  const look = T ? { shirt: T.shirts[(j.i >> 1) % T.shirts.length], css: T.css } : BOT_LOOKS[j.i % BOT_LOOKS.length], tag = tagMat(j.name, look.css);
  if (team === 0) { tag.mat.depthTest = false; tag.mat.opacity = .85; }
  const [sr, sg, sb] = look.shirt;
  const r = { name: j.name, lang: j.lang, quiet: !!j.quiet, team, css: look.css, look: randomLook(j.name, sr << 16 | sg << 8 | sb), tag: tag.mat, tagW: tag.w,
    score: 0, kills: 0, deaths: 0, streak: 0, b: null, wait: .5, skill: j.skill ?? SKILL_MID, ...botLoadout() };
  recs.push(r);
  if (MATCH_T - matchT > 1) { feed(`${nameTag(r)} joined`); sfx('join'); }
}
const ranked = () => [...recs].sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH');
const nameTag = r => `<b style="color:${r.css}">${r.name}</b>`;
const teamKills = t => recs.reduce((s, r) => s + (r.team === t ? r.kills : 0), 0);
// 1 = your team is ahead, 0 = level, -1 = behind
const teamLead = () => Math.sign(teamKills(0) - teamKills(1));
function boardHTML() {
  // kill-only modes drop the score column
  const cols = MR.kills ? ['KILLS', 'DEATHS'] : ['SCORE', 'KILLS', 'DEATHS'], cls = MR.kills ? 'lb k' : 'lb';
  const head = `<div class="r h"><span>#</span><span>PLAYER</span>${cols.map(c => `<span>${c}</span>`).join('')}</div>`;
  const row = (r, i) => `<div class="r${r.you ? ' you' : ''}"><span>${i + 1}</span><span style="color:${r.css}"${r.fid || (r.you && net.on && myId()) ? ` data-fid="${r.fid || myId()}"` : !r.you && net.on && r.pid ? ` data-nofid="${r.pid}"` : ''}>${r.name}</span>${MR.kills ? '' : `<span>${r.score}</span>`}<span>${r.kills}</span><span>${r.deaths}</span></div>`; // data-fid adds a friend button on the results screen
  $('board').className = $('postBoard').className = cls;
  if (!MR.team) return head + ranked().map(row).join('');
  // team modes: each team with its kill total, yours first
  return head + [0, 1].map(t => `<div class="r tm" style="color:${TEAMS[t].css}"><span></span><span>${TEAMS[t].name} TEAM</span><span>${teamKills(t)}</span>${MR.kills ? '<span></span>' : '<span></span><span></span>'}</div>`
    + ranked().filter(r => r.team === t).map(row).join('')).join('');
}
function feed(html) {
  const d = document.createElement('div'); d.className = 'kf'; d.innerHTML = html; $('feed').append(d);
  while ($('feed').children.length > 5) $('feed').firstChild.remove();
  setTimeout(() => d.remove(), 5000);
}
// someone died: kill, assists, points
function scoreKill(killer, victim, head, helpers) {
  victim.deaths++; victim.streak = 0;
  if (helpers && !MR.kills) for (const h of helpers) {
    if (h === killer || h === victim || !recs.includes(h)) continue;
    h.score += ASSIST_PTS; h.assists = (h.assists ?? 0) + 1;
    if (h.you) toast('+' + ASSIST_PTS + ' ASSIST', '#e8e8e8');
  }
  if (killer && killer !== victim) {
    killer.kills++; killer.streak++;
    const st = STREAKS[killer.streak];
    // kill-only modes: headshots and streaks are just announced
    const pts = MR.kills ? 1 : KILL_PTS + (head ? HEAD_PTS : 0) + (st ? st[0] : killer.streak > STREAK_PTS_AFTER ? STREAK_PTS : 0);
    killer.score += pts;
    if (killer.you) {
      killNotice(`${MR.kills ? '+1 KILL' : '+' + pts}${head ? ' · HEADSHOT' : ''}`, killer.streak, head);
    }
  }
  feed(killer && killer !== victim ? `${nameTag(killer)} ${head ? ico('head') : ico('skull')} ${nameTag(victim)}` : `${nameTag(victim)} ${ico('skull')}`);
  const st = killer && killer !== victim && STREAKS[killer.streak];
  if (st) feed(`${nameTag(killer)} <b style="color:#8ff0b6">${st[1]}!</b>`);
}

// spawn spots: as far from enemies as possible
function spawnSpots(who, n = 1) {
  const others = [];
  if (who !== YOU_T && respawnT <= 0 && !friendly(who, YOU_T)) others.push(P.pos);
  for (const z of zombies) if (z.rec !== who && !z.dead && !friendly(who, z)) others.push(z.g.position);
  const found = [];
  for (let tries = 0; tries < 60; tries++) {
    const x = (Math.random() * 2 - 1) * (A - 2), z = (Math.random() * 2 - 1) * (A - 2);
    const fy = floorY(x, z);
    if (blocked(x, z, .45, fy) || MAP.land && !MAP.land(x, z) || overWater(x, z, fy) || poolAt(x, z)) continue; // not in the water
    const d = others.length ? Math.min(...others.map(o => Math.hypot(x - o.x, z - o.z))) : 99;
    found.push([d, x, z]);
  }
  found.sort((a, b) => b[0] - a[0]);
  const out = [];
  for (const [, x, z] of found) { if (out.every(([ox, oz]) => Math.hypot(x - ox, z - oz) >= 4)) out.push([x, z]); if (out.length >= n) break; }
  return out.length ? out : [[0, 0]];
}
function spawnSpot(who) { return spawnSpots(who)[0]; }
const ARM_DOWN = new THREE.Vector3(0, -1, 0), _hv = new THREE.Vector3();
// put a gun in the bot's hands
function holdGun(b) {
  const u = BOT_U;
  if (b.gunM) { b.aim.remove(b.gunM); b.gunM.traverse(o => { if (o.geometry && o !== b.flashM && !o.userData.shared) o.geometry.dispose(); }); }
  const gunM = new THREE.Group(), { muzzle: [my, mz], spin, round, mag } = makeGun(b.gun, gunM, b.rec.stars[b.gun]);
  // the hold pose from hold.js
  const h = holdFor(b.gun);
  gunM.position.set(h.T[0] * u, (h.T[1] - 22) * u, h.T[2] * u); gunM.quaternion.fromArray(h.q);
  b.armR.quaternion.setFromUnitVectors(ARM_DOWN, _hv.fromArray(h.dR));
  b.armL.quaternion.setFromUnitVectors(ARM_DOWN, h.dL ? _hv.fromArray(h.dL) : _hv.set(.08, -.95, .3).normalize());
  b.holdTurn = h.turn; // sideways stance so the gun points where it aims
  b.round = round;
  b.flashM ??= makeFlash(.1);
  b.flashM.position.set(0, my, mz - .03); b.flashM.visible = false;
  gunM.add(b.flashM); b.aim.add(gunM);
  b.gunM = gunM; b.spin = spin; b.spinV = 0; b.wf = 0;
  // reload start pose
  b.mag = mag; b.rl = { rk: -1, on: false, p: gunM.position.clone(), q: gunM.quaternion.clone(), qR: b.armR.quaternion.clone(), qL: b.armL.quaternion.clone(), magAt: mag && mag.position.clone(), oneHand: !h.dL };
  gunM.updateMatrix(); const inv = gunM.matrix.clone().invert(), fist = (a, d) => a.position.clone().addScaledVector(_hv.fromArray(d), ARM_LEN * u).applyMatrix4(inv);
  b.rl.fR = fist(b.armR, h.dR); b.rl.fL = h.dL ? fist(b.armL, h.dL) : null;
  b.rl.fA = b.armR.position.clone().addScaledVector(_hv.fromArray(h.dR), ARM_LEN * u);
}
// a wand tips down to point straight while it fires (k = how far), turning round the fist
const _wfq = new THREE.Quaternion(), _wfI = new THREE.Quaternion(), _wfd = new THREE.Vector3(), _wfl = new THREE.Vector3();
function wandFlick(q, k) { _wfd.set(0, 0, -1).applyQuaternion(q); _wfl.set(_wfd.x, 0, _wfd.z).normalize(); return _wfq.setFromUnitVectors(_wfd, _wfl).slerp(_wfI, 1 - k); }
function wandHold(b, dt) {
  const R = b.rl, g = b.gunM; if (!R || !g || R.on || !BASE[b.gun].wand) return;
  b.wf = Math.max(0, Math.min(1, b.wf + dt * (b.fireOn > 0 ? 14 : -4)));
  const r = wandFlick(R.q, b.wf); g.quaternion.copy(R.q).premultiply(r); g.position.copy(R.p).sub(R.fA).applyQuaternion(r).add(R.fA);
}
// knife swing for bots and other players
function knifeChop(b) { const s = b.stab > 0 ? swingAt(1 - b.stab / KNIFE_SWING) : 0; b.aim.rotation.x += s * .9; b.aim.position.z = Math.max(0, s) * .12; }
// reload animation for bots and other players
const _rlE = new THREE.Euler(), _rlQ = new THREE.Quaternion(), _rlV = new THREE.Vector3(), _rlM = new THREE.Vector3(), _rlF = new THREE.Vector3();
function holdReload(b, left, total) {
  const R = b.rl, g = b.gunM; if (!R || !g) return;
  const id = BASE[b.gun].id, k = left > 0 && total > 0 ? Math.max(0, 1 - left / total) : -1, ra = k >= 0 ? reloadPose(id, k) : null;
  reloadSwap(R, id, k, b.mag, scene);
  if (BASE[b.gun].flare && b.mag) b.mag.visible = b.ammo > 0 || k > .4;
  if (!ra) {
    if (R.on) { R.on = false; g.position.copy(R.p); g.quaternion.copy(R.q); b.armR.quaternion.copy(R.qR); b.armL.quaternion.copy(R.qL); if (b.mag) b.mag.position.copy(R.magAt); }
    return;
  }
  R.on = true;
  g.quaternion.copy(R.q).multiply(_rlQ.setFromEuler(_rlE.set(ra.rx, ra.ry, ra.rz)));
  g.position.copy(R.p).add(_rlV.set(ra.x, ra.y, ra.z).applyQuaternion(R.q));
  if (b.mag) b.mag.position.copy(R.magAt).add(_rlV.set(ra.mx, ra.my, ra.mz));
  g.updateMatrix();
  const aimAt = (arm, p) => arm.quaternion.setFromUnitVectors(ARM_DOWN, _rlV.copy(p).sub(arm.position).normalize());
  aimAt(b.armR, _rlF.copy(R.fR).applyMatrix4(g.matrix));
  // left hand on the grip, then to the mag
  const toPart = R.oneHand ? ra.hand : Math.min(1, Math.max(0, -ra.ay / .3));
  if (!b.mag || (!R.fL && toPart <= 0)) { if (R.fL) aimAt(b.armL, _rlF.copy(R.fL).applyMatrix4(g.matrix)); else b.armL.quaternion.copy(R.qL); return; }
  _rlM.copy(partMid(b.mag)).add(b.mag.position).applyMatrix4(g.matrix);
  if (R.fL) _rlF.copy(R.fL).applyMatrix4(g.matrix).lerp(_rlM, toPart); else _rlF.copy(_rlM);
  if (R.fL || toPart > .01) aimAt(b.armL, _rlF);
  if (!R.fL) b.armL.quaternion.slerp(R.qL, 1 - toPart);
}
// best gun for this distance (empty guns count for less)
function pickGun(b, d) {
  let best = b.gun, bestS = -1;
  for (const g of b.rec.load) {
    const w = BASE[g], left = g === b.gun ? b.ammo : b.mags[g];
    let s = GUN_FIT[w.id](d) * (b.rec.taste?.[w.id] ?? 1);
    if (!w.inf && left <= 0) s *= .35;
    if (g === b.gun) s *= 1.15;
    if (s > bestS) { bestS = s; best = g; }
  }
  return best;
}
function botEquip(b, g) {
  if (g === b.gun) return;
  b.mags[b.gun] = b.ammo; b.reload = 0; // switching guns cancels the reload
  b.gun = g; b.ammo = b.mags[g]; b.swap = drawT(BASE[g]); b.burst = 4 + (Math.random() * 6 | 0); b.aimT = 0;
  if (b.fireOn > 0) { b.fireOn = 0; sfx(b.fireEnd, { at: b.g.position, far: 50 }); }
  b.pickT = Math.max(b.pickT, 1.2 + Math.random() * .8);
  holdGun(b); sfx('equip', { at: b.g.position, far: 15, v: .7 });
  const W = b.rec.W[g];
  if (!W.inf && b.ammo <= 0) { b.reload = drawT(W) + W.reload; sfx('r_' + W.id, { at: b.g.position, far: 25, v: .8 }); } // picked up an empty one: reload it
}
// spawn a bot (online the server picks the spot)
function makeBot(rec, spot) {
  const [x, z] = spot ? [spot.x, spot.z] : spawnSpot(rec);
  const ch = buildChar(rec.look, BOT_U), g = ch.g, u = BOT_U, arm = armorOf(rec.armor);
  if (arm) dressArmor(ch, rec.armor, teamMode() ? TEAMS[rec.team].shirts[0] : null);
  dressBoots(ch, rec.boots); dressHat(ch, rec.hat);
  g.rotation.order = 'YXZ'; g.position.set(x, groundAt(x, z, .35, floorY(x, z)), z);
  // arms forward holding the gun
  const aim = new THREE.Group(); aim.position.y = 22 * u; g.add(aim);
  for (const a of [ch.armR, ch.armL]) { aim.add(a); a.position.y = 0; }
  ch.headPiv.rotation.order = 'YXZ';
  const tag = new THREE.Sprite(rec.tag); tag.scale.set(rec.tagW, .25, 1); tag.position.y = 2.25;
  g.add(tag); scene.add(g);
  const yaw = spot?.yaw ?? Math.atan2(-x, -z);
  g.rotation.y = yaw;
  const mags = {}; for (const i of rec.load) mags[i] = rec.W[i].mag; // full ammo on respawn
  const b = { g, head: ch.head, headPiv: ch.headPiv, aim, armR: ch.armR, armL: ch.armL, holdTurn: 0, gunM: null, flashM: null, spin: null, spinV: 0, tag, pivL: ch.legL, pivR: ch.legR, parts: ch.parts, mats: ch.mats, rec, pid: rec.pid, remote: !!rec.remote,
    type: 'bot', hp: BOT.hp, maxHp: BOT.hp, armor: arm ? arm.hp : 0, maxArmor: arm ? arm.hp : 0, dr: arm ? arm.dr : 0, scale: 1, r: .3, coins: 0, t: 0, flash: 0, dead: 0, burn: 0,
    gun: rec.load[0], mags, refill: {}, ammo: mags[rec.load[0]], reload: 0, swap: 0, pickT: 0, stab: 0, fireOn: 0, fireEnd: 'flameEnd', leadGuess: .6 + Math.random() * .6, cd: .3, burst: 5, muzzle: 0, seeT: 0, aimT: 0, aimYaw: yaw, aimPitch: 0,
    strafe: 1, strafeT: 0, detour: 0, detourDir: 1, tgt: null, scanT: 0, lostT: 0, engaged: false, hitBy: null, hitByT: 0, hitDmg: 0, lpx: 0, lpz: 0, pvx: 0, pvz: 0, vy: 0, jumpT: 2 + Math.random() * 4 };
  if (!friendly(rec, YOU_T)) addOutline(b); // enemies glow red
  b.gun = pickGun(b, HUNT_D); b.ammo = mags[b.gun];
  holdGun(b);
  b.parts.forEach(p => p.userData.zombie = b);
  zombies.push(b); rec.b = b;
  return b;
}
// bot death: cry, angel, and its effects off
function botDownFx(b, nobody = false) {
  b.hp = Math.min(b.hp, 0); b.dead ||= .0001;
  b.tag.visible = false; b.flashM.visible = false;
  if (b.fireOn > 0) { b.fireOn = 0; sfx(b.fireEnd, { at: b.g.position, far: 50 }); }
  const bm = beams.get(b); if (bm) { scene.remove(bm.g); beams.delete(b); }
  if (!nobody) sfx('die', { at: b.g.position, far: 40 });
  if (!b.drowned) angel(b); // drowned ones just sink
}
// a bot died (by = the bot that got it, null = you)
function botDown(b, by, head, nobody = false) {
  botDownFx(b, nobody);
  b.rec.wait = MR.bot + DIE_T;
  scoreKill(nobody ? null : by ? by.rec : youRec, b.rec, head, b.helpers);
}
// dead bots turn into an angel that floats away
const haloGeo = new THREE.TorusGeometry(4 * BOT_U, .5 * BOT_U, 6, 16), wingGeo = new THREE.BoxGeometry(1, 1, 1);
function angel(b) {
  const u = BOT_U;
  if (b.gunM) b.gunM.visible = false;
  b.aim.rotation.x = 0; b.aim.position.z = 0; b.g.rotation.x = b.g.rotation.z = 0;
  b.aim.children.forEach(a => { if (a !== b.gunM) a.rotation.set(0, 0, 0); });
  b.pivR.rotation.set(0, 0, -LEG_SPREAD); b.pivL.rotation.set(0, 0, LEG_SPREAD); b.headPiv.rotation.set(-.25, 0, 0);
  for (const m of b.mats) { m.transparent = true; m.opacity = .6; m.depthWrite = false; m.emissive.setHex(0x8a8a8a); m.needsUpdate = true; }
  const glow = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const haloMat = glow(0xffe27a, .95), wingMat = glow(0xffffff, .7), extra = [];
  const halo = new THREE.Mesh(haloGeo, haloMat); halo.rotation.x = Math.PI / 2; halo.position.y = 35.5 * u;
  b.g.add(halo); extra.push(halo);
  // angel wings
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(s * 1.5 * u, 21 * u, -2.6 * u);
    for (const [len, h, y] of [[14, 3.6, 0], [11, 3, -3.2], [7.5, 2.6, -6]]) {
      const f = new THREE.Mesh(wingGeo, wingMat); f.scale.set(len * u, h * u, .6 * u); f.position.set(s * len * u / 2, y * u, 0); w.add(f);
    }
    w.rotation.set(0, s * .5, s * .25); b.g.add(w); extra.push(w);
    return w;
  });
  b.angel = { wings, halo, mats: [haloMat, wingMat], extra, y0: b.g.position.y };
}
// angel float and fade
function angelTick(b, t) {
  const a = b.angel, f = Math.min(1, t);
  b.g.position.y = a.y0 + f * f * .4 + t * 1.6;
  a.wings.forEach((w, i) => w.rotation.y = (i ? 1 : -1) * (.5 + Math.sin(t * 14) * .35));
  a.halo.rotation.z = t * 3;
  const o = Math.max(0, Math.min(1, (DIE_T - t) / (DIE_T - 1)));
  for (const m of b.mats) m.opacity = .6 * o;
  a.mats[0].opacity = .95 * o; a.mats[1].opacity = .7 * o;
}
function angelGone(b) { b.angel.mats.forEach(m => m.dispose()); b.angel = null; const bm = beams.get(b); if (bm) { scene.remove(bm.g); beams.delete(b); } }
// you died: respawn wait, the camera watches who got you
function youDownFx(by) {
  respawnT = YOU_RESPAWN; killedBy = by ? by.rec.name : ''; P.burn = 0; P.hp = 0;
  killCam = by && !friendly(by, YOU_T) ? { b: by, at: by.g.position.clone(), yaw: P.yaw, pitch: P.pitch } : null;
}
// you died in a bot match
function youDown(by) {
  youDownFx(by);
  scoreKill(by ? by.rec : null, youRec, false, youHelpers);
}
// respawn you
function respawnYou(x, z, yaw) {
  gunSpinV = 0;
  if (x == null) [x, z] = spawnSpot(YOU_T);
  Object.assign(P, { drowned: false, drownFlag: false, burn: 0, slowT: 0, vy: 0, mvx: 0, mvz: 0, kx: 0, kz: 0, lx: 0, lz: 0, hp: P.max, armor: P.maxArmor, yaw: yaw ?? Math.atan2(x, z), pitch: 0, onRamp: false }); P.pos.set(x, groundAt(x, z, .35, floorY(x, z)), z); P.pos.lag = 0;
  WEAPONS.forEach((w, i) => { if (owned[i]) { ammo[i] = w.mag; if (!BASE[i].inf) reserve[i] = resMax(i); } });
  youHelpers.clear(); killCam = null;
  cancelReload(); recoilReset(); vm.visible = true; $('cross').style.display = ''; $('banner').style.opacity = 0;
}

const eye = new THREE.Vector3(), beamTo = new THREE.Vector3(), aimV = new THREE.Vector3(), dirV = new THREE.Vector3(), hitV = new THREE.Vector3(), losDir = new THREE.Vector3();
const losRay = new THREE.Raycaster(), pBox = new THREE.Box3();
function clearLine(a, c) { // line of sight (crates block, the fence doesn't)
  losDir.subVectors(c, a); const d = losDir.length(); if (d < .01) return true;
  losRay.set(a, losDir.divideScalar(d)); losRay.far = d;
  return !losRay.intersectObjects(crateMeshes, false).length;
}
const aimDir = (yaw, pitch, out) => out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
const tPos = t => t.you ? P.pos : t.g.position;
const tAlive = t => t.you ? respawnT <= 0 : !t.dead && zombies.includes(t);
function canSee(t) { // can it see the target's chest or head
  const p = tPos(t);
  return clearLine(eye, aimV.set(p.x, p.y + 1.1, p.z)) || clearLine(eye, aimV.set(p.x, p.y + 1.6, p.z));
}
// what a bot can see and hear
const BOT_FOV = Math.PI / 2, BOT_FOV_WIDE = 3.4, WIDEN_AT = 14, WIDEN_T = 14, BOT_VFOV = .8, NEAR_SENSE = 2.5;
const HEAR = 38, HEAR_QUIET = 12; // how far gunfire can be heard
const TURN_WALK = 3.2; // how fast it turns while walking somewhere
const angDiff = (a, c) => Math.atan2(Math.sin(a - c), Math.cos(a - c));
function inView(b, t) {
  const p = tPos(t), pos = b.g.position, dx = p.x - pos.x, dz = p.z - pos.z, d = Math.hypot(dx, dz);
  if (d < NEAR_SENSE) return true;
  const fov = BOT_FOV + Math.min(1, Math.max(0, (b.noSeeT - WIDEN_AT) / WIDEN_T)) * (BOT_FOV_WIDE - BOT_FOV);
  return Math.abs(angDiff(Math.atan2(dx, dz), b.aimYaw)) < fov / 2 && Math.abs(Math.atan2(p.y + 1 - pos.y - 1.6, d) - b.aimPitch) < BOT_VFOV;
}
function enemiesOf(b) {
  const out = [];
  if (respawnT <= 0 && !friendly(b, YOU_T)) out.push(YOU_T);
  for (const z of zombies) if (z !== b && !z.dead && !friendly(b, z)) out.push(z);
  return out;
}
// gunshots bots can hear
const heard = [];
function botHear(x, z, who, quiet) {
  const now = performance.now(), last = heard[heard.length - 1];
  if (last && last.who === who && now - last.at < 400) { last.x = x; last.z = z; last.at = now; last.quiet = !!quiet; return; }
  heard.push({ x, z, who, quiet: !!quiet, at: now }); if (heard.length > 8) heard.shift();
}
// pick a target: stick with one, but switch to someone much closer
const NEAR_SWITCH = 14;
function pickTarget(b) {
  const pos = b.g.position, enemies = enemiesOf(b);
  if (!enemies.length) return null;
  const d = t => Math.hypot(tPos(t).x - pos.x, tPos(t).z - pos.z);
  const shooter = b.hitBy && b.hitByT > 0 && b.hitBy !== b.tgt && tAlive(b.hitBy) && canSee(b.hitBy) ? b.hitBy : null;
  if (b.tgt && tAlive(b.tgt) && b.engaged && b.lostT < LOSE_T) {
    if (shooter && (b.hitDmg >= SWITCH_DMG || b.lostT > 0)) return shooter;
    const dt0 = d(b.tgt), near = enemies.filter(t => t !== b.tgt && d(t) < NEAR_SWITCH && d(t) < dt0 * .5 && inView(b, t) && canSee(t)).sort((a, c) => d(a) - d(c))[0];
    return near ?? b.tgt;
  }
  if (shooter) return shooter;
  return enemies.filter(t => inView(b, t) && canSee(t)).sort((a, c) => d(a) - d(c))[0] ?? null;
}
// where to wander when nobody is around
function roamGoal(b) {
  const pos = b.g.position, en = enemiesOf(b), a = Math.random() * 6.283;
  let x, y = pos.y, z;
  if (en.length && Math.random() < .8) {
    const d = t => Math.hypot(tPos(t).x - pos.x, tPos(t).z - pos.z);
    en.sort((p, q) => d(p) - d(q));
    const e = tPos(Math.random() < .6 ? en[0] : pickOf(en)), r = Math.max(3, 14 - b.noSeeT * .5) * (.4 + Math.random() * .6);
    x = e.x + Math.cos(a) * r; z = e.z + Math.sin(a) * r; y = e.y;
  } else { const r = 8 + Math.random() * 14; x = pos.x + Math.cos(a) * r; z = pos.z + Math.sin(a) * r; }
  const lim = A - 2;
  return { x: Math.max(-lim, Math.min(lim, x)), y, z: Math.max(-lim, Math.min(lim, z)), t: 4 + Math.random() * 5 };
}
// bot head turning: unhurried, with a few quick flicks
function botLook(b, wantYaw, wantPitch, dt) {
  const S = skillOf(b);
  if (!b.turnSpd || Math.abs(angDiff(wantYaw, b.lookWas)) > .45) b.turnSpd = (Math.random() < S.flick ? 8 + Math.random() * 5 : 3 + Math.random() * 2.5) * S.spd;
  b.lookWas = wantYaw;
  const now = performance.now() * .001, uneven = Math.max(.35, .8 + .3 * Math.sin(now * 11 + b.t0) + .25 * Math.sin(now * 23 + b.t0 * 3));
  const cap = b.turnSpd * uneven * dt, k = Math.min(1, dt * S.turn), dy = angDiff(wantYaw, b.aimYaw), dp = wantPitch - b.aimPitch;
  b.aimYaw += Math.sign(dy) * Math.min(Math.abs(dy) * k, cap);
  b.aimPitch += Math.sign(dp) * Math.min(Math.abs(dp) * k, cap * .7);
}
function botAlert(b, x, z, err) { b.alertYaw = Math.atan2(x - b.g.position.x, z - b.g.position.z) + (Math.random() * 2 - 1) * err; b.alertT = .9 + Math.random() * .9; }
// bot brain state
function botMind(b) {
  Object.assign(b, { noSeeT: 0, gazeT: 0, gazeYaw: 0, gazePitch: 0, alertT: 0, alertYaw: 0, idle: 0, idleNext: 20 + Math.random() * 70, roam: null,
    lk: { x: 0, y: 0, z: 0 }, mvYaw: b.aimYaw, wob: 0, wobWant: 0, wobT: 0, turnSpd: 0, lookWas: b.aimYaw, heardAt: performance.now(), t0: Math.random() * 100,
    rest: 0, restNext: 3 + Math.random() * 8, vx: 0, vz: 0, mvx: 0, mvz: 0 });
}

function nearPad(pos, range) {
  let best = null, bestD = range;
  for (const p of pads) {
    if (!p.item || p.type !== 'health') continue;
    const d = Math.hypot(p.x - pos.x, p.z - pos.z);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// you on fire from a bot
function burnYou(t, burn, by) {
  if (respawnT > 0 || friendly(by, YOU_T)) return;
  P.burnDmg = P.burn > 0 ? Math.max(P.burnDmg, burn) : burn;
  P.burn = Math.max(P.burn || 0, t); P.burnBy = by; if (!(P.burnT > 0)) P.burnT = .25;
}
function burnTick(dt) {
  if (!(P.burn > 0) || respawnT > 0) return;
  P.burn -= dt;
  if ((P.burnT -= dt) <= 0) { P.burnT = .25; hurtPlayer(Math.max(1, Math.round(P.burnDmg)), false, P.burnBy); }
}
// bot knife
function botStab(b, W, t, dist) {
  b.cd = W.rate; b.stab = KNIFE_SWING; sfx(W.swing || 'swing', { at: b.g.position, far: 20 }); net.shot(W, b);
  const p = tPos(t), pos = b.g.position, want = Math.atan2(p.x - pos.x, p.z - pos.z);
  const facing = dist < .7 || Math.abs(Math.atan2(Math.sin(want - b.aimYaw), Math.cos(want - b.aimYaw))) <= .6;
  if (dist > W.range || Math.abs(p.y - pos.y) > 1.6 || !facing) return;
  const at = new THREE.Vector3(p.x, p.y + 1.2, p.z);
  sfx(W.hit || 'slash', { at, far: 20 });
  if (W.knock && !net.on) launch(t.you ? P : t, t.you ? new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z) : t.g.position.clone().setY(t.g.position.y + 1), pos.clone().setY(pos.y + 1), W.knock, false);
  if (t.you) hurtPlayer(Math.round(W.dmg * BOT.dmgMul), false, b, false, 1);
  else hurtZombie(t, W.dmg * BOT.dmgMul, at, false, false, b, 1);
  if (W.burn && (t.you ? !dead : !t.dead)) applyBurn(t.you ? P : t, W.burnT, W.burn, b, W.id, true);
}
// bot flamethrower
const coneV = new THREE.Vector3(), flameV = new THREE.Vector3();
function botFlame(b, W) {
  if (!(b.fireOn > 0)) sfx('flameStart', { at: b.g.position, far: 50 });
  b.fireOn = .2; b.fireEnd = 'flameEnd';
  aimDir(b.aimYaw, b.aimPitch, dirV);
  b.flashM.getWorldPosition(flameV);
  for (let k = 0; k < 2; k++) {
    const m = new THREE.Mesh(flameGeo, flameMats[Math.random() * 3 | 0]); m.position.copy(flameV); scene.add(m);
    const v = dirV.clone().multiplyScalar(13).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(2.5));
    flames.push({ m, v, life: .45 });
  }
  const hits = respawnT <= 0 && !friendly(b, YOU_T) ? [YOU_T] : [];
  for (const z of zombies) if (z !== b && !z.dead && !friendly(b, z)) hits.push(z);
  for (const o of hits) {
    const p = tPos(o), c = new THREE.Vector3(p.x, p.y + 1.1, p.z);
    coneV.subVectors(c, eye); const d = coneV.length(), along = coneV.dot(dirV);
    if (along <= 0 || along > W.range) continue;
    if (Math.sqrt(Math.max(0, d * d - along * along)) > .5 + along * .15 + .3) continue;
    if (!clearLine(eye, c)) continue;
    if (o.you) { hurtPlayer(W.dmg, false, b, false, 3); applyBurn(P, BURN_T, W.dmg * .6, b, 'flame'); }
    else { hurtZombie(o, W.dmg, c, false, false, b, 3); applyBurn(o, BURN_T, W.dmg * .6, b, 'flame'); }
  }
}
function botFire(b, W, dist) {
  botHear(b.g.position.x, b.g.position.z, b, W.quiet || W.flame);
  b.ammo--; b.muzzle = W.flame || W.beam ? 0 : .05; net.shot(W, b);
  if (W.starFx) starPuff(b.flashM);
  // beams in long sweeps, everything else in short bursts
  if (autoFire(W)) { b.cd = W.rate; if (--b.burst <= 0) { b.burst = W.beam ? 14 + (Math.random() * 20 | 0) : 4 + (Math.random() * 6 | 0); b.cd = .35 + Math.random() * .35; } }
  else b.cd = W.rate + Math.random() * .12; // semi-auto: about as fast as a person clicks
  if (W.scope) b.aimT = 0;
  if (W.beam) { if (!(b.fireOn > 0)) sfx(W.frost ? 'frostStart' : 'heatStart', { at: b.g.position, far: 50 }); b.fireOn = .2; b.fireEnd = W.frost ? 'frostEnd' : 'heatEnd'; }
  else if (!W.flame) sfx(W.id, { at: b.g.position, far: W.quiet ? 35 : 100 });
  if (b.ammo <= 0) {
    b.reload = W.reload; if (!W.pool) sfx('r_' + W.id, { at: b.g.position, far: 25, v: .8 });
    b.pickT = Math.min(b.pickT, .15 + Math.random() * .25); // out of ammo: think about switching
  }
  if (W.flame) return botFlame(b, W);
  const S = skillOf(b), err = S.aimErr + S.moveErr * Math.min(1, Math.hypot(b.pvx, b.pvz) / 6) + W.spread * (W.scope ? .1 : .8);
  if (W.rocket || W.flare || W.grenade) {
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    (W.rocket ? fireRocket : W.grenade ? fireGrenade : fireFlare)(W, eye.clone(), dirV, b);
    b.leadGuess = .6 + Math.random() * .6;
    return;
  }
  if (W.lance) {
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    return botLance(b, W);
  }
  const youUp = respawnT <= 0 && !friendly(b, YOU_T);
  pBox.min.set(P.pos.x - .25, P.pos.y, P.pos.z - .25); pBox.max.set(P.pos.x + .25, P.pos.y + 1.85, P.pos.z + .25); // as wide as a bot
  // shots hit any enemy in the way
  const others = []; for (const z of zombies) if (z !== b && !z.dead && !friendly(b, z)) others.push(...z.parts);
  // bot snipers line up shots, so a tighter cone
  const walls = [ground, ...crateMeshes];
  for (let i = 0; i < W.pellets; i++) {
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    losRay.set(eye, dirV); losRay.far = W.range || 90;
    const wall = losRay.intersectObjects(walls, false)[0], wallD = wall ? wall.distance : Infinity;
    const bot = others.length ? losRay.intersectObjects(others, false)[0] : null, botD = bot ? bot.distance : Infinity;
    const onYou = youUp && losRay.ray.intersectBox(pBox, hitV), youD = onYou ? eye.distanceTo(hitV) : Infinity;
    const near = Math.min(wallD, botD, youD);
    if (W.beam) showBeam(b, b.flashM.getWorldPosition(beamFrom), beamTo.copy(eye).addScaledVector(dirV, Math.min(near, W.range)), beamKind(W));
    if (near === Infinity) continue;
    if (near === youD) {
      const head = hitV.y > P.pos.y + 1.45;
      hurtPlayer(Math.max(1, Math.round(W.dmg * BOT.dmgMul * (head ? headMul(W) : 1))), false, b, head, W.beam ? 2 : 0);
      if (slows(W)) shockHit(P, W);
    } else if (near === botD) {
      const zz = bot.object.userData.zombie, head = !!bot.object.userData.head;
      if (!zz.dead) { hurtZombie(zz, W.dmg * BOT.dmgMul * (head ? headMul(W) : 1), bot.point, head, false, b, W.beam ? 2 : 0); if (slows(W)) shockHit(zz, W); }
    } else burst(wall.point, 0x999999, 2);
  }
}
// a bot's lance: through anyone in the way (not its team), you included
function botLance(b, W) {
  let you = null;
  if (respawnT <= 0 && !friendly(b, YOU_T)) {
    pBox.min.set(P.pos.x - .25, P.pos.y, P.pos.z - .25); pBox.max.set(P.pos.x + .25, P.pos.y + 1.85, P.pos.z + .25);
    losRay.set(eye, dirV);
    if (losRay.ray.intersectBox(pBox, hitV)) you = { you: true, distance: eye.distanceTo(hitV), point: hitV.clone() };
  }
  const parts = [ground, ...crateMeshes]; for (const z of zombies) if (z !== b && !z.dead && !friendly(b, z)) parts.push(...z.parts);
  const L = lanceLine(eye, dirV, W, parts, you);
  for (const h of L.hits) {
    const d = W.dmg * BOT.dmgMul * h.mul * (h.head ? headMul(W) : 1);
    if (h.zz === YOU_T) hurtPlayer(Math.max(1, Math.round(d)), false, b, h.head, 0, 0, h.thru);
    else hurtZombie(h.zz, d, h.point, h.head, false, b, 0, 0, h.thru);
  }
  showLance(b.flashM.getWorldPosition(beamFrom).clone(), L, W.lance);
}

function updateBot(b, dt) {
  if (b.slowT > 0) b.slowT -= dt;
  let W = b.rec.W[b.gun];
  const pos = b.g.position;
  if (b.gazeT === undefined) botMind(b);
  const S = skillOf(b);
  eye.set(pos.x, pos.y + 1.6, pos.z);
  b.hitByT -= dt;
  if ((b.scanT -= dt) <= 0 || b.tgt && !tAlive(b.tgt)) {
    b.scanT = .3;
    const was = b.tgt, t = pickTarget(b);
    if (t !== was) {
      if (!t && was && tAlive(was) && b.engaged) b.roam = { x: b.lk.x, y: b.lk.y, z: b.lk.z, t: 5 + Math.random() * 3 }; // lost it: go look where it was
      b.tgt = t; b.seeT = 0; b.aimT = 0; b.lostT = 0; b.engaged = false; b.pvx = b.pvz = 0;
      if (t) { const q = tPos(t); b.lpx = b.lk.x = q.x; b.lpz = b.lk.z = q.z; b.lk.y = q.y; b.idle = 0; }
    }
  }
  const t = b.tgt, tp = t ? tPos(t) : null, sees = !!t && canSee(t);
  if (sees) { b.lk.x = tp.x; b.lk.y = tp.y; b.lk.z = tp.z; b.engaged = true; b.noSeeT = 0; } else b.noSeeT += dt;
  b.seeT = sees ? b.seeT + dt : 0;
  b.lostT = sees || !t ? 0 : b.lostT + dt;
  // now and then it just stands around
  if (b.idle > 0) { b.idle -= dt; if (t || b.hitByT > 0) b.idle = 0; }
  else if (S.idle && !t && b.hitByT <= 0 && !b.vy && (b.idleNext -= dt) <= 0) { b.idle = 2 + Math.random() * 3; b.idleNext = 40 + Math.random() * 70; }
  if (b.rest > 0) { b.rest -= dt; if (t) b.rest = 0; }
  else if (S.rest && !t && b.idle <= 0 && (b.restNext -= dt) <= 0) { b.rest = S.rest[2] + Math.random() * S.rest[3]; b.restNext = S.rest[0] + Math.random() * S.rest[1]; }
  if (!t) {
    if (b.hitByT > 1.7 && b.hitBy && tAlive(b.hitBy)) { const q = tPos(b.hitBy); botAlert(b, q.x, q.z, .15); } // shot from behind: turn to look
    let near = null, nd = Infinity; // heard gunfire: look, and sometimes go
    for (const h of heard) if (h.at > b.heardAt && h.who !== b && !friendly(b, h.who)) { const d = Math.hypot(h.x - pos.x, h.z - pos.z); if (d < (h.quiet ? HEAR_QUIET : HEAR) && d < nd) { nd = d; near = h; } }
    b.heardAt = performance.now();
    if (near) { botAlert(b, near.x, near.z, .3); if (Math.random() < .5) b.roam = { x: near.x + (Math.random() * 2 - 1) * 4, y: pos.y, z: near.z + (Math.random() * 2 - 1) * 4, t: 6 }; }
    if (!b.roam || (b.roam.t -= dt) <= 0 || Math.hypot(b.roam.x - pos.x, b.roam.z - pos.z) < 2.5) b.roam = roamGoal(b);
  }
  // where it's going
  const go = sees ? tp : t ? b.lk : b.roam;
  const dx = go.x - pos.x, dz = go.z - pos.z, dist = Math.hypot(dx, dz) || .001;

  // pick the best gun for the distance
  if ((b.pickT -= dt) <= 0) {
    b.pickT = sees ? .5 + Math.random() * .7 : 2 + Math.random() * 2;
    botEquip(b, pickGun(b, t && (sees || b.lostT < 1.5) ? dist : HUNT_D));
    W = b.rec.W[b.gun];
  }
  // reload when nothing is around
  if (!sees && (!t || b.lostT > 1)) {
    if (!W.inf && !W.pool && b.reload <= 0 && b.swap <= 0 && b.ammo < W.mag) { b.reload = W.reload; sfx('r_' + W.id, { at: pos, far: 25, v: .8 }); }
    for (const g of b.rec.load) {
      const G = b.rec.W[g];
      if (g === b.gun || b.mags[g] >= G.mag) continue;
      if ((b.refill[g] = (b.refill[g] || 0) + dt) >= G.reload) { b.mags[g] = G.mag; b.refill[g] = 0; }
    }
  }
  const keep = BOT_KEEP[W.id], sniper = !!W.scope;

  // bot aim: leads a little, lags behind, misses more when you move
  let wantYaw, wantPitch;
  if (sees) {
    if (b.seeT <= dt) { b.lpx = tp.x; b.lpz = tp.z; }
    if (dt > 0) { b.pvx += ((tp.x - b.lpx) / dt - b.pvx) * Math.min(1, dt * 8); b.pvz += ((tp.z - b.lpz) / dt - b.pvz) * Math.min(1, dt * 8); }
    b.lpx = tp.x; b.lpz = tp.z;
    const fly = W.rocket ? dist / ROCKET_SPD : W.flare ? dist / FLARE_SPD : W.grenade ? dist / GREN_SPD : 0, lag = 1 / S.turn, drop = W.flare ? FLARE_DROP : W.grenade ? GREN_GRAV : 0;
    const tx = dx + (fly ? b.pvx * fly * b.leadGuess : (b.pvx * S.lead - b.vx * S.self) * lag), tz = dz + (fly ? b.pvz * fly * b.leadGuess : (b.pvz * S.lead - b.vz * S.self) * lag), th = Math.hypot(tx, tz);
    wantYaw = Math.atan2(tx, tz);
    wantPitch = Math.atan2(tp.y + (W.rocket || W.grenade ? .3 : 1.1) - pos.y - 1.6 - (fly ? 0 : b.vy * S.self * lag), th) + (drop ? Math.atan2(drop * fly * fly / 2, th) : 0);
  } else {
    // nobody around: look where it's going and glance about
    if ((b.gazeT -= dt) <= 0) {
      b.gazeT = S.gaze[0] + Math.random() * S.gaze[1];
      const r = Math.random(), v = Math.random();
      b.gazeYaw = r < .12 ? (Math.random() < .5 ? -1 : 1) * (1.9 + Math.random()) : r < .55 ? (Math.random() * 2 - 1) * 1.1 : (Math.random() * 2 - 1) * .3;
      b.gazePitch = v < .15 ? -.45 - Math.random() * .3 : v < .3 ? .12 + Math.random() * .25 : -.1 + (Math.random() - .5) * .25;
    }
    const ahead = t ? Math.atan2(dx, dz) : b.mvYaw;
    wantYaw = b.idle > 0 ? b.aimYaw : b.alertT > 0 ? b.alertYaw : ahead + b.gazeYaw * (t ? .5 : 1);
    wantPitch = b.idle > 0 ? -1 : b.alertT > 0 ? 0 : b.gazePitch;
    b.alertT -= dt;
  }
  botLook(b, wantYaw, wantPitch, dt);
  b.g.rotation.y = b.aimYaw - b.holdTurn; b.headPiv.rotation.y = b.holdTurn; b.headPiv.rotation.x = b.aim.rotation.x = -b.aimPitch;

  b.cd -= dt; b.muzzle -= dt; b.swap -= dt; b.flashM.visible = b.muzzle > 0;
  if (b.fireOn > 0 && (b.fireOn -= dt) <= 0) sfx(b.fireEnd, { at: pos, far: 50 });
  b.stab = Math.max(0, b.stab - dt); knifeChop(b); // knife chop
  if (b.spin) { if (b.muzzle > 0) b.spinV = 30; b.spin.rotation.z += b.spinV * dt; b.spinV = Math.max(0, b.spinV - dt * 25); } // eradicator barrels spin
  if (b.reload > 0 && (b.reload -= dt) <= 0) b.ammo = W.mag;
  if (b.round) b.round.visible = b.ammo > 0;
  holdReload(b, b.reload, W.reload); wandHold(b, dt);
  // in range for this gun
  const inRange = !sees ? false : W.melee ? dist <= W.range && Math.abs(tp.y - pos.y) < 1.6 : W.flame ? dist < W.range + .5 : W.beam ? dist < W.range : W.rocket ? dist > 4 : true;
  const ready = sees && b.seeT >= S.react && b.reload <= 0 && b.swap <= 0 && (W.inf || b.ammo > 0) && inRange;
  b.aimT = ready && sniper ? b.aimT + dt : 0;
  if (ready && b.cd <= 0 && (!sniper || b.aimT >= SNIPE_T)) { if (W.melee) botStab(b, W, t, dist); else botFire(b, W, dist); }

  // movement: keep its distance, strafe while fighting
  let radial = 1, side = 0;
  if (sees) {
    radial = dist > keep[1] ? 1 : dist < keep[0] ? -1 : 0;
    if (S.plant && radial && dist > keep[0] * .6 && dist < keep[1] * 1.6) radial = 0;
    if (b.reload > 0 && dist < keep[1] + 4) radial = -1;
    if ((b.strafeT -= dt) <= 0) { b.strafeT = S.strafeT[0] + Math.random() * S.strafeT[1]; b.strafe = Math.random() < S.stand ? 0 : Math.random() < .5 ? -1 : 1; }
    side = b.strafe * (sniper && b.aimT > 0 ? .3 : 1);
  }
  const pad = !sees && b.hp < b.maxHp ? nearPad(pos, b.hp <= PAD_LOW ? PAD_FAR : PAD_NEAR) : null;
  let gx = dx, gz = dz, gd = dist;
  // take the stairs or go round the pool
  const way = pad ? MAP.nav?.(pos, { x: pad.x, y: pad.y, z: pad.z }) : !sees || MAP.trapped?.(pos) ? MAP.nav?.(pos, go) : radial > 0 ? MAP.around?.(pos, tp) : null;
  const into = !pad && !!t && !!MAP.trapped?.(go); // only goes in the pool after a target
  if (way) { gx = way.x - pos.x; gz = way.z - pos.z; gd = Math.hypot(gx, gz) || .001; radial = 1; side = 0; }
  else if (pad) { gx = pad.x - pos.x; gz = pad.z - pos.z; gd = Math.hypot(gx, gz) || .001; radial = 1; }
  else if (sees && dist < 1.5 && !W.melee) radial = -1; // too close
  else if (t && !sees && dist < 1.2) radial = 0;
  if (b.detour > 0) { b.detour -= dt; side = b.detourDir; radial *= .3; } // stuck: sidestep
  const ux = gx / gd, uz = gz / gd;
  let mx = ux * radial + uz * side, mz = uz * radial - ux * side;
  for (const o of zombies) {
    if (o === b || o.dead) continue;
    const ox = pos.x - o.g.position.x, oz = pos.z - o.g.position.z, od = Math.hypot(ox, oz);
    if (od < .8 && od > 0) { mx += ox / od; mz += oz / od; }
  }
  if (respawnT <= 0 && Math.abs(P.pos.y - pos.y) < 1.8) { // never stand inside your camera
    const ox = pos.x - P.pos.x, oz = pos.z - P.pos.z, od = Math.hypot(ox, oz);
    if (od < .75) { if (od > .001) { mx += ox / od * 2; mz += oz / od * 2; } else mx += 2; }
  }
  if (b.idle > 0 || b.rest > 0) mx = mz = 0;
  else if (!sees && !way && !pad && b.detour <= 0 && Math.hypot(mx, mz) > .05) {
    // walk in a loose curve, not a straight line
    if ((b.wobT -= dt) <= 0) { b.wobT = 1 + Math.random() * 1.8; b.wobWant = (Math.random() * 2 - 1) * (gd > 5 ? .6 : .15); }
    b.wob += (b.wobWant - b.wob) * Math.min(1, dt * 1.5);
    const m0 = Math.hypot(mx, mz), turn = angDiff(Math.atan2(mx, mz) + b.wob, b.mvYaw);
    b.mvYaw += Math.sign(turn) * Math.min(Math.abs(turn), TURN_WALK * dt);
    mx = Math.sin(b.mvYaw) * m0; mz = Math.cos(b.mvYaw) * m0;
  } else if (Math.hypot(mx, mz) > .05) b.mvYaw = Math.atan2(mx, mz);
  if (b.leap) { if (!b.vy || (b.leap.t -= dt) <= 0) b.leap = null; else { mx = b.leap.x; mz = b.leap.z; } } // mid-jump over a gap
  const ml = Math.hypot(mx, mz), spd = b.leap?.s ?? BOT.speed * (mobMul(W) + b.rec.fx.spd) * slowMul(b);
  const tx = ml > .05 ? mx / ml * spd : 0, tz = ml > .05 ? mz / ml * spd : 0;
  if (b.leap) { b.mvx = tx; b.mvz = tz; } // a jump keeps its line
  else { const e = 1 - Math.exp(-MOVE_EASE * dt); b.mvx += (tx - b.mvx) * e; b.mvz += (tz - b.mvz) * e; } // eases into a new direction like a player
  const mv = Math.hypot(b.mvx, b.mvz);
  if (mv > .05) {
    mx = b.mvx * dt; mz = b.mvz * dt;
    const ox = pos.x, oz = pos.z, grounded = !b.vy; let bump = false;
    const walk = b.leap ? (x, z) => walkTo(pos, x, z, b.r, false) : (x, z) => walkDry(pos, x, z, b.r, grounded, into);
    if (!walk(pos.x + mx, pos.z)) bump = true;
    if (!walk(pos.x, pos.z + mz)) bump = true;
    const lp = bump && grounded && MAP.leap?.(pos, mx, mz); // a gap you can jump
    if (lp) { b.vy = 9; b.leap = { x: lp.x, z: lp.z, s: lp.s, t: 1.2 }; }
    if (bump && sees) b.strafe = -b.strafe;
    if (dt > 0) { b.vx = (pos.x - ox) / dt; b.vz = (pos.z - oz) / dt; }
    if (mv > spd * .6 && Math.hypot(pos.x - ox, pos.z - oz) < BOT.speed * dt * .3 && b.detour <= 0) { // not while still speeding up
      b.detour = .5 + Math.random() * .4; b.detourDir = Math.random() < .5 ? -1 : 1;
      if (!b.vy && Math.random() < .4) b.jumpT = 0; // stuck: try a hop
    }
    // hop now and then like a player
    if (!b.vy && !(sniper && b.aimT > 0) && (b.jumpT -= dt) <= 0) { b.jumpT = sees ? S.jumpF[0] + Math.random() * S.jumpF[1] : Math.random() < S.chain ? .5 + Math.random() * .4 : S.jumpR[0] + Math.random() * S.jumpR[1]; b.vy = 9 * Math.sqrt(1 + (b.rec.fx.jump ?? 0)); b.dj = b.rec.fx.air && Math.random() < .6 ? b.rec.fx.air : 0; }
    // Raider Boots jump again in the air (twice with the set)
    if (b.dj > 0 && b.vy && b.vy > -2 && b.vy < 2) { b.dj--; b.vy = 9 * Math.sqrt(1 + (b.rec.fx.jump ?? 0)); sfx('djump', { at: pos, far: 20, v: .7 }); burst(tmp.set(pos.x, pos.y + .1, pos.z), 0xe8eef2, 5); }
    b.t += dt * BOT.speed * 2.2;
    b.pivL.rotation.x = Math.sin(b.t) * .6; b.pivR.rotation.x = -Math.sin(b.t) * .6;
    const ph = Math.sin(b.t) > 0; // footsteps
    if (ph !== b.stepPh) { b.stepPh = ph; if (!b.vy) sfx('step_' + FOOT_OK(surfaceAt(pos.x, pos.z, b.r, pos.y)) + (ph ? '' : '2'), { at: pos, far: 22, v: .8 }); }
  } else { b.pivL.rotation.x *= .8; b.pivR.rotation.x *= .8; b.vx = b.vz = b.mvx = b.mvz = 0; }
  const air = b.vy < -6;
  settle(b, dt);
  if (inWater(pos.x, pos.z, pos.y)) { drownZombie(b); return; }
  if (air && !b.vy) sfx('land_' + FOOT_OK(surfaceAt(pos.x, pos.z, b.r, pos.y)), { at: pos, far: 22, v: .7 });

  for (const p of pads) {
    if (!p.item || Math.hypot(pos.x - p.x, pos.z - p.z) >= 1 || pos.y >= p.y + 1.5) continue;
    if (!(p.type === 'health' && b.hp < b.maxHp || p.type === 'armor' && b.armor < b.maxArmor)) continue;
    if (net.on) { net.pick(p, b); break; } // online the server hands it over
    if (p.type === 'health') b.hp = Math.min(b.maxHp, b.hp + HEAL_PICK);
    else b.armor = Math.min(b.maxArmor, b.armor + ARMOR_PICK);
    sfx(p.type === 'health' ? 'pickHealth' : 'pickArmor', { at: pos, far: 25, v: .7 });
    clearPad(p); p.t = RESPAWN + Math.random() * 10;
    break;
  }

  b.flash -= dt;
  const e = b.flash > 0 ? 0x880000 : b.burn > 0 ? (Math.sin(performance.now() * .03) > 0 ? 0x993300 : 0x441100) : b.slowT > 0 ? (Math.sin(performance.now() * .05) > 0 ? 0x1a4a66 : 0x0a1a2a) : 0;
  b.mats.forEach(m => m.emissive.setHex(e));
}

// while you're dead: count down, then respawn
function dmDown(dt) {
  if (respawnT <= 0) return false;
  respawnT -= dt;
  if (net.on) respawnT = Math.max(respawnT, .01); // online the server respawns you
  if (respawnT <= 0) { respawnYou(); return false; }
  adsT = 0; if (camera.fov !== fovBase) { camera.fov = fovBase; camera.updateProjectionMatrix(); }
  $('scope').style.display = $('holo').style.display = 'none'; $('cross').style.display = 'none'; vm.visible = false;
  // float up like an angel (or sink if you drowned)
  const t = YOU_RESPAWN - respawnT, f = Math.min(1, t / 1.2);
  if (P.drowned) { camera.position.set(P.pos.x, P.pos.y + .35, P.pos.z); camera.rotation.set(P.pitch, P.yaw, .4); }
  else if (killCam) {
    // watch the bot that killed you
    const k = killCam, b = k.b;
    if (!b.dead && b.rec.b === b) k.at.copy(b.g.position);
    camera.position.set(P.pos.x, P.pos.y + 1.6 + f * f * .3 + Math.min(t, 1) * .6, P.pos.z);
    const dx = k.at.x - camera.position.x, dz = k.at.z - camera.position.z, dy = k.at.y + 1.4 - camera.position.y;
    const wantYaw = Math.atan2(-dx, -dz), wantPitch = Math.max(-1.2, Math.min(1.2, Math.atan2(dy, Math.hypot(dx, dz))));
    const e = 1 - Math.exp(-dt * 6);
    k.yaw += Math.atan2(Math.sin(wantYaw - k.yaw), Math.cos(wantYaw - k.yaw)) * e; k.pitch += (wantPitch - k.pitch) * e;
    camera.rotation.set(k.pitch, k.yaw, 0);
  }
  else { camera.position.set(P.pos.x, P.pos.y + 1.6 + f * f * .5 + Math.min(t, 1.5) * 1.2, P.pos.z); camera.rotation.set(P.pitch + (-.9 - P.pitch) * f, P.yaw, 0); }
  const b = $('banner'); b.textContent = net.on && net.banner ? net.banner : `${killedBy ? 'KILLED BY ' + killedBy : 'YOU DIED'}\n${Math.ceil(respawnT)}`; b.style.opacity = 1;
  return true;
}
let lastTop = '', lastBoard = '', lastSec = 0;
function updateDM(dt) {
  if (matchOver) return; // don't pay out twice
  if (net.on) { net.matchTick(dt); return; } // online the server runs the match
  while (joins.length && MATCH_T - matchT >= joins[0].at) joinBot(joins.shift());
  chatTick(dt); burnTick(dt);
  for (const r of recs) if (!r.you && (!r.b || r.b.dead) && (r.wait -= dt) <= 0) makeBot(r);
  matchT -= dt;
  const sec = Math.max(0, Math.ceil(matchT));
  if (sec <= 10 && sec !== lastSec && sec > 0) sfx('tick');
  lastSec = sec;
  const place = ranked().indexOf(youRec) + 1, clock = `<div class="clock${sec <= 10 ? ' low' : ''}">${sec / 60 | 0}:${String(sec % 60).padStart(2, '0')}</div>`;
  const top = clock + (MR.team
    ? `<div class="teams"><b style="color:${TEAMS[0].css}">${TEAMS[0].name} ${teamKills(0)}</b>–<b style="color:${TEAMS[1].css}">${teamKills(1)} ${TEAMS[1].name}</b></div><div class="place">YOU: ${youRec.kills} KILLS</div>`
    : `<div class="place">${ord(place)} OF ${recs.length}  ·  ${MR.kills ? '' : youRec.score + ' PTS  ·  '}${youRec.kills} KILLS</div>`);
  if (top !== lastTop) { $('top').innerHTML = lastTop = top; }
  const show = held('board');
  $('board').style.display = show ? 'grid' : 'none';
  if (show) { const h = boardHTML(); if (h !== lastBoard) $('board').innerHTML = lastBoard = h; }
  if (matchT <= 0) endMatch();
}
// match results (online they come from the server)
function endMatch(results) {
  matchOver = true; closeChat(); closeArmory(); $('board').style.display = 'none'; $('banner').style.opacity = 0;
  const place = results ? results.place : ranked().indexOf(youRec) + 1, lead = results ? results.lead : teamLead();
  $('postSub').textContent = MR.name + ' OVER';
  $('postPlace').textContent = MR.team ? (lead > 0 ? 'VICTORY!' : lead < 0 ? 'DEFEAT' : 'DRAW') : place === 1 ? '1ST PLACE!' : ord(place) + ' PLACE';
  $('postBoard').innerHTML = boardHTML();
  const won = results ? results.won : MR.team ? lead > 0 : place === 1;
  const key = !!results && !results.priv && place === 1; // keys come from public online wins
  if (key) prof.keys = (prof.keys | 0) + 1;
  const [xp, gold] = boostPay(...(results ? [results.xp, results.gold] : MR.team ? teamReward(lead) : rewardFor(place))), { ups, bonus, boostUp } = grant(xp, gold); // doubled with a booster
  $('rewards').innerHTML = rewardRow([xpTile(xp), coinTile(gold), key && [ico('key'), 'KEY', '+1', 'tk'], boostTile()])
    + (!results && place === 1 ? `<div class="rl">Win online to earn chest keys ${ico('key')}</div>` : '')
    + (results?.priv ? '<div class="rl">Private match: pay for taking part. Public matches pay for placing</div>' : '')
    + (ups ? `<div class="lvup"><span>LEVEL UP! LVL ${prof.lv}</span><span>+${bonus} ${COIN}</span><span>+${boostUp} ${ico('bolt')}</span></div>` : `<div class="rl">LVL ${prof.lv} · ${xpText()}</div>`) + xpBar();
  $('post').style.display = 'flex';
  sfx(won ? 'win' : 'lose'); musicEnd();
  setTimeout(cgMidgame, 1500); // CrazyGames midgame ad
  if (ups) setTimeout(() => sfx('levelUp'), 700);
  document.exitPointerLock();
}
$('againBtn').addEventListener('click', () => { if (net.on) { net.again(); return; } restart(); lockMouse(); });
$('postLobby').addEventListener('click', () => { net.leave(); restart(); showLobby(true); });

// a gun from your account, at your chosen stars
function giveGun(g) {
  lvl[g] = Math.max(0, Math.min(2, gunUse(g) - 1)); applyLvl(g);
  owned[g] = true; ammo[g] = WEAPONS[g].mag; reserve[g] = resMax(g);
}
// set up the mode you picked
function setupMode() {
  matchOver = false; respawnT = 0; lastTop = lastBoard = ''; killedBy = ''; youHelpers.clear(); killCam = null;
  MR = RULES[mode] || RULES.dm; MATCH_T = MR.t; YOU_RESPAWN = MR.you; JOIN_T = MR.join;
  BOT_COUNT = net.on ? 0 : MR.players[MAP.size] - 1;
  $('post').style.display = 'none'; $('board').style.display = 'none'; $('banner').style.opacity = 0; // clears "KILLED BY"
  $('feed').innerHTML = ''; $('top').innerHTML = ''; resetChat();
  $('chat').style.display = pvp() ? '' : 'none';
  if (pvp()) {
    if (net.on) { net.roster(); joins = []; } else makeRecs(); // online the roster is the room's players
    matchT = MATCH_T; wearArmor();
    BASE.forEach((w, g) => { if (hasGun(g)) giveGun(g); });
    CATS.forEach(([c], s) => slotGun[s] = loadoutGun(c));
    cur = slotGun[0]; buildGun(); renderHotbar();
  } else { // zombie waves: bring your loadout and armor
    wearArmor();
    CATS.forEach(([c], s) => { const g = loadoutGun(c); giveGun(g); slotGun[s] = g; });
    cur = slotGun[0]; buildGun(); renderHotbar();
  }
  musicMatch(mapId, pvp() ? 'dm' : mode); // bot matches use the deathmatch music
}
