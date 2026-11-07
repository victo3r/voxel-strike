// The match starts with you + 1 bot, and the rest join over the first minute until the map's lobby is full.
// Bots live in the zombies list (type 'bot'), so your bullets, knife, fire and rockets already hurt them.
// dmgMul = bot guns do this much of their normal damage (to you and to other bots).
// Bots have your stats (speed, damage, reload). What keeps them beatable is how well they play: SKILLS below.
const BOT = { hp: 100, speed: 6, dmgMul: 1, respawn: 1.5 };
// ---- skill levels. Every bot has the same stats; what differs is how well it plays. Each gets a level for the match (rollSkills):
// 2 is the ordinary bot, 4 the rare one that never stops moving and rarely misses, 0 the one still finding the keys.
// react = how long it has to see its target before it shoots. turn = how fast its aim closes on what it's looking at (higher = snappier;
//   big turns are capped by botLook's turn speed). Its aim trails what it wants to look at by 1 / turn seconds, so someone moving
//   across it, or its own strafing and hopping, pulls its shots behind: lead and self are how much of each it makes up for
//   (0 = none, 1 = all of it). aimErr = random wobble on each shot, in radians. moveErr = extra wobble when the target is running
//   (at full speed), so strafing really does make it miss more.
// spd = how fast its head turns (times botLook's speeds), flick = how many of its turns are quick flicks.
// stand = how often a strafe is "stand still", strafeT = how long each one lasts [least, spread] in seconds. plant = it stops to shoot
//   instead of working the range. jumpF / jumpR = seconds between hops fighting / just running [least, spread], chain = how often
//   a running hop is followed straight away by another. gaze = seconds between looks about [least, spread].
// rest = with nobody about it stops every [least, spread] seconds for [least, spread] seconds. idle = it's the kind to stand
//   looking at the ground now and then.
// Measured (test/measure-bots.mjs ladder: one bot with an AR on the yard), levels 0 to 4 land about 12, 19, 26, 51 and 77% of their
// bullets on a player who moves like most people do, and 13, 20, 25, 49 and 75% on one who never stops dodging. The single level
// before this landed 28 and 26%. Retune with that script: the numbers move together, so check the whole ladder
const SKILLS = [
  { react: .8,  turn: 5.2, lead: .2,  self: 0,   aimErr: .06,  moveErr: .08,  spd: .75,  flick: .1,  stand: .7,  strafeT: [1.2, 1.8], plant: true,  jumpF: [6, 8],     jumpR: [10, 15], chain: 0,   gaze: [1.5, 3],  rest: [5, 6, 1, 1.5],   idle: true },
  { react: .62, turn: 6,   lead: .28, self: 0,   aimErr: .05,  moveErr: .07,  spd: .9,   flick: .2,  stand: .4,  strafeT: [.7, 1.4],  plant: false, jumpF: [3, 5],     jumpR: [6, 10],  chain: .15, gaze: [1, 2.8],  rest: [10, 10, .8, 1], idle: true },
  { react: .48, turn: 7.7, lead: .36, self: 0,   aimErr: .028, moveErr: .05,  spd: 1,    flick: .3,  stand: .15, strafeT: [.4, 1.1],  plant: false, jumpF: [1.5, 3.5], jumpR: [4, 8],   chain: .3,  gaze: [.8, 2.4], rest: null,             idle: true },
  { react: .36, turn: 9.5, lead: .6,  self: .42, aimErr: .022, moveErr: .035, spd: 1.15, flick: .45, stand: .08, strafeT: [.35, .9],  plant: false, jumpF: [1.1, 2.4], jumpR: [2.5, 5], chain: .4,  gaze: [.6, 1.8], rest: null,             idle: true },
  { react: .26, turn: 11,  lead: 1,   self: 1,   aimErr: .012, moveErr: .018, spd: 1.35, flick: .6,  stand: 0,   strafeT: [.25, .6],  plant: false, jumpF: [.6, 1.1],  jumpR: [1, 2.2], chain: .5,  gaze: [.35, .9], rest: null,             idle: false },
];
const SKILL_MID = 2, skillOf = b => SKILLS[b.rec.skill ?? SKILL_MID] ?? SKILLS[SKILL_MID];
// the levels for a lobby of n bots: one 4 in CRACKED_P of games (never two), up to two 0s (at least one more often than not), now and
// then a 3 and one or two 1s, the rest 2s, and always at least one 2 in a lobby of three or more. In a random order, so the best
// one isn't always the first in
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
// target focus: a bot sticks with the enemy it's fighting. It only gives up after losing sight of it for LOSE_T seconds,
// and only turns on someone else who's shooting it once they've done SWITCH_DMG damage within a couple of seconds.
const LOSE_T = 2.5, SWITCH_DMG = 40;
const SNIPE_T = .9; // a sniper bot lines up its shot this long before it fires
// health pads: a hurt bot that can't see its target walks to a stocked health pad within PAD_NEAR,
// or within PAD_FAR once it's down to PAD_LOW HP. It also grabs any health pad it walks over while hurt.
// Bots skip ammo pads (they never run out of spare ammo). Armor pads show up once you wear armor (js/armor.js), and bots
// roll their own armor (never better than yours), so a bot with a dented armor bar grabs any armor pad it walks over.
const PAD_LOW = 60, PAD_NEAR = 8, PAD_FAR = 30;
// the rules for each match mode. t = match length (s), you = your respawn wait (s), bot = a bot's respawn wait after its angel
// floats away (s), join = the other bots have all joined by this time (s), kills = ranked on kills only (no points),
// team = blue vs red, players = most players (you included) on a small / medium / large map
const RULES = {
  dm:        { name: 'DEATHMATCH', t: 240, you: 3, bot: 1.5, join: 60, kills: false, team: false, players: { small: 4, medium: 6, large: 8 } },
  team:      { name: 'TEAM FIGHT', t: 240, you: 3, bot: 1.5, join: 60, kills: true,  team: true,  players: { small: 4, medium: 6, large: 8 } },
  blitz:     { name: 'BLITZ',      t: 90,  you: 1.5, bot: .5, join: 20, kills: true,  team: false, players: { small: 4, medium: 6, large: 8 } },
  blitzTeam: { name: 'TEAM BLITZ', t: 90,  you: 1.5, bot: .5, join: 20, kills: true,  team: true,  players: { small: 4, medium: 6, large: 6 } },
};
const DIE_T = 1.5; // how long a body stays (the angel floating up and fading)
let MR = RULES.dm, MATCH_T = 240, YOU_RESPAWN = 3, JOIN_T = 60; // set from RULES in setupMode
let BOT_COUNT = 3; // fill the lobby: players for this mode and map size, minus you (set in setupMode)
// teams: 0 = blue (yours), 1 = red. The bots are dealt out red, blue, red, blue... so a full lobby splits evenly
const TEAMS = [
  { name: 'BLUE', css: '#6aa8ff', shirts: [[40, 90, 190], [30, 70, 160], [60, 110, 210], [35, 100, 175]] },
  { name: 'RED', css: '#ff6a6a', shirts: [[185, 40, 40], [160, 30, 35], [205, 60, 50], [175, 45, 30]] },
];
const teamOf = t => t === YOU_T || t?.you ? 0 : t?.rec ? t.rec.team : t?.team;
// a and c are on the same team (so they can't hurt each other). Bots, you (YOU_T or null = you) or records
function friendly(a, c) { a ??= YOU_T; c ??= YOU_T; return teamMode() && a !== c && teamOf(a) === teamOf(c); }
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
// blitz is under half as long, so it pays about half
const BLITZ_REWARDS = {
  small:  [[15, 3], [8, 1]],
  medium: [[20, 4], [15, 3], [15, 3], [8, 1]],
  large:  [[20, 4], [15, 3], [15, 3], [8, 1]],
};
const rewardTable = () => (mode === 'blitz' || mode === 'blitzTeam' ? BLITZ_REWARDS : REWARDS)[MAP.size];
const rewardFor = place => { const t = rewardTable(); return t[Math.min(place, t.length) - 1]; };
// team modes: the winning team gets 1st place pay, a draw gets 2nd place pay, the losing team gets the bottom pay
const teamReward = res => { const t = rewardTable(); return res > 0 ? t[0] : res === 0 ? t[1] : t[t.length - 1]; };
// every bot gets a full loadout when it joins, one gun per category, and keeps it for the whole match (respawns too).
// BOT_PICKS = what it can roll for each category (a name listed twice is twice as likely)
// Its stars on each gun and its armor are rolled too, anywhere from none up to what you're using, never more
const BOT_PICKS = {
  primary: ['shotgun', 'ar', 'ar', 'thrasher', 'eradicator'],
  backup: ['voxel', 'voxel', 'hitman'],
  melee: ['knife'],
  special: ['flame', 'heatray'],
  sniper: ['sniper', 'sniper', 'semisniper'],
  premium: ['flare', 'flare', 'rocket'],
};
// the distance a bot tries to keep from its target with each gun [closest, furthest]
const BOT_KEEP = {
  voxel: [5, 12], hitman: [6, 16], shotgun: [2.5, 6], ar: [8, 16], thrasher: [9, 18], eradicator: [6, 12], sniper: [16, 32], semisniper: [14, 28],
  knife: [.9, 1.6], flame: [2, 5], heatray: [6, 18], rocket: [9, 18], flare: [7, 16],
};
// how good each gun is at a distance (higher = better). A bot holds whichever of its guns scores best,
// times its own taste for that gun, so two bots in the same spot can pick different guns
const GUN_FIT = {
  knife: d => d < 2.2 ? 1.25 : d < 4 ? .35 : 0,
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
  flare: d => d < 3 ? .1 : d < 20 ? .6 : .35,
};
const HUNT_D = 8; // while it can't see anyone it holds what it'd want if someone came round a corner this far away
const pickOf = list => list[Math.random() * list.length | 0];
// taste: a little random per gun, plus one category it really likes (so you get snipers, rushers, rocket spammers...). load = gun indexes
function tasteFor(load) {
  const fav = pickOf(['primary', 'primary', 'sniper', 'melee', 'special', 'premium']), taste = {};
  for (const g of load) taste[BASE[g].id] = (.85 + Math.random() * .3) * (BASE[g].cat === fav ? 1.3 : 1);
  return taste;
}
// online the host makes the room's bots (js/net.js fill): their gear in the form the server takes, rolled like botLoadout's
function botGearNet() {
  const load = CATS.map(([c]) => pickOf(BOT_PICKS[c])), stars = {};
  for (const id of load) { const top = Math.max(0, gunUse(gi(id)) - 1); stars[id] = Math.random() * (top + 1) | 0; }
  return { armor: botArmor(), boots: botBoots(), hat: botHat(), stars, load };
}
function botLoadout() {
  const load = CATS.map(([c]) => gi(pickOf(BOT_PICKS[c]))), taste = tasteFor(load);
  // stars: any number up to the ones you take into a match on that gun (none on guns you don't have, starters have none).
  // W = its stats with those stars
  const stars = {}, W = {};
  for (const g of load) { const top = Math.max(0, gunUse(g) - 1); stars[g] = Math.random() * (top + 1) | 0; W[g] = statsAt(g, stars[g]); }
  // boots and a hat, rolled the same way. fx = what they do together (js/hats.js gearFx): speed, damage, damage cut, double jump,
  // headshot block, half-damage hits and stealth
  const boots = botBoots(), hat = botHat();
  return { load, taste, stars, W, armor: botArmor(), boots, hat, fx: gearFx(boots, hat) };
}

