// your account: level, XP, coins and guns
const XP_BASE = 50, XP_STEP = 25, LV_MAX = 50;
const xpNeed = lv => XP_BASE + XP_STEP * (lv - 1);
const lvBonus = lv => 5 * (lv - 1); // coins for reaching a level
// boosters for reaching a level, one more every 10 levels
const lvBoosts = lv => 1 + Math.floor(lv / 10);
// dev profile (?all=1 on this computer): everything owned, saved apart from your real one and never synced
const DEV_ALL = /[?&]all=1\b/.test(location.search) && /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
const PROF_KEY = DEV_ALL ? 'voxelstrike-profile-dev' : 'voxelstrike-profile';
// saved profile (v = save format version)
let prof = { v: 1, lv: 1, xp: 0, coins: 0, guns: {}, loadout: {}, use: {}, armor: 0, armorUse: 0, boots: {}, bootUse: {}, bootOn: '', hats: {}, hatUse: {}, hatOn: '' };
try { const s = JSON.parse(localStorage.getItem(PROF_KEY)); if (s) prof = { ...prof, ...s, guns: { ...s.guns }, loadout: { ...s.loadout }, use: { ...s.use }, boots: { ...s.boots }, bootUse: { ...s.bootUse }, hats: { ...s.hats }, hatUse: { ...s.hatUse } }; } catch {}
let onSave = () => {}; // cloud.js uploads changes when signed in
const saveProf = () => { try { localStorage.setItem(PROF_KEY, JSON.stringify(prof)); } catch {} onSave(); };
// tops the dev profile up, so anything new shows up owned
function devAll() {
  if (!DEV_ALL) return;
  prof.lv = LV_MAX; prof.xp = 0; prof.coins = Math.max(prof.coins, 99999); prof.keys = Math.max(prof.keys | 0, 99); prof.boosts = Math.max(prof.boosts | 0, 50);
  for (const w of BASE) if (!w.start && !prof.guns[w.id]) prof.guns[w.id] = 1;
  prof.armor = ARMOR_MAX;
  for (const b of BOOTS) prof.boots[b.id] ||= 1;
  for (const h of HATS) prof.hats[h.id] ||= 1;
  saveProf(); showProf(); renderChests();
}

// add XP and coins, leveling up as many times as needed
function grant(xp, coins) {
  let ups = 0, bonus = 0, boostUp = 0;
  prof.coins += coins;
  if (prof.lv < LV_MAX) prof.xp += xp;
  while (prof.lv < LV_MAX && prof.xp >= xpNeed(prof.lv)) { prof.xp -= xpNeed(prof.lv); prof.lv++; ups++; bonus += lvBonus(prof.lv); boostUp += lvBoosts(prof.lv); }
  if (prof.lv >= LV_MAX) prof.xp = 0;
  prof.coins += bonus;
  prof.boosts = (prof.boosts | 0) + boostUp;
  prof.earned = (prof.earned ?? 0) + coins + bonus; // lifetime coins, used to compare saves
  saveProf(); showProf();
  return { ups, bonus, boostUp };
}
const xpBar = () => `<div class="xpbar"><div style="width:${prof.lv >= LV_MAX ? 100 : Math.min(100, prof.xp / xpNeed(prof.lv) * 100)}%"></div></div>`;
// results screen rewards: same-size tiles, name on top, the icon, the amount
const rewardRow = list => `<div class="rw">${list.filter(Boolean).map(([icon, l, v, c]) => `<div class="rt ${c}"><small>${l}</small><span class="ri">${icon}</span><b>${v}</b></div>`).join('')}</div>`;
const xpTile = n => [ico('xp'), 'XP', `+${n}`, 'tx'], coinTile = n => [COIN, 'COINS', `+${n}`, 'tc'];
const xpText = () => prof.lv >= LV_MAX ? 'MAX LEVEL' : `${prof.xp} / ${xpNeed(prof.lv)} XP`;
function showProf() { // lobby level badge and coins
  $('prof').innerHTML = `<div class="lv"><b>LVL ${prof.lv}</b>${xpBar()}<small>${xpText()}</small></div>`;
  $('lobbyCoins').innerHTML = COIN + prof.coins;
  if (typeof renderBoost === 'function') renderBoost();
  if (typeof renderChests === 'function') renderChests();
}
showProf();
