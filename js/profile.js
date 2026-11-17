// your account: level, XP, coins and guns
const XP_BASE = 50, XP_STEP = 25, LV_MAX = 50;
const BAR_XP = 500; // XP for a titanium bar, once you're at the top level
const BAR_CHEST = 'iron', BAR_CHESTS = 2; // the chests that XP makes instead, once you hold every bar you can use
// bars you still have a use for: the pieces you haven't crafted
const barsWanted = () => [[SUITS, prof.suits], [BOOTS, prof.boots], [HATS, prof.hats]].reduce((s, [list, own]) => s + list.reduce((t, X) => t + (X.bars && !own[X.id] ? X.bars : 0), 0), 0);
const barNext = () => typeof HATS === 'undefined' || (prof.bars | 0) < barsWanted(); // is the next one a bar?
const xpNeed = lv => XP_BASE + XP_STEP * (lv - 1);
const lvBonus = lv => 5 * (lv - 1); // coins for reaching a level
// boosters for reaching a level, one more every 10 levels
const lvBoosts = lv => 1 + Math.floor(lv / 10);
// dev profile (?all=1 on this computer): everything owned, saved apart from your real one and never synced
const DEV_ALL = /[?&]all=1\b/.test(location.search) && /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
const PROF_KEY = DEV_ALL ? 'voxelstrike-profile-dev' : 'voxelstrike-profile';
// saved profile (v = save format version)
let prof = { v: 1, lv: 1, xp: 0, coins: 0, guns: {}, loadout: {}, use: {}, armor: 0, armorUse: 0, suits: {}, suitUse: {}, armorOn: '', boots: {}, bootUse: {}, bootOn: '', hats: {}, hatUse: {}, hatOn: '', skins: {}, hatSkin: {} };
try { const s = JSON.parse(localStorage.getItem(PROF_KEY)); if (s) prof = { ...prof, ...s, guns: { ...s.guns }, loadout: { ...s.loadout }, use: { ...s.use }, suits: { ...s.suits }, suitUse: { ...s.suitUse }, boots: { ...s.boots }, bootUse: { ...s.bootUse }, hats: { ...s.hats }, hatUse: { ...s.hatUse }, skins: { ...s.skins }, hatSkin: { ...s.hatSkin } }; } catch {}
let onSave = () => {}; // cloud.js uploads changes when signed in
const saveProf = () => { try { localStorage.setItem(PROF_KEY, JSON.stringify(prof)); } catch {} onSave(); };
// tops the dev profile up, so anything new shows up owned
function devAll() {
  if (!DEV_ALL) return;
  prof.lv = LV_MAX; prof.xp = 0; prof.coins = Math.max(prof.coins, 99999); prof.keys = Math.max(prof.keys | 0, 99); prof.boosts = Math.max(prof.boosts | 0, 50); prof.bars = Math.max(prof.bars | 0, 20);
  for (const w of BASE) if (!w.start && !prof.guns[w.id]) prof.guns[w.id] = 1;
  prof.armor = ARMOR_MAX;
  for (const S of SUITS) prof.suits[S.id] ||= 1;
  for (const b of BOOTS) prof.boots[b.id] ||= 1;
  for (const h of HATS) prof.hats[h.id] ||= 1;
  for (const S of HAT_SKINS) prof.skins[S.id] ||= 1;
  prof.secrets = Object.keys(SECRETS);
  saveProf(); showProf(); renderChests();
}

// add XP and coins, leveling up as many times as needed
function grant(xp, coins) {
  let ups = 0, bonus = 0, boostUp = 0;
  prof.coins += coins;
  if (prof.lv < LV_MAX) prof.xp += xp; else prof.barXp = (prof.barXp | 0) + xp;
  while (prof.lv < LV_MAX && prof.xp >= xpNeed(prof.lv)) { prof.xp -= xpNeed(prof.lv); prof.lv++; ups++; bonus += lvBonus(prof.lv); boostUp += lvBoosts(prof.lv); }
  let bars = 0, boxes = 0;
  if (prof.lv >= LV_MAX) { // XP past the top level makes titanium bars, then chests
    const all = (prof.barXp | 0) + prof.xp; prof.xp = 0; prof.barXp = all % BAR_XP;
    for (let n = Math.floor(all / BAR_XP); n > 0; n--) {
      if (barNext()) { prof.bars = (prof.bars | 0) + 1; bars++; }
      else { prof.box = { ...prof.box, [BAR_CHEST]: (prof.box?.[BAR_CHEST] | 0) + BAR_CHESTS }; boxes += BAR_CHESTS; }
    }
  }
  prof.coins += bonus;
  prof.boosts = (prof.boosts | 0) + boostUp;
  prof.earned = (prof.earned ?? 0) + coins + bonus; // lifetime coins, used to compare saves
  saveProf(); showProf();
  return { ups, bonus, boostUp, bars, boxes };
}
const xpBar = () => `<div class="xpbar"><div style="width:${prof.lv >= LV_MAX ? (prof.barXp | 0) / BAR_XP * 100 : Math.min(100, prof.xp / xpNeed(prof.lv) * 100)}%"></div></div>`;
// results screen rewards: same-size tiles, name on top, the icon, the amount
const rewardRow = list => `<div class="rw">${list.filter(Boolean).map(([icon, l, v, c]) => `<div class="rt ${c}"><small>${l}</small><span class="ri">${icon}</span><b>${v}</b></div>`).join('')}</div>`;
const xpTile = n => [ico('xp'), 'XP', `+${n}`, 'tx'], coinTile = n => [COIN, 'COINS', `+${n}`, 'tc'], barTile = n => n ? [BAR, 'TITANIUM', `+${n}`, 'tbr'] : null;
const barChest = () => CHESTS.findIndex(c => c.id === BAR_CHEST), boxTile = n => n ? [`<img src="${chestPic(barChest())}">`, CHESTS[barChest()].name, `+${n}`, 'tbr'] : null;
const barWord = () => barNext() ? 'BAR' : 'CHESTS';
const xpText = () => prof.lv >= LV_MAX ? `NEXT ${barNext() ? 'BAR' : BAR_CHESTS + ' CHESTS'} ${prof.barXp | 0} / ${BAR_XP} XP` : `${prof.xp} / ${xpNeed(prof.lv)} XP`;
function showProf() { // lobby level badge and coins
  const max = prof.lv >= LV_MAX;
  $('prof').innerHTML = `<div class="lv${max ? ' max' : ''}"><b><small>LVL</small>${prof.lv}</b><div class="xp"><small>${max ? `${barWord()} <span>${prof.barXp | 0} / ${BAR_XP}</span> XP` : `<span>${prof.xp} / ${xpNeed(prof.lv)}</span> XP`}</small>${xpBar()}</div></div>`;
  $('lobbyCoins').innerHTML = COIN + prof.coins + (prof.bars || max && barNext() ? `<span class="tbr" title="Titanium bars">${BAR}${prof.bars | 0}</span>` : '');
  if (typeof renderBoost === 'function') renderBoost();
  if (typeof renderChests === 'function') renderChests();
  if (typeof renderEvent === 'function') renderEvent();
}
showProf();