const BOT_U = 1.85 / 33; // one skin pixel on a bot: 33 pixels tall (with the neck) = 1.85, same height as you
const BOT_LOOKS = [ // shirt color, name color (used on the tag, leaderboard and kill feed). The rest of the look comes from the name
  { shirt: [185, 40, 40], css: '#ff6a6a' },
  { shirt: [205, 120, 30], css: '#ffa94a' },
  { shirt: [120, 55, 175], css: '#c08aff' },
  { shirt: [40, 130, 60], css: '#6fdc7f' },
  { shirt: [40, 90, 190], css: '#6aa8ff' },
  { shirt: [30, 150, 150], css: '#5fe0d8' },
  { shirt: [200, 190, 50], css: '#f0e45a' },
];
const TAG_FONT = 'bold 13px monospace';
function tagMat(name, css) { // name tag floating over its head, as wide as the name needs. Returns { mat, w } (w in world units)
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = TAG_FONT; c.width = Math.ceil(g.measureText(name).width) + 6; c.height = 16;
  g.font = TAG_FONT; g.textAlign = 'center'; // resizing the canvas resets the font
  g.fillStyle = '#000'; g.fillText(name, c.width / 2 + 1, 13); g.fillStyle = css; g.fillText(name, c.width / 2, 12);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return { mat: new THREE.SpriteMaterial({ map: t, transparent: true }), w: c.width / 64 }; // 64 canvas px = 1 block
}

const YOU_T = { you: true }; // stands in for you whenever a bot is picking or tracking a target
let recs = [], youRec = null, matchT = 0, killedBy = '', joins = [];
const youHelpers = new Set(); // the bots that hurt you this life (assists)
// killCam = while you're dead, the bot that killed you: the camera turns to watch it (dmDown)
let killCam = null;
const ASSIST_PTS = 15;
function makeRecs() {
  youRec = { name: myName, you: true, team: 0, css: '#8ff0b6', score: 0, kills: 0, deaths: 0, streak: 0 };
  recs = [youRec]; joins = [];
  // bot 1 is there from the start with a NATO-alphabet name and never chats.
  // The others join spread across the first minute, a little randomly, with real-looking names (js/names.js).
  const next = nameMaker([myName]), skills = rollSkills(BOT_COUNT);
  for (let i = 0; i < BOT_COUNT; i++) {
    const at = i === 0 ? 0 : Math.min(JOIN_T - 2, Math.max(JOIN_T / 12,JOIN_T * i / BOT_COUNT + (Math.random() - .5) * JOIN_T / 6));
    const nm = i === 0 ? { name: defaultBotName(myName), lang: 'en', quiet: true } : next();
    joins.push({ i, at, skill: skills[i], ...nm });
  }
  joins.sort((a, b) => a.at - b.at);
}
function joinBot(j) {
  // team modes: shirt and name in the team's color. Your teammates' name tags show through walls so you can find them
  const team = teamMode() ? (j.i % 2 ? 0 : 1) : undefined, T = TEAMS[team];
  const look = T ? { shirt: T.shirts[(j.i >> 1) % T.shirts.length], css: T.css } : BOT_LOOKS[j.i % BOT_LOOKS.length], tag = tagMat(j.name, look.css);
  if (team === 0) { tag.mat.depthTest = false; tag.mat.opacity = .85; }
  const [sr, sg, sb] = look.shirt;
  const r = { name: j.name, lang: j.lang, quiet: !!j.quiet, team, css: look.css, look: randomLook(j.name, sr << 16 | sg << 8 | sb), tag: tag.mat, tagW: tag.w,
    score: 0, kills: 0, deaths: 0, streak: 0, b: null, wait: .5, skill: j.skill ?? SKILL_MID, ...botLoadout() };
  recs.push(r);
  if (MATCH_T - matchT > 1) { feed(`${nameTag(r)} joined`); sfx('join'); } // no message for the one that starts with you
}
const ranked = () => [...recs].sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH');
const nameTag = r => `<b style="color:${r.css}">${r.name}</b>`;
const teamKills = t => recs.reduce((s, r) => s + (r.team === t ? r.kills : 0), 0);
// 1 = your team is ahead, 0 = level, -1 = behind
const teamLead = () => Math.sign(teamKills(0) - teamKills(1));
function boardHTML() {
  // kill-only modes drop the score column (score = kills there)
  const cols = MR.kills ? ['KILLS', 'DEATHS'] : ['SCORE', 'KILLS', 'DEATHS'], cls = MR.kills ? 'lb k' : 'lb';
  const head = `<div class="r h"><span>#</span><span>PLAYER</span>${cols.map(c => `<span>${c}</span>`).join('')}</div>`;
  const row = (r, i) => `<div class="r${r.you ? ' you' : ''}"><span>${i + 1}</span><span style="color:${r.css}"${r.fid || (r.you && net.on && myId()) ? ` data-fid="${r.fid || myId()}"` : ''}>${r.name}</span>${MR.kills ? '' : `<span>${r.score}</span>`}<span>${r.kills}</span><span>${r.deaths}</span></div>`; // data-fid: a signed-in player online, the results screen adds a + ADD (js/friends.js)
  $('board').className = $('postBoard').className = cls;
  if (!MR.team) return head + ranked().map(row).join('');
  // team modes: a header per team with its kill total, then its players. Your team first
  return head + [0, 1].map(t => `<div class="r tm" style="color:${TEAMS[t].css}"><span></span><span>${TEAMS[t].name} TEAM</span><span>${teamKills(t)}</span>${MR.kills ? '<span></span>' : '<span></span><span></span>'}</div>`
    + ranked().filter(r => r.team === t).map(row).join('')).join('');
}
function feed(html) {
  const d = document.createElement('div'); d.className = 'kf'; d.innerHTML = html; $('feed').append(d);
  while ($('feed').children.length > 5) $('feed').firstChild.remove();
  setTimeout(() => d.remove(), 5000);
}
// someone died. killer = a record, or null if nobody gets credit (your own rocket)
// helpers = everyone who hurt the victim this life: each one that isn't the killer gets an assist (+15, points modes only)
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
    // kill-only modes: a kill is a kill, headshots and streaks only get announced
    const pts = MR.kills ? 1 : KILL_PTS + (head ? HEAD_PTS : 0) + (st ? st[0] : killer.streak > STREAK_PTS_AFTER ? STREAK_PTS : 0);
    killer.score += pts;
    if (killer.you) {
      toast(`${MR.kills ? '+1 KILL' : '+' + pts}${head ? ' HEADSHOT' : ''}${st ? ' · ' + st[1] : ''}`, '#ffd23f');
      sfx(head || st ? 'killSpecial' : 'kill'); // any streak or headshot gets the special one
    }
  }
  feed(killer && killer !== victim ? `${nameTag(killer)} ${head ? ico('head') : ico('skull')} ${nameTag(victim)}` : `${nameTag(victim)} ${ico('skull')}`);
  const st = killer && killer !== victim && STREAKS[killer.streak];
  if (st) feed(`${nameTag(killer)} <b style="color:#ffd23f">${st[1]}!</b>`);
}

