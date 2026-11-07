// LEADERBOARDS and PLAYER CARDS. Everything here comes from the server's stats (voxel-strike-server room.js saveStats): online
// matches in public rooms by signed-in players, so nothing on them can be farmed against bots offline or in a private room.
// TOP (next to FRIENDS in the lobby) opens the boards: THIS WEEK (Monday to Monday, UTC) or ALL TIME, ranked by XP, wins or kills,
// the top 50 and where you stand. Clicking a player there, a name on the results screen or in your friends list opens their card:
// look, level, gear, and their numbers this week or all time (wins, kills, K/D, accuracy, headshots, favourite gun).
const BOARD_BY = [['xp', 'XP'], ['wins', 'WINS'], ['kills', 'KILLS']];
let lbB = 'week', lbBy = 'xp', lbData = null, lbErr = '', lbAt = 0, lbKey = '';
let cardData = null, cardWeek = false, cardErr = '';
const myId = () => auth?.id || (typeof fr === 'object' && fr.me?.id) || 0;
const safeSprite = (look, head) => { try { return skinSprite(look && typeof look === 'object' ? look : PRESETS[0].look, head); } catch { return skinSprite(PRESETS[0].look, head); } };
// a player's in-game name, and their username under it when it's different (friends.js shows them the same way)
const whoIs = (nick, user) => `<b>${esc(nick || user)}</b>${user && (nick || user).toLowerCase() !== user.toLowerCase() ? `<small>@${esc(user)}</small>` : ''}`;
const lbNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n);
function weekLeft() { // till Monday 00:00 UTC
  const d = new Date(), next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (8 - d.getUTCDay()) % 7 || 7), s = (next - d) / 1000;
  return s > 86400 ? `${Math.floor(s / 86400)}D ${Math.floor(s / 3600) % 24}H` : `${Math.floor(s / 3600)}H ${Math.floor(s / 60) % 60}M`;
}
async function loadBoard(force = false) {
  const key = `${lbB}:${lbBy}:${myId()}`;
  if (!force && key === lbKey && performance.now() - lbAt < 30000) return renderBoard();
  lbKey = key; lbData = null; lbErr = ''; renderBoard();
  try {
    const r = await api('GET', `/boards?b=${lbB}&by=${lbBy}${myId() ? '&me=' + myId() : ''}`);
    if (key !== lbKey) return;
    if (r.status !== 200) throw 0;
    lbData = r; lbAt = performance.now();
  } catch { if (key === lbKey) lbErr = "Can't reach the server"; }
  renderBoard();
}
function renderBoard() {
  if ($('lb').style.display !== 'flex') return;
  const tab = (k, label, on) => `<button data-${k}="${label[0]}" class="${on ? 'on' : ''}">${label[1]}</button>`;
  const me = myId(), unit = BOARD_BY.find(b => b[0] === lbBy)[1];
  const row = r => `<div class="lr${r.id === me ? ' you' : ''}" data-card="${r.id}"><span class="rk">${r.rank}</span><img src="${safeSprite(r.look, true)}"><span class="nm">${whoIs(r.nick, r.name)}</span><span class="lv">LVL ${r.lv}</span><span class="v">${lbNum(r.v)}</span></div>`;
  const list = lbErr ? `<p class="lbNote">${lbErr}</p>` : !lbData ? '<p class="lbNote">Loading…</p>'
    : lbData.rows.length ? lbData.rows.map(row).join('') : `<p class="lbNote">${lbB === 'week' ? 'Nobody yet this week, be the first' : 'Nobody here yet, be the first'}</p>`;
  const signIn = cg.on ? 'Log in to CrazyGames to get on the board' : 'Sign in to get on the board';
  const mine = !auth ? `<p class="lbNote">${signIn}</p>`
    : lbData?.me ? (lbData.rows.some(r => r.id === me) ? '' : `<div class="lr you" data-card="${me}"><span class="rk">${lbData.me.rank}</span><img src="${safeSprite(prof.look, true)}"><span class="nm">${whoIs(myName, auth.user)}</span><span class="lv">LVL ${prof.lv}</span><span class="v">${lbNum(lbData.me.v)}</span></div>`)
    : lbData ? '<p class="lbNote">Play online to get on the board</p>' : '';
  $('lbBox').innerHTML = `<h1>${ico('trophy')} TOP PLAYERS</h1>` +
    `<div class="lbTabs">${tab('b', ['week', 'THIS WEEK'], lbB === 'week')}${tab('b', ['all', 'ALL TIME'], lbB === 'all')}<span class="sp"></span>${BOARD_BY.map(b => tab('by', b, lbBy === b[0])).join('')}</div>` +
    `<p class="lbSub">${lbB === 'week' ? `Online matches · new week in ${weekLeft()}` : 'Online matches'}</p>` +
    `<div class="lbHead"><span>#</span><span></span><span>PLAYER</span><span></span><span>${unit}</span></div><div class="lbList">${list}</div>${mine}` +
    `<div class="lbFoot">${auth && me ? `<button data-card="${me}">MY CARD</button>` : ''}<button id="lbX">CLOSE</button></div>`;
}
function openBoard() { $('lb').style.display = 'flex'; loadBoard(); sfx('ui'); }
$('topBtn').innerHTML = ico('trophy') + 'TOP';
$('topBtn').addEventListener('click', e => { e.stopPropagation(); openBoard(); });
$('lb').addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('button'), c = e.target.closest('[data-card]');
  if (!b && !c && e.target.id === 'lb' || b?.id === 'lbX') { $('lb').style.display = 'none'; return; }
  if (c) return openCard(+c.dataset.card);
  if (b?.dataset.b && b.dataset.b !== lbB) { lbB = b.dataset.b; sfx('ui'); loadBoard(); }
  if (b?.dataset.by && b.dataset.by !== lbBy) { lbBy = b.dataset.by; sfx('ui'); loadBoard(); }
});

