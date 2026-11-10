// online play: the server runs rooms and checks hits, you own your movement
const NET_V = 1;
const GEN_MSG = "That room's on a different version of the game";
const NET_GEN = 2; // content version: rooms hold one, bump it when new guns or maps ship
const NET_DEV = /[?&]dev=1\b/.test(location.search) || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
const NET_HTTP = /[?&]srv=(https?:\/\/[\w.:-]+)/.exec(location.search)?.[1] || (NET_DEV ? 'http://127.0.0.1:8787' : CLOUD); // ?srv= points at another server
const NET_WS = NET_HTTP.replace(/^http/, 'ws');
const NET_BUILD = +(document.currentScript?.src.match(/[?&]v=(\d+)/)?.[1] ?? 0); // lets the server spot old cached clients
const NET_RATE = 50; // ms between packets (20 a second)
const NET_HIST = 600; // ms of position history for smoothing
const REJOIN_FOR = 25000; // keep trying to get back in this long (the server holds your place 30 s)
// guest id that stays the same on this device
let guestId = localStorage.getItem('voxelstrike-guest');
if (!/^[0-9a-f]{16}$/.test(guestId || '')) {
  guestId = [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem('voxelstrike-guest', guestId); } catch {}
}
const netToastEl = $('netToast');
let netToastT = 0;
function netToast(text, ms = 3200) { // message that shows over anything
  netToastEl.textContent = text; netToastEl.classList.add('show');
  clearTimeout(netToastT); netToastT = setTimeout(() => netToastEl.classList.remove('show'), ms);
}
const safeCss = c => /^#[0-9a-fA-F]{3,8}$/.test(c || '') ? c : '#e8e8e8';
const r2 = v => Math.round(v * 100) / 100, r3 = v => Math.round(v * 1000) / 1000;
const wrapAng = a => Math.atan2(Math.sin(a), Math.cos(a));
// bodies face the opposite way from the camera yaw
const bodyYaw = y => y + Math.PI;

