// your account: level, XP, coins and unlocked guns, kept between matches (separate from the zombie-waves shop coins)
// XP needed to go from level L to L+1: XP_BASE + XP_STEP * (L - 1). So 50 for level 2, 75 for level 3, 100 for level 4...
const XP_BASE = 50, XP_STEP = 25, LV_MAX = 50;
const xpNeed = lv => XP_BASE + XP_STEP * (lv - 1);
const lvBonus = lv => 5 * (lv - 1); // coins for reaching level lv: 5 at level 2, 10 at level 3 ... 245 at level 50
// guns: weapon id -> stars (1-3) for unlockable guns you own. Starters aren't listed, everyone has them.
// loadout: category -> weapon id, the one gun per category you take into a match (missing = that category's starter)
// use: weapon id -> the stars you take into a match when that's fewer than you own (missing = all of them)
// armor: stars on your armor, 0 = none (js/armor.js ARMOR_TIERS). armorUse: the star you wear when it's lower than that (0 = your best)
// boots: boot id -> stars you own (js/boots.js). bootUse: boot id -> the stars you wear when fewer. bootOn: the pair you wear ('' = none). hats, hatUse, hatOn: the same for hats (js/hats.js)
// v = save format version, so later changes can upgrade old saves instead of wiping them
let prof = { v: 1, lv: 1, xp: 0, coins: 0, guns: {}, loadout: {}, use: {}, armor: 0, armorUse: 0, boots: {}, bootUse: {}, bootOn: '', hats: {}, hatUse: {}, hatOn: '' }; // xp = progress toward the next level
try { const s = JSON.parse(localStorage.getItem('voxelstrike-profile')); if (s) prof = { ...prof, ...s, guns: { ...s.guns }, loadout: { ...s.loadout }, use: { ...s.use }, boots: { ...s.boots }, bootUse: { ...s.bootUse }, hats: { ...s.hats }, hatUse: { ...s.hatUse } }; } catch {}
let onSave = () => {}; // js/cloud.js sets this to upload the change when you're signed in
const saveProf = () => { try { localStorage.setItem('voxelstrike-profile', JSON.stringify(prof)); } catch {} onSave(); };

// adds XP and coins, levels up as many times as it fills (each level-up pays its coin bonus).
// Returns { ups: levels gained, bonus: level-up coins paid }
function grant(xp, coins) {
  let ups = 0, bonus = 0;
  prof.coins += coins;
  if (prof.lv < LV_MAX) prof.xp += xp;
  while (prof.lv < LV_MAX && prof.xp >= xpNeed(prof.lv)) { prof.xp -= xpNeed(prof.lv); prof.lv++; ups++; bonus += lvBonus(prof.lv); }
  if (prof.lv >= LV_MAX) prof.xp = 0;
  prof.coins += bonus;
  prof.earned = (prof.earned ?? 0) + coins + bonus; // lifetime coins, never goes down (used to compare saves)
  saveProf(); showProf();
  return { ups, bonus };
}
const xpBar = () => `<div class="xpbar"><div style="width:${prof.lv >= LV_MAX ? 100 : Math.min(100, prof.xp / xpNeed(prof.lv) * 100)}%"></div></div>`;
const xpText = () => prof.lv >= LV_MAX ? 'MAX LEVEL' : `${prof.xp} / ${xpNeed(prof.lv)} XP`;
function showProf() { // lobby: compact level badge with a thin XP bar top left; coins top right next to settings
  $('prof').innerHTML = `<div class="lv"><b>LVL ${prof.lv}</b>${xpBar()}<small>${xpText()}</small></div>`;
  $('lobbyCoins').innerHTML = COIN + prof.coins;
}
showProf();
