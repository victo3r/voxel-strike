// achievements: one-time goals, claimed in the lobby for XP and more
const achN = k => prof.ach?.n?.[k] | 0;
// guns you got yourself, not the starters
const achKit = () => BASE.filter(w => !w.start && prof.guns[w.id]);
// goals read off your account, the rest are counted as you play
const ACH_NOW = {
  lv: () => prof.lv, guns: () => achKit().length, slots: () => new Set(achKit().map(w => w.cat)).size,
  star3: () => achKit().filter(w => prof.guns[w.id] >= 3).length,
  set: () => SUITS.filter(S => prof.suits?.[S.id] && prof.boots?.[S.id] && prof.hats?.[S.id]).length,
  zw: () => Math.max(achN('zw'), best.wave | 0),
  used: () => CATS.filter(([c]) => prof.ach?.used?.[c]).length,
};
// n = what's counted, g = how many, then the pay: xp, c coins, k keys, b boosters, box a chest
const ACH = [
  { id: 'g1', ic: 'aim', name: 'Warm Up', text: 'Finish a game', n: 'g', g: 1, xp: 25, c: 10 },
  { id: 'w1', ic: 'trophy', name: 'Winner', text: 'Win a match', n: 'w', g: 1, xp: 50, c: 15 },
  { id: 'k50', ic: 'skull', name: 'Slinger I', text: '50 kills', n: 'k', g: 50, xp: 75 },
  { id: 'k250', ic: 'skull', name: 'Slinger II', text: '250 kills', n: 'k', g: 250, xp: 150, c: 40 },
  { id: 'k1000', ic: 'skull', name: 'Slinger III', text: '1000 kills', n: 'k', g: 1000, xp: 300, k: 1 },
  { id: 'k5000', ic: 'skull', name: 'Slinger IV', text: '5000 kills', n: 'k', g: 5000, xp: 600, box: 'iron' },
  { id: 'h25', ic: 'head', name: 'Headhunter I', text: '25 headshot kills', n: 'h', g: 25, xp: 100 },
  { id: 'h200', ic: 'head', name: 'Headhunter II', text: '200 headshot kills', n: 'h', g: 200, xp: 250, k: 1 },
  { id: 'st5', ic: 'bolt', name: 'On a Roll', text: '5 kills without dying', n: 'st', g: 5, xp: 100 },
  { id: 'st10', ic: 'bolt', name: 'Unstoppable', text: '10 kills without dying', n: 'st', g: 10, xp: 250, k: 1 },
  { id: 'ml25', ic: 'blade', name: 'Up Close', text: '25 melee kills', n: 'ml', g: 25, xp: 100 },
  { id: 'used', ic: 'bullet', name: 'Jack of All Guns', text: 'A kill with a gun from every slot', n: 'used', g: 6, xp: 150 },
  { id: 'g25', ic: 'aim', name: 'Regular', text: 'Finish 25 games', n: 'g', g: 25, xp: 150, c: 40 },
  { id: 'g100', ic: 'aim', name: 'Veteran', text: 'Finish 100 games', n: 'g', g: 100, xp: 300, c: 100 },
  { id: 'w10', ic: 'trophy', name: 'Champion', text: 'Win 10 matches', n: 'w', g: 10, xp: 150, k: 1 },
  { id: 'w50', ic: 'trophy', name: 'Legend', text: 'Win 50 matches', n: 'w', g: 50, xp: 400, box: 'iron' },
  { id: 'ow1', ic: 'cloud', name: 'Going Online', text: 'Win an online match', n: 'ow', g: 1, xp: 100, k: 1 },
  { id: 'z5', ic: 'skull', name: 'Survivor', text: 'Reach zombie wave 5', n: 'zw', g: 5, xp: 50 },
  { id: 'z10', ic: 'skull', name: 'Zombie Hunter', text: 'Reach zombie wave 10', n: 'zw', g: 10, xp: 150 },
  { id: 'z20', ic: 'skull', name: 'Nightmare', text: 'Reach zombie wave 20', n: 'zw', g: 20, xp: 300, k: 1 },
  { id: 'z30', ic: 'skull', name: 'Last One Standing', text: 'Reach zombie wave 30', n: 'zw', g: 30, xp: 500, box: 'iron' },
  { id: 'gun1', ic: 'bullet', name: 'New Toy', text: "Own a gun that isn't a starter", n: 'guns', g: 1, xp: 50 },
  { id: 'slots', ic: 'bullet', name: 'Full Rack', text: 'Own a gun for every slot, starters not counted', n: 'slots', g: 6, xp: 250, k: 1 },
  { id: 'gun10', ic: 'bullet', name: 'Collector', text: 'Own 10 guns, starters not counted', n: 'guns', g: 10, xp: 300, c: 100 },
  { id: 'star3', ic: 'star', name: 'Maxed Out', text: 'Get a gun to 3 stars', n: 'star3', g: 1, xp: 150 },
  { id: 'set', ic: 'shield', name: 'Matching Outfit', text: 'Own the armor, boots and hat of one set', n: 'set', g: 1, xp: 300, k: 1 },
  { id: 'ch10', ic: 'key', name: 'Treasure Hunter', text: 'Open 10 chests', n: 'ch', g: 10, xp: 100, c: 20 },
  { id: 'gold1', ic: 'key', name: 'Gold Rush', text: 'Open a golden chest', n: 'gc', g: 1, xp: 150 },
  { id: 'ms10', ic: 'check', name: 'On a Mission', text: 'Finish 10 daily missions', n: 'ms', g: 10, xp: 100 },
  { id: 'ms50', ic: 'check', name: 'Mission Master', text: 'Finish 50 daily missions', n: 'ms', g: 50, xp: 300, k: 1 },
  { id: 'lv10', ic: 'star', name: 'Double Digits', text: 'Reach level 10', n: 'lv', g: 10, k: 1, b: 2 },
  { id: 'lv25', ic: 'star', name: 'Halfway There', text: 'Reach level 25', n: 'lv', g: 25, box: 'iron' },
  { id: 'lv50', ic: 'star', name: 'Top of the World', text: 'Reach level 50', n: 'lv', g: 50, box: 'gold' },
];
const achAt = a => Math.min(a.g, ACH_NOW[a.n] ? ACH_NOW[a.n]() : achN(a.n));
const achGot = a => !!prof.ach?.got?.[a.id], achDone = a => achAt(a) >= a.g;
const achReady = () => ACH.filter(a => achDone(a) && !achGot(a));
// counting: tell whoever's playing when one is done
let achNew = [];
function achCount(fn) {
  const was = new Set(achReady().map(a => a.id));
  prof.ach = { n: { ...prof.ach?.n }, got: { ...prof.ach?.got }, used: { ...prof.ach?.used } }; fn(prof.ach.n, prof.ach);
  const now = achReady().filter(a => !was.has(a.id));
  if (!now.length) return;
  achNew.push(...now);
  if (!matchOver && !inLobby) toast(`ACHIEVEMENT · ${now[0].name.toUpperCase()}`, '#ffd75e');
  renderAchBtn();
}
function achKill(head, streak) {
  const cat = BASE[cur]?.cat;
  achCount((n, A) => { n.k = (n.k | 0) + 1; if (head) n.h = (n.h | 0) + 1; if (cat === 'melee') n.ml = (n.ml | 0) + 1; if (streak) n.st = Math.max(n.st | 0, streak); if (cat) A.used[cat] = 1; });
}
const achWave = w => achCount(n => { n.zw = Math.max(n.zw | 0, w); });
function achEnd(won, online) { achCount(n => { n.g = (n.g | 0) + 1; if (won) n.w = (n.w | 0) + 1; if (won && online) n.ow = (n.ow | 0) + 1; }); }
const achChest = id => achCount(n => { n.ch = (n.ch | 0) + 1; if (id === 'gold') n.gc = (n.gc | 0) + 1; });
const achMission = () => achCount(n => { n.ms = (n.ms | 0) + 1; });
function achMark() { achNew = []; }
// the results screen: what this game finished
const achRow = () => achNew.length ? `<div class="rl acr">${ico('ach')} ${achNew.length > 1 ? achNew.length + ' ACHIEVEMENTS' : achNew[0].name.toUpperCase()} · CLAIM IN THE LOBBY</div>` : '';