net = (() => {
  // server clock estimate from pings (slides, never jumps)
  const clock = { off: 0, target: 0, rtt: 0, jitter: 0, samples: [] };
  const localNow = () => performance.now();
  const now = () => localNow() + clock.off;
  let lastTc = 0;
  function pong(c, s) {
    const t = localNow(), rtt = t - c;
    clock.samples.push({ t, rtt, off: s + rtt / 2 - t });
    clock.samples = clock.samples.filter(x => t - x.t < 10000);
    const best = clock.samples.reduce((a, b) => b.rtt < a.rtt ? b : a);
    clock.target = best.off; clock.rtt = best.rtt;
    clock.jitter = clock.samples.reduce((s, x) => s + (x.rtt - best.rtt), 0) / clock.samples.length;
  }
  const interpDelay = () => Math.max(100, Math.min(300, 100 + 2 * clock.jitter)); // how far in the past other players are drawn

  // state
  let ws = null, welcomed = false, pid = 0, key = '', room = '', code = null, myTeamRaw = 0;
  let hostPid = 0; // whose client runs the room's bots
  let phase = 'wait', matchEnd = 0, rulesCap = 0;
  let alive = false, respawnAt = 0, readySent = false, readyT = 0;
  let seq = 0, fired = 0, hits = [], evFlags = 0, pjSeq = 0, renderT = 0, shotN = 0; // shotN counts every shot, yours and your bots'
  let last = null; // for PLAY AGAIN
  let starting = null;
  let rejoinInfo = null; // to get back in after a dropped connection
  const remotes = new Map();
  let roster = { recs: [], youRec: null };
  let lastTop = '', lastBoard = '', lastSec = 0;
  const api = { on: false, banner: '', wsOk: null, code: null, serverPads: false }; // serverPads: the server stocks the pads

  function send(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }

  // can this network reach the game server? (school filters often can't)
  function probe() {
    if (api.wsOk !== null) return;
    const saved = sessionStorage.getItem('voxelstrike-ws');
    if (saved) { api.wsOk = saved === 'yes'; return; }
    let done = false;
    const finish = ok => { if (done) return; done = true; api.wsOk = ok; try { sessionStorage.setItem('voxelstrike-ws', ok ? 'yes' : 'no'); } catch {} try { s.close(); } catch {} if (typeof renderPill === 'function' && pickOpen()) renderPill(); };
    let s;
    try { s = new WebSocket(NET_WS + '/play/ws/probe'); } catch { finish(false); return; }
    s.onmessage = () => finish(true); s.onopen = () => finish(true);
    s.onerror = () => finish(false); s.onclose = () => finish(false);
    setTimeout(() => finish(false), 3000);
  }

  // your name, look and gear for the server
  function myGear() { // every gun you own, since you can swap mid-match
    const load = CATS.map(([c]) => BASE[loadoutGun(c)].id), stars = {};
    BASE.forEach((w, i) => { if (hasGun(i)) stars[w.id] = Math.max(0, Math.min(2, gunUse(i) - 1)); });
    return { armor: wornArmor(), boots: wornBoots(), hat: wornHat(), stars, load };
  }
  function hello(rejoin = null) {
    const m = { t: 'hello', v: NET_V, gen: NET_GEN, build: NET_BUILD, name: myName, look: lookBase(), gear: myGear() }; // a drawn skin follows in its own message
    if (auth?.token) m.token = auth.token; else m.guest = guestId;
    if (rejoin) m.rejoin = rejoin;
    send(m);
  }

  // starting a match; if it fails we fall back to a bot match
  const findingEl = $('finding'), findingMsg = $('findingMsg');
  function showFinding(text) { findingMsg.textContent = text; findingEl.style.display = 'flex'; }
  function hideFinding() { findingEl.style.display = 'none'; }
  async function fetchJson(path, opts) {
    const r = await fetch(NET_HTTP + path, { ...opts, headers: { 'Content-Type': 'application/json' } });
    let j = {}; try { j = await r.json(); } catch {}
    return { status: r.status, ...j };
  }
  // the public match you were last in (this tab), so a drop or a reload can take you back to it
  const BACK = 'voxelstrike-back';
  function markBack() { if (api.on && room && !code && phase !== 'over') try { sessionStorage.setItem(BACK, JSON.stringify({ room, mode, map: mapId, gen: NET_GEN, t: Date.now() })); } catch {} }
  function forgetBack() { try { sessionStorage.removeItem(BACK); } catch {} }
  function backRoom(o) {
    let b = null; try { b = JSON.parse(sessionStorage.getItem(BACK)); } catch {}
    return b && !o.code && !o.create && !o.room && b.mode === o.mode && b.map === o.map && b.gen === NET_GEN && Date.now() - b.t < 300e3 ? b.room : null;
  }
  addEventListener('pagehide', markBack);
  function start(o) {
    if (starting) return;
    if (api.on) leave();
    o.room ||= backRoom(o); // back to the match you dropped out of
    last = o; // kept for PLAY AGAIN
    const job = starting = { o, not: [], tries: 0, dead: false, timer: 0 };
    showFinding(o.friend ? `JOINING ${o.friend.toUpperCase()}…` : o.code ? `JOINING ROOM ${o.code}…` : o.create ? 'MAKING YOUR ROOM…' : 'FINDING MATCH…');
    job.timer = setTimeout(() => fail(job, 'Took too long to reach the servers'), 8000);
    findRoom(job).catch(e => fail(job, e?.message || 'Could not reach the servers'));
  }
  async function findRoom(job) {
    const { o } = job;
    let r;
    if (o.code) {
      r = await fetchJson('/play/code/' + o.code);
      if (r.status === 404 || r.status === 422) throw new Error('No room with that code');
      if (!r.room) throw new Error('Could not look up that code');
      if ((r.gen || 1) !== NET_GEN) throw new Error(GEN_MSG);
      o.mode = r.mode; o.map = r.map;
    } else if (o.create) {
      r = await fetchJson('/play/private', { method: 'POST', body: JSON.stringify({ mode: o.mode, map: o.map, gen: NET_GEN }) });
      if (!r.room) throw new Error(r.error || 'Could not make a room');
      o.code = r.code;
    } else if (o.room) { // a public room by name (a friend's, or PLAY AGAIN)
      r = { room: o.room };
    } else {
      r = await fetchJson(`/play/find?mode=${encodeURIComponent(o.mode)}&map=${encodeURIComponent(o.map)}&not=${job.not.join(',')}&gen=${NET_GEN}`);
      if (!r.room) throw new Error(r.error || 'No room found');
    }
    if (job.dead) return;
    connect(r.room, job, null);
  }
  function connect(roomName, job, rejoin) {
    try { ws = new WebSocket(NET_WS + '/play/ws/' + roomName); } catch { if (job) fail(job, 'Could not open a connection'); return; }
    const sock = ws;
    room = roomName; welcomed = false;
    sock.onopen = () => hello(rejoin);
    sock.onmessage = e => { if (sock !== ws) return; let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m, job); };
    sock.onclose = e => { if (sock !== ws) return; onClose(e.code, e.reason, job); };
    sock.onerror = () => {};
  }
  function fail(job, why) {
    if (job.dead) return;
    job.dead = true; clearTimeout(job.timer); starting = null;
    if (ws && !welcomed) { try { ws.close(1000); } catch {} ws = null; }
    hideFinding();
    const o = job.o;
    if (o.code && !o.mode) { // bad code: stay on the code page
      const err = $('codeErr'); if (err) err.textContent = why; else netToast(why);
      return;
    }
    netToast(`${why}, playing against bots`, 4000);
    mode = o.mode; mapId = o.map;
    showPick(false); restart(); showLobby(false); lockMouse();
  }
  function cancelStart() {
    if (!starting) return;
    starting.dead = true; clearTimeout(starting.timer); starting = null;
    if (ws) { try { ws.close(1000); } catch {} ws = null; }
    hideFinding();
  }
  $('findingX').addEventListener('click', () => { cancelStart(); sfx('ui'); });

  // connection lost or ended
  function onClose(codeNum, reason, job) {
    const wasOn = api.on;
    if (job && !job.dead && !welcomed) { // never got in
      if (codeNum === 4001 && job.tries++ < 3 && !job.o.code) { // room full: try another
        if (job.o.room) { job.o.room = null; netToast('That room is full, finding another', 3000); } else job.not.push(room);
        findRoom(job).catch(e => fail(job, e?.message || 'No room found')); return;
      }
      const why = { 4000: 'The game was updated, reload the page to play online', 4001: 'That room is full', 4002: 'The server did not like that request', 4003: 'You were removed from that room', 4005: 'You joined from another tab', 4006: GEN_MSG }[codeNum];
      fail(job, why || 'Could not connect');
      return;
    }
    ws = null;
    if (!wasOn) return;
    if (codeNum === 4010) return; // match ended normally
    if (codeNum === 1012 || codeNum === 1006 || codeNum === 1001 || codeNum === 1011) { // dropped: keep trying to get back in while your place is held
      if (rejoinInfo && !matchOver && localNow() < (rejoinInfo.until ||= localNow() + REJOIN_FOR)) { netToast('Reconnecting…', 2500); setTimeout(() => { if (!api.on || !rejoinInfo) return; connect(rejoinInfo.room, null, { pid: rejoinInfo.pid, key: rejoinInfo.key }); }, 2000); return; }
    }
    const why = { 4000: 'The game was updated, reload the page', 4003: 'You were removed from the match', 4004: 'Disconnected for being away', 4005: 'You joined from another tab' }[codeNum] || 'Connection lost';
    netToast(why, 4000);
    if (codeNum === 4003) forgetBack(); else markBack();
    endOnline();
    restart(); showLobby(true);
  }
  function endOnline() {
    api.on = false; api.banner = ''; api.code = null; api.serverPads = false; rejoinInfo = null; alive = false; respawnAt = 0; readySent = false; hostPid = 0;
    for (const r of remotes.values()) dropBody(r);
    remotes.clear(); hits = []; fired = 0; evFlags = 0;
    $('roomRow').style.display = 'none';
    cgRoom();
  }
  function leave() {
    forgetBack();
    cancelStart();
    if (ws) { try { ws.close(1000); } catch {} ws = null; }
    endOnline();
  }
  function again() { if (!last) return; endOnline(); start(last.code ? { code: last.code } : { mode: last.mode, map: last.map, room: last.room }); }

  // messages from the server
  function onMsg(m, job) {
    const t = Array.isArray(m) ? m[0] : m.t;
    switch (t) {
      case 'welcome': return welcome(m, job);
      case 'snap': return snap(m);
      case 'pong': return pong(m.c, m.s);
      case 'join': return join(m.p);
      case 'leave': return left(m.pid, m.reason);
      case 'spawn': return spawn(m);
      case 'dmg': return damage(m);
      case 'die': return died(m);
      case 'score': return score(m.rows);
      case 'phase': phase = m.phase; if (m.matchEnd) matchEnd = m.matchEnd; lastTop = ''; if (m.solo) netToast('Everyone else left, so the match ends in 30 seconds unless someone joins', 5000); return;
      case 'fire': return remoteFire(m);
      case 'boom': return remoteBoom(m);
      case 'gear': return gearMsg(m);
      case 'look': return lookMsg(m);
      case 'pad': return padMsg(m);
      case 'picked': return m.by ? botPicked(m) : usePickup(m.type, { hp: m.hp, armor: m.armor });
      case 'warp': return warped(m);
      case 'host': return setHost(m.pid);
      case 'fill': return fill(m.n | 0);
      case 'chat': if (chatHidden(cleanName(m.name))) return; return chatSay({ name: cleanName(m.name) || '?', css: safeCss(m.css) }, String(m.text ?? '').slice(0, 80));
      case 'over': return over(m);
      case 'kick': return;
      case 'probe': return;
    }
  }
  function welcome(w, job) {
    const rejoining = api.on;
    if (job) { job.dead = true; clearTimeout(job.timer); starting = null; }
    welcomed = true; pid = w.pid; key = w.key; room = w.room; code = w.code || null; myTeamRaw = w.me?.team ?? 0; hostPid = w.host | 0; skillPool = null;
    phase = w.phase; matchEnd = w.matchEnd || 0; rulesCap = w.rules?.cap || 8;
    rejoinInfo = { room, pid, key, until: 0 };
    clock.off = clock.target = (w.now ?? now()) - localNow(); clock.samples = []; lastTc = 0;
    mode = w.mode; mapId = w.map;
    api.on = true; api.code = code; api.serverPads = Array.isArray(w.pads);
    if (prof.look.px) send({ t: 'skin', px: prof.look.px }); // older servers just ignore it
    if (last && !code && !rejoining) last.room = room; // PLAY AGAIN keeps a group together
    // the roster, as bot-shaped records
    for (const r of remotes.values()) dropBody(r);
    remotes.clear();
    roster.youRec = { name: myName, you: true, team: 0, css: '#8ff0b6', score: 0, kills: 0, deaths: 0, assists: 0, streak: 0, pid };
    roster.recs = [roster.youRec];
    let me = null;
    for (const p of w.players || []) {
      if (p.pid === pid) { me = p; Object.assign(roster.youRec, { score: p.score | 0, kills: p.kills | 0, deaths: p.deaths | 0, assists: p.assists | 0, streak: p.streak | 0 }); continue; }
      addRemote(p, false);
    }
    if (!rejoining) {
      hideFinding(); showPick(false);
      restart();
      showLobby(false);
    } else restart();
    if (api.serverPads) w.pads.forEach((type, i) => { const p = pads[i]; if (p) { clearPad(p); if (type) spawnPickup(p, type); } }); // what the pads hold right now
    for (const r of remotes.values()) if (r.rec.alive && r.pos) spawnBody(r, ...r.pos);
    if (me?.alive && me.pos) { alive = true; readySent = false; respawnYou(me.pos[0], me.pos[2], me.pos[3]); P.pos.y = me.pos[1]; }
    else { alive = false; respawnT = .01; api.banner = 'JOINING…'; }
    const rr = $('roomRow'); rr.style.display = code ? '' : 'none'; if (code) $('roomCode').textContent = 'ROOM CODE ' + code;
    lastTop = lastBoard = ''; lastSec = 0;
    if (!rejoining) lockMouse(); else if (locked) tryReady();
    markBack();
    send({ t: 'ping', c: localNow() });
    cgRoom();
  }
  // CrazyGames: report our room so friends can join and invite links work
  let cgInRoom = false;
  const roomParams = () => code ? { join: code } : { room, mode, map: mapId };
  const humansIn = () => 1 + [...remotes.values()].filter(r => !r.rec.bot).length; // bots make room for people
  function cgRoom() {
    if (!cg.on) return;
    if (api.on) { cgInRoom = true; cgCall(s => s.game.updateRoom({ roomId: room, isJoinable: humansIn() < (rulesCap || 8), inviteParams: roomParams() })); }
    else if (cgInRoom) { cgInRoom = false; cgCall(s => s.game.leftRoom()); }
  }
  // an invite's params as a start()
  function fromInvite(p) {
    const c = String(p?.join || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (c.length === 6) return { code: c };
    if (/^pub-[\w-]{1,60}$/.test(p?.room || '') && PLAY_MODES.some(m => m.id === p.mode) && MAPS[p.map]) return { room: p.room, mode: p.mode, map: p.map };
    return null;
  }
  // another player's record, shaped like a bot's
  // their gear as the fields the bot code reads
  function gearFields(gear) {
    gear = gear || {};
    const stars = {}, W = {};
    BASE.forEach((w, i) => { stars[i] = Math.max(0, Math.min(2, gear.stars?.[w.id] | 0)); W[i] = statsAt(i, stars[i]); });
    const load = CATS.map(([c], k) => { const i = gi(gear.load?.[k]); return i !== undefined && BASE[i].cat === c ? i : BASE.findIndex(w => w.cat === c && w.start); });
    const boots = gear.boots && bootOf(gear.boots.id) ? { id: gear.boots.id, st: Math.max(1, Math.min(3, gear.boots.st | 0)) } : null;
    const hat = gear.hat && hatOf(gear.hat.id) ? { id: gear.hat.id, st: Math.max(1, Math.min(3, gear.hat.st | 0)) } : null;
    const armor = Math.max(0, Math.min(ARMOR_ALL, gear.armor | 0));
    return { stars, load, W, boots, hat, armor, fx: armorFx(gearFx(boots, hat), armor, boots, hat) };
  }
  function gearMsg(m) { // someone changed gear mid-match
    if (m.pid === undefined) { P.maxArmor = m.maxArmor; P.armor = m.armor; return; } // the server's answer to your own change
    const r = remotes.get(m.pid); if (r) Object.assign(r.rec, gearFields(m.gear));
  }
  function lookMsg(m) { // someone's drawn skin arrived
    const r = remotes.get(m.pid); if (!r || r.rec.team !== undefined || (typeof m.px !== 'string' && m.px !== null)) return; // teams keep their shirts
    const L = { ...r.rec.look }; if (m.px) L.px = m.px; else delete L.px;
    r.rec.look = L;
    if (r.body?.mats?.[0]) { r.body.mats[0].map = skinTexture(L); r.body.mats[0].needsUpdate = true; }
  }
  function makeRemoteRec(p) {
    const name = cleanName(p.name) || 'Player';
    const team = teamMode() ? (p.team === myTeamRaw ? 0 : 1) : undefined;
    const css = team !== undefined ? TEAMS[team].css : safeCss(p.css);
    let look = p.look && typeof p.look === 'object' ? { ...p.look } : null;
    if (!look || typeof look.hair !== 'string' || typeof look.top !== 'string') look = randomLook(name, 0x6a6a72);
    if (team !== undefined) delete look.px;
    if (team !== undefined) look.topC = ((TEAMS[team].shirts[0][0] << 16) | (TEAMS[team].shirts[0][1] << 8) | TEAMS[team].shirts[0][2]); // team shirt colour
    const tag = tagMat(name, css);
    if (team === 0) { tag.mat.depthTest = false; tag.mat.opacity = .85; } // teammates' tags show through walls
    return { pid: p.pid, fid: Number.isInteger(p.fid) ? p.fid : 0, bot: !!p.bot, name, lang: 'en', quiet: true, team, css, look, tag: tag.mat, tagW: tag.w, ...gearFields(p.gear), taste: {},
      score: p.score | 0, kills: p.kills | 0, deaths: p.deaths | 0, assists: p.assists | 0, streak: p.streak | 0, alive: !!p.alive, b: null, wait: Infinity, remote: true };
  }
  function addRemote(p, announce) {
    if (remotes.has(p.pid)) left(p.pid, 'replaced');
    const rec = makeRemoteRec(p), r = { rec, body: null, buf: [], fired: 0, burn: 0, reloadWas: false, q: 0, pos: p.pos || null, hits: [], respawnAt: 0, readyAt: 0 };
    if (rec.bot && hostPid === pid) hostRec(rec); // a bot I host
    remotes.set(p.pid, r); roster.recs.push(rec);
    if (recs !== roster.recs) recs.push(rec);
    if (announce) { feed(`${nameTag(rec)} joined`); sfx('join'); }
    return r;
  }
  function join(p) {
    if (!p || p.pid === pid) return;
    const r = addRemote(p, true);
    if (p.alive && p.pos) spawnBody(r, ...p.pos);
    if (!p.bot) cgRoom();
  }
  function left(who, reason) {
    const r = remotes.get(who); if (!r) return;
    dropBody(r); remotes.delete(who);
    if (r.rec.hostBot && skillPool && r.rec.skill !== undefined) skillPool.push(r.rec.skill); // its level goes to the next bot I make
    const i = recs.indexOf(r.rec); if (i >= 0) recs.splice(i, 1);
    const j = roster.recs.indexOf(r.rec); if (j >= 0) roster.recs.splice(j, 1);
    if (reason !== 'replaced') feed(`${nameTag(r.rec)} left`);
    if (r.rec.tag?.map) { r.rec.tag.map.dispose(); r.rec.tag.dispose(); }
    if (!r.rec.bot) cgRoom();
  }
  // bodies: built like a bot's, driven by the network
  function spawnBody(r, x, y, z, yaw = 0) {
    yaw = bodyYaw(yaw);
    dropBody(r);
    const b = makeBot(r.rec, { x, y, z, yaw });
    b.remote = !r.rec.hostBot; b.pid = r.rec.pid; b.aimYaw = yaw; b.aimPitch = 0; // bots I host run the offline AI
    b.g.position.set(x, y, z); b.g.position.lag = 0; b.g.rotation.y = yaw - b.holdTurn;
    r.rec.b = b; r.body = b; r.rec.alive = true;
    r.buf = [{ ts: now(), x, y, z, yaw, pitch: 0, gun: BASE[b.gun].id, flags: 8 }];
    r.lastX = x; r.lastZ = z;
    return b;
  }
  function dropBody(r) {
    const b = r.body; r.body = null; r.rec.b = null; r.rec.alive = false;
    if (!b || b.dead) return; // dead ones fade out as angels
    scene.remove(b.g); const i = zombies.indexOf(b); if (i >= 0) zombies.splice(i, 1);
  }
  function spawn(m) {
    if (m.pid === pid) {
      alive = true; readySent = false; respawnAt = 0; api.banner = '';
      respawnYou(m.x, m.z, m.yaw ?? 0); respawnT = 0; P.pos.y = m.y ?? P.pos.y;
      P.hp = m.hp ?? P.max; P.armor = m.armor ?? P.armor;
      return;
    }
    const r = remotes.get(m.pid); if (!r) return;
    spawnBody(r, m.x, m.y ?? 0, m.z, m.yaw ?? 0);
  }
  const bodyOf = who => who === pid ? null : remotes.get(who)?.body ?? null;
  const recOf = who => who === pid ? youRec : remotes.get(who)?.rec ?? null;
  const centre = new THREE.Vector3();
  function damage(m) {
    const pt = m.p ? centre.set(m.p[0], m.p[1], m.p[2]) : null;
    if (m.v === pid) {
      const armorOnly = m.armor < P.armor && m.hp >= P.hp - 1e-6 && m.d > 0;
      P.hp = m.hp; P.armor = m.armor;
      if (!alive) return;
      youHitFx(!!m.head, armorOnly);
      if (slows(BASE[gi(m.gun)])) shockHit(P, BASE[gi(m.gun)]);
      if (m.launch && !m.launch[4]) launch(P, new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z), new THREE.Vector3(m.launch[1], m.launch[2], m.launch[3]), m.launch[0], false, BASE[gi(m.gun)]?.launch); // someone else's blast throws you
      return;
    }
    const r = remotes.get(m.v); if (!r) return;
    r.rec.alive = true;
    const b = r.body; if (!b) return;
    b.hp = Math.max(m.hp, b.dead ? 0 : .01); b.armor = m.armor;
    if (slows(BASE[gi(m.gun)])) shockHit(b, BASE[gi(m.gun)]); // host bots run slower
    if (m.launch && !m.launch[4] && r.rec.hostBot && !b.dead) launch(b, b.g.position.clone().setY(b.g.position.y + 1), new THREE.Vector3(m.launch[1], m.launch[2], m.launch[3]), m.launch[0], false, BASE[gi(m.gun)]?.launch); // a blast or a hammer throws my bot
    if (r.rec.hostBot && m.by && m.by !== m.v) { // my bot remembers who's hurting it
      const who = m.by === pid ? YOU_T : bodyOf(m.by);
      if (who) { if (b.hitBy !== who || b.hitByT <= 0) b.hitDmg = 0; b.hitBy = who; b.hitByT = 2; b.hitDmg += m.d; }
    }
    if (m.by === pid) return; // your own hits already showed
    hitFx(b, pt ? pt.clone() : b.g.position.clone().setY(b.g.position.y + 1.1), !!m.head, m.kind === 'burn');
  }
  function died(m) {
    const killer = m.by && m.by !== m.v ? recOf(m.by) : null, victim = recOf(m.v);
    if (victim) {
      feed(killer ? `${nameTag(killer)} ${m.head ? ico('head') : ico('skull')} ${nameTag(victim)}` : `${nameTag(victim)} ${ico('skull')}`);
      const st = killer && STREAKS[m.streak]; if (st) feed(`${nameTag(killer)} <b style="color:#8ff0b6">${st[1]}!</b>`);
    }
    if (m.by === pid && m.v !== pid) {
      killNotice(`KILL${m.head ? ' · HEADSHOT' : ''}`, m.streak, m.head); hitMarker('kill');
    } else if ((m.assists || []).includes(pid)) toast('+15 ASSIST', '#e8e8e8');
    if (m.v === pid) {
      alive = false; readySent = false; respawnAt = m.respawnAt || now() + 3000;
      if (!m.drowned) { P.hp = 0; youDownFx(bodyOf(m.by)); }
      else if (respawnT <= 0) youDownFx(null);
      return;
    }
    const r = remotes.get(m.v); if (!r) return;
    r.respawnAt = m.respawnAt || now() + 3000; r.readyAt = 0;
    const b = r.body; if (!b) { r.rec.alive = false; return; }
    b.hp = 0; b.dead = .0001; b.drowned = !!m.drowned;
    botDownFx(b, !!m.drowned);
    r.body = null; r.rec.b = null; r.rec.alive = false;
  }
  function score(rows) {
    for (const [who, sc, k, d, a, st] of rows || []) { const rec = recOf(who); if (rec) { rec.score = sc; rec.kills = k; rec.deaths = d; rec.assists = a; rec.streak = st; } }
    lastBoard = ''; lastTop = '';
  }
  function over(m) {
    score(m.rows);
    const ranks = m.ranks || [], place = Math.max(1, ranks.indexOf(pid) + 1);
    const lead = m.teams ? Math.sign((m.teams[myTeamRaw] | 0) - (m.teams[1 - myTeamRaw] | 0)) : 0;
    const won = MR.team ? lead > 0 : place === 1, [xp, gold] = m.rewards?.[pid] || [0, 0];
    phase = 'over'; alive = false; api.banner = ''; forgetBack();
    endMatch({ place, won, xp, gold, lead, priv: !!m.priv });
    if (typeof frPostButtons === 'function') frPostButtons(); // + ADD buttons
  }
  // pickup pads: the server stocks them and says who got what
  const padPos = new THREE.Vector3();
  function padMsg(m) {
    const p = pads[m.i]; if (!p) return;
    clearPad(p); p.claimAt = 0;
    if (m.type) spawnPickup(p, m.type);
    else if (m.by !== pid) sfx(m.was === 'health' ? 'pickHealth' : m.was === 'armor' ? 'pickArmor' : 'pickAmmo', { at: padPos.set(p.x, .6, p.z), far: 18, v: .6 }); // someone else grabbed it
  }
  // by = one of my bots, otherwise me
  function pick(p, by) {
    if (!api.on || !p.item) return;
    let byPid = 0;
    if (by) { if (!hostedOf(by)) return; byPid = by.pid; }
    else if (!alive || !canPickup(p.type)) return;
    const t = localNow(); if (p.claimAt && t - p.claimAt < 1200) return; // already asked
    p.claimAt = t;
    const m = { t: 'pick', i: pads.indexOf(p) }; if (byPid) m.by = byPid;
    send(m);
  }
  function botPicked(m) { // the server gave a pickup to one of my bots
    const b = remotes.get(m.by)?.body; if (!b || b.dead) return;
    b.hp = m.hp; b.armor = m.armor;
    sfx(m.type === 'health' ? 'pickHealth' : m.type === 'armor' ? 'pickArmor' : 'pickAmmo', { at: b.g.position, far: 25, v: .7 });
  }
  // the server rejected our position: snap back
  function warped(m) {
    if (m.by) { const b = remotes.get(m.by)?.body; if (b && !b.dead) { b.g.position.set(m.x, m.y, m.z); b.g.position.lag = 0; b.vy = 0; b.lx = b.lz = 0; } return; }
    if (!alive) return;
    P.pos.set(m.x, m.y, m.z); P.pos.lag = 0; P.vy = 0; P.kx = P.kz = P.lx = P.lz = P.mvx = P.mvz = 0;
  }
  // room bots: one player hosts their AI, the server owns their health
  const hostedOf = by => { const r = by && by.pid ? remotes.get(by.pid) : null; return r && r.rec.hostBot && r.body ? r : null; };
  // bot levels rolled once per room
  let skillPool = null;
  function hostRec(rec) { rec.hostBot = true; rec.remote = false; rec.taste = tasteFor(rec.load); rec.wait = Infinity; skillPool ??= rollSkills(7); rec.skill = skillPool.length ? skillPool.pop() : SKILL_MID; }
  function setHost(h) {
    hostPid = h | 0;
    const mine = hostPid === pid;
    if (mine) skillPool = null;
    for (const r of remotes.values()) {
      if (!r.rec.bot || mine === !!r.rec.hostBot) continue;
      const b = r.body, live = !!b && !b.dead;
      const pos = live ? b.g.position.clone() : null, yaw = live ? b.aimYaw : 0, hp = live ? b.hp : 0, armor = live ? b.armor : 0;
      if (mine) hostRec(r.rec); else { r.rec.hostBot = false; r.rec.remote = true; }
      if (!live) continue;
      dropBody(r); // the bot carries on from where it stands
      const nb = spawnBody(r, pos.x, pos.y, pos.z, wrapAng(yaw - Math.PI));
      nb.hp = hp; nb.armor = armor;
    }
  }
  function fill(n) { // make bots for empty slots
    if (hostPid !== pid || !api.on || n <= 0) return;
    const next = nameMaker(recs.map(r => r.name)), bots = [];
    for (let i = 0; i < Math.min(n, 7); i++) {
      const name = next().name, [sr, sg, sb] = BOT_LOOKS[(recs.length + i) % BOT_LOOKS.length].shirt;
      bots.push({ name, look: randomLook(name, sr << 16 | sg << 8 | sb), gear: botGearNet() });
    }
    send({ t: 'bot+', bots });
  }
  function hostTick() { // ask the server to spawn my bots that need a body
    const t = now(), lt = localNow();
    for (const r of remotes.values()) {
      if (!r.rec.hostBot || r.body) continue;
      if (r.respawnAt && t < r.respawnAt - 150 || r.readyAt && lt - r.readyAt < 3000) continue;
      r.readyAt = lt;
      const spots = spawnSpots(r.rec, 5).map(([x, z]) => [r2(x), r2(z), r3(Math.atan2(x, z)), r2(groundAt(x, z, .35, floorY(x, z)))]);
      send({ t: 'ready', by: r.rec.pid, spots });
    }
  }
  const botEye = new THREE.Vector3();
  function remoteFire(m) {
    const i = gi(m.g); if (i === undefined || !m.o || !m.d) return;
    const w = WEAPONS[i], by = bodyOf(m.pid), from = new THREE.Vector3(...m.o), dir = new THREE.Vector3(...m.d).normalize();
    (w.rocket ? fireRocket : w.flare ? fireFlare : w.grenade ? fireGrenade : null)?.(w, from, dir, by, { ghost: true, id: m.pid * 100000 + m.id });
  }
  function remoteBoom(m) {
    const id = m.pid * 100000 + m.id, p = new THREE.Vector3(...m.p);
    let kind = 'rocket', gust = false;
    for (const list of [rockets, flares, grenades]) {
      const k = list.findIndex(x => x.ghost && x.id === id);
      if (k >= 0) { kind = list === flares ? 'flare' : 'rocket'; gust = !!list[k].gust; scene.remove(list[k].m); list.splice(k, 1); break; }
    }
    if (kind === 'rocket') blastFx(p, ROCKET_R, gust);
    else flareFx(p);
  }

  // positions coming in, drawn a little in the past
  function snap(m) {
    const st = m[1];
    for (let i = 2; i < m.length; i++) {
      const [who, ts, x, y, z, yaw, pitch, gun, flags, fd, burn] = m[i];
      if (who === pid) continue;
      const r = remotes.get(who); if (!r || r.rec.hostBot) continue; // my own bots don't come back to me
      r.rec.alive = true;
      if (!r.body) spawnBody(r, x, y, z, yaw); // joined before their spawn reached us
      const buf = r.buf;
      if (buf.length && ts <= buf[buf.length - 1].ts) continue; // out of order
      buf.push({ ts, x, y, z, yaw: bodyYaw(yaw), pitch, gun, flags });
      while (buf.length > 2 && buf[1].ts < st - NET_HIST) buf.shift();
      r.fired += fd | 0; r.burn = burn | 0;
      const rl = !!(flags & 2); if (rl && !r.reloadWas) r.q |= 2; r.reloadWas = rl;
      if (flags & 64) r.q |= 64;
    }
  }
  const dirV = new THREE.Vector3(), fv = new THREE.Vector3(), eyeV = new THREE.Vector3(), beamRay = new THREE.Raycaster();
  function applyRemote(z, dt) {
    const r = remotes.get(z.pid); if (!r || r.body !== z) return;
    const buf = r.buf, t = renderT;
    let x, y, zz, yaw, pitch, cur = buf[buf.length - 1];
    let a = null, b = null;
    for (let i = buf.length - 1; i >= 0; i--) if (buf[i].ts <= t) { a = buf[i]; b = buf[i + 1] || null; break; }
    // seenT: when it's drawn, for checking hits
    if (a && b) {
      const k = Math.min(1, (t - a.ts) / Math.max(1, b.ts - a.ts)); r.seenT = a.ts + (b.ts - a.ts) * k;
      x = a.x + (b.x - a.x) * k; y = a.y + (b.y - a.y) * k; zz = a.z + (b.z - a.z) * k;
      yaw = a.yaw + wrapAng(b.yaw - a.yaw) * k; pitch = a.pitch + (b.pitch - a.pitch) * k; cur = a;
    } else if (a) { // past the newest position: coast, then stop
      const prev = buf[buf.length - 2], over = Math.min(50, t - a.ts) / 1000;
      const vx = prev && a.ts > prev.ts ? (a.x - prev.x) / ((a.ts - prev.ts) / 1000) : 0, vz = prev && a.ts > prev.ts ? (a.z - prev.z) / ((a.ts - prev.ts) / 1000) : 0;
      x = a.x + vx * over; y = a.y; zz = a.z + vz * over; yaw = a.yaw; pitch = a.pitch; cur = a; r.seenT = a.ts + over * 1000;
    } else { r.seenT = cur.ts; x = cur.x; y = cur.y; zz = cur.z; yaw = cur.yaw; pitch = cur.pitch; }
    const pos = z.g.position, sp = Math.hypot(x - r.lastX, zz - r.lastZ) / Math.max(dt, 1e-3);
    r.lastX = x; r.lastZ = zz;
    pos.set(x, y, zz); pos.lag = 0;
    z.aimYaw = yaw; z.aimPitch = pitch;
    z.g.rotation.y = yaw - z.holdTurn; z.headPiv.rotation.y = z.holdTurn; z.headPiv.rotation.x = z.aim.rotation.x = -pitch;
    const grounded = !!(cur.flags & 8);
    if (sp > .4) { // legs and footsteps
      z.t += dt * 6 * 2.2 * Math.min(1.3, sp / 6);
      z.pivL.rotation.x = Math.sin(z.t) * .6; z.pivR.rotation.x = -Math.sin(z.t) * .6;
      const ph = Math.sin(z.t) > 0;
      if (ph !== z.stepPh) { z.stepPh = ph; if (grounded) sfx('step_' + FOOT_OK(surfaceAt(pos.x, pos.z, z.r, pos.y)) + (ph ? '' : '2'), { at: pos, far: 22, v: .8 }); }
    } else { z.pivL.rotation.x *= .8; z.pivR.rotation.x *= .8; }
    if (cur.gun !== BASE[z.gun].id) { const i = gi(cur.gun); if (i !== undefined) { z.gun = i; z.ammo = 1; holdGun(z); sfx('equip', { at: pos, far: 15, v: .7 }); } }
    const W = BASE[z.gun];
    // their reload animation and sound
    const rlT = z.rec.W?.[z.gun]?.reload ?? W.reload;
    if (r.q & 2) { if (!W.inf) sfx('r_' + W.id, { at: pos, far: 25, v: .8 }); z.rlLeft = W.inf || W.melee ? 0 : rlT; }
    if (!r.reloadWas) z.rlLeft = 0;
    if (z.rlLeft > 0) z.rlLeft = Math.max(0, z.rlLeft - dt);
    holdReload(z, z.rlLeft, rlT); wandHold(z, dt);
    if (r.q & 64) { sfx('djump', { at: pos, far: 20, v: .7 }); burst(fv.set(pos.x, pos.y + .1, pos.z), 0xe8eef2, 5); }
    r.q = 0;
    if (r.fired) {
      const n = Math.min(r.fired, 3); r.fired = 0;
      if (W.melee) { sfx(W.swing || 'swing', { at: pos, far: 20 }); z.stab = KNIFE_SWING; }
      else if (!W.flame && !W.beam) { z.muzzle = flashTime(W); for (let k = 0; k < n; k++) sfx(W.id, { at: pos, far: W.quiet ? 35 : 100 }); if (z.flashM) muzzleBits(W, z.flashM); }
      if (W.lance) { eyeV.set(pos.x, pos.y + 1.6, pos.z); aimDir(yaw, pitch, dirV); showLance(z.flashM.getWorldPosition(fv).clone(), lanceLine(eyeV, dirV, W, [ground, ...crateMeshes]), W.lance); } // their beam, just for show
    }
    z.muzzle -= dt; z.flashM.visible = z.muzzle > 0;
    z.stab = Math.max(0, z.stab - dt); knifeChop(z);
    if (z.spin) { if (z.muzzle > 0) z.spinV = 30; z.spin.rotation.z += z.spinV * dt; z.spinV = Math.max(0, z.spinV - dt * 25); }
    if (z.round) z.round.visible = true;
    // flame and heat ray stay on while they hold fire
    const firing = !!(cur.flags & 4) && (W.flame || W.beam);
    if (firing) {
      eyeV.set(pos.x, pos.y + 1.6, pos.z); aimDir(yaw, pitch, dirV); z.flashM.getWorldPosition(fv);
      if (W.flame) {
        if (!(z.fireOn > 0)) sfx('flameStart', { at: pos, far: 50 });
        z.fireOn = .2; z.fireEnd = 'flameEnd';
        for (let k = 0; k < 2; k++) {
          const m = new THREE.Mesh(flameGeo, flameMats[Math.random() * 3 | 0]); m.position.copy(fv); scene.add(m);
          const v = dirV.clone().multiplyScalar(13).add(new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(2.5));
          flames.push({ m, v, life: .45 });
        }
      } else {
        if (!(z.fireOn > 0)) sfx(W.frost ? 'frostStart' : 'heatStart', { at: pos, far: 50 });
        z.fireOn = .2; z.fireEnd = W.frost ? 'frostEnd' : 'heatEnd';
        beamRay.set(eyeV, dirV); beamRay.far = W.range || 30;
        const hit = beamRay.intersectObjects(targetsFor(z), false)[0];
        showBeam(z, fv.clone(), hit ? hit.point : eyeV.clone().addScaledVector(dirV, beamRay.far), beamKind(W));
      }
    }
    if (z.fireOn > 0 && (z.fireOn -= dt) <= 0) sfx(z.fireEnd, { at: pos, far: 50 });
    z.flash -= dt;
    const e = z.flash > 0 ? 0x880000 : r.burn ? (Math.sin(performance.now() * .03) > 0 ? 0x993300 : 0x441100) : 0;
    z.mats.forEach(m => m.emissive.setHex(e));
  }

  // send your position 20 times a second, with shots and hits
  function sendState() {
    if (!api.on || !ws || ws.readyState !== 1 || !welcomed || inLobby || document.hidden) return; // hidden tab sends nothing, the server marks you afk
    if (ws.bufferedAmount > 8192) return; // the connection is stuck: don't pile up moves behind it
    let flags = evFlags; evFlags = 0;
    if (aiming) flags |= 1; if (reloading > 0) flags |= 2; if (locked && held('shoot')) flags |= 4; if (P.onGround) flags |= 8;
    if (P.drownFlag) { flags |= 128; P.drownFlag = false; }
    const h = hits; hits = [];
    const f = fired; fired = 0;
    clock.off += Math.max(-3, Math.min(3, clock.target - clock.off)); // slide, don't jump
    const tc = lastTc = Math.max(lastTc + 1, Math.round(now()));
    // my bots ride along in my packets
    const botRows = [];
    if (hostPid === pid) for (const r of remotes.values()) {
      if (!r.rec.hostBot) continue;
      const b = r.body;
      if (!b || b.dead) { r.fired = 0; r.hits = []; continue; }
      let bf = 0; if (!b.vy) bf |= 8; if (b.fireOn > 0) bf |= 4; if (b.reload > 0) bf |= 2; if (b.aimT > 0) bf |= 1;
      if (b.drownFlag) { bf |= 128; b.drownFlag = false; }
      const q = b.g.position;
      botRows.push([r.rec.pid, r3(q.x), r3(q.y), r3(q.z), r3(wrapAng(b.aimYaw - Math.PI)), r3(b.aimPitch), BASE[b.gun].id, bf, r.fired, r.hits]);
      r.fired = 0; r.hits = [];
    }
    send(['s', ++seq, tc, r3(P.pos.x), r3(P.pos.y), r3(P.pos.z), r3(P.yaw), r3(P.pitch), BASE[cur].id, flags, f, h, botRows]);
  }
  setInterval(sendState, NET_RATE);
  // armory changes mid-match get sent to the server
  let gearT = 0;
  function gearChanged() { if (!api.on || !welcomed) return; clearTimeout(gearT); gearT = setTimeout(() => send({ t: 'gear', gear: myGear() }), 150); }
  const onSave0 = onSave; onSave = () => { onSave0(); gearChanged(); };
  setInterval(() => { if (api.on) send({ t: 'ping', c: localNow() }); }, 1000);
  document.addEventListener('visibilitychange', () => { if (document.hidden && api.on) send({ t: 'afk' }); });
  // o.by = the bot of mine that did it
  function claim(victim, o = {}) {
    if (!api.on) return;
    const vp = victim === P ? pid : victim?.pid; if (!vp) return;
    const h = hostedOf(o.by); if (o.by && !h) return;
    const list = h ? h.hits : hits;
    const pt = o.point || (victim === P ? centre.set(P.pos.x, P.pos.y + 1, P.pos.z) : victim.g.position), kind = o.kind | 0, gun = o.gun || BASE[cur].id;
    const eye = h ? botEye.set(h.body.g.position.x, h.body.g.position.y + 1.6, h.body.g.position.z) : camera.position;
    if (kind === 0) { // one claim per shot and victim (pellets add up)
      const same = list.find(c => c.s === shotN && c[0] === vp && c[6] === 0 && c[7] === gun && c[2] === (o.head ? 1 : 0) && c[12] === (o.pj | 0));
      if (same) { same[1] += o.pellets ?? 1; return; }
    }
    // where the victim was when you saw it
    const r = remotes.get(vp), seen = r && r.body === victim && r.seenT ? r.seenT : now();
    const c = [vp, o.pellets ?? 1, o.head ? 1 : 0, r2(pt.x), r2(pt.y), r2(pt.z), kind, gun, r2(eye.x), r2(eye.y), r2(eye.z), Math.round(seen), o.pj | 0, o.thru | 0]; // thru: how a lance got there
    c.s = shotN; list.push(c);
  }
  const burn = (victim, gunId, by) => claim(victim, { kind: 7, gun: gunId, pellets: 1, by });
  function launchP(gunId, from, dir, by) {
    if (!api.on) return 0;
    const h = hostedOf(by); if (by && !h) return 0;
    const id = ++pjSeq, m = { t: 'fire', id, g: gunId, o: [r2(from.x), r2(from.y), r2(from.z)], d: [r3(dir.x), r3(dir.y), r3(dir.z)] };
    if (h) m.by = by.pid;
    send(m);
    return id;
  }
  const boom = (id, p, by) => { if (!api.on || !id) return; const m = { t: 'boom', id, p: [r2(p.x), r2(p.y), r2(p.z)] }; if (by && by.pid) m.by = by.pid; send(m); };

  // spawning: once your mouse is locked
  function tryReady() {
    if (!api.on || alive || readySent && localNow() - readyT < 3000 || !welcomed) return;
    if (respawnAt && now() < respawnAt - 150) return;
    // a few free spots, the server picks the farthest from enemies
    const spots = spawnSpots(YOU_T, 5).map(([x, z]) => [r2(x), r2(z), r3(Math.atan2(x, z)), r2(groundAt(x, z, .35, floorY(x, z)))]);
    send({ t: 'ready', spots, x: spots[0][0], z: spots[0][1], yaw: spots[0][2], y: spots[0][3] });
    readySent = true; readyT = localNow(); api.banner = 'SPAWNING…';
  }
  function onLock(isLocked) { if (!api.on) return; if (isLocked) tryReady(); }

  // match HUD from the server
  function matchTick(dt) {
    if (!api.on) return;
    renderT = now() - interpDelay();
    if (hostPid === pid) hostTick();
    matchT = phase === 'play' ? Math.max(0, (matchEnd - now()) / 1000) : MR.t;
    if (!alive) {
      if (respawnAt) {
        const left = (respawnAt - now()) / 1000;
        respawnT = Math.max(left, .01);
        if (left <= .15) { api.banner = locked ? 'RESPAWNING…' : 'CLICK TO RESPAWN'; if (locked) tryReady(); }
        else api.banner = '';
      } else if (!readySent) api.banner = locked ? 'JOINING…' : 'CLICK TO PLAY';
      if (respawnT <= 0) respawnT = .01;
    }
    const sec = Math.max(0, Math.ceil(matchT));
    if (phase === 'play' && sec <= 10 && sec !== lastSec && sec > 0) sfx('tick');
    lastSec = sec;
    const place = ranked().indexOf(youRec) + 1, others = remotes.size;
    const clockHtml = (phase !== 'play' ? `<div class="clock">${others ? 'STARTING SOON' : 'WAITING FOR PLAYERS'}</div>` : `<div class="clock${sec <= 10 ? ' low' : ''}">${sec / 60 | 0}:${String(sec % 60).padStart(2, '0')}</div>`)
      + (phase === 'play' && !others ? '<div class="place">WAITING FOR PLAYERS</div>' : ''); // alone: the server ends the match in 30 s unless someone joins
    const top = clockHtml + (MR.team
      ? `<div class="teams"><b style="color:${TEAMS[0].css}">${TEAMS[0].name} ${teamKills(0)}</b>–<b style="color:${TEAMS[1].css}">${teamKills(1)} ${TEAMS[1].name}</b></div><div class="place">YOU: ${youRec.kills} KILLS</div>`
      : `<div class="place">${ord(place)} OF ${recs.length}  ·  ${MR.kills ? '' : youRec.score + ' PTS  ·  '}${youRec.kills} KILLS</div>`)
      + (code && (phase !== 'play' || !others) ? `<div class="place">ROOM CODE ${code}</div>` : '');
    if (top !== lastTop) { $('top').innerHTML = lastTop = top; }
    const show = held('board');
    $('board').style.display = show ? 'grid' : 'none';
    if (show) { const h = boardHTML(); if (h !== lastBoard) $('board').innerHTML = lastBoard = h; }
  }

  // lobby: join links and the room code
  const joinParam = (new URLSearchParams(location.search).get('join') || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
  if (cg.on) { // CrazyGames invite links and instant multiplayer
    const inv = fromInvite(cgCall(s => s.game.inviteParams)), instant = !inv && cgCall(s => s.game.isInstantMultiplayer);
    const go = () => {
      if (document.body.classList.contains('boot')) return setTimeout(go, 300);
      if (inv) return start(inv);
      const m = PLAY_MODES.find(m => m.id === mode && m.id !== 'zombies') || PLAY_MODES.find(m => m.id !== 'zombies'); // instant multiplayer: a private room of your usual mode
      start({ mode: m.id, map: m.maps?.includes(mapId) ? mapId : m.maps?.[0] || mapId, create: true });
    };
    if (inv || instant) setTimeout(go, 300);
    // joining a friend while the game's already open
    cgCall(s => s.game.addJoinRoomListener(p => { const o = fromInvite(p); if (!o || (api.on && (o.code ? o.code === code : o.room === room))) return; if (api.on) leave(); start(o); }));
  } else if (joinParam.length === 6) {
    $('joinCode').textContent = joinParam; $('joinBtn').style.display = '';
    $('joinBtn').addEventListener('click', () => { $('joinBtn').style.display = 'none'; sfx('ui'); start({ code: joinParam }); });
  }
  $('inviteBtn').addEventListener('click', e => {
    e.stopPropagation();
    if (!code) return;
    const url = cg.on ? cgCall(s => s.game.inviteLink({ join: code })) : location.origin + location.pathname + '?join=' + code;
    navigator.clipboard?.writeText(url).then(() => netToast('Invite link copied'), () => netToast(url, 6000));
    sfx('ui');
  });
  $('roomRow').addEventListener('click', e => e.stopPropagation());
  setTimeout(probe, 300);

  Object.assign(api, {
    now, start, again, leave, onLock, claim, burn, shot: (w, by) => { if (!api.on) return; shotN++; if (by) { const h = hostedOf(by); if (h) h.fired++; } else fired++; }, launch: launchP, boom, ev: k => { if (api.on) evFlags |= k === 'djump' ? 64 : 32; },
    matchTick, applyRemote, roster: () => { recs = roster.recs; youRec = roster.youRec; }, chat: text => send({ t: 'chat', text }), report: (pid, why) => send({ t: 'report', pid, why }), probe, pick,
  });
  Object.defineProperties(api, { // read live
    pid: { get: () => pid }, phase: { get: () => phase }, alive: { get: () => alive }, players: { get: () => remotes.size + 1 }, rtt: { get: () => clock.rtt }, room: { get: () => api.on ? room : '' }, host: { get: () => api.on && hostPid === pid },
  });
  return api;
})();
