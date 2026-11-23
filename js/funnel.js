// an anonymous count of how far new players get, to see where they leave: no ids, just a step, phone or desktop, CrazyGames or not
let fun = null;
try { fun = JSON.parse(localStorage.getItem('voxelstrike-funnel')); } catch {}
if (!fun) fun = prof.lv === 1 && !prof.xp && !localStorage.getItem('voxelstrike-starter') && !DEV_ALL ? { d0: dayKey(), s: [], t: 0, g: 0 } : { s: [] }; // only players who start out now
const funnelSave = () => { try { localStorage.setItem('voxelstrike-funnel', JSON.stringify(fun)); } catch {} };
const FUN_BOTS = /[a-z]bot\/|crawler|spider|slurp|facebookexternalhit|headlesschrome|lighthouse|pagespeed/i, FUN_BOT = FUN_BOTS.test(navigator.userAgent); // crawlers that say so
let funAct = false; const funWait = [];
function funnel(step) {
  if (!fun.d0 || fun.s.includes(step)) return;
  if (!funAct && step !== 'load') { if (!funWait.includes(step)) funWait.push(step); return; } // the rest waits for a real click or key
  fun.s.push(step); funnelSave();
  if ((navigator.webdriver || FUN_BOT) && !window.funnelTest) return; // not from automated tests or crawlers
  fetch(CLOUD + '/funnel', { method: 'POST', keepalive: true, body: JSON.stringify({ s: step, d: (TOUCH ? 'p' : 'd') + (cg.on ? 'c' : 'w') }) }).catch(() => {});
}
// someone's really there: crawlers that open the page never click or press a key
function funnelAct(e) {
  if (funAct || !e.isTrusted) return;
  funAct = true; for (const k of ['pointerdown', 'keydown', 'touchend']) removeEventListener(k, funnelAct, true);
  funnel('act'); for (const s of funWait.splice(0)) funnel(s);
}
for (const k of ['pointerdown', 'keydown', 'touchend']) addEventListener(k, funnelAct, true);
// the game is up: how it loaded, and whether they've come back (all but the load itself sent once they act)
function funnelBoot() {
  funnel('load');
  if (performance.now() > 10000) funnel('slow');
  if (TOUCH && scr.h > scr.w) funnel('tall'); // a phone held upright
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