const achPayTags = a => [a.xp && `<span class="ax">+${a.xp} XP</span>`, a.c && `<span class="ay">${COIN}${a.c}</span>`, a.k && `<span class="ak">${ico('key')}${a.k}</span>`, a.b && `<span class="ak">${ico('bolt')}${a.b}</span>`,
  a.box && `<span class="ak"><img src="${chestPic(CHESTS.findIndex(c => c.id === a.box))}"></span>`].filter(Boolean).join('');
function achClaim(id) {
  const a = ACH.find(x => x.id === id); if (!a || !achDone(a) || achGot(a)) return;
  prof.ach = { n: { ...prof.ach?.n }, used: { ...prof.ach?.used }, got: { ...prof.ach?.got, [a.id]: 1 } };
  if (a.c) { prof.coins += a.c; prof.earned = (prof.earned ?? 0) + a.c; }
  if (a.k) prof.keys = (prof.keys | 0) + a.k;
  if (a.b) prof.boosts = (prof.boosts | 0) + a.b;
  if (a.box) prof.box = { ...prof.box, [a.box]: (prof.box?.[a.box] | 0) + 1 };
  const r = grant(a.xp | 0, 0);
  sfx(r.ups ? 'levelUp' : 'buy');
  if (r.ups && !lvlShow()) netToast(`LEVEL UP! LVL ${prof.lv}`);
  renderAch(); renderAchBtn(); renderChests(); renderBoost();
}
function renderAchBtn() {
  const n = achReady().length;
  $('achBtn').innerHTML = ico('ach') + `<i id="achBadge">${n || ''}</i>`;
  $('achBtn').classList.toggle('new', n > 0);
}
function renderAch() {
  if ($('ach').style.display !== 'flex') return;
  const rank = a => achGot(a) ? 2 : achDone(a) ? 0 : 1, list = ACH.map((a, i) => [a, i]).sort((x, y) => rank(x[0]) - rank(y[0]) || x[1] - y[1]).map(x => x[0]);
  const keep = $('achBox').querySelector('.acList')?.scrollTop | 0;
  $('achBox').innerHTML = `<div class="lbTop"><h1>${ico('ach')} ACHIEVEMENTS</h1><span class="acN">${ACH.filter(achGot).length} / ${ACH.length}</span></div>` +
    '<div class="acList">' + list.map(a => {
      const at = achAt(a), got = achGot(a), done = at >= a.g;
      return `<div class="ac${got ? ' got' : done ? ' ok' : ''}"><span class="aci">${ico(a.ic)}</span><div class="act"><b>${a.name}</b><small>${a.text}</small><u><i style="width:${at / a.g * 100}%"></i></u></div>` +
        `<div class="acp">${achPayTags(a)}</div>` + (got ? `<span class="acs">${ico('check')}</span>` : done ? `<button data-ach="${a.id}">CLAIM</button>` : `<span class="acs">${at}/${a.g}</span>`) + '</div>';
    }).join('') + '</div>' +
    `<div class="lbFoot"><button id="achX">${ico('close')} CLOSE</button></div>`;
  $('achBox').querySelector('.acList').scrollTop = keep;
}
function openAch() { $('ach').style.display = 'flex'; renderAch(); sfx('ui'); }
$('achBtn').addEventListener('click', e => { e.stopPropagation(); openAch(); });
$('ach').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b?.dataset.ach) { achClaim(b.dataset.ach); return; }
  if (!b && e.target.id === 'ach' || b?.id === 'achX') $('ach').style.display = 'none';
});
renderAchBtn();
