// daily missions: three a day, coins for each and a wooden chest for all three
const MISSION_SLOTS = [ // easy, medium, hard; goals for under level 5, then everyone else
  [{ k: 'play', g: [2, 3] }, { k: 'kills', g: [10, 15] }],
  [{ k: 'head', g: [3, 5] }, { k: 'cat', g: [4, 6] }, { k: 'kills', g: [20, 30] }],
  [{ k: 'win', g: [1, 1] }, { k: 'streak', g: [3, 4] }, { k: 'wave', g: [4, 6] }],
];
const MISSION_PAY = [15, 25, 40], MISSION_REROLLS = 1, MISSION_CATS = ['backup', 'melee', 'special', 'sniper', 'premium'];
const missionText = m => ({
  play: () => `Play ${m.g} games`, kills: () => `${m.g} kills`, head: () => `${m.g} headshot kills`, cat: () => `${m.g} ${m.c} kills`,
  win: () => 'Win a match', streak: () => `${m.g} kills without dying`, wave: () => `Reach zombie wave ${m.g}`,
})[m.k]();
// a mission for a slot, not a kind already picked today (a swap can be another gun type)
function rollMission(slot, not, used = []) {
  const opts = MISSION_SLOTS[slot].filter(o => (o.k !== not?.k || o.k === 'cat') && !used.includes(o.k)), o = opts[Math.random() * opts.length | 0];
  const m = { k: o.k, g: o.g[prof.lv < 5 ? 0 : 1], n: 0, s: slot };
  if (o.k === 'cat') { const cs = MISSION_CATS.filter(c => c !== not?.c); m.c = cs[Math.random() * cs.length | 0]; }
  return m;
}
// today's three, new ones each day
function missionsNow() {
  const today = dayKey();
  if (prof.missions?.day !== today) { const m = []; for (const s of [0, 1, 2]) m.push(rollMission(s, null, m.map(x => x.k))); prof.missions = { day: today, m, rr: 0, all: false }; }
  return prof.missions;
}
let missionAt = null; // progress when this game started, for the results screen
function missionMark() { missionAt = missionsNow().m.map(m => m.n); missionAt.day = prof.missions.day; }
function missionStep(test, add) {
  const M = missionsNow();
  M.m.forEach((m, i) => {
    if (m.ok || !test(m)) return;
    m.n = Math.min(m.g, add(m.n));
    if (m.n < m.g) return;
    m.ok = true; const pay = MISSION_PAY[m.s];
    prof.coins += pay; prof.earned = (prof.earned ?? 0) + pay;
    if (!matchOver) toast(`MISSION DONE · +${pay} COINS`, '#ffd75e'); // the results screen shows it there
    sfx('buy');
    if (M.m.every(x => x.ok) && !M.all) {
      M.all = true; prof.box = { ...prof.box, wood: (prof.box?.wood | 0) + 1 };
      setTimeout(() => { if (!matchOver) toast('ALL MISSIONS DONE · FREE WOODEN CHEST', '#ffd75e'); sfx('levelUp'); }, 1800);
    }
    saveProf();
  });
}
// what counts
function missionKill(head, streak) {
  const cat = BASE[cur]?.cat;
  missionStep(m => m.k === 'kills' || m.k === 'cat' && m.c === cat, n => n + 1);
  if (head) missionStep(m => m.k === 'head', n => n + 1);
  if (streak) missionStep(m => m.k === 'streak', n => Math.max(n, streak));
}
const missionWave = w => missionStep(m => m.k === 'wave', n => Math.max(n, w));
function missionEnd(won) {
  missionStep(m => m.k === 'play', n => n + 1);
  if (won) missionStep(m => m.k === 'win', n => n + 1);
  saveProf();
}
function missionReroll(i) {
  const M = missionsNow(), m = M.m[i];
  if (!m || m.ok || M.rr >= MISSION_REROLLS) return;
  M.m[i] = rollMission(m.s, m, M.m.filter(x => x !== m).map(x => x.k)); M.rr++;
  if (missionAt?.day === M.day) missionAt[i] = 0;
  saveProf(); renderMissions(); sfx('ui');
}
// the results screen: this game's progress
function missionsRow() {
  const M = missionsNow(), at = missionAt?.day === M.day ? missionAt : null;
  return `<div class="msr"><small>DAILY MISSIONS</small><div>${M.m.map((m, i) => {
    const up = at && m.n > at[i], fresh = up && m.ok;
    return `<div class="mcard${m.ok ? ' ok' : ''}${up ? ' up' : ''}"><b>${missionText(m)}</b><u><i style="width:${m.n / m.g * 100}%"></i></u><span>${fresh ? `+${MISSION_PAY[m.s]} ${COIN}` : m.ok ? ico('check') : `${m.n}/${m.g}`}</span></div>`;
  }).join('')}</div>${M.all && at && at.some((n, i) => n < M.m[i].g) ? `<small class="all">ALL DONE · FREE WOODEN CHEST</small>` : ''}</div>`;
}
// the lobby panel
function renderMissions() {
  const el = $('missions'); if (!el) return;
  const M = missionsNow(), left = Math.max(0, new Date().setHours(24, 0, 0, 0) - Date.now()) / 60000, can = M.rr < MISSION_REROLLS;
  el.innerHTML = `<div class="mh"><b>DAILY MISSIONS</b><small>NEW IN ${left / 60 | 0}H ${String(left % 60 | 0).padStart(2, '0')}M</small></div>` +
    M.m.map((m, i) => `<div class="mr${m.ok ? ' ok' : ''}"><span class="mt">${missionText(m)}</span><span class="mp">${m.ok ? ico('check') : `${m.n}/${m.g}`}</span>` +
      `<span class="pay">${COIN}${MISSION_PAY[m.s]}</span>${can && !m.ok ? `<button class="rr" data-i="${i}" title="Swap this mission (once a day)">${ico('reload')}</button>` : ''}<u><i style="width:${m.n / m.g * 100}%"></i></u></div>`).join('') +
    `<div class="mb${M.all ? ' ok' : ''}">${M.all ? ico('check') + ' ' : ''}ALL 3: <img src="${chestPic(0)}"> WOODEN CHEST</div>`;
}
$('missions').addEventListener('click', e => { const b = e.target.closest('.rr'); if (b) { e.stopPropagation(); missionReroll(+b.dataset.i); } });
setInterval(() => { if (inLobby) renderMissions(); }, 30000);
addEventListener('pagehide', () => saveProf()); // kills so far this game
renderMissions();
