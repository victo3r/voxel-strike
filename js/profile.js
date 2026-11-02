// your account: level, XP, coins and unlocked guns, kept between matches (separate from the zombie-waves shop coins)
// XP needed to go from level L to L+1: XP_BASE + XP_STEP * (L - 1). So 50 for level 2, 75 for level 3, 100 for level 4...
const XP_BASE = 50, XP_STEP = 25, LV_MAX = 30;
const xpNeed = lv => XP_BASE + XP_STEP * (lv - 1);
const lvBonus = lv => 5 * (lv - 1); // coins for reaching level lv: 5 at level 2, 10 at level 3 ... 145 at level 30
// guns: weapon id -> stars (1-3) for unlockable guns you own. Starters aren't listed, everyone has them.
// loadout: category -> weapon id, the one gun per category you take into a match (missing = that category's starter)
// v = save format version, so later changes can upgrade old saves instead of wiping them
let prof = { v: 1, lv: 1, xp: 0, coins: 0, guns: {}, loadout: {} }; // xp = progress toward the next level
try { const s = JSON.parse(localStorage.getItem('voxelstrike-profile')); if (s) prof = { ...prof, ...s, guns: { ...s.guns }, loadout: { ...s.loadout } }; } catch {}
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
function showProf() { // lobby: compact level badge with a thin XP bar, then coins
  $('prof').innerHTML = `<div class="lv"><b>LVL ${prof.lv}</b>${xpBar()}<small>${xpText()}</small></div><span class="pc">◆ ${prof.coins}</span>`;
}
showProf();
