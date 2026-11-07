// friends: add by username or #id, see who's online, join and invite
const FR_POLL = 30000, FR_POLL_OPEN = 15000;
let fr = { me: null, friends: [], in: [], out: [], invites: [] }, frAt = -1e9, frBusy = false, frErr = '', frMsg = '', frBad = false, frSure = 0;
const frIds = new Set(), frOut = new Set(), frIn = new Set(); // friends, requests sent, requests received
const frNoticed = new Set(), frHidden = new Set(); // invites already shown or dismissed
const frOpen = () => $('binds').style.display === 'flex' && setTab === 'friends';
const frOnline = () => fr.friends.filter(f => f.on).length;
const modeTitle = id => { const m = PLAY_MODES.find(m => m.id === id); return m ? m.title || m.name : String(id || '').toUpperCase(); };
const whereText = f => `${modeTitle(f.mode)} · ${(MAPS[f.map]?.name || f.map || '').toUpperCase()} · ${f.humans}/${f.cap}`;
function frReset() { fr = { me: null, friends: [], in: [], out: [], invites: [] }; frIds.clear(); frOut.clear(); frIn.clear(); frAt = -1e9; frErr = frMsg = ''; }

async function frPoll(force = false) {
  if (!auth) { if (fr.me) { frReset(); renderFriends(); } return; }
  if (frBusy || !force && performance.now() - frAt < (frOpen() ? FR_POLL_OPEN : FR_POLL)) return;
  frBusy = true;
  try {
    const r = await api('POST', '/friends/list', { name: myName, lobby: !net.on }); // outside a room this doubles as the online heartbeat
    if (r.status === 401) { signedOut(); frReset(); return; }
    if (r.status !== 200) throw 0;
    fr = { me: r.me, friends: r.friends || [], in: r.in || [], out: r.out || [], invites: r.invites || [] }; frErr = ''; frAt = performance.now();
    frIds.clear(); frOut.clear(); frIn.clear();
    for (const f of fr.friends) frIds.add(f.id);
    for (const f of fr.out) frOut.add(f.id);
    for (const f of fr.in) frIn.add(f.id);
    for (const i of fr.invites) { // show new invites
      const k = i.id + ':' + i.room; if (frNoticed.has(k)) continue;
      frNoticed.add(k);
      if (!frHidden.has(k)) { netToast(`${i.name} invited you to ${whereText(i)}, open FRIENDS to join`, 6000); sfx('join'); }
    }
  } catch { frErr = "Can't reach the server"; }
  finally { frBusy = false; renderFriends(); }
}
// one friends call; errors show under the add box
async function frCall(path, body) {
  try {
    const r = await api('POST', '/friends/' + path, body);
    if (r.status === 401) { signedOut(); frReset(); renderFriends(); return null; }
    if (r.status !== 200) { frSay(r.error || 'Something went wrong', true); return null; }
    return r;
  } catch { frSay("Can't reach the server", true); return null; }
}
function frSay(text, bad = false) { frMsg = text; frBad = bad; const el = $('frMsg'); el.textContent = text; el.className = bad ? 'bad' : ''; }
async function frAdd(who) {
  who = String(who ?? '').trim();
  if (!who) { frSay('Type a username or an ID like #123', true); return null; }
  frSay('…');
  const r = await frCall('add', { who });
  if (!r) return null;
  frSay(r.result === 'friends' ? `You and ${r.friend.user} are friends now` : r.result === 'sent' ? `Request sent to ${r.friend.user}` : '');
  if (r.result === 'sent') sfx('ui'); else sfx('buy');
  await frPoll(true);
  return r;
}
// join a friend's match
function frJoin(f) {
  if (!f?.room) return;
  closeBinds(); sfx('ui');
  net.start(f.code ? { code: f.code, friend: f.name } : { room: f.room, mode: f.mode, map: f.map, friend: f.name });
}
async function frAct(act, id, b) {
  const num = +id;
  if (act === 'join') frJoin(fr.friends.find(f => f.id === num));
  else if (act === 'jinv') frJoin(fr.invites.find(f => f.id === num));
  else if (act === 'hide') { frHidden.add(id); renderFriends(); }
  else if (act === 'acc') { if (await frCall('accept', { id: num })) { sfx('buy'); await frPoll(true); } }
  else if (act === 'dec') { if (await frCall('decline', { id: num })) { sfx('ui'); await frPoll(true); } }
  else if (act === 'inv') { if (await frCall('invite', { id: num })) { const f = fr.friends.find(f => f.id === num); frSay(`Invite sent to ${f ? f.name : 'your friend'}`); sfx('ui'); if (b) { b.textContent = 'INVITED'; b.disabled = true; } } }
  else if (act === 'rm') { // first click on the x asks to confirm
    if (frSure !== num) { frSure = num; renderFriends(); return; }
    frSure = 0;
    if (await frCall('remove', { id: num })) { sfx('ui'); await frPoll(true); }
  }
}

