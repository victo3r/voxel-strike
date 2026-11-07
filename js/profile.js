// your account: level, XP, coins and guns
const XP_BASE = 50, XP_STEP = 25, LV_MAX = 50;
const xpNeed = lv => XP_BASE + XP_STEP * (lv - 1);
const lvBonus = lv => 5 * (lv - 1); // coins for reaching a level
// boosters for reaching a level, one more every 10 levels
const lvBoosts = lv => 1 + Math.floor(lv / 10);
// saved profile (v = save format version)
let prof = { v: 1, lv: 1, xp: 0, coins: 0, guns: {}, loadout: {}, use: {}, armor: 0, armorUse: 0, boots: {}, bootUse: {}, bootOn: '', hats: {}, hatUse: {}, hatOn: '' };
try { const s = JSON.parse(localStorage.getItem('voxelstrike-profile')); if (s) prof = { ...prof, ...s, guns: { ...s.guns }, loadout: { ...s.loadout }, use: { ...s.use }, boots: { ...s.boots }, bootUse: { ...s.bootUse }, hats: { ...s.hats }, hatUse: { ...s.hatUse } }; } catch {}
let onSave = () => {}; // cloud.js uploads changes when signed in
const saveProf = () => { try { localStorage.setItem('voxelstrike-profile', JSON.stringify(prof)); } catch {} onSave(); };

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
const xpText = () => prof.lv >= LV_MAX ? 'MAX LEVEL' : `${prof.xp} / ${xpNeed(prof.lv)} XP`;
function showProf() { // lobby level badge and coins
  $('prof').innerHTML = `<div class="lv"><b>LVL ${prof.lv}</b>${xpBar()}<small>${xpText()}</small></div>`;
  $('lobbyCoins').innerHTML = COIN + prof.coins;
  if (typeof renderBoost === 'function') renderBoost();
}
showProf();