// ---- a player's card
async function openCard(id) {
  if (!id) return;
  $('card').style.display = 'flex'; cardData = null; cardErr = ''; cardWeek = false; renderCard(); sfx('ui');
  try {
    const r = await api('GET', '/stats/' + id);
    if (r.status !== 200) throw 0;
    cardData = r;
  } catch { cardErr = "Can't reach the server"; }
  renderCard();
}
function renderCard() {
  if ($('card').style.display !== 'flex') return;
  const c = cardData;
  if (!c) { $('cardBox').innerHTML = `<p class="lbNote">${cardErr || 'Loading…'}</p><div class="lbFoot"><button id="cardX">CLOSE</button></div>`; return; }
  const s = cardWeek ? c.week : c.all, pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const fi = BASE.findIndex(w => w.id === c.fav), g = c.gear || {};
  const gear = [
    g.hat && HATS.find(h => h.id === g.hat.id) ? `<img title="${HATS.find(h => h.id === g.hat.id).name}" src="${hatSprite(g.hat.id, g.hat.st)}">` : '',
    g.armor > 0 && armorOf(g.armor) ? `<img title="${armorOf(g.armor).name} Armor" src="${armorSprite(g.armor - 1)}">` : '',
    g.boots && BOOTS.find(b => b.id === g.boots.id) ? `<img title="${BOOTS.find(b => b.id === g.boots.id).name}" src="${bootSprite(g.boots.id, g.boots.st)}">` : '',
  ].join('');
  const stat = (label, v) => `<div class="cs"><b>${v}</b><span>${label}</span></div>`;
  $('cardBox').innerHTML = `<div class="cTop"><img class="cSkin" src="${safeSprite(c.look, false)}"><div class="cWho"><h1>${esc(c.nick || c.name)}</h1>${(c.nick || c.name).toLowerCase() !== c.name.toLowerCase() ? `<div class="cUser">@${esc(c.name)}</div>` : ''}` +
    `<div class="cLv">LVL ${c.lv} <small>ID #${c.id}</small></div>${gear ? `<div class="cGear">${gear}</div>` : ''}</div></div>` +
    `<div class="lbTabs"><button data-cw="0" class="${cardWeek ? '' : 'on'}">ALL TIME</button><button data-cw="1" class="${cardWeek ? 'on' : ''}">THIS WEEK</button></div>` +
    (s.matches || s.kills || s.shots ? `<div class="cStats">${stat('WINS', lbNum(s.wins))}${stat('MATCHES', lbNum(s.matches))}${stat('KILLS', lbNum(s.kills))}` +
      `${stat('K/D', (kd => kd >= 100 ? lbNum(Math.round(kd)) : kd.toFixed(2))(s.kills / Math.max(1, s.deaths)))}${stat('ACCURACY', pct(s.hits, s.shots))}${stat('HEADSHOTS', pct(s.heads, s.hits))}</div>` +
      (!cardWeek && fi >= 0 ? `<div class="cFav"><span>FAVORITE GUN</span><img src="${SPRITES[fi]}"><b>${BASE[fi].name}</b></div>` : '')
      : `<p class="lbNote">${cardWeek ? 'No online matches this week yet' : 'No online matches yet'}</p>`) +
    `<div class="lbFoot"><button id="cardX">CLOSE</button></div>`;
}
$('card').addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('button');
  if (!b && e.target.id === 'card' || b?.id === 'cardX') { $('card').style.display = 'none'; return; }
  if (b?.dataset.cw) { cardWeek = b.dataset.cw === '1'; sfx('ui'); renderCard(); }
});
// names on the results screen (signed-in players) and in the friends list open their card
$('postBoard').addEventListener('click', e => { const n = e.target.closest('[data-fid]'); if (n && !e.target.closest('button')) { e.stopPropagation(); openCard(+n.dataset.fid); } });
$('friends').addEventListener('click', e => { const n = e.target.closest('[data-card]'); if (n) { e.stopPropagation(); openCard(+n.dataset.card); } });
