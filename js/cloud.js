// cloud saves: newest save wins, or the one with more progress if both changed
const CLOUD = /[?&]srv=(https?:\/\/[\w.:-]+)/.exec(location.search)?.[1] || 'https://sync.gemforge.org'; // ?srv= points at another server
let auth = null, sync = { user: null, rev: 0, dirty: false };
try { auth = DEV_ALL ? null : JSON.parse(localStorage.getItem('voxelstrike-auth')); } catch {}
devAll();
try { sync = { ...sync, ...JSON.parse(localStorage.getItem('voxelstrike-sync')) }; } catch {}
const saveSync = () => { try { localStorage.setItem('voxelstrike-sync', JSON.stringify(sync)); } catch {} };
let changes = 0, busy = false, pushTimer = 0, cloudState = '', applying = false;
let onAuth = () => {}; // set by friends.js

// lifetime coins, estimated for old saves
if (prof.earned == null) {
  let spent = 0;
  for (const w of BASE) {
    const s = prof.guns[w.id] ?? 0;
    if (!w.start && s) { spent += w.price; for (let k = 1; k < s; k++) spent += Math.round(w.price * UPG[k - 1]); }
  }
  prof.earned = prof.coins + spent;
  try { localStorage.setItem(PROF_KEY, JSON.stringify(prof)); } catch {}
}
function progress(p) {
  if (!p) return -1;
  let xp = p.xp | 0;
  for (let l = 1; l < (p.lv | 0); l++) xp += xpNeed(l);
  return xp + (p.earned | 0);
}
const snapshot = () => ({ v: 1, prof: JSON.parse(JSON.stringify(prof)), name: myName, best: { ...best } });
const better = (a, b) => (a.wave | 0) > (b.wave | 0) || ((a.wave | 0) === (b.wave | 0) && (a.kills | 0) > (b.kills | 0));

function applySave(s) {
  if (!s || typeof s.prof !== 'object') return;
  applying = true;
  const keepBest = better(best, s.best || {});
  for (const k of Object.keys(prof)) delete prof[k];
  Object.assign(prof, { v: 1, lv: 1, xp: 0, coins: 0, earned: 0, guns: {}, loadout: {}, use: {}, armor: 0, armorUse: 0, suits: {}, suitUse: {}, armorOn: '', boots: {}, bootUse: {}, bootOn: '', hats: {}, hatUse: {}, hatOn: '' }, s.prof);
  prof.guns = { ...prof.guns }; prof.loadout = { ...prof.loadout }; prof.use = { ...prof.use }; prof.suits = { ...prof.suits }; prof.suitUse = { ...prof.suitUse }; fixArmor(); prof.boots = { ...prof.boots }; prof.bootUse = { ...prof.bootUse }; prof.hats = { ...prof.hats }; prof.hatUse = { ...prof.hatUse };
  if (!prof.look) prof.look = { ...PRESETS[0].look };
  try { localStorage.setItem(PROF_KEY, JSON.stringify(prof)); } catch {}
  const n = cleanName(auth?.cg ? auth.user : s.name); // on CrazyGames your name is your CrazyGames username
  if (n) { myName = n; $('nameIn').value = n; try { localStorage.setItem('voxelstrike-name', n); } catch {} }
  if (!keepBest && s.best) { best = { wave: s.best.wave | 0, kills: s.best.kills | 0 }; try { localStorage.setItem('voxelstrike-best', JSON.stringify(best)); } catch {} }
  showProf(); dressHero(); armIcon();
  if (armOpen) renderArmory();
  applying = false;
  if (keepBest) markDirty(); // this device has a better zombie run
}

async function api(method, path, body, keepalive = false) {
  const h = { 'Content-Type': 'application/json' };
  if (auth) h.Authorization = 'Bearer ' + auth.token;
  const r = await fetch(CLOUD + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, keepalive });
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, ...j };
}