// spawning: somewhere open, as far from everyone else as it can find (in team modes, as far from the other team as it can).
// who = YOU_T or the bot's record
// the n best of 60 random free spots, farthest from whoever would shoot `who` first, at least 4 blocks apart
// (online the server takes one of them, the farthest from where it has the enemies: js/net.js tryReady)
function spawnSpots(who, n = 1) {
  const others = [];
  if (who !== YOU_T && respawnT <= 0 && !friendly(who, YOU_T)) others.push(P.pos);
  for (const z of zombies) if (z.rec !== who && !z.dead && !friendly(who, z)) others.push(z.g.position);
  const found = [];
  for (let tries = 0; tries < 60; tries++) {
    const x = (Math.random() * 2 - 1) * (A - 2), z = (Math.random() * 2 - 1) * (A - 2);
    if (blocked(x, z, .45, 0) || MAP.land && !MAP.land(x, z) || overWater(x, z, 0) || poolAt(x, z)) continue; // not in the sea or the pool
    const d = others.length ? Math.min(...others.map(o => Math.hypot(x - o.x, z - o.z))) : 99;
    found.push([d, x, z]);
  }
  found.sort((a, b) => b[0] - a[0]);
  const out = [];
  for (const [, x, z] of found) { if (out.every(([ox, oz]) => Math.hypot(x - ox, z - oz) >= 4)) out.push([x, z]); if (out.length >= n) break; }
  return out.length ? out : [[0, 0]];
}
function spawnSpot(who) { return spawnSpots(who)[0]; }
const FLASH_MAT = new THREE.MeshBasicMaterial({ color: 0xffdd55 });
const ARM_DOWN = new THREE.Vector3(0, -1, 0), _hv = new THREE.Vector3();
// put gun b.gun in the bot's hands: the same model you see in your own hands, turned to point forward out of its hands
function holdGun(b) {
  const u = BOT_U;
  if (b.gunM) { b.aim.remove(b.gunM); b.gunM.traverse(o => { if (o.geometry && o !== b.flashM && !o.userData.shared) o.geometry.dispose(); }); }
  const gunM = new THREE.Group(), { muzzle: [my, mz], spin, round, mag } = makeGun(b.gun, gunM, b.rec.stars[b.gun]); // its upgrade bands, like yours
  // held the way its hold says (js/hold.js): the gun and both arms come from the solved pose, which is in character pixels
  // from its feet. The aim group pivots at shoulder height. A one-handed weapon leaves the left arm hanging a little forward
  const h = holdFor(b.gun);
  gunM.position.set(h.T[0] * u, (h.T[1] - 22) * u, h.T[2] * u); gunM.quaternion.fromArray(h.q);
  b.armR.quaternion.setFromUnitVectors(ARM_DOWN, _hv.fromArray(h.dR));
  b.armL.quaternion.setFromUnitVectors(ARM_DOWN, h.dL ? _hv.fromArray(h.dL) : _hv.set(.08, -.95, .3).normalize());
  b.holdTurn = h.turn; // the body turns this far right so the gun still points where it aims (a sideways stance)
  b.round = round;
  b.flashM ??= box(.14, .14, .14, FLASH_MAT);
  b.flashM.position.set(0, my, mz - .04); b.flashM.visible = false;
  gunM.add(b.flashM); b.aim.add(gunM);
  b.gunM = gunM; b.spin = spin; b.spinV = 0;
  // what a reload moves from (holdReload): the gun's place, its loose part, both arms, and where each fist sits on the gun
  // (in the gun's own space, so the hands stay on it as it turns)
  b.mag = mag; b.rl = { rk: -1, on: false, p: gunM.position.clone(), q: gunM.quaternion.clone(), qR: b.armR.quaternion.clone(), qL: b.armL.quaternion.clone(), magAt: mag && mag.position.clone(), oneHand: !h.dL };
  gunM.updateMatrix(); const inv = gunM.matrix.clone().invert(), fist = (a, d) => a.position.clone().addScaledVector(_hv.fromArray(d), ARM_LEN * u).applyMatrix4(inv);
  b.rl.fR = fist(b.armR, h.dR); b.rl.fL = h.dL ? fist(b.armL, h.dL) : null;
}
// a bot's or another player's knife swing (b.stab = seconds of it left): the arms and knife come up from the shoulders,
// chop down and come back
function knifeChop(b) { const s = b.stab > 0 ? swingAt(1 - b.stab / KNIFE_SWING) : 0; b.aim.rotation.x += s * .9; b.aim.position.z = Math.max(0, s) * .12; }
// the reload on the gun in a bot's or another player's hands: the same moves as yours (weapons.js RELOAD_ANIM) on the gun they hold,
// its loose part coming out and the spent one falling away, their hands staying on the gun and the left one going to the part.
// left = seconds of reload to go (0 = not reloading), total = how long the whole reload takes
const _rlE = new THREE.Euler(), _rlQ = new THREE.Quaternion(), _rlV = new THREE.Vector3(), _rlM = new THREE.Vector3(), _rlF = new THREE.Vector3();
function holdReload(b, left, total) {
  const R = b.rl, g = b.gunM; if (!R || !g) return;
  const id = BASE[b.gun].id, k = left > 0 && total > 0 ? Math.max(0, 1 - left / total) : -1, ra = k >= 0 ? reloadPose(id, k) : null;
  reloadSwap(R, id, k, b.mag, scene);
  if (BASE[b.gun].flare && b.mag) b.mag.visible = b.ammo > 0 || k > .4; // the flare in the muzzle, like yours
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
  // the left hand: on the fore grip, going to the loose part as it comes out (or, one-handed, coming up to it from hanging)
  const toPart = R.oneHand ? ra.hand : Math.min(1, Math.max(0, -ra.ay / .3));
  if (!b.mag || (!R.fL && toPart <= 0)) { if (R.fL) aimAt(b.armL, _rlF.copy(R.fL).applyMatrix4(g.matrix)); else b.armL.quaternion.copy(R.qL); return; }
  _rlM.copy(partMid(b.mag)).add(b.mag.position).applyMatrix4(g.matrix);
  if (R.fL) _rlF.copy(R.fL).applyMatrix4(g.matrix).lerp(_rlM, toPart); else _rlF.copy(_rlM);
  if (R.fL || toPart > .01) aimAt(b.armL, _rlF);
  if (!R.fL) b.armL.quaternion.slerp(R.qL, 1 - toPart);
}
// the best gun in its loadout for fighting at distance d. An empty gun counts for a lot less (it would have to reload),
// and the one in its hands gets a small bonus so it doesn't flip back and forth (or between two empty guns)
function pickGun(b, d) {
  let best = b.gun, bestS = -1;
  for (const g of b.rec.load) {
    const w = BASE[g], left = g === b.gun ? b.ammo : b.mags[g];
    let s = GUN_FIT[w.id](d) * (b.rec.taste?.[w.id] ?? 1); // (another player's record has no tastes)
    if (!w.inf && left <= 0) s *= .35;
    if (g === b.gun) s *= 1.15;
    if (s > bestS) { bestS = s; best = g; }
  }
  return best;
}
function botEquip(b, g) {
  if (g === b.gun) return;
  b.mags[b.gun] = b.ammo; b.reload = 0; // switching away mid-reload throws the reload away, like yours
  b.gun = g; b.ammo = b.mags[g]; b.swap = drawT(BASE[g]); b.burst = 4 + (Math.random() * 6 | 0); b.aimT = 0;
  if (b.fireOn > 0) { b.fireOn = 0; sfx(b.fireEnd, { at: b.g.position, far: 50 }); }
  b.pickT = Math.max(b.pickT, 1.2 + Math.random() * .8); // sticks with it for a bit, unless it runs dry
  holdGun(b); sfx('equip', { at: b.g.position, far: 15, v: .7 });
  const W = b.rec.W[g];
  if (!W.inf && b.ammo <= 0) { b.reload = drawT(W) + W.reload; sfx('r_' + W.id, { at: b.g.position, far: 25, v: .8 }); } // picked up an empty one: reload it
}
// spot = where to put it ({x, z, yaw?}): online, where the server says. Otherwise it picks a spawn spot itself
function makeBot(rec, spot) {
  const [x, z] = spot ? [spot.x, spot.z] : spawnSpot(rec);
  const ch = buildChar(rec.look, BOT_U), g = ch.g, u = BOT_U, arm = armorOf(rec.armor);
  if (arm) dressArmor(ch, rec.armor, teamMode() ? TEAMS[rec.team].shirts[0] : null);
  dressBoots(ch, rec.boots); dressHat(ch, rec.hat);
  g.rotation.order = 'YXZ'; g.position.set(x, 0, z);
  // both arms forward holding the gun, swung up and down with the aim from the shoulders
  const aim = new THREE.Group(); aim.position.y = 22 * u; g.add(aim);
  for (const a of [ch.armR, ch.armL]) { aim.add(a); a.position.y = 0; }
  ch.headPiv.rotation.order = 'YXZ';
  const tag = new THREE.Sprite(rec.tag); tag.scale.set(rec.tagW, .25, 1); tag.position.y = 2.25;
  g.add(tag); scene.add(g);
  const yaw = spot?.yaw ?? Math.atan2(-x, -z);
  g.rotation.y = yaw;
  const mags = {}; for (const i of rec.load) mags[i] = rec.W[i].mag; // every gun full on respawn
  const b = { g, head: ch.head, headPiv: ch.headPiv, aim, armR: ch.armR, armL: ch.armL, holdTurn: 0, gunM: null, flashM: null, spin: null, spinV: 0, tag, pivL: ch.legL, pivR: ch.legR, parts: ch.parts, mats: ch.mats, rec, pid: rec.pid, remote: !!rec.remote,
    type: 'bot', hp: BOT.hp, maxHp: BOT.hp, armor: arm ? arm.hp : 0, maxArmor: arm ? arm.hp : 0, dr: arm ? arm.dr : 0, scale: 1, r: .3, coins: 0, t: 0, flash: 0, dead: 0, burn: 0,
    gun: rec.load[0], mags, refill: {}, ammo: mags[rec.load[0]], reload: 0, swap: 0, pickT: 0, stab: 0, fireOn: 0, fireEnd: 'flameEnd', leadGuess: .6 + Math.random() * .6, cd: .3, burst: 5, muzzle: 0, seeT: 0, aimT: 0, aimYaw: yaw, aimPitch: 0,
    strafe: 1, strafeT: 0, detour: 0, detourDir: 1, tgt: null, scanT: 0, lostT: 0, engaged: false, hitBy: null, hitByT: 0, hitDmg: 0, lpx: 0, lpz: 0, pvx: 0, pvz: 0, vy: 0, jumpT: 2 + Math.random() * 4 };
  if (!friendly(rec, YOU_T)) addOutline(b); // enemies glow red (before the gun goes in its hands, so the gun isn't outlined)
  b.gun = pickGun(b, HUNT_D); b.ammo = mags[b.gun]; // spawns holding whatever it likes best for running into someone
  holdGun(b);
  b.parts.forEach(p => p.userData.zombie = b);
  zombies.push(b); rec.b = b;
  return b;
}
// the look and sound of a bot dying: tag and muzzle off, its fire or beam cut, a death cry, and the angel (unless it drowned).
// nobody = it drowned (no cry). Online, net.js calls this when the server says someone died
function botDownFx(b, nobody = false) {
  b.hp = Math.min(b.hp, 0); b.dead ||= .0001; // (whatever killed it offline has set these already)
  b.tag.visible = false; b.flashM.visible = false;
  if (b.fireOn > 0) { b.fireOn = 0; sfx(b.fireEnd, { at: b.g.position, far: 50 }); }
  const bm = beams.get(b); if (bm) { scene.remove(bm.g); beams.delete(b); } // its heat ray beam goes with it
  if (!nobody) sfx('die', { at: b.g.position, far: 40 });
  if (!b.drowned) angel(b); // one that drowned just sinks
}
// a bot died (called from hurtZombie). by = the bot that killed it, or null if it was you. nobody = it drowned, no credit
function botDown(b, by, head, nobody = false) {
  botDownFx(b, nobody);
  b.rec.wait = MR.bot + DIE_T; // its angel floats away first
  scoreKill(nobody ? null : by ? by.rec : youRec, b.rec, head, b.helpers);
}
// dying: the bot turns into a see-through angel (white glow, halo, wings, arms out) that floats up and fades away.
// main.js moves it (angelTick) and takes it out after DIE_T
const haloGeo = new THREE.TorusGeometry(4 * BOT_U, .5 * BOT_U, 6, 16), wingGeo = new THREE.BoxGeometry(1, 1, 1);
function angel(b) {
  const u = BOT_U;
  if (b.gunM) b.gunM.visible = false;
  b.aim.rotation.x = 0; b.aim.position.z = 0; b.g.rotation.x = b.g.rotation.z = 0;
  b.aim.children.forEach(a => { if (a !== b.gunM) a.rotation.set(0, 0, 0); });
  b.pivR.rotation.set(0, 0, -LEG_SPREAD); b.pivL.rotation.set(0, 0, LEG_SPREAD); b.headPiv.rotation.set(-.25, 0, 0); // looking up
  for (const m of b.mats) { m.transparent = true; m.opacity = .6; m.depthWrite = false; m.emissive.setHex(0x8a8a8a); m.needsUpdate = true; }
  const glow = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false });
  const haloMat = glow(0xffe27a, .95), wingMat = glow(0xffffff, .7), extra = [];
  const halo = new THREE.Mesh(haloGeo, haloMat); halo.rotation.x = Math.PI / 2; halo.position.y = 35.5 * u;
  b.g.add(halo); extra.push(halo);
  // a wing on each side of its back: a long upper feather and a shorter one under it, tilted out and back
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
// called every frame for a dead bot with an angel. t = seconds since it died
function angelTick(b, t) {
  const a = b.angel, f = Math.min(1, t);
  b.g.position.y = a.y0 + f * f * .4 + t * 1.6; // eases off the ground, then drifts up
  a.wings.forEach((w, i) => w.rotation.y = (i ? 1 : -1) * (.5 + Math.sin(t * 14) * .35)); // flapping
  a.halo.rotation.z = t * 3;
  const o = Math.max(0, Math.min(1, (DIE_T - t) / (DIE_T - 1))); // fully there for a second, then fades out
  for (const m of b.mats) m.opacity = .6 * o;
  a.mats[0].opacity = .95 * o; a.mats[1].opacity = .7 * o;
}
function angelGone(b) { b.angel.mats.forEach(m => m.dispose()); b.angel = null; const bm = beams.get(b); if (bm) { scene.remove(bm.g); beams.delete(b); } }
// you're down: the respawn wait starts, the banner names who got you and the camera turns to watch them (dmDown). No scoring here.
// by = the bot (or online, the player) that got you, or nothing if it was your own rocket
function youDownFx(by) {
  respawnT = YOU_RESPAWN; killedBy = by ? by.rec.name : ''; P.burn = 0; P.hp = 0;
  killCam = by && !friendly(by, YOU_T) ? { b: by, at: by.g.position.clone(), yaw: P.yaw, pitch: P.pitch } : null;
}
// you died in deathmatch (called from hurtPlayer). by = the bot that got you, or nothing if it was your own rocket
function youDown(by) {
  youDownFx(by);
  scoreKill(by ? by.rec : null, youRec, false, youHelpers);
}
// x, z, yaw = where you come back (online: where the server put you). Otherwise it picks a spot
function respawnYou(x, z, yaw) {
  if (x == null) [x, z] = spawnSpot(YOU_T);
  Object.assign(P, { drowned: false, drownFlag: false, burn: 0, vy: 0, kx: 0, kz: 0, lx: 0, lz: 0, hp: P.max, armor: P.maxArmor, yaw: yaw ?? Math.atan2(x, z), pitch: 0, onRamp: false }); P.pos.set(x, groundAt(x, z, .35, 0), z); P.pos.lag = 0;
  WEAPONS.forEach((w, i) => { if (owned[i]) { ammo[i] = w.mag; if (!BASE[i].inf) reserve[i] = resMax(i); } });
  youHelpers.clear(); killCam = null;
  cancelReload(); recoilReset(); vm.visible = true; $('cross').style.display = ''; $('banner').style.opacity = 0;
}

