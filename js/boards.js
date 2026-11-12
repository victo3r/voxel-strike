// leaderboards and player cards (stats only count online public matches; the zombie board counts signed-in zombie runs)
const BOARD_BY = [['xp', 'XP', 'xp'], ['wins', 'WINS', 'crown'], ['kills', 'KILLS', 'skull'], ['zombies', 'ZOMBIES', 'zombie']]; // id, label, icon
let lbB = 'week', lbBy = 'xp', lbData = null, lbErr = '', lbAt = 0, lbKey = '';
let cardData = null, cardWeek = false, cardErr = '';
// weekly prizes, by your best place on last week's online boards, and the zombie board's own (the server's tables.js has the same): [down to place, golden, iron, wooden chests, coins]
const WEEK_PRIZES = [[1, 2, 1, 0, 100], [2, 1, 1, 0, 50], [3, 1, 0, 0, 25], [10, 0, 2, 0, 25], [50, 0, 0, 1, 20]];
const Z_PRIZES = [[1, 0, 2, 0, 10], [3, 0, 1, 0, 0]];
const prizeOf = (rank, zb) => (zb ? Z_PRIZES : WEEK_PRIZES).find(p => rank <= p[0])?.slice(1) || null;
const PRIZE_BOX = [[2, 'gold'], [1, 'iron'], [0, 'wood']]; // CHESTS index and id for each chest count, best first
const prizeTag = z => `<span class="pz">${z ? PRIZE_BOX.map(([i], k) => z[k] ? `<span class="ch"><img src="${chestPic(i)}">${z[k] > 1 ? `<i>${z[k]}</i>` : ''}</span>` : '').join('') + (z[3] ? `<b>${COIN}${z[3]}</b>` : '') : ''}</span>`;
const LB_PARTS = [[1, '1ST TO 3RD'], [4, '4TH TO 10TH'], [11, '11TH TO 50TH']]; // the board in sections, from these places down
const myId = () => auth?.id || (typeof fr === 'object' && fr.me?.id) || 0;
const safePic = (look, head) => { try { return skinPic(look && typeof look === 'object' ? look : PRESETS[0].look, head); } catch { return skinPic(PRESETS[0].look, head); } };
// row heads draw a few a frame, so opening the board doesn't stall
const lbHeads = [], lazyHead = look => `<img class="ai" data-hd="${lbHeads.push(look) - 1}">`;
function lbHeadsDraw() {
  const t0 = performance.now();
  for (const im of document.querySelectorAll('#lbBox img[data-hd]')) {
    if (performance.now() - t0 > 6) { requestAnimationFrame(lbHeadsDraw); return; }
    im.src = safePic(lbHeads[+im.dataset.hd], true); im.removeAttribute('data-hd');
  }
}
// in-game name, with @username under it when different
const whoIs = (nick, user, lv) => `<b>${esc(nick || user)}</b><small>LVL ${lv}${user && (nick || user).toLowerCase() !== user.toLowerCase() ? ` · @${esc(user)}` : ''}</small>`;
const lbNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n);
function weekLeft() { // time until Monday 00:00 UTC
  const d = new Date(), next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)), s = (next - d) / 1000;
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
  const tab = (k, id, label, on, icon = '') => `<button data-${k}="${id}" class="${on ? 'on' : ''}">${icon && ico(icon)}<span>${label}</span></button>`;
  const zb = lbBy === 'zombies', me = myId(), by = BOARD_BY.find(b => b[0] === lbBy), unit = zb ? 'WAVE' : by[1]; lbHeads.length = 0;
  const wk = lbB === 'week', pzOn = wk;
  const val = r => zb ? `${r.v}<small>${lbNum(r.k)} KILLS</small>` : lbNum(r.v);
  const row = (r, look = r.look, lv = r.lv, cls = '') => `<div class="lr${r.id === me ? ' you' : ''}${r.rank <= 3 ? ' p' + r.rank : ''}${cls}" data-card="${r.id}"><span class="rk"><b>${r.rank}</b></span>${lazyHead(look)}` +
    `<span class="nm">${whoIs(r.nick, r.name, lv)}</span>${pzOn ? prizeTag(prizeOf(r.rank, zb)) : ''}<span class="v">${val(r)}</span></div>`;
  const part = (r, i, a) => { const p = LB_PARTS.findLast(([from]) => r.rank >= from); return p && (!i || a[i - 1].rank < p[0]) ? `<div class="lbPart">${p[1]}</div>` : ''; };
  const head = `<div class="lbHead"><span class="rk">#</span><span></span><span>PLAYER</span>${pzOn ? '<span class="pz">PRIZE</span>' : ''}<span class="v">${ico(by[2])}${unit}</span></div>`;
  const pin = auth && lbData?.me && !lbData.rows.some(r => r.id === me) ? row({ ...lbData.me, id: me, nick: myName, name: auth.user }, prof.look, prof.lv, ' pin') : ''; // your place, held at the bottom
  const list = lbErr ? `<p class="lbNote">${lbErr}</p>` : !lbData ? '<p class="lbNote">Loading…</p>'
    : lbData.rows.length ? `<div class="lbList">${head}${lbData.rows.map((r, i, a) => part(r, i, a) + row(r)).join('')}${pin}</div>` : `<p class="lbNote">${wk ? 'Nobody yet this week, be the first' : 'Nobody here yet, be the first'}</p>`;
  const signIn = cg.on ? 'Log in to CrazyGames to get on the board' : 'Sign in to get on the board';
  const note = !auth ? `<p class="lbNote">${signIn}</p>` : lbData && !lbData.me ? `<p class="lbNote">${zb ? 'Play zombie waves to get on the board' : 'Play online to get on the board'}</p>` : '';
  const sub = (zb ? 'Zombie waves · best runs' : 'Online matches') + (wk ? ` · the top ${zb ? 3 : 50} win prizes` : '');
  $('lbBox').className = pzOn ? 'wk' : '';
  $('lbBox').innerHTML = `<div class="lbTop"><h1>${ico('trophy')} TOP PLAYERS</h1><div class="lbWhen">${tab('b', 'week', 'THIS WEEK', wk)}${tab('b', 'all', 'ALL TIME', !wk)}</div></div>` +
    `<div class="lbTabs lbBy">${BOARD_BY.map(b => tab('by', b[0], b[1], lbBy === b[0], b[2])).join('')}</div>` +
    `<p class="lbSub"><span>${sub}</span>${wk ? `<span class="lbClock">${ico('clock')}new week in ${weekLeft()}</span>` : ''}</p>` +
    list + note +
    `<div class="lbFoot">${auth && me ? `<button data-card="${me}">MY CARD</button>` : ''}<button id="lbX">${ico('close')} CLOSE</button></div>`;
  requestAnimationFrame(lbHeadsDraw);
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

