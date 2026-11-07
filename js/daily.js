// daily reward: a 7 day streak, miss a day and it starts over
const DAILY = [{ c: 10 }, { b: 1 }, { c: 20 }, { b: 2 }, { c: 30 }, { b: 2 }, { c: 50, b: 3 }];
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayBefore = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
// today's streak day, and whether the streak was lost
function dailyNow() {
  const d = prof.daily || {}, today = dayKey();
  if (d.last === today) return { claimed: true, day: d.streak | 0 || 1 };
  const goesOn = d.last === dayBefore() && (d.streak | 0) < DAILY.length;
  return { claimed: false, day: goesOn ? (d.streak | 0) + 1 : 1, lost: !!d.last && d.last !== dayBefore() && (d.streak | 0) > 1 };
}
const dailyGift = r => [r.c ? `<span class="pc">${COIN}${r.c}</span>` : '', r.b ? `<span class="bz">${ico('bolt')}${r.b}</span>` : ''].join('');
function claimDaily() {
  const s = dailyNow(); if (s.claimed) return;
  const r = DAILY[s.day - 1];
  prof.coins += r.c || 0; prof.earned = (prof.earned ?? 0) + (r.c || 0); prof.boosts = (prof.boosts | 0) + (r.b || 0);
  prof.daily = { last: dayKey(), streak: s.day };
  saveProf(); showProf(); sfx('buy');
}
function renderDaily() {
  const s = dailyNow();
  $('dailyBtn').classList.toggle('ready', !s.claimed);
  if ($('daily').style.display !== 'flex') return;
  const left = Math.max(0, Math.ceil((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000)), hms = `${left / 3600 | 0}:${String((left / 60 | 0) % 60).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  $('dailyBox').innerHTML = `<h1>${ico('gift')} DAILY REWARD</h1><p>${s.lost ? 'You lost your streak.' : 'Come back every day for bigger rewards'}</p>` +
    `<div class="days">${DAILY.map((r, i) => { const n = i + 1, cls = n < s.day || (s.claimed && n === s.day) ? 'done' : n === s.day ? 'now' : '';
      return `<div class="day ${cls}${n === DAILY.length ? ' big' : ''}"><b>DAY ${n}</b><div class="gift">${dailyGift(r)}</div>${cls === 'done' ? ico('check', 'ck') : ''}</div>`; }).join('')}</div>` +
    (s.claimed ? `<button id="dailyGo" disabled>NEXT IN ${hms}</button>` : `<button id="dailyGo" class="go">CLAIM</button>`) +
    `<button id="dailyX">CLOSE</button>`;
}
function openDaily() { $('daily').style.display = 'flex'; renderDaily(); }
function closeDaily() { $('daily').style.display = 'none'; }
$('dailyBtn').innerHTML = ico('gift');
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