const eye = new THREE.Vector3(), beamTo = new THREE.Vector3(), aimV = new THREE.Vector3(), dirV = new THREE.Vector3(), hitV = new THREE.Vector3(), losDir = new THREE.Vector3();
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
// ---- what a bot knows. It has eyes in the front of its head only: it notices someone who is in front of it (BOT_FOV across, and
// not far above or below where it's looking) with nothing in the way, or close enough to bump into, or who is shooting it. It hears
// gunfire and looks that way. The longer it has found nobody, the wider it looks (up to BOT_FOV_WIDE), so a match never stalls
const BOT_FOV = Math.PI / 2, BOT_FOV_WIDE = 3.4, WIDEN_AT = 14, WIDEN_T = 14, BOT_VFOV = .8, NEAR_SENSE = 2.5;
const HEAR = 38, HEAR_QUIET = 12; // how far a shot carries to a bot's ears (suppressed guns and the flamethrower: the short one)
const TURN_WALK = 3.2; // how fast its feet come round to a new direction when it's just going somewhere (radians a second)
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
// shots it can hear: the last few, each { x, z, who, quiet, at }. A gun firing on and on keeps updating its one entry
const heard = [];
function botHear(x, z, who, quiet) {
  const now = performance.now(), last = heard[heard.length - 1];
  if (last && last.who === who && now - last.at < 400) { last.x = x; last.z = z; last.at = now; last.quiet = !!quiet; return; }
  heard.push({ x, z, who, quiet: !!quiet, at: now }); if (heard.length > 8) heard.shift();
}
// pick who to fight. Once it has seen its target it stays on it until the target dies or has been out of sight for LOSE_T,
// unless someone else is hurting it badly (SWITCH_DMG). Otherwise: whoever is shooting it (if it can see them once it turns),
// else the closest one it notices. Nobody noticed: nobody (it wanders, see roamGoal)
function pickTarget(b) {
  const pos = b.g.position, enemies = enemiesOf(b);
  if (!enemies.length) return null;
  const d = t => Math.hypot(tPos(t).x - pos.x, tPos(t).z - pos.z);
  const shooter = b.hitBy && b.hitByT > 0 && b.hitBy !== b.tgt && tAlive(b.hitBy) && canSee(b.hitBy) ? b.hitBy : null;
  if (b.tgt && tAlive(b.tgt) && b.engaged && b.lostT < LOSE_T) {
    if (shooter && (b.hitDmg >= SWITCH_DMG || b.lostT > 0)) return shooter; // getting shot hard, or can't see its own target right now
    return b.tgt;
  }
  if (shooter) return shooter;
  return enemies.filter(t => inView(b, t) && canSee(t)).sort((a, c) => d(a) - d(c))[0] ?? null;
}
// where to wander next with nobody in sight: somewhere round an enemy (it has a feel for where the fight is, not for where they
// stand), usually the nearest one, or now and then just off somewhere. The longer it finds nobody, the closer it guesses
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
// its head: never turns faster than this turn's speed (most turns unhurried, some quick flicks), a little uneven, and eases in on
// what it's looking at (its level's turn). It picks a new speed each time what it wants to look at jumps
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
// what's going on in its head besides its target (set up the first time it thinks)
function botMind(b) {
  Object.assign(b, { noSeeT: 0, gazeT: 0, gazeYaw: 0, gazePitch: 0, alertT: 0, alertYaw: 0, idle: 0, idleNext: 20 + Math.random() * 70, roam: null,
    lk: { x: 0, y: 0, z: 0 }, mvYaw: b.aimYaw, wob: 0, wobWant: 0, wobT: 0, turnSpd: 0, lookWas: b.aimYaw, heardAt: performance.now(), t0: Math.random() * 100,
    rest: 0, restNext: 3 + Math.random() * 8, vx: 0, vz: 0 }); // rest: stopped for a moment, vx / vz: how fast it's moving itself
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

// you on fire from a bot's flamethrower or flare: burn = damage every quarter second for t seconds
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
// knife: hits its target if it's close enough and in front of it
function botStab(b, W, t, dist) {
  b.cd = W.rate; b.stab = KNIFE_SWING; sfx('swing', { at: b.g.position, far: 20 }); net.shot(W, b);
  const p = tPos(t), pos = b.g.position, want = Math.atan2(p.x - pos.x, p.z - pos.z);
  // right on top of its target the direction to it is meaningless, so it counts as in front
  const facing = dist < .7 || Math.abs(Math.atan2(Math.sin(want - b.aimYaw), Math.cos(want - b.aimYaw))) <= .6;
  if (dist > W.range || Math.abs(p.y - pos.y) > 1.6 || !facing) return;
  const at = new THREE.Vector3(p.x, p.y + 1.2, p.z);
  sfx('slash', { at, far: 20 });
  if (t.you) hurtPlayer(Math.round(W.dmg * BOT.dmgMul), false, b, false, 1);
  else hurtZombie(t, W.dmg * BOT.dmgMul, at, false, false, b, 1);
}
// flamethrower: a short cone in front of it that hits you and every other bot in it (not through walls) and sets them on fire
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
    if (Math.sqrt(Math.max(0, d * d - along * along)) > .5 + along * .15 + .3) continue; // how far it is from the middle of the cone
    if (!clearLine(eye, c)) continue;
    if (o.you) { hurtPlayer(W.dmg, false, b, false, 3); applyBurn(P, BURN_T, W.dmg * .6, b, 'flame'); }
    else { hurtZombie(o, W.dmg, c, false, false, b, 3); applyBurn(o, BURN_T, W.dmg * .6, b, 'flame'); }
  }
}
function botFire(b, W, dist) {
  botHear(b.g.position.x, b.g.position.z, b, W.quiet || W.flame);
  b.ammo--; b.muzzle = W.flame || W.beam ? 0 : .05; net.shot(W, b); // online (a bot I host): the server counts its shots like mine
  // a beam is held in long sweeps, everything else automatic in short bursts
  if (autoFire(W)) { b.cd = W.rate; if (--b.burst <= 0) { b.burst = W.beam ? 14 + (Math.random() * 20 | 0) : 4 + (Math.random() * 6 | 0); b.cd = .35 + Math.random() * .35; } }
  else b.cd = W.rate + Math.random() * .12; // semi-auto guns: about as fast as a person clicks
  if (W.scope) b.aimT = 0;
  if (W.beam) { if (!(b.fireOn > 0)) sfx('heatStart', { at: b.g.position, far: 50 }); b.fireOn = .2; b.fireEnd = 'heatEnd'; }
  else if (!W.flame) sfx(W.id, { at: b.g.position, far: W.quiet ? 35 : 100 }); // a suppressed gun only carries so far
  if (b.ammo <= 0) {
    b.reload = W.reload; sfx('r_' + W.id, { at: b.g.position, far: 25, v: .8 });
    b.pickT = Math.min(b.pickT, .15 + Math.random() * .25); // out: think about switching instead of standing there reloading
  }
  if (W.flame) return botFlame(b, W);
  const S = skillOf(b), err = S.aimErr + S.moveErr * Math.min(1, Math.hypot(b.pvx, b.pvz) / 6) + W.spread * (W.scope ? .1 : .8);
  if (W.rocket || W.flare) { // these fly, so they come out of its eye line with the same wobble as a bullet
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    (W.rocket ? fireRocket : fireFlare)(W, eye.clone(), dirV, b);
    b.leadGuess = .6 + Math.random() * .6;
    return;
  }
  const youUp = respawnT <= 0 && !friendly(b, YOU_T);
  pBox.min.set(P.pos.x - .25, P.pos.y, P.pos.z - .25); pBox.max.set(P.pos.x + .25, P.pos.y + 1.85, P.pos.z + .25); // as wide as a bot's body
  // shots can hit any enemy in the way, not just its target. Its teammates don't block them
  const others = []; for (const z of zombies) if (z !== b && !z.dead && !friendly(b, z)) others.push(...z.parts);
  // the sniper's listed spread is its unscoped hip-fire, but the bot lines up its shots, so it gets a tighter cone
  const walls = [ground, ...crateMeshes];
  for (let i = 0; i < W.pellets; i++) {
    const wob = () => (Math.random() + Math.random() - 1) * err;
    aimDir(b.aimYaw + wob(), b.aimPitch + wob(), dirV);
    losRay.set(eye, dirV); losRay.far = W.range || 90;
    const wall = losRay.intersectObjects(walls, false)[0], wallD = wall ? wall.distance : Infinity;
    const bot = others.length ? losRay.intersectObjects(others, false)[0] : null, botD = bot ? bot.distance : Infinity;
    const onYou = youUp && losRay.ray.intersectBox(pBox, hitV), youD = onYou ? eye.distanceTo(hitV) : Infinity;
    const near = Math.min(wallD, botD, youD);
    if (W.beam) showBeam(b, b.flashM.getWorldPosition(beamFrom), beamTo.copy(eye).addScaledVector(dirV, Math.min(near, W.range)));
    if (near === Infinity) continue;
    if (near === youD) {
      const head = hitV.y > P.pos.y + 1.45;
      hurtPlayer(Math.max(1, Math.round(W.dmg * BOT.dmgMul * (head ? 1.5 : 1))), false, b, head, W.beam ? 2 : 0);
    } else if (near === botD) {
      const zz = bot.object.userData.zombie, head = !!bot.object.userData.head;
      if (!zz.dead) hurtZombie(zz, W.dmg * BOT.dmgMul * (head ? 1.5 : 1), bot.point, head, false, b, W.beam ? 2 : 0);
    } else burst(wall.point, 0x999999, 2);
  }
}