function setState(s) { cloudState = s; renderAcct(); }
function signedOut() {
  auth = null; sync = { user: sync.user, rev: 0, dirty: false }; // remember whose progress is on this device
  try { localStorage.removeItem('voxelstrike-auth'); } catch {}
  saveSync(); setState('');
}
function markDirty() {
  if (applying) return;
  changes++;
  if (!auth) return;
  if (!sync.dirty) { sync.dirty = true; saveSync(); }
  clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500);
  setState('saving');
}
onSave = markDirty;

// the cloud copy changed: keep whichever has more progress
async function resolve(r) {
  if (progress(r.save?.prof) >= progress(prof)) {
    applySave(r.save); sync.rev = r.rev; sync.dirty = false; saveSync(); setState('saved');
  } else {
    sync.rev = r.rev; saveSync(); await push();
  }
}

async function push(keepalive = false) {
  if (!auth || busy) return;
  busy = true;
  const sent = changes;
  try {
    const r = await api('PUT', '/save', { base: sync.rev, save: snapshot() }, keepalive);
    if (r.status === 401) { signedOut(); return; }
    if (r.status === 409) { busy = false; await resolve(r); return; }
    if (r.status !== 200) throw 0;
    sync.rev = r.rev;
    if (changes === sent) sync.dirty = false;
    saveSync(); setState(sync.dirty ? 'saving' : 'saved');
    if (sync.dirty) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); }
  } catch { setState('offline'); }
  finally { busy = false; }
}

async function pull() {
  if (!auth || busy) return;
  busy = true;
  try {
    const r = await api('GET', '/save');
    if (r.status === 401) { signedOut(); return; }
    if (r.status !== 200) throw 0;
    busy = false;
    if (!r.save) { await push(); return; }
    if (r.rev === sync.rev) { if (sync.dirty) await push(); else setState('saved'); return; }
    if (sync.dirty) await resolve(r);
    else { applySave(r.save); sync.rev = r.rev; saveSync(); setState('saved'); }
  } catch { setState('offline'); }
  finally { busy = false; }
}

// account section of settings
function renderAcct() {
  onAuth();
  // grey = guest, green = saved, yellow = saving, red = offline
  const cb = $('cloudBtn'), cs = !auth ? 'guest' : cloudState || 'saving';
  cb.className = cs;
  cb.title = { guest: cg.on ? 'Log in to CrazyGames to save your progress and add friends' : 'Not signed in, click to save your progress', saved: `Saved to ${auth?.user}`, saving: 'Syncing…', offline: "Offline, it'll save when you're back online" }[cs];
  const el = $('acct');
  $('acctForm').style.display = auth ? 'none' : '';
  if (!auth) { el.innerHTML = ''; return; }
  const st = { saving: 'SAVING…', saved: 'SAVED', offline: 'OFFLINE · SAVES LATER' }[cloudState] ?? '';
  el.innerHTML = `<span>Signed in as <b>${auth.user}</b></span><small class="${cloudState}">${st}</small><button id="acctOut">SIGN OUT</button>`;
}
$('acct').addEventListener('click', async e => {
  if (e.target.id === 'acctOut') {
    sfx('ui');
    if (sync.dirty) await push();
    api('POST', '/logout').catch(() => {});
    signedOut();
  }
});
$('acctForm').addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') acctGo('login'); });
$('acctIn').addEventListener('click', () => acctGo('login'));
$('cloudBtn').addEventListener('click', () => {
  sfx('ui');
  if (!cg.on) { showSetTab('account'); openSettings(); return; }
  if (!auth?.cg) { cgCall(s => s.user.showAuthPrompt().then(() => cgSignIn(), () => {})); return; } // CrazyGames' own log in window
  netToast({ saving: 'Saving to your CrazyGames account…', offline: "You're offline, it'll save when you're back" }[cloudState] || 'Your progress is saved to your CrazyGames account');
});
$('acctNew').addEventListener('click', () => acctGo('signup'));