// player card
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
  const s = cardWeek ? c.week : c.all, z = c.zombies?.[cardWeek ? 'week' : 'all'], pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const fi = BASE.findIndex(w => w.id === c.fav), g = c.gear || {};
  const gear = [
    g.hat && HATS.find(h => h.id === g.hat.id) ? `<img class="ai" title="${HATS.find(h => h.id === g.hat.id).name}" src="${hatPic(g.hat.id, g.hat.st)}">` : '',
    g.armor > 0 && armorOf(g.armor) ? `<img class="ai" title="${armorTitle(armorOf(g.armor))}" src="${armorPic(g.armor - 1)}">` : '',
    g.boots && BOOTS.find(b => b.id === g.boots.id) ? `<img class="ai" title="${BOOTS.find(b => b.id === g.boots.id).name}" src="${bootPic(g.boots.id, g.boots.st)}">` : '',
  ].join('');
  const stat = (label, v) => `<div class="cs"><b>${v}</b><span>${label}</span></div>`;
  $('cardBox').innerHTML = `<div class="cTop"><img class="cSkin ai" src="${safePic(c.look, false)}"><div class="cWho"><h1>${esc(c.nick || c.name)}</h1>${(c.nick || c.name).toLowerCase() !== c.name.toLowerCase() ? `<div class="cUser">@${esc(c.name)}</div>` : ''}` +
    `<div class="cLv">LVL ${c.lv} <small>ID #${c.id}</small></div>${gear ? `<div class="cGear">${gear}</div>` : ''}</div></div>` +
    `<div class="lbTabs"><button data-cw="0" class="${cardWeek ? '' : 'on'}">ALL TIME</button><button data-cw="1" class="${cardWeek ? 'on' : ''}">THIS WEEK</button></div>` +
    (s.matches || s.kills || s.shots ? `<div class="cStats">${stat('WINS', lbNum(s.wins))}${stat('MATCHES', lbNum(s.matches))}${stat('KILLS', lbNum(s.kills))}` +
      `${stat('K/D', (kd => kd >= 100 ? lbNum(Math.round(kd)) : kd.toFixed(2))(s.kills / Math.max(1, s.deaths)))}${stat('ACCURACY', pct(s.hits, s.shots))}${stat('HEADSHOTS', pct(s.heads, s.hits))}</div>` +
      (!cardWeek && fi >= 0 ? `<div class="cFav"><span>FAVORITE GUN</span><img class="ai" src="${gunPic(fi)}"><b>${BASE[fi].name}</b></div>` : '')
      : `<p class="lbNote">${cardWeek ? 'No online matches this week yet' : 'No online matches yet'}</p>`) +
    (z ? `<div class="cZom"><span>BEST ZOMBIE RUN</span><b>WAVE ${z.wave}</b><span>${lbNum(z.kills)} KILLS</span></div>` : '') +
    `<div class="lbFoot"><button id="cardX">CLOSE</button></div>`;
}
$('card').addEventListener('click', e => {
  e.stopPropagation();
  const b = e.target.closest('button');
  if (!b && e.target.id === 'card' || b?.id === 'cardX') { $('card').style.display = 'none'; return; }
  if (b?.dataset.cw) { cardWeek = b.dataset.cw === '1'; sfx('ui'); renderCard(); }
});
// clicking a name on the results screen or friends list opens their card
$('postBoard').addEventListener('click', e => { const n = e.target.closest('[data-fid]'); if (n && !e.target.closest('button')) { e.stopPropagation(); openCard(+n.dataset.fid); } });
$('friends').addEventListener('click', e => { const n = e.target.closest('[data-card]'); if (n) { e.stopPropagation(); openCard(+n.dataset.card); } });