function updateBot(b, dt) {
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
      if (!t && was && tAlive(was) && b.engaged) b.roam = { x: b.lk.x, y: b.lk.y, z: b.lk.z, t: 5 + Math.random() * 3 }; // lost it: go and look where it was
      b.tgt = t; b.seeT = 0; b.aimT = 0; b.lostT = 0; b.engaged = false; b.pvx = b.pvz = 0;
      if (t) { const q = tPos(t); b.lpx = b.lk.x = q.x; b.lpz = b.lk.z = q.z; b.lk.y = q.y; b.idle = 0; }
    }
  }
  const t = b.tgt, tp = t ? tPos(t) : null, sees = !!t && canSee(t);
  if (sees) { b.lk.x = tp.x; b.lk.y = tp.y; b.lk.z = tp.z; b.engaged = true; b.noSeeT = 0; } else b.noSeeT += dt;
  b.seeT = sees ? b.seeT + dt : 0;
  b.lostT = sees || !t ? 0 : b.lostT + dt;
  // now and then, with nobody about, it just stands there for a few seconds looking at the ground (like someone in their settings)
  if (b.idle > 0) { b.idle -= dt; if (t || b.hitByT > 0) b.idle = 0; }
  else if (S.idle && !t && b.hitByT <= 0 && !b.vy && (b.idleNext -= dt) <= 0) { b.idle = 2 + Math.random() * 3; b.idleNext = 40 + Math.random() * 70; }
  // the less keen ones also stop for a moment every so often when they've nobody to fight (still looking about)
  if (b.rest > 0) { b.rest -= dt; if (t) b.rest = 0; }
  else if (S.rest && !t && b.idle <= 0 && (b.restNext -= dt) <= 0) { b.rest = S.rest[2] + Math.random() * S.rest[3]; b.restNext = S.rest[0] + Math.random() * S.rest[1]; }
  if (!t) {
    if (b.hitByT > 1.7 && b.hitBy && tAlive(b.hitBy)) { const q = tPos(b.hitBy); botAlert(b, q.x, q.z, .15); } // shot from where it can't see: it turns to look
    let near = null, nd = Infinity; // gunfire: it looks that way, and half the time heads over
    for (const h of heard) if (h.at > b.heardAt && h.who !== b && !friendly(b, h.who)) { const d = Math.hypot(h.x - pos.x, h.z - pos.z); if (d < (h.quiet ? HEAR_QUIET : HEAR) && d < nd) { nd = d; near = h; } }
    b.heardAt = performance.now();
    if (near) { botAlert(b, near.x, near.z, .3); if (Math.random() < .5) b.roam = { x: near.x + (Math.random() * 2 - 1) * 4, y: pos.y, z: near.z + (Math.random() * 2 - 1) * 4, t: 6 }; }
    if (!b.roam || (b.roam.t -= dt) <= 0 || Math.hypot(b.roam.x - pos.x, b.roam.z - pos.z) < 2.5) b.roam = roamGoal(b);
  }
  // where it's headed: its target, where it last saw it once it can't, else its wander goal
  const go = sees ? tp : t ? b.lk : b.roam;
  const dx = go.x - pos.x, dz = go.z - pos.z, dist = Math.hypot(dx, dz) || .001;

  // which gun: every so often (and right after it runs dry) it picks the best one in its loadout for how far away its target is.
  // While it can't see anyone, it gets ready for a mid-range fight instead
  if ((b.pickT -= dt) <= 0) {
    b.pickT = sees ? .5 + Math.random() * .7 : 2 + Math.random() * 2;
    botEquip(b, pickGun(b, t && (sees || b.lostT < 1.5) ? dist : HUNT_D));
    W = b.rec.W[b.gun];
  }
  // out of the fight for a bit: it reloads what's in its hands, and the guns it switched away from empty get topped up
  if (!sees && (!t || b.lostT > 1)) {
    if (!W.inf && b.reload <= 0 && b.swap <= 0 && b.ammo < W.mag) { b.reload = W.reload; sfx('r_' + W.id, { at: pos, far: 25, v: .8 }); }
    for (const g of b.rec.load) {
      const G = b.rec.W[g];
      if (g === b.gun || b.mags[g] >= G.mag) continue;
      if ((b.refill[g] = (b.refill[g] || 0) + dt) >= G.reload) { b.mags[g] = G.mag; b.refill[g] = 0; }
    }
  }
  const keep = BOT_KEEP[W.id], sniper = !!W.scope;

  // aim, on a target it can see: at its chest, leading it a little, but lagging behind. Changing direction makes it miss.
  // Rockets and flares fly slower than bullets, so it leads those by how long they take to get there.
  // Rockets go at the feet (the blast still gets you), flares aim a little high to make up for the drop
  let wantYaw, wantPitch;
  if (sees) {
    if (b.seeT <= dt) { b.lpx = tp.x; b.lpz = tp.z; } // just came into sight: no speed worked out from where it was before
    if (dt > 0) { b.pvx += ((tp.x - b.lpx) / dt - b.pvx) * Math.min(1, dt * 8); b.pvz += ((tp.z - b.lpz) / dt - b.pvz) * Math.min(1, dt * 8); }
    b.lpx = tp.x; b.lpz = tp.z;
    // (it guesses the lead like a person would: somewhere between 60% and 120% of what's right, a new guess every shot)
    // Bullets: its aim trails what it wants by `lag`, so it wants a point ahead by as much of that as its level makes up for:
    // for the target's movement (lead), and for its own strafing and hopping (self)
    const fly = W.rocket ? dist / ROCKET_SPD : W.flare ? dist / FLARE_SPD : 0, lag = 1 / S.turn;
    const tx = dx + (fly ? b.pvx * fly * b.leadGuess : (b.pvx * S.lead - b.vx * S.self) * lag), tz = dz + (fly ? b.pvz * fly * b.leadGuess : (b.pvz * S.lead - b.vz * S.self) * lag), th = Math.hypot(tx, tz);
    wantYaw = Math.atan2(tx, tz);
    wantPitch = Math.atan2(tp.y + (W.rocket ? .3 : 1.1) - pos.y - 1.6 - (fly ? 0 : b.vy * S.self * lag), th) + (W.flare ? Math.atan2(FLARE_DROP * fly * fly / 2, th) : 0);
  } else {
    // nobody in sight: it looks where it's going and glances about, to the sides, now and then right round, a bit up or down
    // (nobody runs about staring dead ahead). Something it heard or that hit it takes its eyes first. Standing idle, it looks down
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
  // a two-handed stance turns the body right, the head looks back round along the gun
  b.g.rotation.y = b.aimYaw - b.holdTurn; b.headPiv.rotation.y = b.holdTurn; b.headPiv.rotation.x = b.aim.rotation.x = -b.aimPitch;

  b.cd -= dt; b.muzzle -= dt; b.swap -= dt; b.flashM.visible = b.muzzle > 0;
  if (b.fireOn > 0 && (b.fireOn -= dt) <= 0) sfx(b.fireEnd, { at: pos, far: 50 });
  b.stab = Math.max(0, b.stab - dt); knifeChop(b); // knife: a chop down
  if (b.spin) { if (b.muzzle > 0) b.spinV = 30; b.spin.rotation.z += b.spinV * dt; b.spinV = Math.max(0, b.spinV - dt * 25); } // eradicator barrels, like yours
  if (b.reload > 0 && (b.reload -= dt) <= 0) b.ammo = W.mag;
  if (b.round) b.round.visible = b.ammo > 0;
  holdReload(b, b.reload, W.reload);
  // in range for this gun: knife = arm's reach, flamethrower = its flame, rocket = not close enough to blow itself up
  const inRange = !sees ? false : W.melee ? dist <= W.range && Math.abs(tp.y - pos.y) < 1.6 : W.flame ? dist < W.range + .5 : W.beam ? dist < W.range : W.rocket ? dist > 4 : true;
  const ready = sees && b.seeT >= S.react && b.reload <= 0 && b.swap <= 0 && (W.inf || b.ammo > 0) && inRange;
  b.aimT = ready && sniper ? b.aimT + dt : 0;
  if (ready && b.cd <= 0 && (!sniper || b.aimT >= SNIPE_T)) { if (W.melee) botStab(b, W, t, dist); else botFire(b, W, dist); }

  // moving: keep the distance its gun likes, strafe side to side while fighting, go to where it last saw them when it loses them,
  // wander when it has nobody
  let radial = 1, side = 0;
  if (sees) {
    radial = dist > keep[1] ? 1 : dist < keep[0] ? -1 : 0;
    if (S.plant && radial && dist > keep[0] * .6 && dist < keep[1] * 1.6) radial = 0; // not one for working the range: near enough, it stops and shoots
    if (b.reload > 0 && dist < keep[1] + 4) radial = -1;
    if ((b.strafeT -= dt) <= 0) { b.strafeT = S.strafeT[0] + Math.random() * S.strafeT[1]; b.strafe = Math.random() < S.stand ? 0 : Math.random() < .5 ? -1 : 1; }
    side = b.strafe * (sniper && b.aimT > 0 ? .3 : 1);
  }
  const pad = !sees && b.hp < b.maxHp ? nearPad(pos, b.hp <= PAD_LOW ? PAD_FAR : PAD_NEAR) : null;
  let gx = dx, gz = dz, gd = dist;
  // a target on another floor it can't see, or it's down in the pool: take the stairs (MAP.nav gives the next spot on the way)
  // one it can see but has to get closer to across the pool: round the edge of it
  const way = pad ? MAP.nav?.(pos, { x: pad.x, y: 0, z: pad.z }) : !sees || MAP.trapped?.(pos) ? MAP.nav?.(pos, go) : radial > 0 ? MAP.around?.(pos, tp) : null;
  const into = !pad && !!t && !!MAP.trapped?.(go); // it only goes into the pool after a target that's in it
  if (way) { gx = way.x - pos.x; gz = way.z - pos.z; gd = Math.hypot(gx, gz) || .001; radial = 1; side = 0; }
  else if (pad) { gx = pad.x - pos.x; gz = pad.z - pos.z; gd = Math.hypot(gx, gz) || .001; radial = 1; }
  else if (sees && dist < 1.5 && !W.melee) radial = -1; // too close (a bot with its knife out wants to be this close)
  else if (t && !sees && dist < 1.2) radial = 0; // where it last saw them, and nobody there: it stands and looks about
  if (b.detour > 0) { b.detour -= dt; side = b.detourDir; radial *= .3; } // stuck on a crate: sidestep around it
  const ux = gx / gd, uz = gz / gd;
  let mx = ux * radial + uz * side, mz = uz * radial - ux * side;
  for (const o of zombies) {
    if (o === b || o.dead) continue;
    const ox = pos.x - o.g.position.x, oz = pos.z - o.g.position.z, od = Math.hypot(ox, oz);
    if (od < .8 && od > 0) { mx += ox / od; mz += oz / od; }
  }
  if (respawnT <= 0 && Math.abs(P.pos.y - pos.y) < 1.8) { // and out of you, so it never stands inside your camera
    const ox = pos.x - P.pos.x, oz = pos.z - P.pos.z, od = Math.hypot(ox, oz);
    if (od < .75) { if (od > .001) { mx += ox / od * 2; mz += oz / od * 2; } else mx += 2; }
  }
  if (b.idle > 0 || b.rest > 0) mx = mz = 0;
  else if (!sees && !way && !pad && b.detour <= 0 && Math.hypot(mx, mz) > .05) {
    // on its way somewhere with nobody to fight: not a ruler line. Its heading drifts to one side and the other, and it comes
    // round to a new direction in a curve instead of snapping onto it
    if ((b.wobT -= dt) <= 0) { b.wobT = 1 + Math.random() * 1.8; b.wobWant = (Math.random() * 2 - 1) * (gd > 5 ? .6 : .15); }
    b.wob += (b.wobWant - b.wob) * Math.min(1, dt * 1.5);
    const m0 = Math.hypot(mx, mz), turn = angDiff(Math.atan2(mx, mz) + b.wob, b.mvYaw);
    b.mvYaw += Math.sign(turn) * Math.min(Math.abs(turn), TURN_WALK * dt);
    mx = Math.sin(b.mvYaw) * m0; mz = Math.cos(b.mvYaw) * m0;
  } else if (Math.hypot(mx, mz) > .05) b.mvYaw = Math.atan2(mx, mz);
  const ml = Math.hypot(mx, mz);
  if (ml > .05) {
    const s = BOT.speed * (mobMul(W) + b.rec.fx.spd) * dt / ml; mx *= s; mz *= s;
    const ox = pos.x, oz = pos.z, grounded = !b.vy; let bump = false;
    if (!walkDry(pos, pos.x + mx, pos.z, b.r, grounded, into)) bump = true;
    if (!walkDry(pos, pos.x, pos.z + mz, b.r, grounded, into)) bump = true;
    if (bump && sees) b.strafe = -b.strafe;
    if (dt > 0) { b.vx = (pos.x - ox) / dt; b.vz = (pos.z - oz) / dt; } // how fast it's really going, for its own aim (self)
    if (Math.hypot(pos.x - ox, pos.z - oz) < BOT.speed * dt * .3 && b.detour <= 0) {
      b.detour = .5 + Math.random() * .4; b.detourDir = Math.random() < .5 ? -1 : 1;
      if (!b.vy && Math.random() < .4) b.jumpT = 0; // sometimes tries hopping over what it's stuck on
    }
    // hops now and then like a player, fighting or just running somewhere (then every so often, sometimes a few in a row),
    // more often mid-fight. Not while a sniper is lining up a shot
    if (!b.vy && !(sniper && b.aimT > 0) && (b.jumpT -= dt) <= 0) { b.jumpT = sees ? S.jumpF[0] + Math.random() * S.jumpF[1] : Math.random() < S.chain ? .5 + Math.random() * .4 : S.jumpR[0] + Math.random() * S.jumpR[1]; b.vy = 9; b.dj = b.rec.fx.dj && Math.random() < .6 ? 1 : 0; }
    // Raider Boots: most of its hops get a second jump near the top
    if (b.dj === 1 && b.vy && b.vy > -2 && b.vy < 2) { b.dj = 2; b.vy = DJ_V; sfx('djump', { at: pos, far: 20, v: .7 }); burst(tmp.set(pos.x, pos.y + .1, pos.z), 0xe8eef2, 5); }
    b.t += dt * BOT.speed * 2.2;
    b.pivL.rotation.x = Math.sin(b.t) * .6; b.pivR.rotation.x = -Math.sin(b.t) * .6;
    const ph = Math.sin(b.t) > 0; // a footstep each time a leg swings through
    if (ph !== b.stepPh) { b.stepPh = ph; if (!b.vy) sfx('step_' + FOOT_OK(surfaceAt(pos.x, pos.z, b.r, pos.y)) + (ph ? '' : '2'), { at: pos, far: 22, v: .8 }); }
  } else { b.pivL.rotation.x *= .8; b.pivR.rotation.x *= .8; b.vx = b.vz = 0; }
  const air = b.vy < -6;
  settle(b, dt);
  if (inWater(pos.x, pos.z, pos.y)) { drownZombie(b); return; }
  if (air && !b.vy) sfx('land_' + FOOT_OK(surfaceAt(pos.x, pos.z, b.r, pos.y)), { at: pos, far: 22, v: .7 });

  for (const p of pads) {
    if (!p.item || Math.hypot(pos.x - p.x, pos.z - p.z) >= 1 || pos.y >= 1.5) continue;
    if (!(p.type === 'health' && b.hp < b.maxHp || p.type === 'armor' && b.armor < b.maxArmor)) continue;
    if (net.on) { net.pick(p, b); break; } // online the server hands it over (js/net.js picked, with by)
    if (p.type === 'health') b.hp = Math.min(b.maxHp, b.hp + HEAL_PICK);
    else b.armor = Math.min(b.maxArmor, b.armor + ARMOR_PICK);
    sfx(p.type === 'health' ? 'pickHealth' : 'pickArmor', { at: pos, far: 25, v: .7 });
    clearPad(p); p.t = RESPAWN + Math.random() * 10;
    break;
  }

  b.flash -= dt;
  const e = b.flash > 0 ? 0x880000 : b.burn > 0 ? (Math.sin(performance.now() * .03) > 0 ? 0x993300 : 0x441100) : 0;
  b.mats.forEach(m => m.emissive.setHex(e));
}