async function acctGo(how) {
  if (DEV_ALL) { $('acctErr').textContent = 'No signing in on the dev profile'; return; }
  const user = $('acctUser').value.trim(), pass = $('acctPass').value;
  if (!user || !pass) { $('acctErr').textContent = 'Enter a username and password'; return; }
  $('acctErr').textContent = how === 'signup' ? 'Creating account…' : 'Signing in…';
  let r;
  try { r = await api('POST', '/' + how, how === 'signup' ? { user, pass, save: snapshot() } : { user, pass }); }
  catch { $('acctErr').textContent = "Can't reach the server. Check your connection"; return; }
  if (!r.token) { $('acctErr').textContent = r.error || 'Something went wrong'; return; }
  $('acctPass').value = ''; $('acctErr').textContent = ''; sfx('buy');
  await signedIn(r, how === 'signup');
}
// save owner key (CrazyGames ids, since their names can change)
const acctKey = a => a.cg ? '#' + a.id : a.user.toLowerCase();
// after signing in: start syncing
async function signedIn(r, fresh) {
  if (DEV_ALL) return;
  auth = { user: r.user, token: r.token, id: r.id, ...(r.cg ? { cg: true, cgId: r.cgId } : {}) };
  try { localStorage.setItem('voxelstrike-auth', JSON.stringify(auth)); } catch {}
  const otherAccount = sync.user && sync.user.toLowerCase() !== acctKey(auth);
  sync = { user: acctKey(auth), rev: 0, dirty: false };
  if (auth.cg) cgLook();
  if (fresh || !r.save) { sync.rev = r.rev; saveSync(); if (!r.save) await push(); else setState('saved'); return; }
  // the bigger save wins, unless this device belonged to another account
  if (otherAccount || progress(r.save.prof) >= progress(prof)) { applySave(r.save); sync.rev = r.rev; saveSync(); setState('saved'); }
  else { sync.rev = r.rev; saveSync(); await push(); }
}

renderAcct();
if (auth && !cg.on) { if (sync.user !== acctKey(auth)) { sync.user = acctKey(auth); saveSync(); } pull(); }

// CrazyGames sign-in: uses their account, no password of ours
async function cgToken() { return cg.sdk.user.getUserToken(); }
let cgBusy = false;
async function cgSignIn() {
  if (!cg.on || cgBusy) return;
  cgBusy = true;
  try {
    let who = null; try { who = await cg.sdk.user.getUser(); } catch {}
    if (!who) { if (auth?.cg) signedOut(); return; } // guest, or just logged out
    if (auth?.cg && auth.cgId === who.__dangerousUserId) { pull(); return; } // still signed in from last time
    let tok = null; try { tok = await cgToken(); } catch {}
    if (!tok) return;
    const r = await api('POST', '/auth/cg', { token: tok, save: snapshot() });
    if (!r.token) { setState('offline'); return; }
    if (auth) api('POST', '/logout').catch(() => {}); // someone else was signed in here
    await signedIn({ ...r, cgId: who.__dangerousUserId }, r.fresh);
  } catch { setState('offline'); }
  finally { cgBusy = false; cgLook(); }
}
function cgLook() {
  const on = cg.on && !!auth?.cg;
  document.body.classList.toggle('cgIn', on);
  $('nameIn').readOnly = on;
  if (on && myName !== auth.user) $('nameIn').value = setMyName(auth.user);
  renderAcct();
}
if (cg.on) {
  if (cg.sdk.user.isUserAccountAvailable) { cgCall(s => s.user.addAuthListener(() => cgSignIn())); cgSignIn(); }
  else document.body.classList.add('cgNoAcct'); // no accounts here, hide the cloud button
  cgLook();
}
// pull progress from other devices when you come back
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (inLobby) pull(); } // not mid-match, it would swap your gear
  else if (sync.dirty) push(true); // leaving the tab: send anything unsaved
});
setInterval(() => { if (inLobby && !document.hidden) { if (sync.dirty) push(); else pull(); } }, 30000);