// friends page and lobby button
function renderFriends() {
  renderFrBtn();
  const list = $('friends'); if (!list) return;
  $('frAdd').style.display = auth ? '' : 'none';
  $('frMsg').style.display = auth ? '' : 'none';
  if (!auth) { $('frMe').innerHTML = ''; list.innerHTML = `<p class="frNote">Sign in to add friends, see who's online and play together.</p><button data-act="signin">SIGN IN</button>`; return; }
  const me = fr.me;
  $('frMe').innerHTML = me ? `You: <b>${esc(myName)}</b>${me.user.toLowerCase() !== myName.toLowerCase() ? ` <small>@${esc(me.user)}</small>` : ''} · ID <b>#${me.id}</b><small>Friends add you by your username or your ID</small>` : '';
  const btn = (act, id, label, cls = '') => `<button data-act="${act}" data-id="${id}"${cls ? ` class="${cls}"` : ''}>${label}</button>`;
  const who = f => `<b data-card="${f.id}" class="pn">${esc(f.name)}</b>${f.user.toLowerCase() !== f.name.toLowerCase() ? `<small>@${esc(f.user)}</small>` : ''}`;
  const inv = fr.invites.filter(i => !frHidden.has(i.id + ':' + i.room)).map(i =>
    `<div class="frRow on">${who(i)}<span class="st">invited you · ${esc(whereText(i))}</span>${i.humans < i.cap ? btn('jinv', i.id, 'JOIN') : '<span class="full">FULL</span>'}${btn('hide', i.id + ':' + i.room, '✕', 'x')}</div>`).join('');
  const reqs = fr.in.map(f => `<div class="frRow">${who(f)}<span class="st">wants to be friends</span>${btn('acc', f.id, 'ACCEPT')}${btn('dec', f.id, '✕', 'x')}</div>`).join('');
  const order = { match: 0, lobby: 1, '': 2 };
  const rows = [...fr.friends].sort((a, b) => order[a.on] - order[b.on] || a.name.localeCompare(b.name)).map(f => {
    const here = net.on && f.room && f.room === net.room;
    const st = f.on === 'match' ? here ? 'In your match' : whereText(f) : f.on === 'lobby' ? 'Online' : 'Offline';
    const join = f.on === 'match' && !here ? f.humans < f.cap ? btn('join', f.id, 'JOIN') : '<span class="full">FULL</span>' : '';
    const invite = net.on && f.on && !here ? btn('inv', f.id, 'INVITE') : '';
    const rm = frSure === f.id ? btn('rm', f.id, 'REMOVE?', 'x sure') : btn('rm', f.id, '✕', 'x');
    return `<div class="frRow${f.on ? ' on' : ''}">${who(f)}<span class="st">${esc(st)}</span>${join}${invite}${rm}</div>`;
  }).join('');
  const sent = fr.out.map(f => `<div class="frRow">${who(f)}<span class="st">waiting for an answer</span>${btn('rm', f.id, '✕', 'x')}</div>`).join('');
  list.innerHTML = (inv ? `<h2>INVITES</h2>${inv}` : '') + (reqs ? `<h2>REQUESTS</h2>${reqs}` : '')
    + `<h2>FRIENDS · ${frOnline()} ONLINE</h2>` + (rows || (fr.me ? '<p class="frNote">No friends yet. Add someone by their username or ID, or from the results screen after a match.</p>' : ''))
    + (sent ? `<h2>SENT</h2>${sent}` : '') + (frErr ? `<p class="frErr">${esc(frErr)}</p>` : '');
}
function renderFrBtn() { // yellow = requests waiting, green = friends online
  const b = $('frBadge'), waiting = auth ? fr.in.length + fr.invites.filter(i => !frHidden.has(i.id + ':' + i.room)).length : 0, on = auth ? frOnline() : 0;
  b.textContent = waiting ? String(waiting) : on ? String(on) : '';
  b.className = waiting ? 'new' : 'on';
  $('friendsBtn').title = !auth ? 'Sign in to add friends' : waiting ? `${waiting} waiting for you` : `${on} friend${on === 1 ? '' : 's'} online`;
}
$('friends').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.act === 'signin') { showSetTab('account'); sfx('ui'); return; }
  frAct(b.dataset.act, b.dataset.id, b);
});
$('frGo').addEventListener('click', () => { frAdd($('frIn').value).then(r => { if (r) $('frIn').value = ''; }); });
$('frIn').addEventListener('keydown', e => { if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); $('frGo').click(); } });
function openFriends() { showSetTab('friends'); openSettings(); frPoll(true); sfx('ui'); }
$('friendsBtn').addEventListener('click', openFriends);
$('menuFriends').addEventListener('click', e => { e.stopPropagation(); openFriends(); });
$('setTabs').addEventListener('click', e => { if (e.target.closest('button')?.dataset.t === 'friends') { frSure = 0; frPoll(true); } });
// + ADD on the results screen (bots and guests just show SENT)
function frPostButtons() {
  if (!auth || !fr.me) return;
  for (const s of $('postBoard').querySelectorAll('[data-nofid]')) {
    if (s.querySelector('button')) continue;
    const r = recs.find(r => r.pid === +s.dataset.nofid), sent = !!r && frAskedNoAcct.has(r.name);
    if (r) s.insertAdjacentHTML('beforeend', ` <button class="fb" data-act="none" data-pid="${r.pid}"${sent ? ' disabled' : ''}>${sent ? 'SENT' : '+ ADD'}</button>`);
  }
  for (const s of $('postBoard').querySelectorAll('[data-fid]')) {
    const id = +s.dataset.fid; if (!id || id === fr.me.id || s.querySelector('button')) continue;
    const done = frIds.has(id) || frOut.has(id);
    s.insertAdjacentHTML('beforeend', ` <button class="fb" data-act="${frIn.has(id) ? 'acc' : 'padd'}" data-id="${id}"${done ? ' disabled' : ''}>${frIds.has(id) ? 'FRIENDS' : frOut.has(id) ? 'SENT' : frIn.has(id) ? 'ACCEPT' : '+ ADD'}</button>`);
  }
}
$('postBoard').addEventListener('click', async e => {
  const b = e.target.closest('button.fb'); if (!b || b.disabled) return;
  b.disabled = true;
  if (b.dataset.act === 'none') { const r = recs.find(r => r.pid === +b.dataset.pid); if (r) frAskedNoAcct.add(r.name); b.textContent = 'SENT'; sfx('ui'); return; }
  if (b.dataset.act === 'acc') { if (await frCall('accept', { id: +b.dataset.id })) { b.textContent = 'FRIENDS'; sfx('buy'); frPoll(true); } else b.disabled = false; return; }
  const r = await frAdd('#' + b.dataset.id);
  if (r) b.textContent = r.result === 'friends' ? 'FRIENDS' : 'SENT'; else b.disabled = false;
});
// + ADD in the players list (bots and guests just show SENT)
const frAskedNoAcct = new Set();
function frPlayerBtn(r) {
  if (!auth || !fr.me) return '';
  const id = r.fid | 0;
  if (!id) { const sent = frAskedNoAcct.has(r.name); return `<button data-fr="none" data-pid="${r.pid}"${sent ? ' disabled' : ''}>${sent ? 'SENT' : '+ ADD'}</button>`; }
  if (id === fr.me.id) return '';
  const done = frIds.has(id) || frOut.has(id);
  return `<button data-fr="${frIn.has(id) ? 'acc' : 'add'}" data-id="${id}"${done ? ' disabled' : ''}>${frIds.has(id) ? 'FRIENDS' : frOut.has(id) ? 'SENT' : frIn.has(id) ? 'ACCEPT' : '+ ADD'}</button>`;
}
$('plist').addEventListener('click', async e => {
  const b = e.target.closest('button[data-fr]'); if (!b || b.disabled) return;
  e.stopPropagation(); b.disabled = true; sfx('ui');
  if (b.dataset.fr === 'none') { const r = recs.find(r => r.pid === +b.dataset.pid); if (r) frAskedNoAcct.add(r.name); renderPlayers(); return; }
  const ok = b.dataset.fr === 'acc' ? await frCall('accept', { id: +b.dataset.id }) : await frCall('add', { who: '#' + b.dataset.id });
  if (!ok) { netToast(frMsg || 'Something went wrong'); b.disabled = false; return; }
  if (b.dataset.fr === 'acc') sfx('buy');
  await frPoll(true); renderPlayers();
});
// poll every 30 s, 15 s with the page open, never while hidden
setInterval(() => { if (auth && !document.hidden) frPoll(); }, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && auth) frPoll(); });
let frUser = auth?.user ?? null;
onAuth = () => { const u = auth?.user ?? null; if (u !== frUser) { frUser = u; frReset(); frPoll(true); } };
renderFriends();
if (auth) frPoll(true);