// while you're dead: camera drops to the floor, the banner counts down, then you respawn. Returns true while you're down.
function dmDown(dt) {
  if (respawnT <= 0) return false;
  respawnT -= dt;
  if (net.on) respawnT = Math.max(respawnT, .01); // online you only come back when the server says so (spawn -> respawnYou)
  if (respawnT <= 0) { respawnYou(); return false; }
  adsT = 0; if (camera.fov !== fovBase) { camera.fov = fovBase; camera.updateProjectionMatrix(); }
  $('scope').style.display = $('holo').style.display = 'none'; $('cross').style.display = 'none'; vm.visible = false;
  // you float up like the bots' angels do, looking down at where you were. Drowned: you sink instead (drownTick)
  const t = YOU_RESPAWN - respawnT, f = Math.min(1, t / 1.2);
  if (P.drowned) { camera.position.set(P.pos.x, P.pos.y + .35, P.pos.z); camera.rotation.set(P.pitch, P.yaw, .4); }
  else if (killCam) {
    // killed by a bot: rise up a little and turn to watch it. If it dies or respawns, keep looking where it was last
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
  if (matchOver) return; // the mouse can stay locked for a frame or two after the end, don't pay out twice
  if (net.on) { net.matchTick(dt); return; } // online: the server runs the match (clock, joins, scores); net.js draws it
  while (joins.length && MATCH_T - matchT >= joins[0].at) joinBot(joins.shift());
  chatTick(dt); burnTick(dt);
  for (const r of recs) if (!r.you && (!r.b || r.b.dead) && (r.wait -= dt) <= 0) makeBot(r); // bots come back after their body falls
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
// results = what the server says it was, online: { place, won, xp, gold, lead }. Offline it works them out here
function endMatch(results) {
  matchOver = true; closeChat(); closeArmory(); $('board').style.display = 'none'; $('banner').style.opacity = 0;
  const place = results ? results.place : ranked().indexOf(youRec) + 1, lead = results ? results.lead : teamLead();
  $('postSub').textContent = MR.name + ' OVER';
  $('postPlace').textContent = MR.team ? (lead > 0 ? 'VICTORY!' : lead < 0 ? 'DEFEAT' : 'DRAW') : place === 1 ? '1ST PLACE!' : ord(place) + ' PLACE';
  $('postBoard').innerHTML = boardHTML();
  const won = results ? results.won : MR.team ? lead > 0 : place === 1;
  const [xp, gold] = boostPay(...(results ? [results.xp, results.gold] : MR.team ? teamReward(lead) : rewardFor(place))), { ups, bonus, boostUp } = grant(xp, gold); // boostPay: doubled with a booster (js/boost.js)
  $('rewards').innerHTML = `<div class="rw"><span class="rx">+${xp} XP</span><span class="pc">+${gold} ${COIN}</span>${boostTag()}</div>`
    + (results?.priv ? '<div class="rl">Private match: pay for taking part. Public matches pay for placing</div>' : '')
    + (ups ? `<div class="lvup">LEVEL UP! LVL ${prof.lv} · +${bonus} ${COIN} · +${boostUp} ${ico('bolt')}</div>` : `<div class="rl">LVL ${prof.lv} · ${xpText()}</div>`) + xpBar();
  $('post').style.display = 'flex';
  sfx(won ? 'win' : 'lose'); musicEnd();
  setTimeout(cgMidgame, 1500); // CrazyGames: a midgame ad once you've seen how you did (js/crazy.js)
  if (ups) setTimeout(() => sfx('levelUp'), 700);
  document.exitPointerLock();
}
$('againBtn').addEventListener('click', () => { if (net.on) { net.again(); return; } restart(); lockMouse(); });
$('postLobby').addEventListener('click', () => { net.leave(); restart(); showLobby(true); });

// a gun from your account, at the stars you picked to use (gunUse, js/armory.js), with full ammo
function giveGun(g) {
  lvl[g] = Math.max(0, Math.min(2, gunUse(g) - 1)); applyLvl(g);
  owned[g] = true; ammo[g] = WEAPONS[g].mag; reserve[g] = resMax(g);
}
// called at the end of restart(): sets up whichever mode you picked in the lobby
function setupMode() {
  matchOver = false; respawnT = 0; lastTop = lastBoard = ''; killedBy = ''; youHelpers.clear(); killCam = null;
  MR = RULES[mode] || RULES.dm; MATCH_T = MR.t; YOU_RESPAWN = MR.you; JOIN_T = MR.join;
  BOT_COUNT = net.on ? 0 : MR.players[MAP.size] - 1; // online the room is other people
  $('post').style.display = 'none'; $('board').style.display = 'none'; $('banner').style.opacity = 0; // clears "KILLED BY" if you left while dead
  $('feed').innerHTML = ''; $('top').innerHTML = ''; resetChat();
  $('chat').style.display = pvp() ? '' : 'none';
  if (pvp()) {
    if (net.on) { net.roster(); joins = []; } else makeRecs(); // online: the roster is the room's players (net.js keeps recs and youRec)
    matchT = MATCH_T; wearArmor();
    BASE.forEach((w, g) => { if (hasGun(g)) giveGun(g); });
    CATS.forEach(([c], s) => slotGun[s] = loadoutGun(c));
    cur = slotGun[0]; buildGun(); renderHotbar();
  } else { // zombie waves: your loadout comes along, at its stars, with your armor; the shop between waves sells the rest (zombies.js SHOP)
    wearArmor();
    CATS.forEach(([c], s) => { const g = loadoutGun(c); giveGun(g); slotGun[s] = g; });
    cur = slotGun[0]; buildGun(); renderHotbar();
  }
  musicMatch(mapId, pvp() ? 'dm' : mode); // every bot match uses the deathmatch music, timed to its own length
}
