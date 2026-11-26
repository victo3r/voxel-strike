// weekly events: a theme each week, Monday to Monday UTC like the boards, and prizes for the points you earn
const EVENTS = [
  { id: 'zombie', name: 'ZOMBIE WEEK', icon: 'skull', col: '#9be05a', line: 'Zombie runs pay double points', zx: 2, skin: 'brainjar' },
  { id: 'head', name: 'HEADHUNTER WEEK', icon: 'head', col: '#ff8f66', line: '+5 points for every headshot kill', head: 5, skin: 'hunter' },
  { id: 'blade', name: 'BLADE WEEK', icon: 'blade', col: '#c9a2ff', line: '+10 points for every melee kill', cat: 'melee', per: 10, skin: 'circlet' },
  { id: 'sniper', name: 'SNIPER WEEK', icon: 'aim', col: '#7fd8ff', line: '+5 points for every sniper kill', cat: 'sniper', per: 5, skin: 'ghillie' },
  { id: 'champ', name: 'CHAMPIONS WEEK', icon: 'trophy', col: '#ffd75e', line: '+20 points for every win', win: 20, skin: 'laurel' },
];
const EV_TRACK = [{ p: 50, b: 1 }, { p: 150, k: 1 }, { p: 400, b: 2 }, { p: 800, box: 'iron' }, { p: 1500, b: 3 }, { p: 2500, box: 'gold' }, { p: 4000, skin: 1 }];
const EV_START = Date.UTC(2026, 10, 9), EV_WEEK = 7 * 864e5; // a Monday: Zombie Week, then down the list
const evWeek = () => Math.floor((Date.now() - EV_START) / EV_WEEK);
let evPick = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && new URLSearchParams(location.search).get('ev') || null; // ?ev=blade to try one here
// this week's event; a new week starts the points over
function eventNow() {
  const w = evWeek(), wk = new Date(EV_START + w * EV_WEEK).toISOString().slice(0, 10);
  if (prof.event?.wk !== wk) prof.event = { wk, pts: 0, got: 0 };
  return EVENTS.find(e => e.id === evPick) ?? EVENTS[(w % EVENTS.length + EVENTS.length) % EVENTS.length];
}
const evLeft = () => { const m = Math.max(0, EV_START + (evWeek() + 1) * EV_WEEK - Date.now()) / 60000; return m >= 1440 ? `${m / 1440 | 0}D ${m / 60 % 24 | 0}H` : `${m / 60 | 0}H ${String(m % 60 | 0).padStart(2, '0')}M`; };
// prizes; the top one is the week's hat skin, or a golden chest if it's yours already
const evPrize = r => !r.skin ? r : prof.skins?.[eventNow().skin] ? { p: r.p, box: 'gold' } : { p: r.p, skin: eventNow().skin };
const evChest = r => CHESTS.findIndex(c => c.id === r.box);
const evPic = r => r.skin ? `<img src="${hatPic('', 0, r.skin)}">` : r.box ? `<img src="${chestPic(evChest(r))}">` : ico(r.k ? 'key' : 'bolt');
const evName = r => r.skin ? hatSkinOf(r.skin).name.toUpperCase() : r.box ? CHESTS[evChest(r)].name : r.k ? 'CHEST KEY' : `${r.b} BOOSTER${r.b > 1 ? 'S' : ''}`;
function evPay(r) {
  if (r.skin) prof.skins = { ...prof.skins, [r.skin]: 1 };
  if (r.b) prof.boosts = (prof.boosts | 0) + r.b;
  if (r.k) prof.keys = (prof.keys | 0) + r.k;
  if (r.box) prof.box = { ...prof.box, [r.box]: (prof.box?.[r.box] | 0) + 1 };
  if (!matchOver) netToast(`EVENT PRIZE · ${evName(r)}`); // the results screen shows the rest
  sfx('buy');
}
let evGame = null; // this game: its points, the kill bonus waiting for the end, prizes won
function eventMark() { document.documentElement.style.setProperty('--ev', eventNow().col); evGame = { pts: 0, bonus: 0, got: [] }; }
function eventAdd(n) {
  if (!(n > 0)) return;
  eventNow(); const S = prof.event;
  S.pts += n; if (evGame) evGame.pts += n;
  while (S.got < EV_TRACK.length && S.pts >= EV_TRACK[S.got].p) { const r = evPrize(EV_TRACK[S.got]); evPay(r); evGame?.got.push(r); if (++S.got === EV_TRACK.length) achEvent(); }
  saveProf(); showProf();
}
// what counts: kills on players and bots (the bonus comes when the match ends), a match's XP, zombie waves' XP
function eventKill(head) {
  const E = eventNow(), n = (head ? E.head | 0 : 0) + (E.cat && BASE[cur]?.cat === E.cat ? E.per : 0);
  if (evGame) evGame.bonus += n;
  return n;
}
function eventEnd(xp, won) { eventAdd(xp + ((evGame?.bonus | 0) + (won ? eventNow().win | 0 : 0)) * (gameBoost ? 2 : 1)); } // xp is boosted already
const eventWave = xp => eventAdd(xp * (eventNow().zx || 1));
// results screen tiles: this game's points and any prize
function eventTiles() {
  if (!evGame?.pts) return [];
  return [[ico(eventNow().icon), 'EVENT', `+${evGame.pts}`, 'tev'], ...evGame.got.map(r => [evPic(r), 'PRIZE', r.skin ? 'NEW' : r.box ? 'FREE' : `+${r.b || r.k}`, 'tpz'])];
}
// the lobby panel and the prize card
function renderEvent() {
  const E = eventNow(), S = prof.event, next = S.got < EV_TRACK.length ? evPrize(EV_TRACK[S.got]) : null, from = Math.min(S.pts, S.got ? EV_TRACK[S.got - 1].p : 0); // min: a prize won on the old, shorter track
  document.documentElement.style.setProperty('--ev', E.col);
  if (typeof renderTrial === 'function') renderTrial();
  if (!inLobby) return; // chest pictures only build in the lobby
  setHTML($('event'), `<div class="eh"><b>${ico(E.icon)} ${E.name}</b><small>${evLeft()} LEFT</small></div><div class="el">${E.line}</div>` +
    (next ? `<div class="ep"><u><i style="width:${(S.pts - from) / (next.p - from) * 100}%"></i></u><span>${S.pts}/${next.p}</span></div><div class="en">NEXT ${evPic(next)} ${evName(next)}</div>`
      : `<div class="en">${ico('check')} ALL PRIZES WON</div>`));
  if ($('evCard').style.display === 'flex') renderEvCard();
}
function renderEvCard() {
  const E = eventNow(), S = prof.event;
  const skin = !prof.skins?.[E.skin] && S.got < EV_TRACK.length ? hatSkinOf(E.skin) : null; // still to win
  setHTML($('evBox'), `<h1>${ico(E.icon)} ${E.name}</h1><p>${E.line}<br>Every XP you earn counts too${skin ? `, and ${EV_TRACK.at(-1).p} wins the ${skin.name}, a skin for any hat` : ''}</p>` +
    `<div class="tiers">${EV_TRACK.map((r0, i) => { const r = r0.skin && i < S.got ? { p: r0.p, skin: E.skin } : evPrize(r0);
      return `<div class="tier${i < S.got ? ' done' : i === S.got ? ' now' : ''}${r.box === 'gold' || r.skin ? ' big' : ''}"><b>${r.p}</b><div class="gift">${evPic(r)}${r.box || r.skin ? '' : `<span>${r.b || r.k}</span>`}</div>${i < S.got ? ico('check', 'ck') : ''}</div>`; }).join('')}</div>` +
    `<div class="ebar"><u><i style="width:${Math.min(100, S.pts / EV_TRACK.at(-1).p * 100)}%"></i></u><span>${S.pts} POINTS</span></div>` +
    `<p class="eleft">ENDS IN ${evLeft()}</p><button id="evX">CLOSE</button>`);
}
function openEvCard() { $('evCard').style.display = 'flex'; renderEvCard(); sfx('ui'); }
$('event').addEventListener('click', e => { e.stopPropagation(); openEvCard(); });
$('evCard').addEventListener('click', e => { e.stopPropagation(); if (e.target.id === 'evCard' || e.target.closest('#evX')) $('evCard').style.display = 'none'; });
setInterval(() => { if (inLobby && !document.hidden) renderEvent(); }, 30000);
renderEvent();
// a phone held sideways: the event card goes left under your name, so the right side isn't crowded
function placeEvent() { const p = TOUCH && phoneSide.matches ? $('lobbyTop') : $('side'), d = $('evDraw'); if (d.parentElement !== p) p.id === 'side' ? p.prepend(d) : p.append(d); }
placeEvent(); phoneSide.addEventListener('change', placeEvent);
sideDrawer('evDraw', 'evTab', 'voxelstrike-event-in', 'the weekly event');