// weekly prizes: the server says what you won last week (your best place of the three boards), you claim it here
let prizeQ = [], prizeChk = -1e9;
async function checkPrizes(force = false) {
  if (!auth || (!force && performance.now() - prizeChk < 600e3)) return;
  prizeChk = performance.now();
  try { const r = await api('GET', '/prizes?z=1'); if (r.status === 200 && Array.isArray(r.prizes)) { prizeQ = r.prizes; showPrize(); } } catch {}
}
function showPrize(force = false) {
  const p = prizeQ[0]; if (!p || $('prize').style.display === 'flex') return;
  const busy = !inLobby || [$('binds'), $('armory'), $('boost'), $('pick'), $('daily'), $('chests'), $('lb'), $('card')].some(el => el && getComputedStyle(el).display !== 'none');
  if ((busy || navigator.webdriver) && !force) { setTimeout(showPrize, 2000); return; }
  $('prize').style.display = 'flex'; renderPrize(); sfx('ui');
}
function renderPrize(msg = '') {
  const p = prizeQ[0]; if (!p) return;
  const tile = (pic, n, name, c) => `<div class="loot" style="--rc:${c}"><div class="pic">${pic}</div><b>${name}</b><small>×${n}</small></div>`;
  const tiles = PRIZE_BOX.map(([i, id], k) => p.prize[k] ? tile(`<img class="ai" src="${chestPic(i)}">`, p.prize[k], CHESTS[i].name, ['#ffd75e', '#b5bfcc', '#c48a4e'][k]) : '').join('') + (p.prize[3] ? tile(`<span class="lc">${COIN}</span>`, p.prize[3], 'COINS', '#ffcf3a') : '');
  $('prizeBox').innerHTML = `<h1>${ico('trophy')} WEEKLY PRIZE</h1><p>You finished <b>#${p.rank}</b> on last week's ${p.by === 'xp' ? 'XP' : p.by === 'zombies' ? 'ZOMBIE' : p.by.toUpperCase()} board!</p>` +
    `<div class="lootRow">${tiles}</div>${msg ? `<p class="err">${msg}</p>` : ''}<button id="prizeGo" class="go">CLAIM</button>`;
}
async function claimPrize() {
  const p = prizeQ[0], b = $('prizeGo'); if (!p || b?.disabled) return;
  b.disabled = true;
  let r; try { r = await api('POST', '/prizes/claim', { week: p.week, by: p.by }); } catch { r = { status: 0 }; }
  if (r.status !== 200 && r.status !== 409) return renderPrize("Couldn't reach the server, try again");
  prizeQ.shift();
  if (r.status === 200) { // the server's word, not the list's
    const z = r.prize; PRIZE_BOX.forEach(([i, id], k) => { if (z[k]) prof.box = { ...prof.box, [id]: (prof.box?.[id] | 0) + z[k] }; });
    prof.coins += z[3]; prof.earned = (prof.earned ?? 0) + z[3]; saveProf(); showProf(); sfx('levelUp');
  }
  $('prize').style.display = 'none';
  if (prizeQ.length) showPrize(true); else if (r.status === 200 && r.prize.slice(0, 3).some(Boolean)) { chestSel = PRIZE_BOX.find(([i], k) => r.prize[k])[0]; openChests(); }
}
$('prize').addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('#prizeGo')) claimPrize(); });
if (auth) setTimeout(checkPrizes, 3000);
setInterval(() => { if (inLobby && !document.hidden) checkPrizes(); }, 60e3);
