// daily reward: a 7 day streak, miss a day and it starts over
const DAILY = [{ c: 10 }, { k: 1 }, { c: 20, b: 1 }, { b: 2 }, { c: 30 }, { b: 2, k: 1 }, { c: 50, b: 3, k: 2 }]; // day 2 is a chest key, to bring new players back
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
// today's streak day, and whether the streak was lost
function dailyNow() {
  const d = prof.daily || {}, today = dayKey();
  if (d.last === today) return { claimed: true, day: d.streak | 0 || 1 };
  const goesOn = d.last === dayBefore() && (d.streak | 0) < DAILY.length;
  return { claimed: false, day: goesOn ? (d.streak | 0) + 1 : 1, lost: !!d.last && d.last !== dayBefore() && (d.streak | 0) > 1 };
}
// tomorrow's reward once today's is claimed, and how long until then
const dailyNext = s => DAILY[s.day % DAILY.length];
const dailyWait = () => { const m = Math.max(0, new Date().setHours(24, 0, 0, 0) - Date.now()) / 60000; return `${m / 60 | 0}H ${String(m % 60 | 0).padStart(2, '0')}M`; };
const dailyGift = r => [r.c ? `<span class="pc">${COIN}${r.c}</span>` : '', r.b ? `<span class="bz">${ico('bolt')}${r.b}</span>` : '', r.k ? `<span class="bz">${ico('key')}${r.k}</span>` : ''].join('');
function claimDaily() {
  const s = dailyNow(); if (s.claimed) return;
  const r = DAILY[s.day - 1];
  prof.coins += r.c || 0; prof.earned = (prof.earned ?? 0) + (r.c || 0); prof.boosts = (prof.boosts | 0) + (r.b || 0); prof.keys = (prof.keys | 0) + (r.k || 0);
  prof.daily = { last: dayKey(), streak: s.day };
  saveProf(); showProf(); sfx('buy');
}
let dailyTag = null;
function renderDaily() {
  const s = dailyNow(), next = s.claimed && dailyNext(s);
  $('dailyBtn').classList.toggle('ready', !s.claimed);
  const tag = next?.k ? `${ico('key')} TOMORROW` : ''; // a free chest waiting tomorrow
  if (tag !== dailyTag) { $('dailyTmw').innerHTML = dailyTag = tag; $('dailyBtn').title = tag ? 'Daily reward: a free chest tomorrow' : 'Daily reward'; }
  if ($('daily').style.display !== 'flex') return;
  const left = Math.max(0, Math.ceil((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000)), hms = `${left / 3600 | 0}:${String((left / 60 | 0) % 60).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  $('dailyBox').innerHTML = `<h1>${ico('gift')} DAILY REWARD</h1><p>${s.lost ? 'You lost your streak.' : next ? `Come back tomorrow for ${next.k > 1 ? 'free chests' : next.k ? 'a free chest' : dailyGift(next)}` : 'Come back every day for bigger rewards'}</p>` +
    `<div class="days">${DAILY.map((r, i) => { const n = i + 1, cls = n < s.day || (s.claimed && n === s.day) ? 'done' : n === s.day ? 'now' : s.claimed && n === s.day + 1 ? 'next' : '';
      return `<div class="day ${cls}${n === DAILY.length ? ' big' : ''}"><b>DAY ${n}</b><div class="gift">${dailyGift(r)}</div>${cls === 'done' ? ico('check', 'ck') : ''}</div>`; }).join('')}</div>` +
    (s.claimed ? `<button id="dailyGo" disabled>NEXT IN ${hms}</button>` : `<button id="dailyGo" class="go">CLAIM</button>`) +
    `<button id="dailyX">CLOSE</button>`;
}
function openDaily() { $('daily').style.display = 'flex'; renderDaily(); }
function closeDaily() { $('daily').style.display = 'none'; }
$('dailyBtn').innerHTML = ico('gift') + '<small id="dailyTmw"></small>';
// results screen: what tomorrow brings, or that today's reward is still waiting
function dailyRow() {
  const s = dailyNow();
  if (!s.claimed) return `<div class="dyr">${ico('gift')} DAILY REWARD READY IN THE LOBBY</div>`;
  const r = dailyNext(s);
  return `<div class="dyr">${ico('gift')} TOMORROW <span>${dailyGift(r)}</span>${r.k > 1 ? ' FREE CHESTS' : r.k ? ' FREE CHEST' : ''} <small>IN ${dailyWait()}</small></div>`;
}
$('dailyBtn').addEventListener('click', e => { e.stopPropagation(); openDaily(); sfx('ui'); });
$('daily').addEventListener('click', e => {
  e.stopPropagation();
  const id = e.target.closest('button')?.id;
  if (!id && e.target.id === 'daily' || id === 'dailyX') return closeDaily();
  if (id === 'dailyGo') claimDaily();
  renderDaily();
});
// update the countdown and pop the card up on the first lobby visit of the day
let dailyShown = '';
setInterval(() => {
  renderDaily();
  if (navigator.webdriver || dailyShown === dayKey() || !inLobby || document.body.classList.contains('boot') || dailyNow().claimed) return;
  if ([$('binds'), $('armory'), $('boost'), $('pick')].some(el => el && getComputedStyle(el).display !== 'none')) return; // not over another screen
  dailyShown = dayKey(); openDaily();
}, 1000);
renderDaily();
