// an anonymous count of how far new players get, to see where they leave: no ids, just a step, phone or desktop, CrazyGames or not
let fun = null;
try { fun = JSON.parse(localStorage.getItem('voxelstrike-funnel')); } catch {}
if (!fun) fun = prof.lv === 1 && !prof.xp && !localStorage.getItem('voxelstrike-starter') && !DEV_ALL ? { d0: dayKey(), s: [], t: 0, g: 0 } : { s: [] }; // only players who start out now
const funnelSave = () => { try { localStorage.setItem('voxelstrike-funnel', JSON.stringify(fun)); } catch {} };
function funnel(step) {
  if (!fun.d0 || fun.s.includes(step)) return;
  fun.s.push(step); funnelSave();
  if (navigator.webdriver && !window.funnelTest) return; // not from automated tests
  fetch(CLOUD + '/funnel', { method: 'POST', keepalive: true, body: JSON.stringify({ s: step, d: (TOUCH ? 'p' : 'd') + (cg.on ? 'c' : 'w') }) }).catch(() => {});
}
// the game is up: how it loaded, and whether they've come back
function funnelBoot() {
  funnel('load');
  if (performance.now() > 10000) funnel('slow');
  if (TOUCH && innerHeight > innerWidth) funnel('tall'); // a phone held upright only sees "turn your phone"
  if (fun.d0 && fun.d0 !== dayKey()) { funnel('back'); if (fun.d0 === dayBefore()) funnel('d1'); }
}
// seconds actually played
function funnelPlay(dt) {
  if (!fun.d0 || fun.t >= 600) return;
  const a = fun.t; fun.t = a + dt;
  for (const n of [30, 60, 180, 600]) if (a < n && fun.t >= n) funnel('s' + n);
}
// a game finished
function funnelEnd() {
  if (!fun.d0) return;
  fun.g++; funnelSave();
  if (fun.g === 1 || fun.g === 2 || fun.g === 5) funnel('end' + fun.g);
}
