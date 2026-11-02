// Cloud saves: signing in keeps your level, XP, coins, guns, loadout, look, name and zombie best the same on every device.
// Controls, sensitivity, volume and the last map you picked stay per device.
// The server keeps a revision number that goes up on every save. A device only overwrites the cloud copy if nobody
// else saved since it last synced; if someone did, whichever copy has more total progress wins.
const CLOUD = 'https://sync.gemforge.org';
let auth = null, sync = { user: null, rev: 0, dirty: false };
try { auth = JSON.parse(localStorage.getItem('voxelstrike-auth')); } catch {}
try { sync = { ...sync, ...JSON.parse(localStorage.getItem('voxelstrike-sync')) }; } catch {}
const saveSync = () => { try { localStorage.setItem('voxelstrike-sync', JSON.stringify(sync)); } catch {} };
let changes = 0, busy = false, pushTimer = 0, cloudState = '', applying = false;

// lifetime coins earned, for comparing progress. Older saves didn't track it, so estimate it from coins + what the guns cost.
if (prof.earned == null) {
  let spent = 0;
  for (const w of BASE) {
    const s = prof.guns[w.id] ?? 0;
    if (!w.start && s) { spent += w.price; for (let k = 1; k < s; k++) spent += Math.round(w.price * UPG[k - 1]); }
  }
  prof.earned = prof.coins + spent;
  try { localStorage.setItem('voxelstrike-profile', JSON.stringify(prof)); } catch {}
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
  Object.assign(prof, { v: 1, lv: 1, xp: 0, coins: 0, earned: 0, guns: {}, loadout: {} }, s.prof);
  prof.guns = { ...prof.guns }; prof.loadout = { ...prof.loadout };
  if (!prof.look) prof.look = { ...PRESETS[0].look };
  try { localStorage.setItem('voxelstrike-profile', JSON.stringify(prof)); } catch {}
  const n = cleanName(s.name);
  if (n) { myName = n; $('nameIn').value = n; try { localStorage.setItem('voxelstrike-name', n); } catch {} }
  if (!keepBest && s.best) { best = { wave: s.best.wave | 0, kills: s.best.kills | 0 }; try { localStorage.setItem('voxelstrike-best', JSON.stringify(best)); } catch {} }
  showProf(); showBest(); dressHero();
  if (armOpen) renderArmory();
  applying = false;
  if (keepBest) markDirty(); // this device has a better zombie run than the cloud copy
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
  auth = null; sync = { user: sync.user, rev: 0, dirty: false }; // remembers whose progress is on this device
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

// the cloud copy changed under us: keep whichever side has more progress
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

// ---- account box in the lobby ----
function renderAcct() {
  const el = $('acct');
  if (!auth) { el.innerHTML = '<button id="acctBtn">☁ SIGN IN TO SAVE PROGRESS</button>'; return; }
  const st = { saving: 'SAVING…', saved: 'SAVED', offline: 'OFFLINE · SAVES LATER' }[cloudState] ?? '';
  el.innerHTML = `<span>☁ <b>${auth.user}</b></span><small class="${cloudState}">${st}</small><button id="acctOut">SIGN OUT</button>`;
}
$('acct').addEventListener('click', async e => {
  if (e.target.id === 'acctBtn') { $('acctErr').textContent = ''; $('acctBox').style.display = 'flex'; $('acctUser').focus(); sfx('ui'); }
  if (e.target.id === 'acctOut') {
    if (sync.dirty) await push();
    api('POST', '/logout').catch(() => {});
    signedOut(); sfx('ui');
  }
});
const closeAcct = () => { $('acctBox').style.display = 'none'; $('acctPass').value = ''; };
$('acctX').addEventListener('click', closeAcct);
$('acctBox').addEventListener('keydown', e => {
  if (e.code === 'Escape') closeAcct();
  if (e.code === 'Enter' || e.code === 'NumpadEnter') acctGo('login');
});
$('acctIn').addEventListener('click', () => acctGo('login'));
$('acctNew').addEventListener('click', () => acctGo('signup'));

async function acctGo(how) {
  const user = $('acctUser').value.trim(), pass = $('acctPass').value;
  if (!user || !pass) { $('acctErr').textContent = 'Enter a username and password'; return; }
  $('acctErr').textContent = how === 'signup' ? 'Creating account…' : 'Signing in…';
  let r;
  try { r = await api('POST', '/' + how, how === 'signup' ? { user, pass, save: snapshot() } : { user, pass }); }
  catch { $('acctErr').textContent = "Can't reach the server. Check your connection"; return; }
  if (!r.token) { $('acctErr').textContent = r.error || 'Something went wrong'; return; }
  const otherAccount = sync.user && sync.user.toLowerCase() !== r.user.toLowerCase();
  auth = { user: r.user, token: r.token };
  try { localStorage.setItem('voxelstrike-auth', JSON.stringify(auth)); } catch {}
  closeAcct(); sfx('buy');
  sync = { user: r.user, rev: 0, dirty: false };
  if (how === 'signup' || !r.save) { sync.rev = r.rev; saveSync(); if (!r.save) await push(); else setState('saved'); return; }
  // signing in on a device that already has progress: the bigger save wins, unless this device was synced to a different account
  if (otherAccount || progress(r.save.prof) >= progress(prof)) { applySave(r.save); sync.rev = r.rev; saveSync(); setState('saved'); }
  else { sync.rev = r.rev; saveSync(); await push(); }
}

renderAcct();
if (auth) { if (sync.user !== auth.user) { sync.user = auth.user; saveSync(); } pull(); }
// pick up progress from your other devices when you come back to this tab or sit in the lobby
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pull();
  else if (sync.dirty) push(true); // closing or switching away: send anything unsaved
});
setInterval(() => { if (inLobby && !document.hidden) { if (sync.dirty) push(); else pull(); } }, 30000);
