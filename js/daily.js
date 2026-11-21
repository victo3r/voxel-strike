// daily reward: a 7 day streak, miss a day and it starts over
const DAILY = [{ c: 10 }, { k: 1 }, { c: 20, b: 1 }, { b: 2 }, { c: 30 }, { b: 2, k: 1 }, { c: 50, b: 3, k: 2 }]; // day 2 is a chest key, to bring new players back
// a new player's first week instead: one gift for each day they play a game, and it waits for them (nothing to lose by missing a day).
// Its two guns can't be bought
const WELCOME = [{ c: 50, k: 1 }, { gun: 'daybreak' }, { box: 'iron' }, { boots: 'raider' }, { b: 3, k: 2 }, { box: 'gold' }, { gun: 'highnoon' }];
function dailyPlayed() { prof.played = dayKey(); } // a game finished today
const welcomeDays = () => prof.welcome ?? (prof.daily?.last || prof.lv >= 5 ? WELCOME.length : 0); // how many you've had (only those starting out get it)
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
// today's day on the list you're on, and whether the streak was lost
function dailyNow() {
  const d = prof.daily || {}, today = dayKey(), w = welcomeDays();
  if (w < WELCOME.length || d.w === today) return { claimed: d.last === today, day: d.last === today ? w : w + 1, list: WELCOME, wait: d.last !== today && prof.played !== today }; // wait: play a game first
  if (d.last === today) return { claimed: true, day: d.streak | 0 || 1, list: DAILY };
  const goesOn = d.last === dayBefore() && (d.streak | 0) < DAILY.length;
  return { claimed: false, day: goesOn ? (d.streak | 0) + 1 : 1, lost: !!d.last && d.last !== dayBefore() && (d.streak | 0) > 1, list: DAILY };
}
// tomorrow's reward once today's is claimed, and how long until then
const dailyNext = s => s.list === WELCOME ? WELCOME[s.day] ?? DAILY[0] : DAILY[s.day % DAILY.length];
const dailyWait = () => { const m = Math.max(0, new Date().setHours(24, 0, 0, 0) - Date.now()) / 60000; return `${m / 60 | 0}H ${String(m % 60 | 0).padStart(2, '0')}M`; };
const boxPic = id => typeof chestPic === 'function' ? chestPic(CHESTS.findIndex(c => c.id === id)) : ''; // (chests.js loads after this file)
const dailyGift = r => [r.gun ? `<img class="gp" src="${gunPic(gi(r.gun))}">` : '', r.boots ? `<img class="gp gq" src="${bootPic(r.boots, 1)}">` : '', r.box ? `<img class="gp gq" src="${boxPic(r.box)}">` : '',
  r.c ? `<span class="pc">${COIN}${r.c}</span>` : '', r.b ? `<span class="bz">${ico('bolt')}${r.b}</span>` : '', r.k ? `<span class="bz">${ico('key')}${r.k}</span>` : ''].join('');
