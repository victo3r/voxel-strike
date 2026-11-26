// weapon of the week: one armory gun anyone can try in every match that week, never yours, so nothing that counts guns sees it
const TRIAL_GUNS = ['finale', 'wildfire', 'quasar', 'monarch', 'starsmasher', 'voidlantern', 'tempest', 'aurora', 'blazesaber', 'apex', 'wisp', 'windsaber', 'moonbeam', 'bombard', 'peregrine', 'boomerang', 'juggernaut', 'scythe', 'meteor'];
const TRIAL_FROM = 2; // the evWeek() of the first, the week of 2026-11-23
const trialPick = /^(127\.0\.0\.1|localhost)$/.test(location.hostname) && new URLSearchParams(location.search).get('try') || null; // ?try=quasar to see one here
const trialWk = () => new Date(EV_START + evWeek() * EV_WEEK).toISOString().slice(0, 10);
// this week's gun, or -1
function trialNow() {
  const w = evWeek() - TRIAL_FROM, id = trialPick ?? (w >= 0 ? TRIAL_GUNS[w % TRIAL_GUNS.length] : null), i = id ? gi(id) : undefined;
  return i === undefined ? -1 : i;
}
// on offer: not yours already, and not before your first game
function trialOk() { const t = trialNow(); return t >= 0 && !hasGun(t) && !needStarter(); }
// in your loadout this week
function trialOn() { return trialOk() && prof.trial === trialWk(); }
function trialSet(on) {
  prof.trial = on ? trialWk() : ''; saveProf();
  const t = trialNow(); if (t >= 0) armSync(t, 'eq');
  armIcon(); renderTrial();
}
// equipping or buying another gun for that slot puts it away
function trialOff(cat) { if (trialOn() && BASE[trialNow()].cat === cat) { prof.trial = ''; renderTrial(); } }

// the lobby card, just above the ARMORY button
function renderTrial() {
  const el = $('trial'); if (!el) return;
  if (!inLobby || !trialOk()) { el.innerHTML = ''; return; }
  const t = trialNow(), w = BASE[t], [rn, rc] = RARITY[rarOf(w)], on = trialOn();
  el.style.setProperty('--rc', rc);
  el.title = `${rn} ${CATS[CAT_I[w.cat]][1]}  ·  ${evLeft()} left`;
  setHTML(el, `<div class="th"><b>FREE THIS WEEK</b><small>${evLeft()}</small></div><img class="ai" src="${gunPic(t)}"><b class="tn">${w.name.toUpperCase()}</b>` +
    (on ? `<span class="ton">${ico('check')} EQUIPPED</span>` : `<button class="go" data-try="1">TRY IT</button>`));
}
$('trial').addEventListener('click', e => {
  e.stopPropagation();
  if (e.target.closest('[data-try]')) { trialSet(true); sfx('equip'); return; }
  const t = trialNow(); if (t < 0) return; // the rest of the card: that gun in the armory
  openArmory(); armPage = 'weapons'; armCat = BASE[t].cat; armSel = t; armPick = true; armDet = false; sfx('ui'); renderArmory();
});
renderTrial();