// what a gift is called, when it's a thing
const dailyName = r => (r.gun ? BASE[gi(r.gun)].name.replace(/"/g, '') : r.boots ? bootOf(r.boots).name : r.box ? CHESTS.find(c => c.id === r.box)?.name ?? '' : '').toUpperCase();
function claimDaily() {
  const s = dailyNow(); if (s.claimed || s.wait) return;
  const r = s.list[s.day - 1], today = dayKey();
  let c = r.c || 0; // a gift you own already pays its price
  if (r.gun) { const w = BASE[gi(r.gun)]; if (prof.guns[w.id]) c += w.price; else { prof.guns[w.id] = 1; prof.loadout[w.cat] = w.id; } }
  if (r.boots) { const B = bootOf(r.boots); if (prof.boots[B.id]) c += B.price; else { prof.boots[B.id] = 1; if (!prof.bootOn) prof.bootOn = B.id; } }
  if (r.box) prof.box = { ...prof.box, [r.box]: (prof.box?.[r.box] | 0) + 1 };
  prof.coins += c; prof.earned = (prof.earned ?? 0) + c; prof.boosts = (prof.boosts | 0) + (r.b || 0); prof.keys = (prof.keys | 0) + (r.k || 0);
  if (s.list === WELCOME) { prof.welcome = s.day; prof.daily = { last: today, streak: 0, w: today }; if (s.day < 3) funnel('gift' + s.day); } else prof.daily = { last: today, streak: s.day };
  saveProf(); showProf(); sfx(r.gun || r.boots ? 'levelUp' : 'buy');
  if (r.boots) dressHero();
}
let dailyTag = null;
function renderDaily() {
  const s = dailyNow(), next = s.claimed && dailyNext(s), name = next && dailyName(next), today = s.list[s.day - 1];
  $('dailyBtn').classList.toggle('ready', !s.claimed && !s.wait);
  const tag = s.wait ? `<span>${dailyGift(today)}</span> PLAY A GAME` : name ? `<span>${dailyGift(next)}</span> TOMORROW` : next?.k ? `${ico('key')} TOMORROW` : ''; // something good waiting
  if (tag !== dailyTag) { $('dailyTmw').innerHTML = dailyTag = tag; $('dailyBtn').title = name ? `Daily reward: ${name} tomorrow` : tag ? 'Daily reward: a free chest tomorrow' : 'Daily reward'; }
  if ($('daily').style.display !== 'flex') return;
  const left = Math.max(0, Math.ceil((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000)), hms = `${left / 3600 | 0}:${String((left / 60 | 0) % 60).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const W = s.list === WELCOME, gift = !s.claimed && dailyName(today);
  const line = s.wait ? `Play a game today and ${gift ? `<b>${gift}</b>` : 'your gift'} is yours` : s.lost ? 'You lost your streak.' : next ? `Come back tomorrow for ${name ? `<b>${name}</b>` : next.k > 1 ? 'free chests' : next.k ? 'a free chest' : dailyGift(next)}`
    : W ? 'A gift for every day you play in your first week' : 'Come back every day for bigger rewards';
  $('dailyBox').innerHTML = `<h1>${ico('gift')} ${W ? 'WELCOME WEEK' : 'DAILY REWARD'}</h1><p>${line}</p>` +
    `<div class="days${W ? ' wk' : ''}">${s.list.map((r, i) => { const n = i + 1, cls = n < s.day || (s.claimed && n === s.day) ? 'done' : n === s.day ? 'now' : s.claimed && n === s.day + 1 ? 'next' : '';
      return `<div class="day ${cls}${n === s.list.length ? ' big' : ''}"><b>DAY ${n}</b><div class="gift">${dailyGift(r)}</div>${W ? `<small>${dailyName(r)}</small>` : ''}${cls === 'done' ? ico('check', 'ck') : ''}</div>`; }).join('')}</div>` +
    (s.claimed ? `<button id="dailyGo" disabled>NEXT IN ${hms}</button>` : s.wait ? '<button id="dailyGo" disabled>PLAY A GAME FIRST</button>' : `<button id="dailyGo" class="go">${gift ? `CLAIM ${gift}` : 'CLAIM'}</button>`) +
    `<button id="dailyX">CLOSE</button>`;
}
function openDaily() { $('daily').style.display = 'flex'; renderDaily(); }
function closeDaily() { $('daily').style.display = 'none'; }
$('dailyBtn').innerHTML = ico('gift') + '<small id="dailyTmw"></small>';
// results screen: what tomorrow brings, or that today's reward is still waiting
function dailyRow() {
  const s = dailyNow();
  if (!s.claimed) { const r = s.list[s.day - 1], name = dailyName(r); return `<div class="dyr${name ? ' big' : ''}">${ico('gift')} ${name ? `<span>${dailyGift(r)}</span>FREE ${name} WAITING IN THE LOBBY` : 'DAILY REWARD READY IN THE LOBBY'}</div>`; }
  const r = dailyNext(s), name = dailyName(r);
  return `<div class="dyr${name ? ' big' : ''}">${ico('gift')} TOMORROW <span>${dailyGift(r)}</span>${name ? ` FREE ${name}` : r.k > 1 ? ' FREE CHESTS' : r.k ? ' FREE CHEST' : ''} <small>IN ${dailyWait()}</small></div>`;
}
$('dailyBtn').addEventListener('click', e => { e.stopPropagation(); openDaily(); sfx('ui'); });
$('daily').addEventListener('click', e => {
  e.stopPropagation();
  const id = e.target.closest('button')?.id;
  if (!id && e.target.id === 'daily' || id === 'dailyX') return closeDaily();
  if (id === 'dailyGo') claimDaily();
  renderDaily();
});
// update the countdown and pop the card up on the first lobby visit of the day (after your first game, if you've never played),
// and again once a welcome gift is ready to claim
let dailyShown = '';
setInterval(() => {
  renderDaily();
  const s = dailyNow(), key = dayKey() + (s.wait ? ' wait' : '');
  if (navigator.webdriver || dailyShown === key || !inLobby || document.body.classList.contains('boot') || s.claimed || needStarter()) return;
  if ([$('binds'), $('armory'), $('boost'), $('pick'), $('moved')].some(el => el && getComputedStyle(el).display !== 'none')) return; // not over another screen
  dailyShown = key; openDaily();
}, 1000);
renderDaily();
