// one hotbar slot per category
const CATS = [['primary', 'PRIMARY'], ['backup', 'BACKUP'], ['melee', 'MELEE'], ['special', 'SPECIAL'], ['sniper', 'SNIPER'], ['premium', 'PREMIUM']];
const CAT_I = Object.fromEntries(CATS.map(([k], i) => [k, i]));
// weapon stats (ids are used in saves, never rename them)
const BASE = [
  { id: 'voxel', hold: 'pistol', name: 'Voxel Gun', cat: 'backup', start: true, free: true, mob: 70, dmg: 20, rate: .26, mag: 12, reload: 1.0, pellets: 1, spread: 0, auto: false, color: 0x444444, len: .3 },
  { id: 'hitman', rar: 'rare', hold: 'pistol', name: 'Hitman', cat: 'backup', unlock: 3, price: 60, mob: 70, zoom: 2, quiet: true, dmg: 20, rate: .2, mag: 18, reload: 1.1, pellets: 1, spread: 0, auto: false, color: 0x2c2c30, len: .4 },
  { id: 'heatray', rar: 'rare', hold: 'rifle', name: 'Heat Ray Rifle', cat: 'special', unlock: 4, price: 100, mob: 60, beam: true, dmg: 7, rate: 1 / 18, range: 30, mag: 100, reload: 2.0, pellets: 1, spread: 0, auto: true, color: 0xb5652b, len: .7 },
  { id: 'shotgun', hold: 'rifle', name: 'Shotgun', cat: 'primary', start: true, mob: 60, action: 'PUMP ACTION', dmg: 10, rate: .75, mag: 6, reload: 1.6, pellets: 9, spread: .07, auto: false, color: 0x6b4a2b, len: .6 },
  { id: 'ar', hold: 'rifle', name: 'Assault Rifle', cat: 'primary', start: true, mob: 60, dmg: 12, rate: .09, mag: 30, reload: 1.4, pellets: 1, spread: .006, auto: true, color: 0x2f3b2f, len: .55 },
  { id: 'sniper', hold: 'rifle', name: 'Sniper Rifle', cat: 'sniper', start: true, mob: 55, action: 'BOLT ACTION', zoom: 5, dmg: 80, rate: 1.1, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x1a1a1a, len: .9, scope: true },
  { id: 'eradicator', rar: 'legend', hold: 'heavy', name: 'Eradicator', cat: 'primary', unlock: 12, price: 450, mob: 55, dmg: 9, rate: .05, mag: 120, reload: 2.6, pellets: 1, spread: .012, auto: true, color: 0x777777, len: .7 },
  { id: 'knife', hold: 'melee', name: 'Combat Knife', cat: 'melee', start: true, free: true, inf: true, melee: true, mob: 80, dmg: 40, rate: .4, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xd8dde3, len: .3, model: 'knife' },
  { id: 'flame', hold: 'rifle', name: 'Flamethrower', cat: 'special', start: true, mob: 60, flame: true, dmg: 5, rate: .06, range: 7, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0x555555, len: .5, model: 'flame' },
  { id: 'rocket', rar: 'rare', hold: 'shoulder', name: 'Rocket Launcher', cat: 'premium', unlock: 6, price: 150, mob: 55, rocket: true, dmg: 150, rate: 1.1, mag: 1, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x4b5b3b, len: .8, model: 'rocket' },
  { id: 'flare', hold: 'pistol', name: 'Flare Gun', cat: 'premium', start: true, mob: 65, flare: true, dmg: 80, burn: 3, burnT: 3, rate: .4, mag: 1, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc8402a, len: .4, model: 'flare' },
  { id: 'thrasher', rar: 'rare', hold: 'rifle', name: 'Thrasher', cat: 'primary', unlock: 2, price: 50, mob: 60, zoom: 3, dmg: 12, rate: 1 / 12, mag: 35, reload: 1.5, pellets: 1, spread: .006, auto: true, color: 0x3c3c44, len: .6 },
  { id: 'semisniper', rar: 'rare', hold: 'rifle', name: 'Semi Auto Sniper Rifle', cat: 'sniper', unlock: 4, price: 100, mob: 55, zoom: 4, dmg: 60, rate: 1 / 1.8, mag: 10, reload: 1.8, pellets: 1, spread: 0, auto: false, color: 0x3e3f44, len: .9, scope: true },
  { id: 'herosword', rar: 'rare', hold: 'melee', name: 'Hero Sword', cat: 'melee', unlock: 5, price: 110, inf: true, melee: true, tilt: 1.1, mob: 75, dmg: 65, rate: .6, range: 3.2, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xc8873a, len: .4, model: 'herosword' },
  { id: 'shockbeam', rar: 'rare', hold: 'rifle', name: 'Shock Beam', cat: 'special', unlock: 8, price: 180, mob: 60, beam: true, shock: true, dmg: 9, rate: 1 / 15, range: 28, mag: 100, reload: 2.0, pellets: 1, spread: 0, auto: true, color: 0x2f4a66, len: .7 },
  { id: 'tigerbite', rar: 'epic', hold: 'rifle', name: 'Tigerbite', cat: 'sniper', unlock: 10, price: 300, mob: 55, zoom: 5, dmg: 105, rate: 1, mag: 6, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0xe07a1f, len: .9, scope: true },
  { id: 'trex', rar: 'epic', hold: 'rifle', name: '"T. REX"', cat: 'primary', unlock: 14, price: 400, mob: 60, action: 'PUMP ACTION', dmg: 20, rate: 1 / 1.6, mag: 6, reload: 1.6, pellets: 6, spread: .06, auto: false, color: 0x4f6b34, len: .6 },
  { id: 'starsmasher', rar: 'legend', hold: 'rifle', name: 'Starsmasher', cat: 'primary', unlock: 30, price: 1150, mob: 60, zoom: 3, reticle: '255,215,90', starFx: true, dmg: 20, rate: .1, mag: 30, reload: 1.6, pellets: 1, spread: .005, auto: true, color: 0x24305a, len: .6 },
  { id: 'blazesaber', rar: 'legend', hold: 'melee', name: 'Blazesaber', cat: 'melee', unlock: 20, price: 750, inf: true, melee: true, tilt: 1.1, swing: 'saber', mob: 85, dmg: 60, rate: .55, range: 3.2, burn: 3, burnT: 2.5, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xff6a1a, len: .4, model: 'blazesaber' },
  { id: 'windsaber', rar: 'mythic', hold: 'melee', name: 'Windsaber', cat: 'melee', unlock: 40, price: 2000, inf: true, melee: true, tilt: 1.1, swing: 'saber', mob: 100, jump: [.25, .35, .45], dmg: 70, rate: .5, range: 3.4, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xe8f6ff, len: .4, model: 'windsaber' },
  { id: 'frostwand', rar: 'epic', hold: 'melee', name: 'Frost Wand', cat: 'special', unlock: 16, price: 460, mob: 65, beam: true, frost: true, wand: true, pool: true, dmg: 10, rate: 1 / 14, range: 26, mag: 240, reload: 3, pellets: 1, spread: 0, auto: true, color: 0x9fe8ff, len: .5 },
  { id: 'warhammer', rar: 'epic', hold: 'melee', name: 'War Hammer', cat: 'melee', unlock: 17, price: 490, inf: true, melee: true, tilt: 1.1, swing: 'hammer', hit: 'smash', knock: 1.5, mob: 65, dmg: 95, rate: .95, range: 3, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0x6a6e78, len: .4, model: 'warhammer' },
  { id: 'executioner', rar: 'epic', hold: 'pistol', name: 'Executioner', cat: 'backup', unlock: 14, price: 400, mob: 70, zoom: 4, reticle: '212,123,255', laser: true, dmg: 85, rate: 1 / 1.8, mag: 10, reload: 1.4, pellets: 1, spread: 0, auto: false, color: 0x5b3b8a, len: .4 },
  { id: 'crossbow', rar: 'rare', hold: 'rifle', name: 'Crossbow', cat: 'sniper', unlock: 7, price: 175, mob: 60, zoom: 2.5, reticle: '255,190,80', spare: 12, quiet: true, bow: true, headMul: 2.4, dmg: 85, rate: 1, mag: 1, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0x6b4a2b, len: .8 },
  { id: 'grenade', rar: 'epic', hold: 'rifle', name: 'Grenade Bouncer', cat: 'premium', unlock: 12, price: 350, mob: 60, grenade: true, dmg: 90, rate: .75, mag: 4, reload: 2.4, pellets: 1, spread: 0, auto: false, color: 0x3f7a3a, len: .7 },
  { id: 'aerial', rar: 'epic', hold: 'rifle', name: 'Aerial Blast', cat: 'premium', unlock: 15, price: 435, mob: 60, rocket: true, gust: true, launch: 1.1, dmg: 95, rate: 1, mag: 6, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0x8fd0f5, len: .8 },
  { id: 'rubypierce', rar: 'legend', hold: 'pistol', name: 'Ruby Pierce', cat: 'backup', unlock: 22, price: 835, mob: 60, zoom: 4, reticle: '255,70,90', lance: 0xff2e48, pierce: true, wallBreak: true, dmg: 115, rate: 1 / .9, mag: 6, reload: 1.6, pellets: 1, spread: 0, auto: false, color: 0xb3162e, len: .5 },
  { id: 'paragon', rar: 'legend', hold: 'rifle', name: 'Paragon', cat: 'sniper', unlock: 20, price: 760, mob: 55, zoom: 8, scope: true, lance: 0x3d9bff, pierce: true, wallBreak: true, dmg: 125, rate: 1 / .7, mag: 5, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0x2a5bd8, len: .95 },
  // the wand set
  { id: 'windwand', rar: 'epic', hold: 'melee', name: 'Wind Wand', cat: 'backup', unlock: 18, price: 520, mob: 70, wand: 'wind', knock: .7, dmg: 45, rate: 1 / 3, mag: 9, reload: 1.5, pellets: 1, spread: 0, auto: false, color: 0xd8f2ff, len: .5 },
  { id: 'stunwand', rar: 'epic', hold: 'melee', name: 'Stun Wand', cat: 'melee', unlock: 19, price: 550, inf: true, melee: true, wand: 'stun', swing: 'zapSwing', hit: 'zapHit', knock: .8, stun: .7, mob: 80, dmg: 50, rate: .65, range: 4.5, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xffd23a, len: .5 },
  { id: 'flamewand', rar: 'legend', hold: 'melee', name: 'Flame Wand', cat: 'primary', unlock: 21, price: 800, mob: 65, wand: 'flame', fast: true, burn: 3, burnT: 2, dmg: 25, rate: 1 / 6, mag: 36, reload: 1.8, pellets: 1, spread: 0, auto: true, color: 0xff7a2a, len: .5 },
  { id: 'soulwand', rar: 'legend', hold: 'melee', name: 'Soul Wand', cat: 'sniper', unlock: 23, price: 875, mob: 60, wand: 'soul', heavyKick: true, zoom: 6, reticle: '110,255,215', soul: 25, dmg: 110, rate: .8, mag: 5, reload: 2.0, pellets: 1, spread: 0, auto: false, color: 0x6fffd8, len: .5 },
  { id: 'ancientwand', rar: 'mythic', hold: 'melee', name: 'Ancient Wand', cat: 'premium', unlock: 25, price: 1250, chest: true, mob: 65, wand: 'spell', spell: true, heavyKick: true, burn: 3, burnT: 3, dmg: 100, rate: 1, mag: 6, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0x8a6a4a, len: .5 },
  { id: 'hornet', rar: 'rare', hold: 'rifle', name: 'Hornet', cat: 'primary', unlock: 7, price: 175, mob: 60, zoom: 2.5, reticle: '255,205,60', burst: 3, dmg: 19, rate: .4, mag: 30, reload: 1.5, pellets: 1, spread: .003, auto: true, color: 0xf2b818, len: .55 },
  { id: 'salvo', rar: 'legend', hold: 'shoulder', name: 'Salvo', cat: 'premium', unlock: 17, price: 645, mob: 55, rocket: true, tubes: true, dmg: 110, rate: .95, mag: 4, reload: 2.8, pellets: 1, spread: 0, auto: false, color: 0xc8242b, len: .8 },
  { id: 'apex', rar: 'legend', hold: 'rifle', name: 'Apex Predator', cat: 'sniper', unlock: 32, price: 1215, mob: 58, zoom: 6, scope: true, dmg: 135, rate: .9, mag: 6, reload: 1.9, pellets: 1, spread: 0, auto: false, color: 0xe8edf3, len: .95 },
  { id: 'tracker', rar: 'epic', hold: 'pistol', name: 'Tracker', cat: 'backup', unlock: 10, price: 290, mob: 70, quiet: true, bolt: 'dart', track: 4, dmg: 30, rate: .28, mag: 10, reload: 1.4, pellets: 1, spread: 0, auto: false, color: 0xffc21a, len: .35 },
  { id: 'tempest', rar: 'legend', hold: 'rifle', name: 'Tempest Coil', cat: 'special', unlock: 27, price: 1025, mob: 60, beam: true, chain: [3.5, 4, 4.5], dmg: 10, rate: 1 / 15, range: 24, mag: 120, reload: 2.4, pellets: 1, spread: 0, auto: true, color: 0x8a6bff, len: .7 },
  // mythics
  { id: 'wisp', rar: 'mythic', hold: 'pistol', name: 'Wisp Caller', cat: 'backup', unlock: 35, price: 1750, mob: 70, wisp: true, dmg: 36, rate: .3, mag: 12, reload: 1.5, pellets: 1, spread: 0, auto: false, color: 0x5fe8d8, len: .45 },
  { id: 'voidlantern', rar: 'mythic', hold: 'lantern', name: 'Void Lantern', cat: 'special', unlock: 38, price: 1900, mob: 60, vortex: true, launch: .5, dmg: 130, rate: 1.4, mag: 3, reload: 2.6, pellets: 1, spread: 0, auto: false, color: 0x5a2f9a, len: .7 },
  { id: 'crystal', rar: 'mythic', hold: 'rifle', name: 'Crystal Companion', cat: 'primary', unlock: 45, price: 2250, chest: true, drop: .15, mob: 70, zoom: 3, reticle: '255,150,225', tracer: 0xa8f4ff, grow: { top: 45, dmg: 14, mag: 30 }, dmg: 21, rate: .09, mag: 40, reload: 1.5, pellets: 1, spread: .004, auto: true, color: 0x4fd0ea, len: .6 },
  { id: 'aurora', rar: 'mythic', hold: 'rifle', name: 'Aurora Rail', cat: 'sniper', unlock: 42, price: 2100, mob: 55, zoom: 7, scope: true, charge: 1, lance: 0x4dffc4, heavyKick: true, dmg: 150, rate: .4, mag: 5, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0x1c2848, len: .95 },
  // the titanium set
  { id: 'tishot', rar: 'mythic', hold: 'rifle', name: 'Titanium Scattergun', cat: 'primary', unlock: 50, price: 2500, mob: 65, dmg: 20, rate: .55, mag: 8, reload: 1.8, pellets: 7, spread: .055, auto: false, color: 0xc3ccd6, len: .6 },
  { id: 'tipistol', rar: 'mythic', hold: 'pistol', name: 'Titanium Sidearm', cat: 'backup', unlock: 50, price: 2500, mob: 70, dmg: 62, rate: .32, mag: 10, reload: 1.3, pellets: 1, spread: 0, auto: false, color: 0xc3ccd6, len: .45 },
  { id: 'tisword', rar: 'mythic', hold: 'melee', name: 'Titanium Edge', cat: 'melee', unlock: 50, price: 2500, inf: true, melee: true, tilt: 1.1, swing: 'tiSwing', mob: 85, dmg: 90, rate: .55, range: 3.5, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xc3ccd6, len: .4 },
  { id: 'tisaw', rar: 'mythic', hold: 'rifle', name: 'Titanium Ripsaw', cat: 'special', unlock: 50, price: 2500, mob: 60, saw: true, pierce: true, dmg: 120, rate: .7, mag: 5, reload: 2.2, pellets: 1, spread: 0, auto: false, color: 0xc3ccd6, len: .7 },
  { id: 'tisniper', rar: 'mythic', hold: 'rifle', name: 'Titanium Longshot', cat: 'sniper', unlock: 50, price: 2500, mob: 58, zoom: 6, scope: true, dmg: 160, rate: 1, mag: 5, reload: 2, pellets: 1, spread: 0, auto: false, color: 0xc3ccd6, len: .95 },
  { id: 'tirocket', rar: 'mythic', hold: 'shoulder', name: 'Titanium Launcher', cat: 'premium', unlock: 50, price: 2500, mob: 55, rocket: true, tubes: true, dmg: 170, rate: .9, mag: 2, reload: 2.4, pellets: 1, spread: 0, auto: false, color: 0xc3ccd6, len: .8 },
  // the welcome week's two (js/daily.js): never sold, found in golden chests otherwise
  { id: 'daybreak', rar: 'rare', hold: 'pistol', name: 'Daybreak', cat: 'backup', unlock: 4, price: 110, chest: true, gift: true, mob: 70, zoom: 2, irons: true, action: 'SIX SHOOTER', dmg: 34, rate: .38, mag: 6, reload: 1.7, pellets: 1, spread: 0, auto: false, color: 0xf0a030, len: .45 },
  { id: 'highnoon', rar: 'epic', hold: 'rifle', name: 'High Noon', cat: 'primary', unlock: 10, price: 300, chest: true, gift: true, mob: 60, zoom: 3, irons: true, action: 'LEVER ACTION', dmg: 55, rate: .5, mag: 8, reload: 2, pellets: 1, spread: .002, auto: false, color: 0xe0a83c, len: .75 },
  // sunken treasure: only in golden chests
  { id: 'cutlass', rar: 'rare', hold: 'melee', name: 'Sunken Cutlass', cat: 'melee', unlock: 8, price: 180, chest: true, inf: true, melee: true, tilt: 1.1, swing: 'cutSwing', mob: 85, dmg: 45, rate: .38, range: 2.9, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0x9fc4c0, len: .4 },
  { id: 'harpoon', rar: 'epic', hold: 'rifle', name: 'Riptide Harpoon', cat: 'sniper', unlock: 18, price: 520, chest: true, mob: 58, zoom: 4, irons: true, action: 'SPEARGUN', bolt: 'harpoon', reel: .6, spare: 10, dmg: 115, rate: .5, mag: 1, reload: 1.7, pellets: 1, spread: 0, auto: false, color: 0x2f7f86, len: .9 },
  { id: 'conch', rar: 'legend', hold: 'pistol', name: 'Siren Shell', cat: 'special', unlock: 30, price: 1150, chest: true, mob: 65, beam: true, water: true, knock: .18, dmg: 11, rate: 1 / 15, range: 26, mag: 110, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0xf2c8a8, len: .45 },
  { id: 'balisong', rar: 'epic', hold: 'melee', name: 'Balisong', cat: 'melee', unlock: 11, price: 325, inf: true, melee: true, flip: true, swing: 'flick', swingT: .28, mob: 85, dmg: 40, rate: .3, range: 2.6, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xb89cf0, len: .32 },
  { id: 'quasar', rar: 'legend', hold: 'pistol', name: 'Quasar', cat: 'backup', unlock: 44, price: 1670, mob: 65, zoom: 4, reticle: '160,255,90', lance: 0x8aff3a, pierce: true, wallBreak: true, dmg: 135, rate: 1 / .9, mag: 6, reload: 1.6, pellets: 1, spread: 0, auto: false, color: 0x5fd629, len: .5 },
  { id: 'monarch', rar: 'legend', hold: 'melee', name: 'Monarch', cat: 'melee', unlock: 28, price: 1065, inf: true, melee: true, flip: true, tricks: true, toss: [4, 9.5], swings: 4, swing: 'wingFlick', swingT: .28, mob: 100, dmg: 45, rate: .3, range: 2.7, mag: 1, reload: 0, pellets: 1, spread: 0, auto: true, color: 0xf28c1e, len: .36 },
  { id: 'wildfire', rar: 'legend', hold: 'rifle', name: 'Wildfire', cat: 'special', unlock: 33, price: 1255, mob: 60, flame: true, patch: true, dmg: 6, rate: .06, range: 9.5, mag: 100, reload: 2.2, pellets: 1, spread: 0, auto: true, color: 0xff7a1a, len: .5 },
  { id: 'finale', rar: 'legend', hold: 'shoulder', name: 'Grand Finale', cat: 'premium', unlock: 37, price: 1405, mob: 55, rocket: true, cluster: true, dmg: 85, rate: 1.1, mag: 3, reload: 2.4, pellets: 1, spread: 0, auto: false, color: 0xd42a3a, len: .8 },
];
const mobMul = w => 1 + ((w.mob ?? 60) - 60) / 100; // run speed multiplier from mobility
const autoFire = w => !!w.auto || w.rate < .25; // fast guns fire while the trigger is held
// burst guns: the shots come out quick, then the gun waits out the rest of its rate (st.bn = shots left in this burst)
const BURST_GAP = .07, myBurst = { bn: 0 };
function burstCd(w, st) { if (!w.burst) return w.rate; st.bn = st.bn > 0 ? st.bn - 1 : w.burst - 1; return st.bn ? BURST_GAP : w.rate - (w.burst - 1) * BURST_GAP; }
const perShot = w => w.burst ? w.rate / w.burst : w.rate; // time a shot, on average
const W_ID = Object.fromEntries(BASE.map((w, i) => [w.id, i]));
const gi = id => W_ID[id];
const jumpOf = i => BASE[i].jump?.[lvl[i]] ?? 0; // extra jump height (Windsaber)
// star upgrades: worth buying, but higher-level guns still win
const lvl = BASE.map(() => 0); // 0 = ★, 1 = ★★, 2 = ★★★
const WEAPONS = BASE.map(w => ({ ...w }));
const STAR_DPS = b => b.rate < .15 ? .1 : b.rate < .5 ? .12 : .15, STAR_MAG = .2, STAR_RELOAD = .1, STAR_FAST = .15;
const magAt = (b, L) => b.mag === 1 || b.tubes ? b.mag : Math.round(b.mag * (1 + STAR_MAG * L)); // a rocket per tube, whatever the stars
// a gun that grows with its owner (the Crystal Companion): from grow's numbers at level 1 to its own at level grow.top
const grown = (b, lv) => { const t = Math.min(1, Math.max(0, ((lv || 1) - 1) / (b.grow.top - 1))), o = { ...b }; for (const k in b.grow) if (k !== 'top') o[k] = Math.round(b.grow[k] + (b[k] - b.grow[k]) * t); return o; };
// a gun's stats at a star level (lv: its owner's level, yours if not given)
const statsAt = (i, L, lv) => {
  const b = BASE[i].grow ? grown(BASE[i], lv ?? prof.lv) : BASE[i], k = 1 + STAR_DPS(b) * L, fast = b.fast ?? b.rate < STAR_FAST; // fast: stars add fire rate (the Flame Wand opts in)
  return { ...b, dmg: fast ? b.dmg : Math.max(b.dmg + L, Math.round(b.dmg * k)), rate: fast ? +(b.rate / k).toFixed(4) : b.rate, mag: magAt(b, L), reload: +(b.reload * (1 - STAR_RELOAD * L)).toFixed(2) };
};
function applyLvl(i) { const s = statsAt(i, lvl[i]); Object.assign(WEAPONS[i], { dmg: s.dmg, rate: s.rate, mag: s.mag, reload: s.reload }); }
const upgradable = i => !BASE[i].start;
const GROW_MAX = 5, growStage = (i, lv = prof.lv) => BASE[i].grow ? Math.min(GROW_MAX, Math.floor(Math.min(lv || 1, BASE[i].grow.top) / 9)) : 0; // how many crystals a growing gun has (0-5)
const stars = i => upgradable(i) ? starRow(lvl[i] + 1, lvl[i] + 1, 3) : '';
let cur = gi('voxel'), cd = 0, reloading = 0, reloadFull = 1, kick = 0, aiming = false, adsT = 0, wandOn = 0, wandK = 0;
// camera recoil per gun
const RECOIL = {
  voxel: { up: 1.4, side: .3, back: 1 }, hitman: { up: 1.1, side: .25, back: 1 }, executioner: { up: 1.8, side: .3, back: .9 }, flare: { up: 2, side: .35, back: .8 },
  ar: { up: .55, side: .25, back: 1 }, thrasher: { up: .5, side: .22, back: 1 }, eradicator: { up: .25, side: .2, back: 1.2 },
  shotgun: { up: 2.8, side: .5, back: .6 }, trex: { up: 3.2, side: .55, back: .55 }, starsmasher: { up: .6, side: .22, back: 1 }, rocket: { up: 2.6, side: .35, back: .5 }, finale: { up: 2.8, side: .4, back: .55 },
  sniper: { up: 1.8, side: .2, back: .28 }, semisniper: { up: 1.3, side: .18, back: .4 }, tigerbite: { up: 1.9, side: .2, back: .32 }, crossbow: { up: 1.2, side: .15, back: .5 }, grenade: { up: 2.2, side: .35, back: .6 }, aerial: { up: 2.4, side: .35, back: .55 },
  rubypierce: { up: 2.3, side: .3, back: .75 }, quasar: { up: 2.4, side: .25, back: .8 }, paragon: { up: 2, side: .2, back: .3 },
  heatray: { up: .05, side: .06, back: 2 }, shockbeam: { up: .06, side: .08, back: 2 }, frostwand: { up: .05, side: .06, back: 2 }, flame: { up: .04, side: .07, back: 2 }, wildfire: { up: .05, side: .08, back: 2.2 },
  windwand: { up: 1.2, side: .3, back: .9 }, flamewand: { up: .5, side: .22, back: 1.1 }, soulwand: { up: 1.6, side: .2, back: .4 }, ancientwand: { up: 2.2, side: .3, back: .55 },
  hornet: { up: .62, side: .2, back: 1 }, salvo: { up: 2.3, side: .35, back: .55 }, apex: { up: 2.1, side: .22, back: .3 }, tracker: { up: 1.3, side: .25, back: 1 }, tempest: { up: .06, side: .1, back: 2 },
  tishot: { up: 2.6, side: .45, back: .65 }, tipistol: { up: 1.7, side: .3, back: .9 }, tisaw: { up: 1.6, side: .3, back: .7 }, tisniper: { up: 2, side: .2, back: .3 }, tirocket: { up: 2.4, side: .35, back: .55 },
  daybreak: { up: 1.9, side: .3, back: .9 }, highnoon: { up: 1.7, side: .2, back: .4 }, harpoon: { up: 1.6, side: .15, back: .45 }, conch: { up: .05, side: .07, back: 2 },
  crystal: { up: .5, side: .2, back: 1 }, wisp: { up: .9, side: .2, back: 1 }, voidlantern: { up: 1, side: .25, back: .8 }, aurora: { up: 2.3, side: .2, back: .3 },
};
// big single-shot energy guns kick higher and take longer to settle: every lance gun, or heavyKick on a gun
const HEAVY = { lift: 1.45, settle: .55 }, heavyKick = w => w.heavyKick ?? !!w.lance;
const ADS_SOFT = .4, REC_RISE = 50, REC_BACK = 8, REC_MAX = 4;
const rec = { tp: 0, ty: 0, p: 0, y: 0 };
const ammo = WEAPONS.map(w => w.mag);
const resMax = i => BASE[i].inf ? Infinity : BASE[i].pool ? 0 : WEAPONS[i].mag * (BASE[i].spare ?? 4); // spare mags (pool guns: none, the mag is all you get)
const reserve = WEAPONS.map(w => w.inf ? Infinity : 0);
const owned = WEAPONS.map(w => !!w.free);
const slotOf = i => CAT_I[BASE[i].cat];
const slotGun = CATS.map(() => -1);
function resetSlots() { slotGun.fill(-1); BASE.forEach((w, i) => { if (w.free) slotGun[slotOf(i)] = i; }); }
resetSlots();
const hasGun = i => !!BASE[i].start || !!prof.guns[BASE[i].id];
function loadoutGun(cat) { // loadout gun, or the starter
  const i = gi(prof.loadout[cat]);
  return i !== undefined && BASE[i].cat === cat && hasGun(i) ? i : BASE.findIndex(w => w.cat === cat && w.start);
}

function renderHotbar() {
  $('hotbar').innerHTML = CATS.map(([, label], s) => {
    const i = slotGun[s], key = keyCap(binds['slot' + (s + 1)][0] || binds['slot' + (s + 1)][1]);
    return `<div class="slot ${i === cur ? 'on' : ''} ${i < 0 ? 'empty' : ''}" style="--rc:${RARITY[rarOf(BASE[i])][1]}">${key ? `<span class="k">${key}</span>` : ''}` +
      `<span class="s">${i >= 0 ? stars(i) : ''}</span><img class="ai" src="${gunPic(Math.max(0, i))}"><span class="c">${label}</span></div>`;
  }).join('');
}

const vm = new THREE.Group(); camera.add(vm); vm.position.set(.32, -.3, -.55);
// muzzle flash pictures (16 px, dx/dy from the middle)
function flashTex(px) {
  const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const col = px(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
}
const flashSpr = (px, jit = 7, k = 1) => Object.assign(new THREE.SpriteMaterial({ depthWrite: false, fog: false, blending: THREE.AdditiveBlending, map: flashTex(px) }), { userData: { jit, k } });
const FLASH_SPR = flashSpr((dx, dy) => { // a hot core and four spikes
  const r = Math.max(dx, dy), spike = Math.min(dx, dy) < 1 ? 8 : Math.abs(dx - dy) < 1 ? 4.5 : 2.5;
  if (r <= spike) return r < 2 ? '#fffbe0' : r < 4 ? '#ffd24a' : '#ff8a1a';
});
// guns with their own flash: picture, light, how long it shows, what flies out (muzzleBits in combat.js)
const FLASH_FX = {
  rubypierce: { spr: flashSpr((dx, dy) => { // a cut ruby with a glint
    const m = Math.max(dx, dy), s = dx + dy;
    if (m <= 5.5 && s <= 8) return m <= 1.5 && s <= 2.5 ? '#fff2f5' : Math.abs(dx - dy) < 1 ? '#ffb8c8' : m > 4.5 || s > 7 ? '#ff5c7a' : dx > dy ? '#ff2448' : '#c8102e';
    if (Math.min(dx, dy) < 1) return '#ffd0da';
  }, .25, 1.15), light: 0xff3050, t: .08, bits: 'gem' },
  finale: { spr: flashSpr((dx, dy) => { // a gold starburst
    const r = Math.hypot(dx, dy);
    if (r < 1.8) return '#ffffff'; if (r < 3) return '#fff0a0';
    if ((dx < 1 || dy < 1 || Math.abs(dx - dy) < 1) && r < 7.5) return r < 5 ? '#ffd23a' : '#ff9a3a';
  }, 1.5, 1.15), light: 0xffd23a, t: .1, bits: 'confetti' },
  quasar: { spr: flashSpr((dx, dy) => { // a little quasar: a white-hot core, its disc out to the sides and its jets straight up and down
    const r = Math.hypot(dx, dy);
    if (r < 1.6) return '#ffffff'; if (r < 2.6) return '#eaffd2';
    if (dy < 1 && dx < 7.6) return dx < 4.5 ? '#b8ff6a' : '#6edc2a';
    if (dx < 1 && dy < 7.6) return dy < 5 ? '#f2ffe0' : '#9cff52';
    if (dy < 2 && dx + dy < 5.5) return '#5cc824';
  }, .2, 1.2), light: 0x8aff3a, t: .09, bits: 'plasma' },
  paragon: { spr: flashSpr((dx, dy) => { // a white-hot core with rays of energy
    const r = Math.hypot(dx, dy);
    if (r < 1.6) return '#ffffff'; if (r < 3) return '#c4ebff'; if (r < 4) return '#5ab0ff';
    if (Math.min(dx, dy) < 1 && r < 7.6) return r < 5.5 ? '#9fdcff' : '#3d9bff';
    if (Math.abs(dx - dy) < 1 && r < 5.5) return '#5ab0ff';
  }, 1.6, 1.2), light: 0x58b0ff, t: .09, bits: 'energy' },
  executioner: { spr: flashSpr((dx, dy) => { // crossed violet blades on a gold core
    const r = Math.hypot(dx, dy);
    if (dx + dy <= 3) return r < 1.5 ? '#fffbe8' : '#ffd86a';
    if (Math.abs(dx - dy) <= (r < 6.5 ? 1 : 0)) return r < 3.5 ? '#ffe9a8' : r < 6 ? '#d6a4ff' : '#a466ff';
  }, .3, 1.1), light: 0xb47aff },
  flamewand: { spr: flashSpr((dx, dy) => { // a puff of flame, ragged at the edge
    const r = Math.hypot(dx, dy);
    if (r < 1.6) return '#fff6d0'; if (r < 3.2) return '#ffd04a'; if (r < 4.8) return '#ff8a1a'; if (r < 6.2 && (dx + dy | 0) % 3 < 2) return '#ff4a1a';
  }, 1.4, .9), light: 0xff7a1a, t: .06, bits: 'ember' },
  windwand: { spr: flashSpr((dx, dy) => { // a bright eye in a ring of wind
    const r = Math.hypot(dx, dy);
    if (r < 1.5) return '#ffffff'; if (r > 3.6 && r < 5.4) return r < 4.5 ? '#e8f8ff' : '#9fdcff'; if (Math.abs(dx - dy) < 1 && r < 7) return '#cfefff';
  }, 2.4, 1.1), light: 0xcff0ff, t: .07, bits: 'wind' },
  soulwand: { spr: flashSpr((dx, dy) => { // a pale ghost light with four wisps
    const r = Math.hypot(dx, dy);
    if (r < 1.6) return '#ffffff'; if (r < 3) return '#c8fff0'; if (r < 4) return '#5ff0c8';
    if (Math.min(dx, dy) < 1 && r < 7.5) return r < 5.5 ? '#9fffe4' : '#3fd0a8';
  }, .4, 1.2), light: 0x6fffd8, t: .1, bits: 'soul' },
  apex: { spr: flashSpr((dx, dy) => { // a white-hot core and four icy fangs
    const r = Math.hypot(dx, dy);
    if (r < 1.6) return '#ffffff'; if (r < 3) return '#dcffff'; if (r < 4.2) return '#6ff4ff';
    if (Math.abs(dx - dy) < 1.2 && r < 7.8) return r < 5.6 ? '#b4faff' : '#28b8d8';
  }, .35, 1.25), light: 0x7ff4ff, t: .1 },
  ancientwand: { spr: flashSpr((dx, dy) => { // a gold rune star
    const r = Math.hypot(dx, dy);
    if (r < 1.5) return '#fffbea'; if (dx + dy <= 4) return '#ffe08a';
    if (Math.min(dx, dy) < 1 && r < 7.5) return r < 5 ? '#ffd060' : '#c89a30'; if (Math.abs(dx - dy) < 1 && r < 4.5) return '#ffeaa8';
  }, .5, 1.2), light: 0xffe2a0, t: .09, bits: 'rune' },
  wisp: { spr: flashSpr((dx, dy) => { // a soft teal puff with four little petals
    const r = Math.hypot(dx, dy);
    if (r < 1.5) return '#ffffff'; if (r < 2.8) return '#c8fff6'; if (r < 3.9) return '#5fe8d8';
    if (Math.abs(dx - dy) < 1.5 && r < 6.5) return r < 5 ? '#9ff6ea' : '#3fc8b8';
  }, 1.2, 1), light: 0x7ff0e0, t: .07, bits: 'wisp' },
  voidlantern: { spr: flashSpr((dx, dy) => { // a violet ring round a dark middle
    const r = Math.hypot(dx, dy);
    if (r < 1.1) return '#f6ecff'; if (r > 2.8 && r < 4.6) return r < 3.7 ? '#e0c0ff' : '#a060ff';
    if (Math.min(dx, dy) < 1 && r > 4.6 && r < 7.2) return '#7a3ad8';
  }, .6, 1.2), light: 0x9a5aff, t: .09, bits: 'void' },
  crystal: { spr: flashSpr((dx, dy) => { // a cut crystal: a white heart, rose facets, aqua points
    const m = Math.max(dx, dy), d = dx + dy;
    if (d <= 2.5) return '#ffffff'; if (d <= 5) return dx > dy ? '#ffb4ea' : '#ff7fd4';
    if (d <= 7.5 && m <= 6) return Math.abs(dx - dy) < 2 ? '#d8fbff' : '#6fe4ff';
    if (Math.min(dx, dy) < 1 && m < 7.8) return '#a8f4ff';
  }, .5, 1.05), light: 0xa8f0ff, t: .05, bits: 'crystal' },
  aurora: { spr: flashSpr((dx, dy) => { // a white core with green, teal, blue and violet rays
    const r = Math.hypot(dx, dy);
    if (r < 1.6) return '#ffffff'; if (r < 2.8) return '#d4fff0'; if (r < 3.8) return '#4dffb0';
    if (Math.min(dx, dy) < 1 && r < 7.6) return r < 5.4 ? '#3dffd6' : '#4ab8ff';
    if (Math.abs(dx - dy) < 1 && r < 5.6) return '#a07bff';
  }, 1.4, 1.25), light: 0x6fffc8, t: .1, bits: 'aurora' },
};
{ // the titanium set: a hard white star with a cold blue edge
  const spr = flashSpr((dx, dy) => {
    const r = Math.max(dx, dy), m = Math.min(dx, dy);
    if (dx + dy <= 3) return '#ffffff'; if (m < 1 && r < 7.6) return r < 4.5 ? '#eaf4ff' : '#8fc4ff'; if (Math.abs(dx - dy) < 1 && r < 4.6) return '#bcdcff';
  }, .4, 1.15);
  for (const id of ['tishot', 'tipistol', 'tisniper']) FLASH_FX[id] = { spr, light: 0xcfe4ff, t: id === 'tisniper' ? .1 : .06, bits: 'ti' };
}
{ // the welcome guns: a little sunrise
  const spr = flashSpr((dx, dy) => {
    const r = Math.hypot(dx, dy), ray = Math.min(dx, dy) < 1 || Math.abs(dx - dy) < 1;
    if (r < 2.5) return '#fffbe0'; if (r < 4.5) return '#ffd24a'; if (ray && r < 7.8) return r < 6 ? '#ffb02a' : '#ff7a2a';
  }, .4, 1.1);
  for (const id of ['daybreak', 'highnoon']) FLASH_FX[id] = { spr, light: 0xffc060, t: .06, bits: 'spark' };
}
{ // the sunken ones: a splash
  const spr = flashSpr((dx, dy) => {
    const r = Math.hypot(dx, dy);
    if (r < 2) return '#ffffff'; if (r < 4) return '#c8f6ff'; if ((Math.min(dx, dy) < 1 || Math.abs(dx - dy) < 1) && r < 7) return r < 5.5 ? '#6fd8f0' : '#2fa8d8';
  }, .5, 1.1);
  for (const id of ['harpoon', 'conch']) FLASH_FX[id] = { spr, light: 0x8fe0ff, t: .06, bits: 'ice' };
}
const flashOf = w => FLASH_FX[w.id]?.spr || FLASH_SPR, flashTime = w => FLASH_FX[w.id]?.t ?? (w.scope ? .1 : .05);
// glowing parts that light up when a gun fires: their colours, how bright, how long; dim and back: it dims, then charges back up for the next shot; flick: flickers while it fires
const CORE_FX = {
  rubypierce: { cols: [0xff4a64, 0xffc2cc], k: 2.6, t: .3, dim: .45, back: .5 },
  quasar: { cols: [0x8aff3a, 0xeaffd2], k: 2.6, t: .25, dim: .35, back: .8 },
  paragon: { cols: [0x4aa8ff, 0xd2ecff], k: 2.4, t: .35, dim: .45, back: .75 },
  executioner: { cols: [0xd47bff], k: 2.3, t: .22, dim: .5, back: .28 },
  soulwand: { cols: [0x6fffd8, 0xe0fff6], k: 2.2, t: .3, dim: .5, back: .4 },
  ancientwand: { cols: [0xff4a3a, 0x8fe0ff, 0xeefff6, 0xf0ecff, 0xffffff], k: 2, t: .3, dim: .5, back: .55 },
  voidlantern: { cols: [0xb46bff, 0xe8d2ff], k: 2.3, t: .35, dim: .4, back: .9 },
  harpoon: { cols: [0x4fe0d0], k: 2, t: .3, dim: .5, back: .8 },
  aerial: { cols: [0xd8f6ff], k: 2, t: .2, dim: .5, back: .6 },
  wisp: { cols: [0x5fe8d8, 0xeafffb], k: 2, t: .2 },
  windwand: { cols: [0xc8f0ff], k: 1.9, t: .22 },
  flamewand: { cols: [0xff6a1a, 0xffc04a, 0xfff0b0], k: 1.8, t: .15 },
  voxel: { cols: [0x2ee6d6], k: 1.8, t: .15 },
  starsmasher: { cols: [0xffe68a], k: 1.9, t: .12, flick: .25 },
  daybreak: { cols: [0xfff0a0], k: 1.7, t: .2 }, highnoon: { cols: [0xfff0a0], k: 1.7, t: .2 },
  frostwand: { cols: [0x9fe8ff, 0xe8fbff], k: 1.6, t: .15, flick: .15 },
  conch: { cols: [0x3fc8ec, 0xf0ffff], k: 1.6, t: .15, flick: .15 },
  heatray: { cols: [0xfff2a8, 0xffd27a, 0xffb347, 0xffd23f], k: 1.7, t: .15, flick: .2 },
  shockbeam: { cols: [0x8fe9ff], k: 2.1, t: .12, flick: .5 },
  tempest: { cols: [0xb69bff, 0xf3eeff], k: 2.1, t: .12, flick: .5 },
  flame: { cols: [0xffaa33], k: 1.8, t: .12, flick: .3 },
  wildfire: { cols: [0xff7a1a, 0xffc04a], k: 2.1, t: .14, flick: .35 },
  finale: { cols: [0xffe07a], k: 2.4, t: .25, flick: .5 },
};
for (const id of ['tishot', 'tipistol', 'tisniper', 'tirocket', 'tisaw']) CORE_FX[id] = { cols: [0x4f9dff], k: 1.8, t: .2 }; // the titanium set's blue
const coreOf = i => CORE_FX[BASE[i].id] && new Set(CORE_FX[BASE[i].id].cols.map(c => palIdx(c, true)));
let fxClock = 0; // seconds, moved on each frame (trailTick)
function coreAt(u) { // how bright, this long after the last shot
  const f = u.fx, s = fxClock - u.at, dim = f.dim ?? 1;
  if (s < f.t) { const k = 1 - s / f.t; return dim + (u.pk - dim) * k * k * (f.flick ? 1 - f.flick * Math.random() : 1); }
  if (!f.back) return 1;
  const e = Math.min(1, (s - f.t) / f.back); return dim + (1 - dim) * e * e * (3 - 2 * e);
}
function coreLit() { const m = this.material; if (m.userData.fx) m.color.setScalar(coreAt(m.userData)); } // a mesh's own, not an outline pass's stand-in
function coreFire(mat) { if (!mat) return; const u = mat.userData; u.at = fxClock; u.pk = 1 + (u.fx.k - 1) * (.85 + Math.random() * .3); } // a little brighter or softer each time
function makeFlash(size = .1, mat = FLASH_SPR) {
  const s = new THREE.Sprite(mat); s.scale.setScalar(size);
  s.onBeforeRender = () => { const m = s.material, u = m.userData; m.rotation = (Math.random() - .5) * (u.jit ?? 7); s.scale.setScalar(size * (u.k || 1) * (.75 + Math.random() * .5)); };
  return s;
}
const vmFlashMats = new Map(), vmFlashMat = m => vmFlashMats.get(m) || vmFlashMats.set(m, Object.assign(m.clone(), { depthTest: false })).get(m); // yours draws over the barrel, which would hide it
const flashMesh = makeFlash(.12, vmFlashMat(FLASH_SPR));
flashMesh.renderOrder = 5;
const flashLight = new THREE.PointLight(0xffcc66, 0, 8); flashLight.layers.enableAll();
let flashT = 0;
let gunSpin = null, gunSpinV = 0;
const SPIN_IDLE = { wisp: 1.6, voidlantern: .9, crystal: 1.3, tisaw: 3, quasar: 1 }, spinIdle = i => SPIN_IDLE[BASE[i]?.id] || 0, spinKick = i => spinIdle(i) ? 9 : 30; // magic parts turn on their own with no motor, and only whirl a bit faster when fired
let gunRound = null, gunRounds = null, gunCharges = null, chargeT = 0; // chargeT: how long the Aurora Rail has been charging
// guns with a rocket in each tube: each shows while it's loaded, and a reload puts them back one by one (k = reload done, -1 when not reloading)
const roundsShow = (rs, n, k = -1) => rs.forEach((r, i) => { r.visible = n > i || k >= .232 + .16 * i; });
function chargeShow(cs, k) { // the Aurora Rail's coils light up one by one as it charges, all four when it's full, and the bar inside glows brighter all the way
  if (!cs) return;
  cs.forEach((c, i) => { const on = k >= (i + 1) / cs.length - 1e-3; for (const m of c.children) if (m.material === gunGlow || m.material === gunGlowDim) m.material = on ? gunGlow : gunGlowDim; });
  if (cs.bar) for (const m of cs.bar.children) m.material.color.setScalar(k >= 1 ? 1.5 : (.3 + .7 * k) ** 2.2);
}
let gunHolo = null;
// barrels spin about the bore; a flat part (the Ripsaw's blade) turns like a record; a hovering part (the Crystal Companion's crystal) turns upright and bobs
function spinTurn(s, v, dt) {
  const c = s.userData.core; if (c) { const u = c.userData, e = Math.min(1, Math.max(0, (fxClock - u.at) / (u.fx.t + u.fx.back))); s.rotation.y += 14 * e * e * dt; return; } // the Quasar's disc: a shot spends it, then it spins back up as it charges
  if (s.userData.flat) { s.rotation.y += v * dt; return; } if (s.userData.hover === undefined) { s.rotation.z += v * dt; return; } s.rotation.y += v * dt; s.position.y = s.userData.hover + Math.sin(performance.now() * .003) * .01; }
// the Crystal Companion's crystals: while it fires, a white-hot light runs along them toward the muzzle
let gunPulse = null, gunCore = null;
function pulseShow(ps, on) { const hot = on ? Math.floor(performance.now() / 45) % ps.length : -1; ps.forEach((c, i) => { for (const m of c.children) if (m.material === gunGlow || m.material === gunGlowHot) m.material = i === hot ? gunGlowHot : gunGlow; }); }
let gunMag = null, gunArmL = null, gunHand = null, gunFlips = null; // parts a reload moves, a balisong's blade and handle
let gunSwing = null; // the Void Lantern hangs from your fist and swings
const vmRl = {};
// switching guns (lighter guns come up faster)
const drawT = w => Math.min(.4, Math.max(.2, .2 + (80 - (w.mob ?? 60)) * .008)), SWAP_DOWN = .35;
let gunShown = -1, swapOff = 0, swapDown = false, swapLen = .3;
// reload animations, as keyframes from 0 (start) to 1 (done)
const POSE_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'mx', 'my', 'mz', 'ay', 'az', 'hand'];
// box magazine swap
const magSwap = (roll, drop, lift = .2) => { const h = { rz: roll, rx: lift, y: .06, x: -.07 }; return [[0, {}], [.14, h], [.3, { ...h, my: -drop * .4, ay: -.15 }], [.42, { ...h, my: -drop, ay: -.42 }], [.56, { ...h, my: -drop * .35, ay: -.18 }], [.7, { ...h, y: .07 }], [.74, { ...h, y: .085 }], [.86, { rx: .05, z: .035 }], [.93, { z: -.01 }], [1, {}]]; };
// rounds pushed in one at a time
const dips = (h, n, t0, t1, d = .025) => Array.from({ length: n }, (_, i) => { const t = t0 + (t1 - t0) * i / n, w = (t1 - t0) / n; return [[t + w * .45, { ...h, y: (h.y || 0) - d, ay: -.05 }], [t + w * .9, h]]; }).flat();
const RELOAD_SWAP = { voxel: [.3, .36], hitman: [.3, .36], ar: [.3, .42], thrasher: [.3, .42], semisniper: [.3, .42], eradicator: [.36, .48], heatray: [.3, .42], flame: [.34, .46], wildfire: [.34, .46], executioner: [.3, .36], shockbeam: [.3, .42], tigerbite: [.3, .42], starsmasher: [.3, .42], aerial: [.3, .42], rubypierce: [.3, .36], quasar: [.3, .36], paragon: [.3, .42], flamewand: [.3, .42], windwand: [.3, .42], soulwand: [.3, .42], ancientwand: [.3, .42], hornet: [.3, .42], apex: [.3, .42], tracker: [.3, .36], tempest: [.3, .42], wisp: [.3, .36], voidlantern: [.3, .44], aurora: [.3, .42], crystal: [.3, .42], tishot: [.3, .42], tipistol: [.3, .36], tisaw: [.3, .42], tisniper: [.3, .42] };
const RELOAD_ANIM = (() => {
  const pistol = roll => { const h = { rx: .45, rz: roll, y: .07, x: -.06 }; return [[0, {}], [.16, h], [.3, { ...h, my: -.26 }], [.31, { ...h, my: -.45 }], [.46, { ...h, my: -.11, hand: 1 }], [.58, { ...h, my: -.09, hand: 1 }], [.66, { ...h, y: .03, hand: 1 }], [.72, { ...h, y: .045, hand: .7 }], [.8, { ...h, y: .02 }], [.86, { rx: .08, z: .04 }], [.93, { z: -.012 }], [1, {}]]; };
  const wandRl = (() => { const h = { rx: .5, y: .05, x: -.05 }; return [[0, {}], [.14, h], [.24, { ...h, hand: 1 }], [.3, { ...h, mz: .12, hand: 1 }], [.5, { ...h, mz: .12, hand: 1 }], [.62, { ...h, hand: 1 }], [.72, { ...h, hand: .6 }], [.86, { rx: .06 }], [1, {}]]; })(); // tip up, a fresh charge into the pommel
  const sg = { rz: -.5, rx: .28, y: -.04 }, bolt = { rz: .3, rx: .1, y: -.03, mz: .09, my: .02 }, box = { rz: -.4, ry: -.22, y: -.05 }, cell = { rx: .38, rz: -.25, y: .02 }, tank = { rz: -.5, rx: .18, y: -.02 }, fuelCan = { rz: .45, rx: .2, y: -.02 };
  return {
    voxel: pistol(-.3), hitman: pistol(-.4), executioner: pistol(-.35), tigerbite: magSwap(-.35, .38, .16), ar: magSwap(-.4, .34), thrasher: magSwap(-.5, .38, .24), starsmasher: magSwap(-.45, .4, .22), semisniper: magSwap(-.35, .38, .16), aerial: magSwap(-.4, .36, .2),
    rubypierce: pistol(-.35), quasar: pistol(-.35), paragon: magSwap(-.35, .38, .16), hornet: magSwap(-.45, .36, .2), apex: magSwap(-.35, .4, .16), tracker: pistol(-.38), wisp: pistol(-.32), aurora: magSwap(-.38, .4, .16), crystal: magSwap(-.45, .38, .22), tishot: magSwap(-.45, .42, .22), tipistol: pistol(-.36), tisaw: magSwap(-.4, .4, .2), tisniper: magSwap(-.35, .4, .16),
    flamewand: wandRl, windwand: wandRl, soulwand: wandRl, ancientwand: wandRl,
    daybreak: (() => { const h = { rx: .4, rz: -.35, y: .06, x: -.05 }, o = { ...h, mx: -.07 }; return [[0, {}], [.12, h], [.2, o], ...dips(o, 3, .24, .7), [.76, o], [.84, h], [.93, { rx: .06 }], [1, {}]]; })(), // the cylinder out, rounds in, shut
    highnoon: [[0, {}], [.1, sg], ...dips(sg, 4, .14, .74), [.8, { rx: .06 }], [.87, { rx: .05, my: -.05, mz: .02 }], [.95, { z: -.012 }], [1, {}]],
    harpoon: (() => { const h = { rx: -.3, y: -.08, z: .05 }; return [[0, {}], [.14, h], [.5, h], [.6, { ...h, mz: .09 }], [.76, { ...h, mz: .09 }], [.84, h], [.93, { rx: .05 }], [1, {}]]; })(), // a fresh harpoon down the tube, then the handle back and home
    conch: (() => { const h = { rx: .7, rz: -.2, y: .04 }, o = { ...h, mz: .1 }; return [[0, {}], [.15, h], [.28, o], [.4, { ...o, y: 0 }], [.55, { ...o, y: .05 }], [.7, o], [.82, h], [.92, { rx: .06 }], [1, {}]]; })(), // tipped up, the spire off, filled, the spire back on
    shotgun: [[0, {}], [.1, sg], ...dips(sg, 4, .14, .74), [.8, { rx: .06 }], [.87, { rx: .05, mz: .09, az: .09 }], [.95, { z: -.012 }], [1, {}]],
    trex: [[0, {}], [.1, sg], ...dips(sg, 4, .14, .74), [.8, { rx: .06 }], [.87, { rx: .05, mz: .09, az: .09 }], [.95, { z: -.012 }], [1, {}]],
    sniper: [[0, {}], [.1, { rz: .3, rx: .1, y: -.03 }], [.22, bolt], ...dips(bolt, 3, .3, .72, .02), [.78, bolt], [.88, { rz: .3, rx: .1, y: -.03, z: -.012 }], [1, {}]],
    eradicator: [[0, {}], [.15, box], [.36, { ...box, my: -.36, ay: -.3 }], [.48, { ...box, my: -.48, ay: -.42 }], [.6, { ...box, my: -.36, ay: -.3 }], [.74, { ...box, y: -.04 }], [.78, { ...box, y: -.015 }], [.9, { y: -.02 }], [1, {}]],
    heatray: [[0, {}], [.14, cell], [.3, { ...cell, my: -.3, ay: -.3 }], [.42, { ...cell, my: -.42, ay: -.42 }], [.54, { ...cell, my: -.3, ay: -.3 }], [.68, cell], [.72, { ...cell, y: .04 }], [.86, { rx: .05, z: .02 }], [.93, { z: -.01 }], [1, {}]],
    voidlantern: (() => { const h = { rx: -.25, rz: -.3, y: .1, x: -.03 }; return [[0, {}], [.12, h], [.28, { ...h, my: -.06 }], [.34, { ...h, my: -.4 }], [.46, { ...h, my: -.3, hand: 1 }], [.56, { ...h, my: -.02, hand: 1 }], [.6, { ...h, y: .115, hand: 1 }], [.68, { ...h, hand: .6 }], [.8, { rx: .12 }], [.9, { rx: -.05 }], [1, {}]]; })(), // lifted and tipped in toward you, the cell drops out of the floor and a fresh one goes up
    shockbeam: [[0, {}], [.14, cell], [.3, { ...cell, my: -.3, ay: -.3 }], [.42, { ...cell, my: -.42, ay: -.42 }], [.54, { ...cell, my: -.3, ay: -.3 }], [.68, cell], [.72, { ...cell, y: .04 }], [.86, { rx: .05, z: .02 }], [.93, { z: -.01 }], [1, {}]],
    tempest: [[0, {}], [.14, { ...cell, rz: -.32 }], [.3, { ...cell, rz: -.32, my: -.32, ay: -.3 }], [.44, { ...cell, rz: -.32, my: -.46, ay: -.44 }], [.56, { ...cell, rz: -.32, my: -.3, ay: -.3 }], [.7, { ...cell, rz: -.32 }], [.74, { ...cell, rz: -.32, y: .045 }], [.87, { rx: .05, z: .02 }], [.94, { z: -.01 }], [1, {}]],
    wildfire: [[0, {}], [.14, fuelCan], [.34, { ...fuelCan, my: .34, ay: .26 }], [.46, { ...fuelCan, my: .46, ay: .36 }], [.58, { ...fuelCan, my: .34, ay: .26 }], [.74, fuelCan], [.8, { ...fuelCan, rz: .52 }], [.9, { rx: .05 }], [1, {}]], // its fuel can lifts off the top
    flame: [[0, {}], [.14, tank], [.34, { ...tank, my: -.38, ay: -.3 }], [.46, { ...tank, my: -.5, ay: -.42 }], [.58, { ...tank, my: -.38, ay: -.3 }], [.74, tank], [.8, { ...tank, rz: -.58 }], [.9, { rx: .05 }], [1, {}]],
    crossbow: [[0, {}], [.14, { rx: .4, y: -.06, z: .05 }], [.4, { rx: .46, y: -.08, z: .07 }], [.7, { rx: .4, y: -.06, z: .05 }], [.86, { rx: .04 }], [1, {}]],
    grenade: [[0, {}], [.1, { ...sg, mx: .08 }], ...dips({ ...sg, mx: .08 }, 4, .14, .74), [.8, { rx: .06 }], [.9, { z: -.012 }], [1, {}]],
    rocket: [[0, {}], [.14, { rx: -.32, y: -.1, z: .05 }], [.85, { rx: -.32, y: -.1, z: .05 }], [.94, { rx: .04 }], [1, {}]],
    finale: [[0, {}], [.14, { rx: -.32, y: -.1, z: .05 }], [.85, { rx: -.32, y: -.1, z: .05 }], [.94, { rx: .04 }], [1, {}]],
    salvo: [[0, {}], [.12, { rx: -.32, y: -.1, z: .05 }], ...dips({ rx: -.32, y: -.1, z: .05 }, 4, .16, .8, .03), [.88, { rx: .04 }], [1, {}]], // a rocket into each tube (roundsShow)
    tirocket: [[0, {}], [.12, { rx: -.32, y: -.1, z: .05 }], ...dips({ rx: -.32, y: -.1, z: .05 }, 2, .16, .48, .03), [.6, { rx: -.32, y: -.1, z: .05 }], [.88, { rx: .04 }], [1, {}]],
    flare: [[0, {}], [.18, { rx: -.75, y: .03 }], [.4, { rx: -.75, y: .03, my: -.4 }], [.52, { rx: -.75, y: .03, my: -.12, hand: 1 }], [.64, { rx: -.75, y: .03, hand: 1 }], [.72, { rx: -.75, y: .03 }], [.84, { rx: .12 }], [1, {}]],
  };
})();
function reloadPose(id, k) {
  const F = RELOAD_ANIM[id]; if (!F) return null;
  let i = 1; while (i < F.length - 1 && k > F[i][0]) i++;
  const [t0, a] = F[i - 1], [t1, b] = F[i], o = {};
  let u = t1 > t0 ? Math.min(1, Math.max(0, (k - t0) / (t1 - t0))) : 1; u = u * u * (3 - 2 * u);
  for (const c of POSE_KEYS) o[c] = (a[c] || 0) + ((b[c] || 0) - (a[c] || 0)) * u;
  return o;
}
// drop the old mag and show the new one partway through a reload
function reloadSwap(st, id, k, part, sc) {
  const S = RELOAD_SWAP[id], was = st.rk ?? -1; st.rk = k;
  if (!part || !S) return;
  if (k >= S[0] && was < S[0] && was >= 0) dropPart(part, sc);
  part.visible = !(k >= S[0] && k < S[1]);
}
// dropped mags: fall, lie on the ground a moment, shrink away
const drops = [], DROP_LIE = 2.5, _dp = new THREE.Vector3(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3();
function dropPart(part, sc, floor) {
  part.updateWorldMatrix(true, false);
  const c = part.clone(true); c.visible = true;
  part.matrixWorld.decompose(c.position, c.quaternion, c.scale);
  sc.add(c);
  const right = _dp.set(1, 0, 0).applyQuaternion(c.quaternion);
  drops.push({ m: c, sc, s: c.scale.x, v: new THREE.Vector3(right.x * .6, -.5, right.z * .6), spin: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 4 - 2, Math.random() * 6 - 3),
    floor: floor ?? (sc === scene ? groundAt(c.position.x, c.position.z, .05, c.position.y) : 0), lie: 0 });
}
function dropTick(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i], m = d.m;
    if (d.lie > 0) {
      if ((d.lie += dt) > DROP_LIE) { const k = 1 - (d.lie - DROP_LIE) / .3; if (k <= 0) { d.sc.remove(m); drops.splice(i, 1); continue; } m.scale.setScalar(d.s * k); }
      continue;
    }
    d.v.y -= 18 * dt; m.position.addScaledVector(d.v, dt);
    m.rotation.x += d.spin.x * dt; m.rotation.y += d.spin.y * dt; m.rotation.z += d.spin.z * dt;
    if (m.position.y <= d.floor + .02) { m.position.y = d.floor + .02; d.lie = 1e-6; }
  }
}
function clearDrops(sc) { for (let i = drops.length - 1; i >= 0; i--) if (!sc || drops[i].sc === sc) { drops[i].sc.remove(drops[i].m); drops.splice(i, 1); } }
// middle of a gun part, for hands that hold it
function partMid(part) {
  if (part.userData.mid) return part.userData.mid;
  const b = new THREE.Box3();
  for (const m of part.children) if (m.geometry) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); }
  part.userData.half = b.isEmpty() ? [0, 0, 0] : b.getSize(new THREE.Vector3()).multiplyScalar(.5).toArray();
  return part.userData.mid = b.isEmpty() ? new THREE.Vector3() : b.getCenter(new THREE.Vector3());
}
const partBounds = part => { const m = partMid(part); return { c: [part.position.x + m.x, part.position.y + m.y, part.position.z + m.z], h: part.userData.half }; };

// voxel models: boxes filled into a pixel grid, edges drawn black
const GPX = .02, GUN_SCALE = { knife: .75, herosword: .75, blazesaber: .75, windsaber: .75, warhammer: .65, frostwand: .6, windwand: .6, stunwand: .6, flamewand: .6, soulwand: .6, ancientwand: .6, grenade: .85, salvo: .75, voidlantern: .9, tisword: .75, tirocket: .85, cutlass: .75, conch: .7, balisong: .75, monarch: .75 }, GUN_DARK = 0x4a4a52, GUN_STEEL = 0x62626a;
const gunPal = [null], gunPalI = {};
function palIdx(col, glow = false, shine = false, even = shine) { // even: polished, no grain
  const k = (glow ? 'g' : shine ? 's' : even ? 'e' : '') + col;
  if (gunPalI[k] === undefined) gunPalI[k] = gunPal.push({ c: new THREE.Color(col), glow, shine, even }) - 1;
  return gunPalI[k];
}
const VOX_FACES = [
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
];
const VOX_RING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function voxelGrid(pieces) {
  const boxes = pieces.map(([w, h, d, m, x, y, z]) => [Math.round(x - w / 2), Math.round(y - h / 2), Math.round(z - d / 2), Math.round(x + w / 2), Math.round(y + h / 2), Math.round(z + d / 2), m]);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], b[k] - 1); hi[k] = Math.max(hi[k], b[k + 3] + 1); }
  const [NX, NY, NZ] = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], cell = new Uint16Array(NX * NY * NZ);
  for (const [x0, y0, z0, x1, y1, z1, m] of boxes)
    for (let z = z0; z < z1; z++) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) cell[((z - lo[2]) * NY + (y - lo[1])) * NX + (x - lo[0])] = m;
  const at = (x, y, z) => x < 0 || y < 0 || z < 0 || x >= NX || y >= NY || z >= NZ ? 0 : cell[(z * NY + y) * NX + x];
  return { lo, NX, NY, NZ, cell, at };
}
// turn a model's pixels into geometry (core: the glowing colours that light up when it fires, kept apart)
function voxelGeos(pieces, px, core, near) { // near: other parts it sits against (a balisong's), so no outline runs between them
  const { lo, NX, NY, NZ, cell, at } = voxelGrid(pieces), by = near ? (x, y, z) => at(x, y, z) || near(x + lo[0], y + lo[1], z + lo[2]) : at;
  const out = { lit: [[], [], []], glow: [[], [], []], shine: [[], [], []], core: [[], [], []] };
  const CORNER = [0, 1, 2, 0, 2, 3], ca = [0, 1, 1, 0], cb = [0, 0, 1, 1];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const m = cell[(z * NY + y) * NX + x]; if (!m) continue;
    const P = gunPal[m];
    for (let f = 0; f < 6; f++) {
      const [n, a, b] = VOX_FACES[f];
      if (at(x + n[0], y + n[1], z + n[2])) continue;
      // black outline wherever the surface turns an outside corner
      let black = false;
      for (let e = 0; e < 8 && !black && !P.glow; e++) {
        const sa = VOX_RING[e][0], sb = VOX_RING[e][1];
        if (!by(x + sa * a[0] + sb * b[0], y + sa * a[1] + sb * b[1], z + sa * a[2] + sb * b[2])) black = true;
      }
      let r = 0, g = 0, bl = 0;
      if (!black) {
        const h = Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791 ^ (f + 1) * 2654435761, 1597334677) >>> 0;
        const sh = P.glow ? 1 : P.even ? .95 + (h % 1000) / 1000 * .05 : .82 + (h % 1000) / 1000 * .18;
        r = P.c.r * sh; g = P.c.g * sh; bl = P.c.b * sh;
      }
      const [pos, nor, col] = out[P.glow ? (core?.has(m) ? 'core' : 'glow') : P.shine ? 'shine' : 'lit'];
      const ox = x + lo[0] + (n[0] > 0), oy = y + lo[1] + (n[1] > 0), oz = z + lo[2] + (n[2] > 0);
      for (let q = 0; q < 6; q++) {
        const k = CORNER[q], i = ca[k], j = cb[k];
        pos.push((ox + i * a[0] + j * b[0]) * px, (oy + i * a[1] + j * b[1]) * px, (oz + i * a[2] + j * b[2]) * px);
        nor.push(n[0], n[1], n[2]); col.push(r, g, bl);
      }
    }
  }
  const geo = ([pos, nor, col]) => {
    if (!pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere(); return g;
  };
  return { lit: geo(out.lit), glow: geo(out.glow), shine: geo(out.shine), core: geo(out.core) };
}

// gun models (grip and fore are where the hands go)
const GUN_MODELS = {
  voxel({ p, mat, dark, glow, sub, at }) {
    const teal = glow(0x2ee6d6), grip = mat(0x3a3a3e);
    p(4, 4, 16, mat(0x6a6a6a), 0, 2, -8); p(4, 1, 16, mat(0x8e8e8e), 0, 3.5, -8); // slide and its lighter top
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(2, 2, 1, teal, 0, 2, -15.5); // emitter in the muzzle
    for (const z of [-4, -7, -10]) p(4, 2, 2, teal, 0, 2, z); // teal cubes set into the sides
    p(2, 1, 1, dark, 0, 4.5, -1); p(1, 1, 1, dark, 0, 4.5, -15); // sights
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, grip, 0, -3.5, -3); p(4, 3, 4, grip, 0, -6.5, -2); // short grip under the back of the slide
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, teal, 0, -5, -2); // its power cell: the floor plate, and the glowing cell up inside the grip
    return { muzzle: [2, -17], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-11, -14], band: [6, 8, 1], mag };
  },
  shotgun({ p, mat, dark, sub, at }) {
    const wood = mat(0x7a5232), dwood = mat(0x4e3420), steel = mat(0x4a4a4e);
    p(4, 5, 9, wood, 0, -.5, 4.5); p(4, 6, 1, dwood, 0, -1, 9.5); // stock and butt pad
    p(6, 5, 11, steel, 0, .5, -5.5); // receiver
    p(4, 4, 26, mat(GUN_STEEL), 0, 2, -24); p(4, 3, 18, steel, 0, -1.5, -20); // barrel, mag tube under it
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 4, 10, wood, 0, -1, -21); for (const z of [-17.5, -20.5, -23.5]) mg(6, 4, 1, dwood, 0, -1, z); // pump and its grooves (racked at the end of a reload)
    p(1, 1, 1, mat(0xdddddd), 0, 4.5, -36.5); p(4, 4, 1, dark, 0, 2, -37.5); // bead sight, dark muzzle end
    p(4, 3, 3, wood, 0, -3.5, -1.5); p(4, 3, 3, wood, 0, -6.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4.5); // guard and trigger
    return { muzzle: [2, -38], grip: [4, 6, 4, 0, -5, -1], fore: [6, 4, 10, 0, -1, -21], bands: [-3, -8], band: [8, 8, .5], mag };
  },
  ar({ p, mat, dark, sub, at }) {
    const body = mat(0x5a705a), dk = mat(0x465846);
    p(4, 6, 8, dk, 0, 0, 4); p(4, 8, 1, dark, 0, -1, 8.5); // stock, butt
    p(6, 6, 15, body, 0, 0, -7.5); // receiver
    p(4, 1, 13, dark, 0, 3.5, -7.5); p(2, 2, 2, dark, 0, 5, -2); // top rail, rear sight
    p(6, 6, 11, dk, 0, 0, -20.5); for (const z of [-18, -21, -24]) p(6, 2, 2, mat(0x2a2a2e), 0, 0, z); // handguard and its vents
    p(4, 4, 8, mat(GUN_STEEL), 0, 1, -30); p(4, 4, 3, dark, 0, 1, -35.5); p(2, 3, 1, dark, 0, 4.5, -25.5); // barrel, muzzle brake, front sight
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 4, dark, 0, -5, -10); mg(4, 3, 4, dark, 0, -8.5, -11); // mag, curving forward
    p(4, 4, 4, dk, 0, -5, -2); p(4, 3, 4, dk, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -37], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 11, 0, 0, -20.5], bands: [-5, -11], band: [8, 8, 0], mag };
  },
  sniper({ p, mat, dark, glow, sub, at }) {
    const wood = mat(0x5a3d26), act = mat(0x44444c), silver = mat(0x9a9a9a);
    p(4, 6, 10, wood, 0, -1, 5); p(4, 8, 1, mat(0x2e1f14), 0, -1, 10.5); p(4, 2, 6, wood, 0, 3, 4); // stock, butt, cheek rest
    p(4, 4, 18, act, 0, 0, -9); p(4, 3, 10, wood, 0, -3.5, -16); // action, forend
    p(4, 4, 28, mat(GUN_STEEL), 0, .5, -32); p(4, 4, 6, dark, 0, .5, -49); // barrel, suppressor
    p(4, 4, 16, mat(0x2a2a2e), 0, 6, -10); p(6, 6, 2, dark, 0, 6, -1); p(6, 6, 2, dark, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0x66ccff), 0, 6, -18.5); p(4, 4, 1, 0, 0, 6, -19.5); // lens, set back in the bell so it has a rim
    p(4, 4, 1, mat(0x1f4f6e), 0, 6, -1.5); p(4, 4, 1, 0, 0, 6, -.5); p(1, 1, 1, mat(0x9fdcff), -1.5, 7.5, -1.5); // eyepiece glass and its glint
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 2, 2, silver, 4, 1, -3); mg(3, 3, 3, silver, 6.5, 1.5, -3.5); // bolt handle and knob (worked back and forward to reload)
    p(4, 5, 4, wood, 0, -4.5, -2); p(4, 3, 4, wood, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -6); p(1, 3, 1, dark, 0, -3.5, -8.5); p(1, 2, 1, silver, 0, -3, -5.5); // guard and trigger
    return { muzzle: [.5, -52], grip: [4, 8, 5, 0, -6, -1.5], fore: [4, 3, 10, 0, -3.5, -16], bands: [-6, -12], band: [6, 6, 0], mag };
  },
  eradicator({ p, mat, dark, sub, at }) {
    const steel = mat(0x808084), dk = mat(0x48484e), bar = mat(0x66666b), gold = mat(0xc9a43a);
    p(10, 10, 14, steel, 0, 0, -5); p(12, 12, 2, dk, 0, 0, 3); // housing, back plate
    p(2, 2, 10, dk, 0, 8, -5); p(2, 2, 2, dk, 0, 6, -9); p(2, 2, 2, dk, 0, 6, -1); // carry handle
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 6, 8, mat(0x5a5a2a), -8, -2, -5); mg(4, 2, 4, gold, -5, 2, -5); // ammo box and the belt feeding in
    const spin = sub(0, 0, -23, [.5, .5, 0]), sp = at(spin);
    for (const [x, y] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { sp(3, 3, 22, bar, x, y, 0); sp(1, 1, 1, mat(0x111111), x + .5, y + .5, -10.5); } // barrels with dark bores
    sp(2, 2, 18, dk, 0, 0, 1); for (const z of [-6, 6]) sp(9, 9, 2, dk, 0, 0, z); // spindle and barrel rings
    p(4, 2, 6, dk, 0, 3, 7); p(4, 2, 6, dk, 0, -5, 7); p(4, 10, 3, dk, 0, -1, 11.5); // D-shaped spade handle out the back
    p(1, 2, 1, mat(0x999999), 0, -1, 9.5); // trigger inside it
    p(4, 8, 4, dk, 0, -9, -8); // front handle
    return { muzzle: [0, -35], grip: [4, 10, 3, 0, -1, 11.5], fore: [2, 4, 10, 0, 7, -5], bands: [-2, -5], band: [12, 12, 0], spin, mag }; // left hand on the carry handle
  },
  knife({ p, mat }) {
    const brown = mat(0x5a3a1a), dbrown = mat(0x3a2412), steel = mat(0x8a8f96), blade = mat(0xc4cad2);
    p(4, 4, 8, brown, 0, 1, 0); for (const z of [-2.5, 2.5]) p(4, 4, 1, dbrown, 0, 1, z); // handle and its wraps, a pixel up so it lines up with the blade
    p(6, 6, 2, steel, 0, 1, 5); // pommel
    p(4, 10, 2, steel, 0, 1, -5); // crossguard, running up and down like the blade
    p(2, 5, 14, blade, 0, 1.5, -13); p(2, 2, 13, mat(0xf2f5f8), 0, -1, -12.5); // blade, bright sharp edge along the bottom
    p(2, 1, 10, mat(0x9aa3ad), 0, 1.5, -12); // fuller groove
    p(2, 4, 2, blade, 0, 2, -21); p(2, 2, 2, blade, 0, 3, -23); // tip
    return { muzzle: [0, -24], grip: [6, 6, 10, 0, 1, 1], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  flame({ p, mat, dark, glow, sub, at }) {
    const grey = mat(0x66666a), dk = mat(0x404044), red = mat(0xc43030);
    p(6, 6, 14, grey, 0, 0, -6); p(4, 4, 2, dk, 0, 0, 2); // body, rear cap
    p(8, 8, 7, dk, 0, 0, -16.5); for (const z of [-14.5, -16.5, -18.5]) p(8, 8, 1, mat(0x161616), 0, 0, z); // heat shroud and its ribs
    p(4, 4, 7, dark, 0, 0, -23.5); // nozzle
    p(2, 2, 6, dark, 0, -3, -23); p(2, 2, 2, glow(0xffaa33), 0, -3, -27); // pilot pipe and its flame
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 6, 10, red, 0, -6, -8); for (const z of [-4.5, -10.5]) mg(8, 8, 1, dk, 0, -6, z); // fuel tank and straps
    mg(4, 4, 1, mat(0xc9a43a), 0, -6, -13.5); // tank cap
    p(4, 5, 4, dk, 0, -5.5, 1); p(4, 3, 4, dk, 0, -9.5, 2); // rear grip
    p(1, 1, 2, dark, 0, -6.5, -2); p(1, 2, 1, mat(0x999999), 0, -4, -1.5); // guard and trigger
    p(4, 7, 4, dk, 0, -7.5, -16); // front handle
    return { muzzle: [0, -28], grip: [4, 8, 5, 0, -7, 1.5], fore: [8, 15, 7, 0, -3.5, -16.5], bands: [-7, -1], band: [8, 8, 0], mag }; // fore: the front handle and the shroud above it
  },
  rocket({ p, mat, dark, glow, sub, at }) {
    const olive = mat(0x6f8253), dk = mat(0x45533a), hole = mat(0x101010);
    p(8, 8, 52, olive, 0, 0, 4); // tube
    p(8, 8, 3, dk, 0, 0, -20.5); p(10, 10, 3, dk, 0, 0, 26.5); p(10, 10, 2, dark, 0, 0, 30); // front ring, rear ring, exhaust
    p(6, 6, 1, hole, 0, 0, -21.5); p(6, 6, 1, hole, 0, 0, 30.5); // dark tube mouths
    for (const x of [-3.5, 3.5]) p(1, 4, 36, mat(0xc9a43a), x, 0, 4); // yellow warning stripes
    p(6, 2, 12, mat(0x2a2a2a), 0, -5, 18); // shoulder pad under the back
    p(4, 5, 4, dk, 0, -6.5, -6); p(4, 3, 4, dk, 0, -10.5, -5); // trigger grip
    p(1, 1, 4, dark, 0, -7.5, -10); p(1, 3, 1, dark, 0, -5.5, -11.5); p(1, 2, 1, mat(0x888888), 0, -5, -9.5); // guard and trigger
    p(4, 8, 4, dk, 0, -8, -16); // front grip
    const round = sub(0, 0, 0), r = at(round); // the loaded rocket, poking well out of the front
    r(6, 6, 6, mat(0xaa3333), 0, 0, -25); r(4, 4, 3, mat(0xcc4433), 0, 0, -29.5); r(2, 2, 2, mat(0xe86a50), 0, 0, -32);
    return { muzzle: [0, -33], grip: [4, 8, 5, 0, -8, -5.5], fore: [4, 8, 4, 0, -8, -16], bands: [7, 10], band: [10, 10, 0], round };
  },
  crossbow({ p, mat, dark, glow, sub, at }) {
    const wood = mat(0x6b4a2b), dk = mat(0x47301c), limb = mat(0x5c5c66), str = mat(0xe8e2d0);
    p(4, 6, 10, wood, 0, -1, 7); p(4, 8, 2, dk, 0, -1, 13); // stock and butt
    p(4, 4, 30, wood, 0, 0, -13); p(2, 1, 22, dk, 0, 2.5, -15); // rail and its groove
    p(20, 2, 2, limb, 0, 1, -27); for (const s of [-1, 1]) { p(2, 2, 4, limb, s * 11, 1, -25); p(2, 2, 2, limb, s * 13, 1, -22); } // bow, its tips swept back
    for (let k = 0; k < 12; k++) for (const s of [-1, 1]) p(1, 1, 2, str, s * (12.5 - k), 2.5, Math.round(-21 + k * 1.45)); // string
    p(6, 2, 2, dark, 0, -3, -27); // stirrup
    for (const x of [-1.5, 1.5]) p(1, 4, 1, dark, x, 4, .5); p(4, 1, 1, dark, 0, 6.5, .5); // a little ring sight at the back
    const round = sub(0, 0, 0), r = at(round); // the loaded bolt
    r(2, 1, 20, mat(0xc9a46a), 0, 3.5, -14); r(2, 2, 2, mat(GUN_STEEL), 0, 4, -25); r(4, 1, 2, mat(0xc8402a), 0, 4.5, -5);
    p(4, 6, 4, wood, 0, -5, 0); p(4, 3, 4, wood, 0, -9.5, 1); // grip
    p(1, 1, 4, dark, .5, -6.5, -4); p(1, 4, 1, dark, .5, -4, -5.5); p(1, 3, 1, mat(0x888888), .5, -3.5, -3.5); // guard and trigger
    return { muzzle: [4, -27], grip: [4, 8, 5, 0, -6, 0], fore: [4, 4, 10, 0, -1, -17], bands: [-6, -12], band: [6, 6, 0], holo: [4.5, .5], round };
  },

  grenade({ p, mat, dark, glow, sub, at }) {
    const green = mat(0x3f7a3a), dk = mat(0x2a3d28), yel = mat(0xffc933), hole = mat(0x101010);
    p(6, 6, 18, green, 0, 1, -19); for (const z of [-14, -24]) p(8, 8, 2, yel, 0, 1, z); // fat barrel and its bouncy stripes
    p(8, 8, 2, dk, 0, 1, -29); p(4, 4, 1, hole, 0, 1, -30.5); // muzzle
    const spin = sub(0, -1, -5), sp = at(spin); // the drum
    sp(10, 10, 10, dk, 0, 0, 0); sp(2, 1, 4, yel, 0, 5.5, 0); sp(1, 2, 4, yel, -5.5, 0, 0); sp(2, 1, 4, yel, 0, -5.5, 0);
    p(4, 6, 10, dk, 0, 0, 5); p(4, 8, 2, green, 0, 0, 11); // stock and butt
    p(4, 6, 4, dk, 0, -6, 4); p(4, 3, 4, dk, 0, -10.5, 5); // grip
    p(2, 1, 4, dark, 0, -9.5, 0); p(1, 3, 1, mat(0x888888), .5, -7.5, -1.5); // guard and trigger
    p(4, 7, 4, dk, 0, -5.5, -18); // front grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(1, 6, 6, mat(0x555a55), 5.5, -1, -5); // loading gate, swung open to reload
    return { muzzle: [1, -31], grip: [4, 8, 5, 0, -7, 4], fore: [4, 7, 4, 0, -5.5, -18], bands: [-17, -20], band: [8, 8, 1], spin, mag };
  },
  aerial({ p, mat, dark, glow, sub, at }) {
    const sky = mat(0x8fd0f5), dsky = mat(0x5aa6d8), white = mat(0xf2f6fa), gold = mat(0xe8b83a), dgold = mat(0xb08a2a);
    const ring = (o, i, d, m, z) => { const t = (o - i) / 2, c = (i + t) / 2; p(o, t, d, m, 0, 1 + c, z); p(o, t, d, m, 0, 1 - c, z); p(t, i, d, m, c, 1, z); p(t, i, d, m, -c, 1, z); };
    p(10, 10, 8, white, 0, 1, 4); p(10, 10, 2, gold, 0, 1, 2); // the turbine housing and its gold band
    const spin = sub(0, 1, 8), sp = at(spin); // the fan at the back
    sp(4, 8, 1, sky, 0, 0, 0); sp(8, 4, 1, sky, 0, 0, 0); sp(2, 2, 1, dgold, 0, 0, 1);
    p(6, 6, 24, sky, 0, 1, -12); // barrel
    for (const x of [-2.5, 2.5]) for (const z0 of [-3, -13]) for (let t = 0; t < 5; t++) p(1, 1, 2, white, x, -1.5 + t, z0 - 2 * t); // wind swooshes along the sides
    p(6, 1, 24, dsky, 0, 3.5, -12); p(4, 1, 20, white, 0, 3.5, -12); // a white stripe along the top
    p(8, 8, 2, white, 0, 1, -25); p(10, 10, 2, sky, 0, 1, -27); ring(12, 8, 3, gold, -29.5); // the bell, flaring out to a gold rim
    p(8, 8, 1, dsky, 0, 1, -28.5); p(4, 4, 1, glow(0xd8f6ff), 0, 1, -28.5); // inside it, the wind glowing
    p(6, 6, 1, dsky, 0, 1, 7.5); // the intake behind the fan
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 6, 6, gold, 0, -5, -11); mg(4, 1, 6, white, 0, -8.5, -11); // the air tank
    p(4, 2, 8, white, 0, -3, -3); // under the barrel, holding the grip and trigger
    p(4, 4, 4, white, 0, -6, -1); p(4, 3, 4, white, 0, -9.5, 0); // grip
    p(1, 1, 4, dark, 0, -7.5, -5); p(1, 3, 1, dark, 0, -5.5, -6.5); p(1, 2, 1, mat(0x888888), 0, -5, -4.5); // guard and trigger
    p(4, 6, 4, dsky, 0, -4, -19); // front grip
    return { muzzle: [1, -32], grip: [4, 7, 5, 0, -7.5, -.5], fore: [4, 6, 4, 0, -4, -19], bands: [-6, -16], band: [8, 8, 1], spin, mag };
  },

  flare({ p, mat, dark, glow, sub, at }) {
    const red = mat(0xc8402a), grip = mat(0x3a3a3e);
    p(6, 6, 14, red, 0, 2, -9); p(6, 1, 14, mat(0xe8684a), 0, 4.5, -9); // fat barrel and its lighter top
    p(6, 6, 2, dark, 0, 2, -17); // dark muzzle
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 1, glow(0xffaa33), 0, 2, -17.5); // the flare inside it (gone once fired, back when it's reloaded)
    p(6, 8, 4, mat(0x3a3a3a), 0, 2, 0); p(2, 3, 2, dark, 0, 7.5, 2); // breech and hammer
    p(4, 4, 4, grip, 0, -4, 0); p(4, 3, 4, grip, 0, -7.5, 1); p(4, 2, 4, grip, 0, -10, 2); // grip, raked back in steps
    p(1, 1, 5, dark, 0, -4.5, -3.5); p(1, 3, 1, dark, 0, -2.5, -6.5); p(1, 2, 1, mat(0x888888), 0, -2, -3.5); // guard and trigger
    return { muzzle: [2, -18], grip: [4, 9, 5, 0, -6.5, .5], fore: null, bands: [-6, -11], band: [8, 8, 2], mag };
  },
  hitman({ p, mat, dark, glow, sub, at }) {
    const slide = mat(0x3a3a40), grip = mat(0x2e2e33), can = mat(0x26262b), ring = mat(0x45454c);
    p(4, 4, 14, slide, 0, 2, -7); p(4, 1, 14, mat(0x55555d), 0, 3.5, -7); // slide and its lighter top
    for (const z of [-1.5, -3.5]) p(4, 2, 1, dark, 0, 2.5, z); // grip serrations at the back of the slide
    p(4, 2, 12, dark, 0, -1, -6); // frame
    p(6, 6, 18, can, 0, 2, -23); for (const z of [-16.5, -23, -29.5]) p(6, 6, 1, ring, 0, 2, z); // suppressor and its rings
    p(2, 2, 1, mat(0x0c0c0c), 0, 2, -32.5); // its bore
    p(6, 1, 4, dark, 0, 4.5, -6); // holo sight: mount, then an open window framed by two posts and a hood
    for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 7, -6);
    p(6, 1, 2, dark, 0, 9.5, -6);
    p(1, 1, 1, glow(0xff3333), .5, 5.5, -4.5); // the emitter that throws the reticle
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, grip, 0, -3.5, -3); p(4, 3, 4, grip, 0, -6.5, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, mat(0x8a8a90), 0, -5, -2); // its magazine: the floor plate, and the steel body up inside the grip
    return { muzzle: [2, -34], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-11, -13], band: [6, 8, 1], holo: [7, -6], mag };
  },
  thrasher({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x3c3c44), dk = mat(0x2b2b31), acc = mat(0xe0632a), vent = mat(0x141418);
    p(4, 6, 9, dk, 0, 0, 4.5); p(4, 8, 1, dark, 0, -1, 9.5); p(4, 1, 7, acc, 0, .5, 4.5); // stock, butt, stripe
    p(6, 6, 16, body, 0, 0, -8); p(6, 1, 12, acc, 0, -.5, -8); // receiver and its stripe
    p(4, 1, 14, dark, 0, 3.5, -8); // top rail
    p(6, 1, 4, dark, 0, 4.5, -10); // holo sight: mount, two posts and a hood, open in the middle
    for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 7, -10);
    p(6, 1, 2, dark, 0, 9.5, -10);
    p(1, 1, 1, glow(0xff3333), .5, 5.5, -8.5); // the emitter that throws the reticle
    p(6, 6, 10, dk, 0, 0, -21); for (const z of [-18, -21, -24]) p(6, 2, 1, vent, 0, 0, z); // handguard and its vents
    p(4, 4, 6, mat(GUN_STEEL), 0, 1, -29); // barrel
    p(6, 6, 4, dk, 0, 1, -34); p(6, 2, 1, vent, 0, 1, -33.5); // muzzle brake and its port
    for (const y of [-1.5, 3.5]) p(4, 1, 2, dark, 0, y, -37); // its teeth
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, dark, 0, -7, -10.5); mg(4, 1, 5, acc, 0, -8.5, -10.5); // straight box mag with an orange band
    p(4, 4, 4, dk, 0, -5, -2); p(4, 3, 4, dk, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -38], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 10, 0, 0, -21], bands: [-3, -14], band: [8, 8, 0], holo: [7, -10], mag };
  },
  semisniper({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x3e3f44), tan = mat(0xb39a6b), dtan = mat(0x8a744c), vent = mat(0x1a1a1e);
    p(4, 6, 10, tan, 0, -1, 5); p(4, 8, 1, dark, 0, -1, 10.5); p(4, 2, 6, dtan, 0, 3, 4); // stock, butt pad, cheek riser
    p(6, 6, 16, body, 0, 0, -8); p(4, 1, 16, dark, 0, 3.5, -8); // receiver and top rail
    p(3, 3, 3, mat(0x9a9a9a), 4.5, 1, -4); // charging handle on the right
    p(4, 4, 16, mat(0x2a2a2e), 0, 6, -10); p(6, 6, 2, dark, 0, 6, -1); p(6, 6, 2, dark, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0x6bff9a), 0, 6, -18.5); p(4, 4, 1, 0, 0, 6, -19.5); // lens, set back in the bell so it has a rim
    p(4, 4, 1, mat(0x1f5a37), 0, 6, -1.5); p(4, 4, 1, 0, 0, 6, -.5); p(1, 1, 1, mat(0xa8ffc4), -1.5, 7.5, -1.5); // eyepiece glass and its glint
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    p(6, 6, 12, tan, 0, 0, -22); for (const z of [-19, -22, -25]) p(6, 2, 1, vent, 0, 0, z); // handguard and its vents
    p(4, 4, 14, mat(GUN_STEEL), 0, 1, -35); // barrel
    p(6, 6, 4, body, 0, 1, -44); p(6, 2, 1, vent, 0, 1, -43.5); // muzzle brake and its port
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, dark, 0, -7, -11); mg(4, 1, 5, dtan, 0, -8.5, -11); // straight box mag with a tan band
    p(4, 4, 4, dtan, 0, -5, -2); p(4, 3, 4, dtan, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -46], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 12, 0, 0, -22], bands: [-6, -15], band: [8, 8, 0], mag };
  },
  // a magnifying glass on top focuses sunlight into the beam
  herosword({ p, mat, glow }) {
    const bronze = mat(0xc8873a), dbronze = mat(0x8a5a24), lbronze = mat(0xeab36a), wrap = mat(0x4a2c18), gem = glow(0x38d8ff);
    p(4, 4, 16, wrap, 0, 1, 4); for (const z of [-1.5, 2.5, 6.5, 10.5]) p(4, 4, 1, mat(0x2e1a0e), 0, 1, z); // long grip and its wraps
    p(6, 6, 4, dbronze, 0, 1, 14); p(8, 2, 2, gem, 0, 1, 14); // pommel, a gem showing on both sides
    p(4, 18, 3, bronze, 0, 1, -5.5); p(4, 2, 3, lbronze, 0, 11, -5.5); p(4, 2, 3, lbronze, 0, -9, -5.5); // crossguard and its bright tips
    p(6, 4, 4, dbronze, 0, 1, -5.5); p(8, 2, 2, gem, 0, 1, -5.5); // the setting in the middle, and its gem
    p(2, 6, 28, bronze, 0, 1, -21); p(2, 1, 28, lbronze, 0, 4.5, -21); p(2, 1, 28, lbronze, 0, -2.5, -21); // blade and its bright edges
    p(2, 2, 22, dbronze, 0, 1, -19); // fuller
    p(2, 4, 2, bronze, 0, 1, -36); p(2, 2, 2, lbronze, 0, 1, -38); // tip
    return { muzzle: [1, -39], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  trex({ p, mat, dark, glow, sub, at }) {
    const scale = mat(0x4f6b34), dscale = mat(0x3a5226), belly = mat(0xc9b98a), bone = mat(0xece3c8), steel = mat(0x4a4a4e);
    p(4, 6, 9, scale, 0, -.5, 4.5); p(4, 7, 1, dark, 0, -1, 9.5); for (const z of [2, 5, 8]) p(4, 1, 1, dscale, 0, 1.5, z); // stock, butt pad, scale stripes
    p(6, 6, 12, scale, 0, .5, -6); p(6, 1, 12, belly, 0, -1.5, -6); // receiver and its pale belly
    for (const z of [-2, -6, -10]) p(4, 3, 3, bone, 0, 5, z); // back plates
    p(4, 4, 24, mat(GUN_STEEL), 0, 2, -24); p(4, 3, 16, steel, 0, -1.5, -20); // barrel, mag tube under it
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 4, 10, dscale, 0, -1, -21); for (const z of [-17.5, -20.5, -23.5]) mg(6, 4, 1, dark, 0, -1, z); // pump and its grooves
    p(6, 4, 4, scale, 0, 2.5, -37); for (const z of [-38, -36]) p(6, 1, 1, bone, 0, 2.5, z); // a jaw round the muzzle, with teeth
    p(6, 1, 1, glow(0xffcc33), 0, 3.5, -36); // and an eye
    p(4, 3, 3, dscale, 0, -3.5, -1.5); p(4, 3, 3, dscale, 0, -6.5, -.5); // pistol grip
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4.5); // guard and trigger
    return { muzzle: [2, -40], grip: [4, 6, 4, 0, -5, -1], fore: [6, 4, 10, 0, -1, -21], bands: [-3, -8], band: [8, 8, .5], mag };
  },
  starsmasher({ p, mat, dark, glow, sub, at }) {
    const navy = mat(0x24305a), dnavy = mat(0x18203e), gold = mat(0xe8b84a), star = glow(0xffe68a), vent = mat(0x10142a);
    p(4, 5, 10, dnavy, 0, .5, 5); p(4, 8, 1, dark, 0, -1, 10.5); p(4, 3, 6, navy, 0, 4, 4); // stock, butt, cheek rest
    p(6, 6, 26, navy, 0, 1, -12); p(6, 1, 26, gold, 0, -.5, -12); // the tall upper receiver and its gold stripe
    p(6, 3, 12, dnavy, 0, -3.5, -6); // lower receiver
    for (const z of [-14, -17, -20, -23]) p(6, 1, 2, vent, 0, 2.5, z); // side rail slots
    p(6, 1, 3, star, 0, 1.5, -7); p(6, 3, 1, star, 0, 1.5, -7); // a glowing star on each side
    p(4, 1, 28, dark, 0, 4.5, -13); // top rail
    p(6, 1, 4, dark, 0, 5.5, -6); for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 8, -6); p(6, 1, 2, dark, 0, 10.5, -6); // holo sight
    p(1, 1, 1, glow(0xffd24a), .5, 6.5, -4.5); // its emitter
    p(4, 4, 8, mat(GUN_STEEL), 0, 2, -29); // barrel
    p(6, 6, 4, dnavy, 0, 2, -35); p(6, 6, 1, gold, 0, 2, -34.5); // flash hider and its gold ring
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, dark, 0, -8, -8); mg(4, 1, 5, gold, 0, -10.5, -8); // mag with a gold band
    p(4, 4, 4, dnavy, 0, -7, 0); p(4, 3, 4, dnavy, 0, -10.5, 1); // pistol grip
    p(1, 1, 4, dark, 0, -8.5, -4); p(1, 2, 1, mat(0x666666), 0, -6, -3.5); // guard and trigger
    return { muzzle: [2, -38], grip: [4, 7, 5, 0, -8.5, .5], fore: [6, 6, 10, 0, 1, -18], bands: [-15.5, -18.5], band: [8, 8, 1], holo: [7, -6], mag };
  },
  blazesaber({ p, mat, glow }) {
    const metal = mat(0x8a8d94), dmetal = mat(0x45474e), red = mat(0xb8322a), blade = glow(0xff6a1a), core = glow(0xffd38a);
    p(4, 4, 16, metal, 0, 1, 4); for (const z of [-1.5, 1.5, 4.5, 7.5]) p(4, 4, 1, dmetal, 0, 1, z); // hilt and its grip rings
    p(6, 6, 3, dmetal, 0, 1, 13.5); p(6, 6, 1, red, 0, 1, 12.5); // pommel and a red ring
    p(6, 6, 4, metal, 0, 1, -6); p(6, 1, 4, red, 0, 1, -6); // emitter, a red stripe round it
    p(4, 4, 34, blade, 0, 1, -25); p(4, 2, 34, core, 0, 1, -25); p(2, 4, 34, core, 0, 1, -25); // blade and its hot core
    p(2, 2, 2, core, 0, 1, -43); // tip
    return { muzzle: [1, -44], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  windsaber({ p, mat, glow }) {
    const white = mat(0xe4e8ee), silver = mat(0xa8b0ba), teal = mat(0x3ab8c8), blade = glow(0xc8f0ff), core = glow(0xffffff);
    p(4, 4, 16, white, 0, 1, 4); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, silver, 0, 1, z); // hilt and its rings
    p(6, 6, 3, silver, 0, 1, 13.5); p(6, 6, 1, teal, 0, 1, 12.5); // pommel and a teal ring
    p(6, 6, 4, white, 0, 1, -6); p(6, 1, 4, teal, 0, 1, -6); // emitter and its teal band
    p(4, 4, 34, blade, 0, 1, -25); p(4, 2, 34, core, 0, 1, -25); p(2, 4, 34, core, 0, 1, -25); // white blade, pale blue edges
    p(2, 2, 2, core, 0, 1, -43); // tip
    return { muzzle: [1, -44], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  frostwand({ p, mat, dark, glow, sub, at }) {
    const shaft = mat(0xe8eef4), dshaft = mat(0xa9b8c8), wrap = mat(0x2f4f86), dwrap = mat(0x1e3560), gold = mat(0xc9a24a), ice = glow(0x9fe8ff), core = glow(0xe8fbff);
    p(4, 4, 12, wrap, 0, 0, 2); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, dwrap, 0, 0, z); // handle and its wraps
    p(6, 6, 3, dshaft, 0, 0, 9.5); // pommel
    p(6, 6, 2, gold, 0, 0, -5); // gold collar
    p(4, 4, 18, shaft, 0, 0, -15); for (const z of [-10, -18]) p(4, 4, 1, dshaft, 0, 0, z); // the shaft and its rings
    p(6, 6, 4, ice, 0, 0, -26); p(4, 4, 4, ice, 0, 0, -30); p(2, 2, 2, core, 0, 0, -33); // an ice crystal on the tip
    for (const [x, y] of [[3, 2], [-3, -2], [-2, 3], [2, -3]]) p(2, 2, 3, ice, x, y, -25.5); // little shards round it
    p(4, 4, 2, ice, 0, 0, 12); // a frost charge in the pommel
    return { muzzle: [0, -35], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-9, -12], band: [6, 6, 0] };
  },
  flamewand({ p, mat, glow, sub, at }) {
    const wood = mat(0x4a2c1c), dwood = mat(0x2a1810), brass = mat(0xc8902a), dbrass = mat(0x8a5c18), ember = glow(0xff6a1a), hot = glow(0xffc04a), core = glow(0xfff0b0);
    p(4, 4, 12, dwood, 0, 0, 2); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, brass, 0, 0, z); // handle and its brass wraps
    p(6, 6, 3, dbrass, 0, 0, 9.5); // pommel
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 2, ember, 0, 0, 12); // an ember charge in the pommel
    p(6, 6, 2, brass, 0, 0, -5); // brass collar
    p(4, 4, 18, wood, 0, 0, -15); for (const z of [-11, -20]) p(4, 4, 1, dwood, 0, 0, z); // charred shaft and its knots
    p(6, 6, 3, dbrass, 0, 0, -25.5); // a brass cup for the ember
    for (const [x, y] of [[3, 2], [-3, -2], [-2, 3], [2, -3]]) p(2, 2, 4, brass, x, y, -28); // prongs round it
    p(6, 6, 4, ember, 0, 0, -29); p(4, 4, 3, hot, 0, 0, -32.5); p(2, 2, 2, core, 0, 0, -35); // the ember, hotter toward the tip
    return { muzzle: [0, -37], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-8, -14], band: [6, 6, 0], mag };
  },
  windwand({ p, mat, glow, sub, at }) {
    const birch = mat(0xece6d8), fleck = mat(0x8a8274), silver = mat(0xb4bcc6), teal = mat(0x3ab8c8), dteal = mat(0x24808c), wind = glow(0xc8f0ff), core = glow(0xffffff);
    p(4, 4, 12, teal, 0, 0, 2); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, dteal, 0, 0, z); // teal handle and its wraps
    p(6, 6, 3, silver, 0, 0, 9.5); // pommel
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 2, wind, 0, 0, 12); // a wind charge in the pommel
    p(6, 6, 2, silver, 0, 0, -5); // silver collar
    p(4, 4, 18, birch, 0, 0, -15); for (const z of [-9, -14, -20]) p(4, 4, 1, fleck, 0, 0, z); // a birch shaft with dark flecks
    p(6, 6, 2, silver, 0, 0, -25); // a silver cap
    p(6, 6, 6, wind, 0, 0, -29); p(8, 8, 2, silver, 0, 0, -29); p(2, 2, 2, core, 0, 0, -33); // a ball of wind in a silver ring
    for (const [x, y] of [[3, 3], [-3, -3]]) p(2, 2, 4, wind, x, y, -25); for (const [x, y] of [[-3, 3], [3, -3]]) p(2, 2, 3, core, x, y, -32.5); // wisps curling round it
    return { muzzle: [0, -35], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-8, -17], band: [6, 6, 0], mag };
  },
  stunwand({ p, mat, glow }) {
    const steel = mat(0x7a808a), dsteel = mat(0x4a4e58), copper = mat(0xc87a3a), rubber = mat(0x2a2a30), zap = glow(0xffe24a), core = glow(0xffffff);
    p(4, 4, 12, rubber, 0, 0, 2); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, dsteel, 0, 0, z); // a rubber grip and its rings
    p(6, 6, 3, dsteel, 0, 0, 9.5); p(4, 4, 2, zap, 0, 0, 12); // pommel and a little battery light
    p(6, 6, 2, copper, 0, 0, -5); // copper collar
    p(4, 4, 18, steel, 0, 0, -15); for (const z of [-10, -13, -16, -19, -22]) p(6, 6, 1, copper, 0, 0, z); // a steel rod wound with copper coils
    p(6, 6, 2, dsteel, 0, 0, -25); for (const x of [-2, 2]) p(2, 2, 6, dsteel, x, 0, -29); // two prongs
    p(4, 4, 4, zap, 0, 0, -28); p(2, 4, 2, core, 0, 0, -31); // the spark that jumps between them
    return { muzzle: [0, -33], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-7.5, -24], band: [6, 6, 0] };
  },
  soulwand({ p, mat, glow, sub, at }) {
    const bone = mat(0xe6e0cc), dbone = mat(0xa8a08a), wrap = mat(0x3a2a52), dwrap = mat(0x241a36), iron = mat(0x3c3c46), soul = glow(0x6fffd8), core = glow(0xe0fff6);
    p(4, 4, 12, wrap, 0, 0, 2); for (const z of [-1.5, 2.5, 6.5]) p(4, 4, 1, dwrap, 0, 0, z); // a dark wrapped handle
    p(6, 6, 3, iron, 0, 0, 9.5); // pommel
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 2, soul, 0, 0, 12); // a soul charge in the pommel
    p(6, 6, 2, iron, 0, 0, -5); // iron collar
    p(4, 4, 18, bone, 0, 0, -15); for (const z of [-9, -15, -21]) p(6, 6, 2, dbone, 0, 0, z); // a bone shaft with knuckles
    p(6, 6, 2, iron, 0, 0, -25); for (const [x, y] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) p(2, 2, 8, iron, x, y, -30); p(6, 6, 2, iron, 0, 0, -35); // an iron cage
    p(4, 4, 6, soul, 0, 0, -30); p(2, 2, 2, core, 0, 0, -30); // the trapped soul
    return { muzzle: [0, -37], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-12, -18], band: [6, 6, 0], holo: [0, -30], mag };
  },
  ancientwand({ p, mat, glow, sub, at }) {
    const wood = mat(0x5a4030), dwood = mat(0x3a281c), lwood = mat(0x7a5a40), ruby = glow(0xff4a3a), ice = glow(0x8fe0ff), wind = glow(0xeefff6), pale = glow(0xf0ecff), core = glow(0xffffff);
    p(4, 4, 12, dwood, 0, 0, 2); p(4, 4, 2, wood, 0, 0, -1); p(4, 4, 2, wood, 0, 0, 5); // a twisted root for a handle
    p(6, 6, 3, dwood, 0, 0, 9.5); p(4, 4, 2, lwood, 1, 1, 10); // a knot of root for a pommel
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 2, pale, 0, 0, 12); // a pale charge in the pommel
    p(6, 6, 2, lwood, 0, 0, -5); // a gnarl where the root meets the shaft
    p(4, 4, 6, wood, 0, 0, -9); p(4, 4, 6, wood, 1, 0, -15); p(4, 4, 6, wood, 0, 1, -21); // a crooked old shaft
    p(6, 6, 2, dwood, 0, 0, -12); p(6, 6, 2, dwood, 1, 0, -18); // its gnarls
    p(4, 2, 4, ruby, 0, 3, -9); p(4, 2, 4, ice, 0, 3, -15); p(4, 2, 4, wind, 0, 3, -21); // three gems in a row: fire, ice and wind
    p(6, 6, 2, dwood, 0, 1, -25); for (const [x, y] of [[2, 3], [-2, 3], [0, -1]]) p(2, 2, 4, lwood, x, y, -27); // old wood fingers
    p(4, 4, 5, pale, 0, 1, -28.5); p(2, 2, 2, core, 0, 1, -32); // a pale crystal that shows the next spell
    return { muzzle: [1, -34], grip: [6, 6, 18, 0, 0, 2.5], fore: null, bands: [-7, -24], band: [6, 6, 0], mag };
  },
  warhammer({ p, mat, glow }) {
    const steel = mat(0x8a8e98), dsteel = mat(0x5a5e68), wood = mat(0x6a4428), wrap = mat(0x3a2414), gold = mat(0xd8a838);
    p(4, 4, 22, wood, 0, 1, 1); for (const z of [3.5, 6.5, 9.5]) p(4, 4, 1, wrap, 0, 1, z); // long handle, a wrapped grip
    p(6, 6, 3, dsteel, 0, 1, 13.5); // pommel
    p(6, 6, 3, gold, 0, 1, -11.5); // gold collar under the head
    p(8, 16, 10, steel, 0, 1, -18); p(8, 16, 2, dsteel, 0, 1, -18); // the head, a dark band round it
    p(8, 4, 10, dsteel, 0, 11, -18); p(6, 2, 8, dsteel, 0, -8, -18); // a spike on the back, a flat face on the front
    p(6, 6, 2, steel, 0, 1, -24); // a short cap on the end
    return { muzzle: [1, -26], grip: [6, 6, 18, 0, 1, 6], fore: null, bands: [-6.5, -9.5], band: [6, 6, 1] };
  },
  shockbeam({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x2f4a66), dbody = mat(0x1f3044), coil = mat(0xd9a62a), zap = glow(0x8fe9ff), steel = mat(0x6e6e74);
    p(4, 6, 8, dbody, 0, -.5, 4); p(4, 8, 1, dark, 0, -1, 8.5); // stock and butt
    p(6, 6, 16, body, 0, 0, -8); p(6, 1, 16, mat(0x46688a), 0, 2.5, -8); // body and its lighter top
    p(2, 4, 2, coil, 0, 5, -5); p(2, 4, 2, coil, 0, 5, -11); p(4, 4, 4, zap, 0, 8, -8); // coil posts and the glowing orb they hold
    p(4, 4, 14, steel, 0, .5, -23); for (const z of [-18, -20, -22, -24, -26]) p(6, 6, 1, coil, 0, .5, z); // barrel wound with copper coils
    p(2, 2, 4, steel, 0, 3.5, -31); p(2, 2, 4, steel, 0, -2.5, -31); p(2, 4, 1, zap, 0, .5, -32.5); // two prongs and the spark between them
    p(4, 4, 4, dbody, 0, -4.5, -1); p(4, 3, 4, dbody, 0, -7.5, 0); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -5); p(1, 2, 1, mat(0x888888), 0, -3.5, -4.5); // guard and trigger
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 5, 4, mat(0x2a2a30), 0, -5.5, -9); mg(4, 2, 2, zap, 0, -5.5, -9); // battery with a glowing window
    p(6, 4, 6, dark, 0, -5, -14); // front handle
    return { muzzle: [.5, -33], grip: [4, 7, 4, 0, -6, -.5], fore: [6, 4, 6, 0, -5, -14], bands: [-6, -10], band: [8, 7, -.5], mag };
  },
  tigerbite({ p, mat, dark, glow, sub, at }) {
    const orange = mat(0xe07a1f), dorange = mat(0xa8520f), black = mat(0x1c1a18), cream = mat(0xf0e2c4);
    p(4, 6, 10, orange, 0, -1, 5); for (const z of [2.5, 6.5]) p(4, 4, 1, black, 0, 0, z); p(4, 8, 1, black, 0, -1, 10.5); // striped stock and butt pad
    p(4, 2, 6, cream, 0, 3, 4); // cheek rest, the tiger's pale belly
    p(6, 6, 16, orange, 0, 0, -8); for (const z of [-2.5, -6.5, -10.5, -14.5]) p(6, 4, 1, black, 0, 1, z); // receiver and its stripes
    p(4, 1, 16, dark, 0, 3.5, -8); // top rail
    p(4, 4, 16, black, 0, 6, -10); p(6, 6, 2, dorange, 0, 6, -1); p(6, 6, 2, dorange, 0, 6, -19); // scope tube and bells
    p(4, 4, 1, glow(0xffc531), 0, 6, -18.5); p(4, 4, 1, 0, 0, 6, -19.5); // amber lens, like an eye, set back in its bell
    p(4, 4, 1, mat(0x8c6418), 0, 6, -1.5); p(4, 4, 1, 0, 0, 6, -.5); p(1, 1, 1, mat(0xffe08a), -1.5, 7.5, -1.5); // eyepiece glass and its glint
    p(2, 2, 2, dark, 0, 3, -5); p(2, 2, 2, dark, 0, 3, -15); // scope mounts
    p(6, 6, 12, orange, 0, 0, -22); for (const z of [-18.5, -22.5, -26.5]) p(6, 4, 1, black, 0, -1, z); // handguard and its stripes
    p(4, 4, 14, mat(GUN_STEEL), 0, 1, -35); // barrel
    p(6, 6, 4, black, 0, 1, -44); p(6, 2, 1, cream, 0, -1, -45.5); // muzzle and its bared teeth
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, black, 0, -7, -11); mg(4, 1, 5, orange, 0, -8.5, -11); // box mag with an orange band
    p(4, 4, 4, dorange, 0, -5, -2); p(4, 3, 4, dorange, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -46], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 12, 0, 0, -22], bands: [-6, -15], band: [8, 8, 0], mag };
  },
  executioner({ p, mat, dark, glow, sub, at }) {
    const body = mat(0x2a2233), plate = mat(0x5b3b8a), lplate = mat(0x9a6be0), las = glow(0xd47bff);
    p(4, 4, 18, body, 0, 2, -9); p(6, 3, 10, plate, 0, 2.5, -9); p(4, 1, 18, lplate, 0, 4.5, -9); // slide, purple side plates, bright top
    for (const z of [-6, -9, -12]) p(6, 1, 1, las, 0, 2, z); // glowing slits in the plates
    p(2, 1, 6, plate, 0, 5.5, -15); // low fin ahead of the sight
    p(6, 1, 4, plate, 0, 5.5, -7); // purple holo sight: mount, posts, hood
    for (const x of [-2.5, 2.5]) p(1, 4, 2, plate, x, 8, -7);
    p(6, 1, 2, plate, 0, 10.5, -7);
    p(1, 1, 1, las, .5, 6.5, -5.5); // the emitter
    p(6, 6, 4, plate, 0, 2, -20); p(2, 2, 1, las, 0, 2, -22.5); // emitter and its lens
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, body, 0, -3.5, -3); p(4, 3, 4, body, 0, -6.5, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, las, 0, -5, -2); // power cell glowing up inside the grip
    return { muzzle: [2, -23], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-15, -17], band: [6, 6, 2], holo: [8, -7], mag };
  },
  rubypierce({ p, mat, dark, glow, sub, at }) {
    const ruby = mat(0xb3162e), lruby = mat(0xe8445e), druby = mat(0x6a0c1c), wine = mat(0x2a161c), core = glow(0xff4a64), hot = glow(0xffc2cc);
    p(6, 7, 24, ruby, 0, 2, -10); p(4, 1, 24, lruby, 0, 6, -10); // housing and its bright top
    p(6, 6, 15, druby, 0, 2.5, -11); p(6, 4, 13, 0, 0, 2.5, -11); // a dark frame round a big window each side
    p(4, 4, 13, core, 0, 2.5, -11); p(4, 2, 7, hot, 0, 2.5, -11); // the ruby core and its white-hot heart
    p(4, 1, 9, druby, 0, 6, -15); p(2, 2, 7, core, 0, 5.5, -15); p(2, 1, 3, hot, 0, 6, -15); // the core shining up through a slot in the top
    p(6, 1, 4, druby, 0, 7, -6); for (const x of [-2.5, 2.5]) p(1, 4, 2, druby, x, 9.5, -6); p(6, 1, 2, druby, 0, 12, -6); // holo sight
    p(6, 7, 4, druby, 0, 2, -24); p(4, 4, 1, core, 0, 2, -26.5); p(2, 2, 1, hot, 0, 2, -26.5); // emitter and its lens
    for (const y of [-1, 5]) p(4, 1, 3, druby, 0, y, -27.5); // prongs above and below the lens
    p(4, 3, 1, druby, 0, 3, 2.5); p(2, 1, 1, core, 0, 3, 2.5); // a back plate with a glowing charge light
    p(4, 2, 14, wine, 0, -2.5, -7); // frame
    p(1, 1, 4, dark, 0, -6, -8); p(1, 2, 1, dark, 0, -4.5, -10.5); p(1, 2, 1, mat(0x777777), 0, -4.5, -7.5); // trigger guard and trigger
    p(4, 3, 4, wine, 0, -5, -3); p(4, 3, 4, wine, 0, -8, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -10, -2); mg(2, 6, 2, core, 0, -6.5, -2); // power cell up inside the grip
    return { muzzle: [2, -29], grip: [4, 7, 5, 0, -6.5, -2.5], fore: null, bands: [-20.5, -24.5], band: [6, 7, 2], holo: [9.5, -6], mag };
  },
  paragon({ p, mat, dark, glow, sub, at }) {
    const navy = mat(0x1d2a58), blue = mat(0x2f62d6), white = mat(0xe6edf8), cell = glow(0x4aa8ff), hot = glow(0xd2ecff);
    p(4, 6, 10, navy, 0, -1, 5); p(4, 9, 2, blue, 0, -1.5, 11); p(4, 2, 6, white, 0, 3, 4); // stock, butt plate, cheek rest
    p(6, 6, 18, blue, 0, 0, -9); p(4, 1, 18, white, 0, 3.5, -9); // receiver and its white top
    p(4, 4, 28, navy, 0, .5, -32); p(6, 2, 22, cell, 0, .5, -33); // barrel, glowing rails down both sides
    for (const z of [-31, -36, -41]) p(6, 6, 2, blue, 0, .5, z); // coils
    p(6, 5, 10, blue, 0, -.5, -23); for (const z of [-20.5, -23.5, -26.5]) p(6, 1, 1, cell, 0, -1, z); // handguard and its glowing vents
    p(6, 6, 4, navy, 0, .5, -47); p(2, 2, 1, hot, 0, .5, -49.5); // muzzle and its lens
    p(4, 4, 18, navy, 0, 7, -10); p(6, 6, 2, blue, 0, 7, -1); p(6, 6, 2, blue, 0, 7, -19); // scope tube and bells
    p(4, 4, 1, glow(0x8fd0ff), 0, 7, -18.5); p(4, 4, 1, 0, 0, 7, -19.5); // lens, set back in the bell so it has a rim
    p(4, 4, 1, mat(0x24467a), 0, 7, -1.5); p(4, 4, 1, 0, 0, 7, -.5); p(1, 1, 1, mat(0xc4e6ff), -1.5, 8.5, -1.5); // eyepiece glass and its glint
    p(2, 2, 2, dark, 0, 4, -5); p(2, 2, 2, dark, 0, 4, -15); // scope mounts
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 7, 5, navy, 0, -6.5, -13); mg(4, 3, 3, cell, 0, -6.5, -13); // energy cell with a glowing window
    p(4, 5, 4, navy, 0, -5.5, -2); p(4, 3, 4, navy, 0, -9.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 3, 1, dark, 0, -4.5, -8.5); p(1, 2, 1, mat(0xaaaaaa), 0, -4, -5.5); // guard and trigger
    return { muzzle: [.5, -50], grip: [4, 8, 5, 0, -7, -1.5], fore: [6, 5, 10, 0, -.5, -23], bands: [-6, -10], band: [8, 7, .5], mag };
  },
  heatray({ p, mat, dark, glow, sub, at }) {
    const cop = mat(0xb5652b), dcop = mat(0x7e4220), brass = mat(0xc9a43a), steel = mat(0x6e6e74), wood = mat(0x5a3a22);
    p(4, 6, 8, wood, 0, -.5, 4); p(4, 8, 1, mat(0x3a2414), 0, -1, 8.5); // stock and butt
    p(6, 6, 16, cop, 0, 0, -8); p(6, 1, 16, mat(0xd98a4a), 0, 2.5, -8); // body and its lighter top
    for (const z of [-2.5, -13.5]) p(6, 6, 1, dcop, 0, 0, z); // rivet bands
    p(2, 2, 2, dark, 0, 4, -6); p(2, 2, 2, dark, 0, 4, -10); // posts holding the lens up
    for (const z of [-3.5, -12.5]) p(10, 2, 1, brass, 0, 5, z); // lens frame: front and back
    for (const x of [-4.5, 4.5]) p(1, 2, 8, brass, x, 5, -8); // and its sides
    p(8, 1, 8, mat(0xbfe3ee), 0, 5.5, -8); // the magnifying glass
    p(2, 1, 2, glow(0xfff2a8), 0, 5.5, -8); // the spot where it gathers the sunlight
    p(2, 1, 4, glow(0xffd27a), 0, 3.5, -8); // the focused light it pours into the body
    p(4, 4, 14, steel, 0, .5, -23); for (const z of [-18.5, -22, -25.5]) p(8, 8, 1, cop, 0, .5, z); // barrel and its fins
    p(4, 4, 2, dark, 0, .5, -31); p(2, 2, 1, glow(0xffb347), 0, .5, -32.5); // emitter and its glowing tip
    p(4, 4, 4, dcop, 0, -4.5, -1); p(4, 3, 4, dcop, 0, -7.5, 0); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -5); p(1, 2, 1, mat(0x888888), 0, -3.5, -4.5); // guard and trigger
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 5, 4, mat(0x3a3a3a), 0, -5.5, -9); mg(4, 2, 2, glow(0xffd23f), 0, -5.5, -9); // heat cell, with a window glowing out of both sides (spent ones are pulled and swapped)
    p(6, 4, 6, dark, 0, -5, -14); // front handle under the barrel's root
    return { muzzle: [.5, -33], grip: [4, 7, 4, 0, -6, -.5], fore: [6, 4, 6, 0, -5, -14], bands: [-6, -10], band: [8, 7, -.5], mag };
  },
  hornet({ p, mat, dark, glow, sub, at }) {
    const blk = mat(0x26241f), yel = mat(0xf2b818), wing = mat(0xbcd8ea);
    p(2, 2, 9, blk, 0, 2, 4.5); p(2, 2, 9, blk, 0, -3, 4.5); p(4, 9, 3, blk, 0, -.5, 10.5); p(4, 4, 3, yel, 0, -3, 10.5); // open stock, yellow pad
    p(6, 7, 13, blk, 0, .5, -6.5); p(6, 2, 9, yel, 0, -1, -6.5); // the thorax and its stripe
    for (const s of [-1, 1]) for (const [y, z0, z1] of [[4, -5, 3], [5, -6, 5], [6, -6, 6], [7, -5, 6], [8, -3, 5]]) p(1, 1, z1 - z0, wing, s * 2.5, y + .5, (z0 + z1) / 2); // wings, folded back
    p(4, 1, 4, blk, 0, 4.5, -8); p(4, 4, 5, blk, 0, 7, -8.5); p(4, 4, 1, glow(0xffc93a), 0, 7, -10.5); p(2, 2, 5, 0, 0, 7, -8.5); // a ring sight with a glowing rim
    p(6, 6, 3, yel, 0, 0, -14.5); p(6, 6, 2, blk, 0, 0, -17); p(6, 6, 3, yel, 0, 0, -19.5); // the abdomen, striped
    p(4, 4, 2, blk, 0, 0, -22); p(4, 4, 2, yel, 0, 0, -24); p(4, 4, 2, blk, 0, 0, -26); p(2, 2, 7, blk, 0, 0, -30.5); // narrowing to the stinger
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 5, blk, 0, -5, -10.5); mg(4, 4, 5, yel, 0, -9, -11.5); mg(4, 1, 5, blk, 0, -11.5, -11.5); // a curved mag
    p(4, 4, 4, blk, 0, -5, -2); p(4, 3, 4, blk, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [0, -34], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 8, 0, 0, -17], bands: [-11, -1], band: [8, 9, .5], holo: [7, -8.5], mag };
  },
  salvo({ p, mat, dark, glow, sub, at }) {
    const red = mat(0xc8242b), lit = mat(0xe24a46), dred = mat(0x8e1820), blk = mat(0x1e1d21), nose = mat(0xe4ded2);
    p(12, 12, 56, red, 0, 1, 2); // four tubes in a block
    for (const y of [-4.5, 1.5]) p(12, 1, 56, lit, 0, y + 4, 2); for (const y of [-3.5, 2.5]) p(12, 1, 56, dred, 0, y, 2); // lit tops and dark bottoms, so they look round
    p(2, 12, 51, blk, 0, 1, 2.5); p(12, 2, 51, blk, 0, 1, 2.5); // black seams between them
    p(16, 16, 3, blk, 0, 1, -24.5); p(14, 14, 2, blk, 0, 1, -11); p(14, 14, 3, blk, 0, 1, 1.5); p(16, 16, 2, blk, 0, 1, 29); // a flared muzzle, two bands, a flared back
    for (const x of [-3, 3]) for (const y of [-2, 4]) { p(4, 4, 3, 0, x, y, -24.5); p(4, 4, 2, 0, x, y, 29); } // the tubes' mouths, front and back
    p(4, 4, 6, blk, 0, 9, -4); p(2, 2, 1, glow(0xff3b30), 0, 9, -7.5); // sight with a red lens
    p(6, 2, 24, blk, 0, -6, -4); // rail under the tubes
    p(4, 5, 4, blk, 0, -9.5, -4); p(4, 3, 4, blk, 0, -13.5, -3); // grip
    p(1, 1, 6, dark, 0, -10.5, -9); p(1, 2, 1, mat(0x888888), 0, -8, -8.5); // guard and trigger
    p(4, 8, 4, blk, 0, -11, -14); // front grip
    p(8, 3, 10, blk, 0, -6.5, 20); // shoulder rest
    const rounds = [[3, -2], [-3, -2], [3, 4], [-3, 4]].map(([x, y]) => { const r = sub(x, y, 0); at(r)(4, 4, 6, nose, 0, 0, -26.5); return r; }); // a rocket in each tube, the top ones fire first
    return { muzzle: [1, -30], grip: [4, 8, 5, 0, -11, -3.5], fore: [4, 8, 4, 0, -11, -14], bands: [8, 12], band: [14, 14, 1], rounds };
  },
  apex({ p, mat, dark, glow, sub, at }) {
    const wht = mat(0xe8edf3), gry = mat(0xb4bfcc), blk = mat(0x18191d), eye = glow(0x22ccff);
    const slash = (m, w, y, z) => { for (let t = 0; t < 4; t++) p(w, 1, 1, m, 0, y + t + .5, z - t - .5); }; // a stripe, up and forward
    p(4, 6, 10, wht, 0, -1, 5); p(4, 8, 2, blk, 0, -1, 11); p(4, 2, 6, gry, 0, 3, 4); // stock, butt pad, cheek rest
    for (const z of [5, 9]) slash(blk, 4, -3, z);
    p(6, 6, 18, wht, 0, 0, -9); p(6, 6, 12, wht, 0, 0, -24); for (const z of [-1, -6, -11, -16, -21, -26]) slash(blk, 6, -2, z); // receiver, handguard, stripes
    p(4, 1, 18, dark, 0, 3.5, -9); // top rail
    p(4, 4, 18, blk, 0, 6, -11); p(6, 6, 2, gry, 0, 6, -1); p(6, 6, 2, gry, 0, 6, -21); // scope tube and bells
    p(4, 4, 1, eye, 0, 6, -20.5); p(4, 4, 1, 0, 0, 6, -21.5); // icy lens, set back in its bell
    p(4, 4, 1, mat(0x1d5f68), 0, 6, -1.5); p(4, 4, 1, 0, 0, 6, -.5); p(1, 1, 1, mat(0xd2ffff), -1.5, 7.5, -1.5); // eyepiece glass and its glint
    p(2, 2, 2, dark, 0, 3, -6); p(2, 2, 2, dark, 0, 3, -16); // scope mounts
    p(4, 4, 14, mat(GUN_STEEL), 0, 1, -37); // barrel
    p(6, 6, 6, gry, 0, 1, -47); p(6, 2, 1, 0, 0, 1, -47.5); p(6, 2, 1, 0, 0, 1, -45.5); // muzzle brake, slotted
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, blk, 0, -7, -11.5); mg(4, 1, 5, eye, 0, -8.5, -11.5); // box mag with a glowing band
    p(4, 4, 4, blk, 0, -5, -2); p(4, 3, 4, blk, 0, -8.5, -1); // pistol grip
    p(1, 1, 5, dark, 0, -6.5, -6.5); p(1, 2, 1, mat(0x666666), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -50], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 12, 0, 0, -24], bands: [-6, -15], band: [8, 8, 0], mag };
  },
  tracker({ p, mat, dark, glow, sub, at }) {
    const gph = mat(0x2e323a), lgph = mat(0x4a515d), yel = mat(0xffc21a), tip = glow(0xffd84a);
    p(4, 5, 16, gph, 0, 2.5, -8); p(4, 1, 16, lgph, 0, 5.5, -8); p(4, 1, 11, yel, 0, 2.5, -9.5); // slide, its lighter top, a yellow stripe
    p(6, 6, 6, yel, 0, 3, -19); p(8, 8, 1, dark, 0, 3, -18); p(4, 4, 1, 0, 0, 3, -21.5); p(2, 2, 2, tip, 0, 3, -22); // the dart barrel and its collar, a dart's glowing tip poking out
    p(2, 3, 1, glow(0x7a5a14), 0, 3.5, -.5); p(1, 1, 1, glow(0xfff0a0), .5, 4, -.5); // a little tracking screen on the back, with a blip
    p(1, 4, 1, dark, -1.5, 8, -2); p(1, 1, 1, glow(0xff5a3a), -1.5, 10.5, -2); // antenna and its light
    p(4, 2, 13, dark, 0, -1, -6.5); // frame
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, gph, 0, -3.5, -3); p(4, 3, 4, gph, 0, -6.5, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, yel, 0, -8.5, -2); mg(2, 6, 2, yel, 0, -5, -2); // a clip of darts up the grip
    return { muzzle: [3, -23], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-11, -14], band: [6, 7, 2.5], mag };
  },
  tempest({ p, mat, dark, glow, sub, at }) {
    const navy = mat(0x2a2542), lnavy = mat(0x463d6e), silv = mat(0xc9cedb), glass = mat(0x8e9bd0), bolt = glow(0xb69bff), hot = glow(0xf3eeff);
    p(4, 6, 8, navy, 0, -.5, 4); p(4, 8, 1, dark, 0, -1, 8.5); // stock and butt
    p(6, 6, 16, navy, 0, 0, -8); p(6, 1, 16, lnavy, 0, 2.5, -8); // body and its lighter top
    p(6, 4, 12, glass, 0, 5, -8); p(6, 5, 1, silv, 0, 5, -14.5); p(6, 5, 1, silv, 0, 5, -1.5); // a glass storm cell on top, capped
    for (const [y, z] of [[4, -13], [5, -12], [6, -11], [5, -10], [4, -9], [5, -8], [6, -7], [5, -6], [4, -5], [5, -4]]) p(6, 1, 1, bolt, 0, y + .5, z + .5); // lightning zigzagging through it
    p(4, 4, 14, bolt, 0, .5, -22); // the storm's core, glowing between the rings
    p(10, 10, 3, silv, 0, .5, -18); p(8, 8, 3, silv, 0, .5, -22); p(6, 6, 3, silv, 0, .5, -26); // silver rings stepping down along it
    p(6, 6, 3, silv, 0, .5, -31); p(2, 2, 1, hot, 0, .5, -33); // the tip and its white-hot spark
    p(4, 4, 4, navy, 0, -4.5, -1); p(4, 3, 4, navy, 0, -7.5, 0); // pistol grip
    p(1, 1, 4, dark, 0, -5.5, -5); p(1, 2, 1, mat(0x888888), 0, -3.5, -4.5); // guard and trigger
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 5, 4, mat(0x24203a), 0, -5.5, -9); mg(4, 2, 2, bolt, 0, -5.5, -9); // a storm battery with a glowing window
    p(6, 4, 6, dark, 0, -5, -14); // front handle
    return { muzzle: [1, -34], grip: [4, 7, 4, 0, -6, -.5], fore: [6, 4, 6, 0, -5, -14], bands: [-6, -10], band: [8, 7, -.5], mag };
  },
  wisp({ p, mat, dark, glow, sub, at }) {
    const silv = mat(0xd5e2ea), lsilv = mat(0xf4f9fc), slate = mat(0x2b3944), teal = mat(0x2fb3a4), soft = glow(0x5fe8d8), core = glow(0xeafffb);
    p(4, 4, 14, silv, 0, 2, -7); p(4, 1, 14, lsilv, 0, 4.5, -7); p(4, 1, 10, soft, 0, 2.5, -8); // slide, its bright top, a glowing teal seam
    p(2, 1, 3, lsilv, 0, 5.5, -1.5); // a little fin for a rear sight
    p(2, 2, 2, lsilv, 0, 3, 1); p(4, 4, 1, silv, 0, 3, 2.5); p(2, 2, 1, 0, 0, 3, 2.5); // a mouthpiece at the back, like a horn's
    p(6, 6, 2, silv, 0, 2, -15); p(8, 8, 2, silv, 0, 2, -17); p(10, 10, 1, teal, 0, 2, -18.5); p(6, 6, 2, 0, 0, 2, -18); // the horn, flaring out to a teal lip, its mouth hollow
    for (const [w, h, y, m] of [[2, 2, .5, core], [2, 1, 2, core], [1, 1, 3, soft], [1, 1, 4, soft]]) p(w, h, 1, m, 0, y, -16.5); // a little teal flame inside it
    for (const x of [-1.5, 1.5]) p(1, 2, 1, soft, x, 1, -16.5);
    p(4, 2, 13, slate, 0, -1, -6.5); // frame
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x8a96a0), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, slate, 0, -3.5, -3); p(4, 3, 4, slate, 0, -6.5, -2); p(2, 3, 1, 0, 0, -4, -1.5); // grip, with a window in its back
    const spin = sub(0, 2, -12), sp = at(spin); // three wisps circling the barrel, each trailing a little light
    for (let k = 0; k < 3; k++) {
      const a = Math.PI / 2 + k * Math.PI * 2 / 3;
      sp(2, 2, 2, core, Math.round(6 * Math.cos(a)), Math.round(6 * Math.sin(a)), 0);
      for (const t of [.3, .5]) sp(1, 1, 1, soft, Math.floor(6 * Math.cos(a - t)) + .5, Math.floor(6 * Math.sin(a - t)) + .5, .5);
    }
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, soft, 0, -5, -2); // a wisp jar up the grip
    return { muzzle: [2, -19], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-3, -5.5], band: [6, 6, 2], spin, mag };
  },
  voidlantern({ p, mat, glow, sub, at }) { // a lantern on a bail handle: the handle's bar is at the origin, the lantern hangs under it
    const iron = mat(0x3d3556), liron = mat(0x7566a6), diron = mat(0x1c1826), vio = glow(0xb46bff), pale = glow(0xe8d2ff), heart = glow(0x13091f);
    p(18, 2, 2, diron, 0, -1, 0); for (const x of [-8, 8]) p(2, 10, 2, diron, x, -7, 0); // the handle: a bar across the top, down both sides to the roof
    p(6, 4, 4, liron, 0, -1, 0); // its grip
    p(4, 2, 4, diron, 0, -7, 0); p(10, 3, 10, liron, 0, -9.5, 0); p(16, 2, 16, iron, 0, -12, 0); // cap, roof and eaves
    for (const x of [-6, 6]) for (const z of [-6, 6]) p(4, 12, 4, iron, x, -19, z); // corner posts
    p(10, 1, 10, vio, 0, -13.5, 0); p(10, 1, 10, vio, 0, -24.5, 0); // its violet light under the roof and on the floor
    p(16, 2, 16, iron, 0, -26, 0); // floor
    const spin = sub(0, -19, 0), sp = at(spin); // the void inside, turning faster when it fires
    sp(6, 6, 6, heart, 0, 0, 0);
    for (const [x, y, z] of [[0, 4, 1.5], [3.5, -2, -1.5], [-3.5, -2, .5]]) sp(2, 2, 2, vio, x, y, z);
    sp(1, 1, 1, pale, 0, 3.5, -3); sp(1, 1, 1, pale, -3, 1, 3);
    const mag = sub(0, 0, 0), mg = at(mag); mg(10, 1, 10, diron, 0, -27.5, 0); mg(6, 1, 6, vio, 0, -28.5, 0); // the violet cell under the floor
    return { muzzle: [-19, -9], grip: [18, 2, 2, 0, -1, 0], fore: null, bands: [7, -7], band: [16, 2, -12], spin, mag };
  },
  crystal({ p, mat, dark, glow, sub, at, grow }) { // a rifle cut from crystal; more of it grows as its owner levels up (grow 0-5)
    const cry = mat(0x46c6e6), lcry = mat(0xa4ecff), dcry = mat(0x1d86b0), rosy = mat(0xf070c8), rose = glow(0xff7fd4), pale = glow(0xfff2fc);
    p(4, 6, 4, dcry, 0, 0, 2); p(4, 5, 3, cry, 0, -.5, 5.5); p(4, 4, 2, lcry, 0, -1, 8); p(4, 6, 1, dcry, 0, -1, 9.5); // stock: three facets narrowing back, and the butt
    p(6, 6, 16, cry, 0, 0, -8); p(4, 1, 16, lcry, 0, 3.5, -8); // receiver and its pale top
    p(6, 1, 6, lcry, 0, 2.5, -3); p(6, 1, 3, lcry, 0, 1.5, -1.5); p(6, 1, 6, dcry, 0, -2.5, -13); p(6, 1, 3, dcry, 0, -1.5, -14.5); // a light facet and a deep one
    p(6, 1, 11, rose, 0, -.5, -7.5); p(6, 1, 1, pale, 0, 2.5, -9.5); // a rose vein along each side, and a glint
    p(6, 1, 4, dark, 0, 4.5, -10); for (const x of [-2.5, 2.5]) p(1, 4, 2, dark, x, 7, -10); p(6, 1, 2, dark, 0, 9.5, -10); // ring sight
    p(1, 1, 1, rose, .5, 5.5, -8.5); // its emitter
    p(6, 6, 10, dcry, 0, 0, -21); p(4, 1, 10, cry, 0, 3.5, -21); for (const z of [-18.5, -21.5, -24.5]) p(6, 2, 1, rose, 0, 0, z); // handguard with glowing slits
    p(4, 4, 8, lcry, 0, 1, -30); p(6, 6, 2, cry, 0, 1, -33); p(2, 2, 3, pale, 0, 1, -35.5); // barrel, a collar, and the bright point it fires from
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 8, 5, rosy, 0, -7, -10.5); mg(4, 1, 5, pale, 0, -5.5, -10.5); // a rose crystal for a magazine
    p(4, 4, 4, dcry, 0, -5, -2); p(4, 3, 4, dcry, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0xc8f6ff), 0, -4, -5.5); // guard and trigger
    const g = grow | 0, big = g > 2, spin = sub(0, 9 + big, -19), sp = at(spin); // its companion: a little crystal that hovers over the handguard and turns
    sp(2, 6 + 2 * big, 2, pale, 0, 0, 0); sp(4, 2 + 2 * big, 4, rose, 0, 0, 0); if (big) sp(4, 2, 4, glow(0xe0489f), 0, 0, 0);
    // crystals growing out of it. A shard is four columns of light, deep to pale, the tallest one tipped white: [corner x, base y, corner z, height at each stage, colour]
    const AQUA = [0x2fb4e0, 0x6fe0ff, 0xb8f8ff], ROSE = [0xe0489f, 0xff7fd4, 0xffb8ea];
    const shard = (r, x, y, z, h, [deep, mid, light]) => {
      for (const [dx, dz, hh, c] of [[0, 0, h - 2, deep], [1, 0, h - 1, mid], [0, 1, h - 1, mid], [1, 1, h, light]]) if (hh > 0) r(1, hh, 1, glow(c), x + dx + .5, y + hh / 2, z + dz + .5);
      r(1, 1, 1, pale, x + 1.5, y + h - .5, z + 1.5);
    };
    const pulse = [];
    const cluster = list => { const c = sub(0, 0, 0), r = at(c); let any = false; for (const [x, y, z, hs, col] of list) if (hs[g]) { shard(r, x, y, z, hs[g], col); any = true; } if (any) pulse.push(c); };
    cluster([[-1, 2, 5, [3, 4, 4, 5, 5, 6], AQUA], [0, 3, 2, [0, 0, 3, 4, 4, 5], ROSE], [-2, 1, 7, [0, 0, 0, 0, 3, 3], ROSE]]); // on the stock (short: they're right by your eye)
    cluster([[-1, 4, -5, [0, 3, 4, 5, 6, 7], ROSE], [0, 4, -3, [0, 0, 3, 3, 4, 5], AQUA], [-2, 4, -7, [0, 0, 0, 3, 4, 5], AQUA]]); // behind the sight
    cluster([[-1, 3, -29, [0, 0, 4, 5, 7, 8], AQUA], [0, 3, -31, [0, 0, 0, 3, 5, 6], ROSE], [-2, 3, -31, [0, 0, 0, 0, 3, 4], ROSE]]); // on the barrel
    cluster([[-1, 4, -34, [0, 0, 0, 3, 5, 6], ROSE], [1, 4, -34, [0, 0, 0, 0, 3, 4], AQUA], [-3, 4, -34, [0, 0, 0, 0, 0, 4], AQUA]]); // round the muzzle
    return { muzzle: [1, -38], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 6, 10, 0, 0, -21], bands: [-14, -17], band: [8, 8, 0], holo: [7, -10], spin, hover: true, pulse, mag };
  },
  aurora({ p, mat, dark, glow, sub, at }) {
    const navy = mat(0x1a2442), lnavy = mat(0x2e3f6a), silv = mat(0xc9d3e2), tip = glow(0xeafff6), lens = glow(0x9fffd6);
    p(4, 3, 12, navy, 0, 1.5, 6); p(4, 2, 11, navy, 0, -6, 5.5); p(4, 10, 2, lnavy, 0, -2, 12); // an open stock: top bar, bottom bar, butt
    p(6, 6, 16, navy, 0, 0, -8); p(4, 1, 16, silv, 0, 3.5, -8); // receiver and its silver top
    p(4, 4, 16, navy, 0, 7, -9); p(6, 6, 2, lnavy, 0, 7, -1); p(6, 6, 2, lnavy, 0, 7, -17); // scope tube and bells
    p(4, 4, 1, lens, 0, 7, -16.5); p(4, 4, 1, 0, 0, 7, -17.5); // pale green lens, set back in its bell
    p(4, 4, 1, mat(0x24467a), 0, 7, -1.5); p(4, 4, 1, 0, 0, 7, -.5); p(1, 1, 1, mat(0xd8fff0), -1.5, 8.5, -1.5); // eyepiece glass and its glint
    p(2, 2, 2, dark, 0, 4, -5); p(2, 2, 2, dark, 0, 4, -13); // scope mounts
    p(4, 3, 32, silv, 0, 4.5, -32); p(4, 3, 32, silv, 0, -2.5, -32); // twin rails
    const bar = sub(0, 1, -32), br = at(bar); // the light between them, brighter the more it's charged
    for (const [c, len, z] of [[0x4dff9a, 10, 11], [0x3dffd6, 8, 2], [0x4ab8ff, 8, -6], [0xa07bff, 6, -13]]) br(2, 2, len, glow(c), 0, 0, z);
    p(4, 4, 2, lnavy, 0, 1, -17); p(4, 4, 2, lnavy, 0, 1, -46); p(2, 2, 1, tip, 0, 1, -48.5); // braces between the rails, a hot tip
    p(6, 4, 10, navy, 0, -5, -22); // handguard
    const charges = [0x4dff9a, 0x3dffd6, 0x4ab8ff, 0xa07bff].map((c, i) => { // coils of aurora light that brighten as it charges
      const s = sub(0, 0, 0), r = at(s), m = glow(c), z = -30 - i * 4;
      r(8, 2, 2, m, 0, 7, z); r(8, 2, 2, m, 0, -5, z); for (const x of [-3, 3]) r(2, 10, 2, m, x, 1, z);
      return s;
    });
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 7, 5, navy, 0, -6.5, -11); mg(4, 1, 5, glow(0x3dffd6), 0, -8, -11); // box mag with a glowing band
    p(4, 5, 4, navy, 0, -5.5, -2); p(4, 3, 4, navy, 0, -9.5, -1); // pistol grip
    p(1, 1, 5, dark, 0, -6.5, -5.5); p(1, 2, 1, mat(0xaaaaaa), 0, -4, -4.5); // guard and trigger
    return { muzzle: [1, -49], grip: [4, 8, 5, 0, -7, -1.5], fore: [6, 4, 10, 0, -5, -22], bands: [-6, -12], band: [8, 8, 0], charges, bar, mag };
  },
  // the titanium set: polished silver (shine), dark gunmetal, anodized blue light
  tishot({ p, mat, dark, glow, shine, sub, at }) {
    const ti = shine(0xbcc6d2), lti = shine(0xe9eff5), gm = mat(0x363c46), blue = glow(0x4f9dff);
    p(4, 6, 8, gm, 0, 0, 4); p(4, 8, 2, ti, 0, -1, 9); // stock and a titanium butt plate
    p(6, 8, 14, ti, 0, 0, -7); p(4, 1, 14, lti, 0, 4.5, -7); p(6, 1, 10, blue, 0, -1.5, -7); // tall receiver, its bright top, a blue seam
    p(6, 6, 22, ti, 0, 1, -25); for (const z of [-18, -22, -26, -30]) p(6, 1, 2, 0, 0, 3.5, z); // barrel shroud, notched along the top
    p(6, 6, 2, gm, 0, 1, -37); p(1, 1, 1, mat(0xdddddd), 0, 4.5, -35.5); // dark muzzle, bead sight
    p(6, 3, 12, gm, 0, -3.5, -24); // handguard
    const mag = sub(0, 0, 0), mg = at(mag); mg(8, 8, 6, gm, 0, -8, -9); mg(8, 2, 6, blue, 0, -8, -9); // a drum of shells with a blue band
    p(4, 4, 4, gm, 0, -6, -2); p(4, 3, 4, gm, 0, -9.5, -1); // pistol grip
    p(1, 1, 2, dark, 0, -7.5, -5); p(1, 2, 1, mat(0x777777), 0, -5, -4.5); // guard (closed by the drum) and trigger
    return { muzzle: [1, -38], grip: [4, 7, 5, 0, -7.5, -1.5], fore: [6, 3, 12, 0, -3.5, -24], bands: [-32, -35], band: [8, 8, 1], mag };
  },
  daybreak({ p, mat, dark, glow, sub, at }) {
    const sun = mat(0xf0a030), hi = mat(0xffd070), rose = mat(0xe8603c), iv = mat(0xf3e6c8), div = mat(0xcbb890), ray = glow(0xfff0a0);
    p(4, 4, 13, sun, 0, 3, -16.5); p(4, 1, 13, hi, 0, 4.5, -16.5); // a long barrel, lit along the top
    p(2, 2, 9, dark, 0, 0, -14.5); p(2, 1, 1, dark, 0, 5.5, -22.5); // ejector rod, front sight
    p(4, 11, 3, sun, 0, 1.5, -.5); p(4, 1, 8, sun, 0, 6.5, -6); p(4, 3, 10, sun, 0, -2.5, -6); // the frame: behind the cylinder, over it and under it
    p(2, 2, 2, dark, 0, 8, 1); // hammer
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 7, 8, rose, 0, 2.5, -6); for (const y of [.5, 4.5]) mg(6, 1, 6, sun, 0, y, -6); // the cylinder and its flutes (it swings out to reload)
    mg(6, 1, 4, ray, 0, 2.5, -6); mg(6, 3, 2, ray, 0, 2.5, -6); // a little sun on each side
    p(1, 1, 5, dark, 0, -6.5, -7.5); p(1, 2, 1, dark, 0, -5, -9.5); p(1, 2, 1, mat(0x777777), 0, -5, -6.5); // guard and trigger
    p(4, 3, 5, iv, 0, -5.5, -3.5); p(4, 3, 5, iv, 0, -8.5, -2.5); p(4, 2, 6, div, 0, -11, -2); // a curved ivory grip
    return { muzzle: [3, -23], grip: [4, 7, 6, 0, -7.5, -3], fore: null, bands: [-13, -17], band: [6, 6, 3], mag };
  },
  highnoon({ p, mat, dark, glow, sub, at }) {
    const wood = mat(0x8a5a32), dwood = mat(0x5c3a1e), brass = mat(0xe0a83c), hi = mat(0xffd070), tube = mat(0x4a4a4e), ray = glow(0xfff0a0);
    p(4, 5, 12, wood, 0, -.5, 6); p(4, 5, 1, dwood, 0, -.5, 12.5); p(4, 5, 4, wood, 0, -5.5, 2); // a straight stock, its butt plate, a grip under it
    p(6, 7, 10, brass, 0, 1.5, -5); p(6, 1, 10, hi, 0, 4.5, -5); // brass receiver, lit along the top
    p(6, 3, 1, ray, 0, .5, -5.5); p(6, 1, 3, ray, 0, .5, -5.5); // the sun on its side
    p(2, 2, 2, dark, 0, 6, -1); p(2, 1, 1, dark, 0, 5.5, -11.5); p(2, 2, 1, dark, 0, 6, -41.5); // hammer, rear sight, front sight
    p(4, 4, 32, mat(GUN_STEEL), 0, 3, -26); p(4, 3, 26, tube, 0, -.5, -23); // a long barrel, the magazine tube under it
    p(6, 5, 12, wood, 0, -.5, -16); p(6, 7, 1, brass, 0, 1.5, -35.5); // forend, muzzle band
    p(1, 1, 4, dark, 0, -4.5, -5); p(1, 2, 1, dark, 0, -3, -7.5); p(1, 2, 1, mat(0x777777), 0, -3, -4.5); // guard and trigger
    const mag = sub(0, 0, 0), mg = at(mag); mg(1, 1, 3, dark, 0, -4.5, -1.5); mg(1, 3, 1, dark, 0, -6.5, -1.5); mg(1, 1, 6, dark, 0, -8.5, 1); mg(1, 5, 1, dark, 0, -5.5, 4.5); // the lever: a loop round the grip (worked at the end of a reload)
    return { muzzle: [3, -42], grip: [4, 7, 7, 0, -5.5, 1.5], fore: [6, 5, 12, 0, -.5, -16], bands: [-26, -30], band: [6, 7, 1.5], mag };
  },
  cutlass({ p, mat, glow }) {
    const steel = mat(0x9fc4c0), edge = mat(0xe4f6f2), gold = mat(0xd9a520), lgold = mat(0xffd76a), wrap = mat(0x6a2a2a), weed = mat(0x2f8f5a), sea = glow(0x4fe0d0);
    p(4, 4, 12, wrap, 0, 1, 4); for (const z of [.5, 4.5, 8.5]) p(4, 4, 1, mat(0x3c1414), 0, 1, z); // grip and its wraps
    p(6, 6, 4, gold, 0, 1, 12); // pommel
    p(6, 14, 4, gold, 0, -2, -4); p(6, 2, 4, lgold, 0, 4, -4); // a deep guard
    p(4, 4, 20, gold, 0, -7, 4); p(4, 3, 4, gold, 0, -3.5, 12); // and its knuckle bow, round under the hand to the pommel
    for (const [h, d, y, z] of [[8, 7, 2, -9.5], [8, 7, 3, -16.5], [9, 7, 4.5, -23.5], [10, 7, 6, -30.5], [10, 6, 8, -37], [9, 5, 9.5, -42.5], [7, 4, 11.5, -47]]) { // a broad blade that curves up as it widens
      p(2, h, d, steel, 0, y, z); p(2, 1, d, edge, 0, y - h / 2 + .5, z); p(2, 1, d, sea, 0, y - h / 2 + 4.5, z); // a bright edge, the sea still glowing in its fuller
    }
    p(2, 4, 3, edge, 0, 14, -50.5); // clipped point
    p(4, 8, 4, weed, 0, 2, -11); // weed caught round it
    return { muzzle: [14, -52], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  harpoon({ p, mat, dark, glow, sub, at }) {
    const teal = mat(0x2f7f86), lteal = mat(0x5fb8b8), brass = mat(0xc9963a), hi = mat(0xf0c868), wood = mat(0x7a4a2a), dwood = mat(0x4f2e18), rope = mat(0xe8dcb8), steel = mat(0xc8d4d8), sea = glow(0x4fe0d0);
    p(4, 4, 34, teal, 0, 2, -17); p(4, 1, 34, lteal, 0, 3.5, -17); // a long launch tube, lit along the top
    p(6, 6, 12, brass, 0, 2, 2); p(6, 1, 12, hi, 0, 4.5, 2); p(6, 2, 4, sea, 0, 2, 2); // brass receiver, a window on the pressure inside
    p(4, 5, 10, wood, 0, .5, 13); p(4, 7, 2, dwood, 0, .5, 19); // stock and butt
    p(6, 5, 8, wood, 0, .5, -9); p(6, 6, 2, brass, 0, 2, -32); // forend, muzzle collar
    p(2, 2, 1, dark, 0, 6, -31.5); p(2, 1, 1, dark, 0, 5.5, 6.5); // sights
    p(6, 6, 6, rope, 0, -3, -19); p(8, 4, 4, brass, 0, -3, -19); // the reel under the tube, its line wound on
    p(4, 6, 4, wood, 0, -4, 0); p(4, 3, 4, dwood, 0, -8.5, 1); // grip
    p(1, 1, 5, dark, .5, -4.5, -4.5); p(1, 2, 1, dark, .5, -3, -7.5); p(1, 2, 1, mat(0x777777), .5, -2, -3.5); // guard and trigger
    const round = sub(0, 0, 0), r = at(round); // the harpoon: shaft, swept barbs, point
    r(2, 2, 12, steel, 0, 2, -39); r(4, 8, 3, steel, 0, 2, -45.5); r(4, 6, 2, steel, 0, 2, -48); r(4, 4, 2, mat(0xf2f8fa), 0, 2, -50);
    const mag = sub(0, 0, 0), mg = at(mag); mg(2, 2, 4, dark, 4, 2, 5); // cocking handle on the side
    return { muzzle: [2, -34], grip: [4, 7, 5, 0, -5.5, .5], fore: [6, 5, 8, 0, .5, -9], bands: [-25, -28], band: [6, 6, 2], round, mag };
  },
  conch({ p, mat, glow, sub, at }) {
    const shell = mat(0xf6dcb8), hi = mat(0xfff2d8), peach = mat(0xe8905e), coral = mat(0xe2584a), dcoral = mat(0xb03a34), sea = glow(0x3fc8ec), foam = glow(0xf0ffff);
    p(12, 12, 10, shell, 0, 3, -7); for (const z of [-10.5, -7.5, -4.5]) p(12, 12, 1, peach, 0, 3, z); // the big whorl, banded
    p(14, 3, 3, peach, 0, 8.5, -13.5); p(14, 3, 3, peach, 0, -2.5, -13.5); for (const sd of [-1, 1]) p(3, 8, 3, peach, sd * 5.5, 3, -13.5); // its flared lip, open at the front
    p(8, 8, 1, sea, 0, 3, -11.5); p(4, 1, 1, foam, -1, 5.5, -11.5); p(3, 1, 1, foam, 1.5, 2.5, -11.5); // and full of sea, a little foam on it
    p(8, 8, 5, shell, 0, 3, .5); p(8, 8, 1, peach, 0, 3, .5); // a whorl winding back
    p(4, 2, 3, hi, 0, 10, -9.5); p(4, 2, 3, hi, 0, 10, -4.5); p(4, 2, 3, hi, 0, 8, .5); // spines along its crown
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 4, 5, shell, 0, 3, 5.5); mg(4, 4, 1, peach, 0, 3, 5.5); mg(2, 2, 2, hi, 0, 3, 9); // the spire (it comes off to fill it)
    p(4, 3, 4, coral, 0, -4.5, -5); p(4, 3, 4, coral, 0, -7.5, -4); p(4, 2, 4, dcoral, 0, -10, -4); // a coral branch for a handle
    return { muzzle: [3, -13], grip: [4, 7, 5, 0, -6.5, -4.5], fore: null, bands: [4.5, 6.5], band: [6, 6, 3], mag };
  },
  tipistol({ p, mat, dark, glow, shine, sub, at }) {
    const ti = shine(0xbcc6d2), lti = shine(0xe9eff5), gm = mat(0x363c46), blue = glow(0x4f9dff);
    p(4, 5, 18, ti, 0, 2.5, -9); p(4, 1, 18, lti, 0, 5.5, -9); p(4, 1, 10, blue, 0, 2.5, -9); // long slide, its bright top, a blue line down each side
    p(6, 7, 5, ti, 0, 2.5, -20.5); for (const z of [-19.5, -21.5]) p(6, 1, 1, 0, 0, 5.5, z); p(2, 2, 1, 0, 0, 3, -22.5); // a big ported compensator and its bore
    p(2, 1, 1, dark, 0, 6.5, -1.5); // rear sight
    p(4, 2, 14, gm, 0, -1, -8); p(4, 2, 6, gm, 0, -3, -13); // frame, a weight under the barrel
    p(1, 1, 4, dark, 0, -4.5, -7); p(1, 2, 1, dark, 0, -3, -9.5); p(1, 2, 1, mat(0x777777), 0, -3, -6.5); // trigger guard and trigger
    p(4, 3, 4, gm, 0, -3.5, -3); p(4, 3, 4, gm, 0, -6.5, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -8.5, -2); mg(2, 6, 2, blue, 0, -5, -2); // magazine, lit up inside the grip
    return { muzzle: [3, -23], grip: [4, 7, 5, 0, -5.5, -2.5], fore: null, bands: [-12, -15], band: [6, 7, 2.5], mag };
  },
  tisword({ p, mat, glow, shine }) {
    const ti = shine(0xbcc6d2), lti = shine(0xe9eff5), gm = mat(0x363c46), blue = glow(0x4f9dff);
    p(4, 4, 16, gm, 0, 1, 4); for (const z of [4.5, 9.5]) p(4, 4, 1, blue, 0, 1, z); // long grip with two blue rings
    p(6, 6, 3, ti, 0, 1, 13.5); // pommel
    p(4, 12, 3, ti, 0, 1, -5.5); p(6, 4, 3, gm, 0, 1, -5.5); // guard
    p(2, 8, 30, ti, 0, 2, -22); p(2, 1, 30, lti, 0, 5.5, -22); p(2, 1, 29, blue, 0, -1.5, -21.5); // a broad single-edged blade: bright spine, glowing edge (stopping where the tip's outline starts)
    p(2, 6, 3, ti, 0, 3, -38.5); p(2, 4, 2, ti, 0, 4, -41); p(2, 2, 2, lti, 0, 5, -43); // the edge sweeps up to the point
    return { muzzle: [5, -44], grip: [6, 6, 18, 0, 1, 5], fore: null, bands: [-1.5, 1.5], band: [6, 6, 1] };
  },
  tisaw({ p, mat, dark, glow, shine, sub, at }) {
    const ti = shine(0xbcc6d2), lti = shine(0xe9eff5), gm = mat(0x363c46), blue = glow(0x4f9dff);
    p(4, 6, 8, gm, 0, 0, 4); p(4, 8, 2, ti, 0, -1, 9); // stock, butt plate
    p(6, 6, 16, ti, 0, 0, -8); p(4, 1, 16, lti, 0, 3.5, -8); p(6, 1, 10, blue, 0, -.5, -8); // receiver, bright top, blue seam
    p(10, 2, 16, ti, 0, 2, -24); p(6, 4, 14, gm, 0, -1, -23); p(2, 1, 2, gm, 0, 3.5, -25); // a wide tray for the blade, the handguard under it, the spindle
    const spin = sub(0, 5, -25), sp = at(spin); // the saw blade lying on the tray, always turning
    sp(6, 2, 12, lti, 0, 0, 0); sp(10, 2, 8, lti, 0, 0, 0); sp(12, 2, 4, lti, 0, 0, 0); for (const k of [-6.5, 6.5]) { sp(2, 2, 1, gm, 0, 0, k); sp(1, 2, 2, gm, k, 0, 0); } sp(2, 1, 2, blue, 0, 1.5, 0); // teeth at the four points, a blue hub
    const mag = sub(0, 0, 0), mg = at(mag); mg(6, 7, 6, gm, 0, -6.5, -11); for (const y of [-5.5, -8.5]) mg(6, 1, 6, blue, 0, y, -11); // a stack of blades
    p(4, 4, 4, gm, 0, -5, -2); p(4, 3, 4, gm, 0, -8.5, -1); // pistol grip
    p(1, 1, 4, dark, 0, -6.5, -6); p(1, 2, 1, mat(0x777777), 0, -4, -5.5); // guard and trigger
    return { muzzle: [5, -33], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 4, 14, 0, -1, -23], bands: [-3, -13], band: [8, 8, 0], spin, flat: true, mag };
  },
  tisniper({ p, mat, dark, glow, shine, sub, at }) {
    const ti = shine(0xbcc6d2), lti = shine(0xe9eff5), gm = mat(0x363c46), blue = glow(0x4f9dff);
    p(4, 6, 12, gm, 0, -1, 6); p(4, 8, 2, ti, 0, -1, 13); p(4, 2, 7, ti, 0, 3, 4.5); // stock, butt plate, cheek rest
    p(6, 6, 18, ti, 0, 0, -9); p(2, 2, 2, ti, 4, 1, -3); // receiver, bolt knob
    p(6, 4, 14, gm, 0, -1, -25); p(4, 2, 16, ti, 0, -2, -40); for (const z of [-36, -40, -44]) p(4, 1, 2, 0, 0, -2.5, z); // forend, a vented shield under the barrel
    p(4, 4, 32, lti, 0, 1, -34); p(6, 6, 5, gm, 0, 1, -52.5); for (const z of [-51.5, -53.5]) p(6, 2, 1, 0, 0, 1, z); // long barrel, a slotted brake
    p(4, 1, 18, dark, 0, 3.5, -9); // top rail
    p(4, 4, 20, gm, 0, 6, -11); p(6, 6, 2, ti, 0, 6, -1); p(6, 6, 4, ti, 0, 6, -21); // scope tube, eyepiece bell, a long front bell
    p(4, 4, 2, 0, 0, 6, -22); p(4, 4, 1, blue, 0, 6, -20.5); // blue lens, set well back
    p(4, 4, 1, mat(0x1b3a66), 0, 6, -1.5); p(4, 4, 1, 0, 0, 6, -.5); p(1, 1, 1, mat(0xdaf0ff), -1.5, 7.5, -1.5); // eyepiece glass and its glint
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 6, 5, gm, 0, -6, -11.5); mg(4, 1, 5, blue, 0, -7.5, -11.5); // box mag with a blue band
    p(4, 4, 4, gm, 0, -5, -2); p(4, 3, 4, gm, 0, -8.5, -1); // pistol grip
    p(1, 1, 5, dark, 0, -6.5, -6.5); p(1, 2, 1, mat(0xaaaaaa), 0, -4, -5.5); // guard and trigger
    return { muzzle: [1, -56], grip: [4, 7, 5, 0, -6.5, -1.5], fore: [6, 4, 14, 0, -1, -25], bands: [-6, -15], band: [8, 8, 0], mag };
  },
  tirocket({ p, mat, dark, glow, shine, sub, at }) {
    const ti = shine(0xbcc6d2), lti = shine(0xe9eff5), gm = mat(0x363c46), blue = glow(0x4f9dff);
    p(8, 12, 50, ti, 0, 1, 3); p(8, 1, 50, lti, 0, 6.5, 3); p(8, 2, 46, gm, 0, 1, 3.5); // two tubes, one over the other: a bright top, a dark seam between
    p(10, 14, 3, gm, 0, 1, -22.5); p(10, 14, 2, gm, 0, 1, 29); p(10, 14, 2, blue, 0, 1, -8); p(10, 14, 2, gm, 0, 1, 14); p(4, 3, 8, gm, 0, 8.5, -8); // flared ends, a blue band, a dark one, a sight block
    for (const y of [-2, 4]) { p(4, 4, 3, 0, 0, y, -22.5); p(4, 4, 2, 0, 0, y, 29); } // the tubes' mouths, front and back
    p(4, 2, 22, gm, 0, -6, -5); // rail under the tubes
    p(4, 5, 4, gm, 0, -9.5, -4); p(4, 3, 4, gm, 0, -13.5, -3); // grip
    p(1, 1, 6, dark, 0, -10.5, -9); p(1, 2, 1, mat(0x888888), 0, -8, -8.5); // guard and trigger
    p(4, 8, 4, gm, 0, -11, -14); // front grip
    p(6, 3, 10, gm, 0, -6.5, 20); // shoulder rest
    const rounds = [-2, 4].map(y => { const r = sub(0, y, 0); at(r)(4, 4, 6, mat(0x4f8fe0), 0, 0, -24); return r; }); // a rocket in each tube, the top one fires first
    return { muzzle: [1, -28], grip: [4, 8, 5, 0, -11, -3.5], fore: [4, 8, 4, 0, -11, -14], bands: [8, 12], band: [10, 14, 1], rounds };
  },
  balisong({ p, mat, sub, at }) { // a butterfly knife: the blade and the bite handle turn on their pins (flips)
    const vio = mat(0x7a4fd0), dvio = mat(0x35215e), seam = mat(0x4a2e86), steel = mat(0xaeb6c0), lsteel = mat(0xd2d8df), edge = mat(0xf2f5f9), brass = mat(0xd9a520);
    const handle = (P, h, y, slot, pin) => { P(4, h, 17, vio, 0, y, 8.5); for (const z of [5, 9, 13]) P(4, 1, 2, dvio, 0, slot, z); P(4, h, 1, steel, 0, y, 16.5); P(4, 1, 1, brass, 0, pin, 1.5); }; // skeleton slots, a steel end, a brass pin by the pivot
    handle(p, 4, 2, 2.5, 1.5); p(4, 1, 15, seam, 0, .5, 8.5); // the safe handle stays in your hand, dark where the two meet
    const blade = sub(0, 0, 0, [0, 2, .5]), bite = sub(0, 0, 0, [0, -1.5, .5]), B = at(blade); // each turns on its pin
    B(2, 5, 1, steel, 0, .5, -.5); B(2, 2, 12, steel, 0, 2, -7); B(2, 1, 12, lsteel, 0, .5, -7); B(2, 2, 12, edge, 0, -1, -7); // tang, then steel, a lighter grind and a bright edge
    B(2, 4, 1, lsteel, 0, 0, -13.5); B(2, 2, 1, edge, 0, -1, -13.5); B(2, 3, 1, edge, 0, -.5, -14.5); // a clipped point, short enough to close inside the handles
    handle(at(bite), 3, -1.5, -1.5, -1.5);
    return { muzzle: [0, -15], grip: [6, 9, 12, 0, .5, 9], fore: null, bands: [3, 14], band: [6, 6, 2], flips: [blade, bite] };
  },
  quasar({ p, mat, dark, glow, sub, at }) { // a ray pistol with a little quasar for a heart: a disc spinning round a white-hot core, and a barrel ringed in green
    const hull = mat(0x241f3d), plate = mat(0x3d3666), lilac = mat(0x7a6cc8), lime = glow(0x8aff3a), soft = glow(0xc8ff8a), hot = glow(0xeaffd2);
    p(6, 7, 15, plate, 0, 2, -4.5); p(4, 1, 15, lilac, 0, 6.5, -4.5); p(2, 1, 15, lime, 0, 6.5, -4.5); // the body, its light top and a green line feeding the core
    p(6, 1, 12, lime, 0, 2, -5); p(4, 5, 1, lilac, 0, 2, 3.5); // a green line down each side, the back plate
    p(4, 1, 4, hull, 0, 6.5, -7); p(4, 1, 4, soft, 0, 7.5, -7); p(2, 2, 2, hot, 0, 9, -7); // the core on its seat, white-hot
    const spin = sub(0, 7, -7), sp = at(spin); // the disc: three arms of light curling round it
    for (let x = -6; x < 6; x++) for (let z = -6; z < 6; z++) {
      const cx = x + .5, cz = z + .5, r = Math.hypot(cx, cz); if (r < 2.4 || r > 6.3) continue;
      if (((Math.atan2(cz, cx) / (Math.PI * 2) * 3 + r * .2) % 1 + 1) % 1 < .42) sp(1, 1, 1, r < 4 ? soft : lime, cx, .5, cz);
    }
    p(4, 4, 10, plate, 0, 2, -17); for (const z of [-14.5, -18.5]) p(6, 6, 1, lime, 0, 2, z); // barrel, ringed in green light
    p(6, 6, 3, plate, 0, 2, -23.5); p(4, 1, 3, lilac, 0, 5.5, -23.5); p(4, 4, 1, lime, 0, 2, -25.5); p(2, 2, 2, hot, 0, 2, -27); // the emitter, its collar and white-hot tip
    p(4, 2, 14, hull, 0, -2.5, -7); // frame
    p(1, 1, 6, dark, 0, -6, -8); p(1, 2, 1, dark, 0, -4.5, -10.5); p(1, 2, 1, mat(0x777777), 0, -4.5, -7.5); // a closed guard and the trigger
    p(4, 3, 4, hull, 0, -5, -3); p(4, 3, 4, hull, 0, -8, -2); // grip
    const mag = sub(0, 0, 0), mg = at(mag); mg(4, 1, 4, dark, 0, -10, -2); mg(2, 6, 2, lime, 0, -6.5, -2); // power cell up inside the grip
    return { muzzle: [2, -28.5], grip: [4, 7, 5, 0, -6.5, -2.5], fore: null, bands: [-16.5, -20.5], band: [6, 6, 2], holo: [10.5, -7], spin, spinUp: true, mag };
  },
  monarch({ p, mat, sub, at }) { // a butterfly knife with monarch wings for handles and a blackened spear point with a bright edge
    const org = mat(0xf28c1e), blk = mat(0x1d1712), dot = mat(0xf6f1e4), gold = mat(0xf2c230), dk = mat(0x353a42), gr = mat(0x6b737e), edge = mat(0xeef2f6);
    const wing = (P, o) => { // o: which way is out from where the handles meet; orange between black veins, a black rim with white spots, a black tip
      const y = k => o * k;
      P(4, 4, 19, org, 0, y(2), 9.5); P(4, 1, 19, blk, 0, y(.5), 9.5);
      for (const x of [-1.5, 1.5]) { P(1, 1, 19, blk, x, y(3.5), 9.5); for (const z of [2.5, 6.5, 10.5]) P(1, 1, 1, dot, x, y(3.5), z); }
      for (const z of [4.5, 8.5, 12.5]) P(4, 3, 1, blk, 0, y(2.5), z);
      P(4, 3, 4, blk, 0, y(2.5), 17); for (const x of [-1.5, 1.5]) for (const z of [15.5, 17.5]) P(1, 1, 1, dot, x, y(2.5), z);
      P(4, 1, 1, gold, 0, y(1.5), 1.5);
    };
    wing(p, 1);
    const blade = sub(0, 0, 0, [0, 2, .5]), bite = sub(0, 0, 0, [0, -2, .5]), B = at(blade), H = at(bite); // each turns on its pin
    B(2, 5, 1, dk, 0, .5, -.5); B(2, 1, 12, dk, 0, 2.5, -7); B(2, 1, 13, dk, 0, 1.5, -7.5); // tang and spine
    B(2, 1, 15, gr, 0, .5, -8.5); B(2, 1, 14, edge, 0, -.5, -8); B(2, 1, 12, edge, 0, -1.5, -7); // a grind line out to the point, then the edge
    wing(H, -1);
    H(4, 1, 5, blk, 0, -4.5, 15.5); H(4, 1, 3, blk, 0, -5.5, 15.5); for (const x of [-1.5, 1.5]) H(1, 1, 1, dot, x, -4.5, 15.5); // its hind wing
    H(2, 2, 2, blk, 0, -1, 20); // and the latch
    return { muzzle: [0, -16], grip: [6, 10, 12, 0, 0, 9], fore: null, bands: [3, 14], band: [6, 6, 2], flips: [blade, bite] };
  },
  wildfire({ p, mat, dark, glow, sub, at }) { // charred wood with embers still glowing in a crack along it, a brass fuel can on top, a glowing coil and a flared bell
    const char = mat(0x2b2320), charL = mat(0x4a3a30), ember = glow(0xff7a1a), hot = glow(0xffc04a), brass = mat(0xc9963a), brassD = mat(0x8a6424), copper = mat(0xb0602c), steel = mat(0x3a3d44);
    p(4, 6, 8, char, 0, -1, 7); p(4, 2, 5, char, 0, -5, 8.5); p(4, 8, 1, charL, 0, -2, 11.5); // stock and butt
    p(6, 6, 12, char, 0, 0, -3); // body
    for (const [x, y, z, c] of [[1.5, -2.5, 9.5], [1.5, -1.5, 8.5], [1.5, -1.5, 7.5], [1.5, -.5, 6.5, 1], [1.5, -.5, 5.5], [1.5, .5, 4.5], [1.5, .5, 3.5], // one long crack, the stock into the body
      [2.5, -.5, 2.5], [2.5, -.5, 1.5], [2.5, .5, .5, 1], [2.5, .5, -.5], [2.5, .5, -1.5], [2.5, 1.5, -1.5], [2.5, -.5, -2.5], [2.5, -.5, -3.5], [2.5, -1.5, -4.5], [2.5, -1.5, -5.5, 1], [2.5, -.5, -6.5], [2.5, .5, -7.5]])
      for (const sx of [-1, 1]) p(1, 1, 1, c ? hot : ember, x * sx, y, z);
    p(4, 4, 14, steel, 0, 0, -16); // barrel
    for (let z = -11.5; z > -22; z--) p(6, 6, 1, (z + 11.5) % 2 ? ember : copper, 0, 0, z); // the coil, glowing between its turns
    p(6, 6, 2, brassD, 0, 0, -23); p(8, 8, 2, brass, 0, 0, -25); p(10, 10, 1, brass, 0, 0, -26.5); p(6, 6, 1, hot, 0, 0, -26.5); // a flared bell, white-hot inside
    p(2, 3, 1, steel, 0, -3.5, -22.5); p(2, 2, 7, dark, 0, -6, -22.5); p(2, 2, 1, glow(0x7ac8ff), 0, -6, -26.5); // pilot light, burning blue
    p(2, 3, 2, brassD, 0, 3.5, -10); // the fuel line
    const mag = sub(0, 0, 0), mg = at(mag); // the fuel can
    mg(6, 4, 11, brass, 0, 6, -3.5); mg(4, 6, 11, brass, 0, 6, -3.5); for (const z of [-.5, -6.5]) { mg(6, 4, 1, brassD, 0, 6, z); mg(4, 6, 1, brassD, 0, 6, z); } mg(4, 4, 1, brassD, 0, 6, 2.5);
    p(4, 5, 4, char, 0, -5.5, 0); p(4, 3, 4, char, 0, -9.5, 1); // grip
    p(1, 1, 4, dark, 0, -7.5, -4); p(1, 4, 1, dark, 0, -5, -5.5); p(1, 2, 1, mat(0x999999), 0, -4, -3.5); // a closed guard and the trigger
    p(4, 7, 4, char, 0, -6.5, -15); // front handle
    return { muzzle: [0, -28], grip: [4, 8, 5, 0, -7, 1], fore: [6, 13, 6, 0, -3.5, -15], bands: [-7, -1], band: [8, 8, 0], mag };
  },
  finale({ p, mat, dark, glow, sub, at }) { // a fireworks mortar wrapped in paper, gold stars on its sides, a lit fuse, and the next shell peeking out of its mouth
    const red = mat(0xd42a3a), gold = mat(0xf2c230), blue = mat(0x2a46b0), white = mat(0xf4f4f0), dk = mat(0x252a3a), hole = mat(0x101010);
    const tube = (z0, z1, m) => { p(10, 8, z1 - z0, m, 0, 0, (z0 + z1) / 2); p(8, 10, z1 - z0, m, 0, 0, (z0 + z1) / 2); }; // round, its corners off
    tube(-16, 18, red);
    for (const [z0, z1] of [[-10, -2], [8, 14]]) { tube(z0, z1, blue); tube(z0 - 1, z0, gold); tube(z1, z1 + 1, gold); } // blue paper between gold
    for (const s of [-1, 1]) {
      for (const [y, z] of [[2.5, -9.5], [-2.5, -2.5], [1.5, 9.5], [-2.5, 12.5], [2.5, 12.5]]) p(1, 1, 1, white, 4.5 * s, y, z); // little white stars
      for (const [y, zs] of [[2.5, [0]], [1.5, [-1, 0, 1]], [.5, [-2, -1, 0, 1, 2]], [-.5, [-1, 0, 1]], [-1.5, [-1, 1]], [-2.5, [-2, 2]]]) for (const dz of zs) p(1, 1, 1, gold, 4.5 * s, y, -6.5 + dz); // and a big gold one
    }
    for (const [x, z] of [[-2.5, -8.5], [1.5, -4.5], [-.5, 10.5], [2.5, 12.5]]) p(1, 1, 1, white, x, 4.5, z);
    p(12, 10, 3, gold, 0, 0, -17.5); p(10, 12, 3, gold, 0, 0, -17.5); p(8, 6, 1, hole, 0, 0, -18.5); p(6, 8, 1, hole, 0, 0, -18.5); // its flared mouth
    p(8, 8, 3, dk, 0, 0, 19.5); p(4, 4, 1, gold, 0, 0, 21.5); // the end cap
    p(2, 3, 2, mat(0x3a2a1a), 0, 6.5, 15); p(2, 2, 2, glow(0xffe07a), 0, 9, 15); // the fuse, lit
    p(6, 2, 10, mat(0x2a2a2a), 0, -6, 12); // shoulder pad
    p(4, 5, 4, dk, 0, -7.5, -2); p(4, 3, 4, dk, 0, -11.5, -1); // trigger grip
    p(1, 1, 4, dark, 0, -8.5, -6); p(1, 4, 1, dark, 0, -7, -7.5); p(1, 2, 1, mat(0x888888), 0, -6, -5.5); // a closed guard and the trigger
    p(4, 8, 4, dk, 0, -9, -12); // front grip
    const round = sub(0, 0, 0), r = at(round); // the next shell
    r(6, 6, 4, blue, 0, 0, -21); r(4, 4, 2, red, 0, 0, -24); r(2, 2, 2, gold, 0, 0, -26);
    return { muzzle: [0, -28], grip: [4, 8, 5, 0, -9, -2], fore: [4, 8, 4, 0, -9, -12], bands: [3, 6], band: [12, 12, 0], round };
  },
};
// shared gun geometry (never dispose meshes marked shared)
const gunGeoCache = {};
// a little glow so the shady side still shows its color
const gunLit = new THREE.MeshLambertMaterial({ vertexColors: true }), gunGlow = new THREE.MeshBasicMaterial({ vertexColors: true }), gunGlowDim = new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x4a4a4a }), gunGlowHot = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.6, 2.6, 2.6) });
// polished metal (the titanium set): streaks of light lie along it, it mirrors the sky, and a glint runs down it every couple of seconds
const gunShine = new THREE.MeshLambertMaterial({ vertexColors: true });
gunShine.onBeforeCompile = s => {
  s.uniforms.uShine = SHINE_T;
  s.vertexShader = 'varying float vShine;\n' + s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vShine = position.z + position.y * .7;');
  s.fragmentShader = 'uniform float uShine;\nvarying float vShine;\n' + s.fragmentShader.replace('#include <emissivemap_fragment>',
    '#include <emissivemap_fragment>\n  float sOn = step(.05, diffuseColor.g), sUp = reflect(-normalize(vViewPosition), normal).y, sAt = vShine - .7 + fract(uShine * .45) * 5.;\n'
    + '  totalEmissiveRadiance += diffuseColor.rgb * (.26 + .2 * smoothstep(-.5, .8, sUp) + .22 * smoothstep(.45, .95, .5 + .5 * sin(vShine * 13.)));\n'
    + '  totalEmissiveRadiance += vec3(.55, .62, .74) * sOn * (smoothstep(.05, 0., abs(sAt)) + .55 * smoothstep(.018, 0., abs(sAt + .085)));');
};
gunLit.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * .45;'); };
const gunPx = i => GPX * (GUN_SCALE[BASE[i].id] || 1);
function gunPieces(i, stars, grow = BASE[i].grow ? GROW_MAX : 0) { // grow: full grown unless told (the hold pose and the arms fit that)
  const main = [], subs = [];
  const c = { mat: col => palIdx(col), dark: palIdx(GUN_DARK), glow: col => palIdx(col, true), shine: col => palIdx(col, false, true), grow };
  c.p = (...a) => main.push(a);
  // a part that moves on its own (barrels, mag, rocket)
  c.sub = (x, y, z, off = [0, 0, 0]) => { const s = { at: [x, y, z], off, list: [] }; subs.push(s); return s; };
  c.at = s => (...a) => s.list.push(a);
  const m = GUN_MODELS[BASE[i].id](c), [bw, bh, by] = m.band, gold = palIdx(0xffcc22);
  for (let s = 0; s < stars; s++) c.p(bw, bh, 2, gold, 0, by, m.bands[s]); // one gold band per upgrade
  return { m, main, subs };
}
function gunGeos(i, stars, grow) {
  const { m, main } = gunPieces(i, stars, grow), px = gunPx(i), core = coreOf(i);
  const all = m.flips && voxelGrid([...main, ...m.flips.flatMap(s => s.list)]), near = all && ((x, y, z) => all.at(x - all.lo[0], y - all.lo[1], z - all.lo[2])); // a balisong's parts, together as it rests
  const part = (s, nb) => {
    if (!s) return null;
    const geos = voxelGeos(s.list, px, core, nb);
    for (const g of [geos.lit, geos.glow, geos.shine, geos.core]) if (g) { g.translate(-s.off[0] * px, -s.off[1] * px, -s.off[2] * px); g.computeBoundingSphere(); }
    return { at: s.at.map((v, k) => v + s.off[k]), geos };
  };
  return { m, main: voxelGeos(main, px, core, near), spin: part(m.spin), round: part(m.round), mag: part(m.mag), rounds: m.rounds?.map(s => part(s)), charges: m.charges?.map(s => part(s)), bar: part(m.bar), pulse: m.pulse?.map(s => part(s)), flips: m.flips?.map(f => part(f, near)) };
}
// gun pictures (hotbar, armory, chests): muzzle turned away a little, seen from above
const gunPicAt = (i, yaw = .4, tilt = .36, w = 320, h = 160) => modelPic(null, g => makeGun(i, g, 0), { yaw: yaw - Math.PI / 2, tilt, w, h });
const gunPic = i => modelPic('gun:' + i + (BASE[i].grow ? ':' + growStage(i) : ''), g => makeGun(i, g, 0), { yaw: .4 - Math.PI / 2, tilt: .36 }); // a growing gun as grown as yours
const gunBox = (b, px) => b && { c: [b[3] * px, b[4] * px, b[5] * px], h: [b[0] / 2 * px, b[1] / 2 * px, b[2] / 2 * px] };
function makeGun(i, g, stars, grow = growStage(i)) {
  const b = gunGeoCache[BASE[i].id + ':' + stars + ':' + grow] ??= gunGeos(i, stars, grow), px = gunPx(i), fx = CORE_FX[BASE[i].id];
  const core = fx && Object.assign(gunGlow.clone(), { userData: { fx, at: -1e9, pk: fx.k } }); // its own, so each gun lights up on its own
  const add = (parent, geos) => {
    for (const [geo, mat] of [[geos.lit, gunLit], [geos.glow, gunGlow], [geos.shine, gunShine], [geos.core, core]]) if (geo) { const m = new THREE.Mesh(geo, mat); m.userData.shared = true; if (mat === core) m.onBeforeRender = coreLit; parent.add(m); }
  };
  add(g, b.main);
  const sub = s => { if (!s) return null; const grp = new THREE.Group(); grp.position.set(...s.at.map(n => n * px)); add(grp, s.geos); g.add(grp); return grp; };
  const charges = b.charges?.map(sub), bar = sub(b.bar);
  if (charges && bar) { for (const m of bar.children) m.material = gunGlow.clone(); charges.bar = bar; } // its own material, so each gun's bar has its own brightness
  const spin = sub(b.spin); if (spin && b.m.hover) spin.userData.hover = spin.position.y; if (spin && b.m.flat) spin.userData.flat = true; if (spin && b.m.spinUp) spin.userData.core = core;
  const flips = b.flips?.map(sub); if (flips?.[1]) { flips[1].position.sub(flips[0].position); flips[0].add(flips[1]); } // a balisong's bite handle rides on the blade's tang
  return { muzzle: b.m.muzzle.map(n => n * px), grip: gunBox(b.m.grip, px), fore: gunBox(b.m.fore, px), spin, round: sub(b.round), mag: sub(b.mag), rounds: b.rounds?.map(sub), charges, pulse: b.pulse?.map(sub), holo: b.m.holo && b.m.holo.map(n => n * px), core, flips };
}
// the gun's outer pixels, for keeping arms out of it
const gunCellCache = {};
function gunCells(i) {
  if (gunCellCache[i]) return gunCellCache[i];
  const { main, subs } = gunPieces(i, 0), px = gunPx(i);
  for (const s of subs) for (const [w, h, d, m, x, y, z] of s.list) main.push([w, h, d, m, x + s.at[0], y + s.at[1], z + s.at[2]]);
  const { lo, NX, NY, NZ, at } = voxelGrid(main), out = [];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++)
    if (at(x, y, z) && (!at(x + 1, y, z) || !at(x - 1, y, z) || !at(x, y + 1, z) || !at(x, y - 1, z) || !at(x, y, z + 1) || !at(x, y, z - 1)))
      out.push((x + lo[0] + .5) * px, (y + lo[1] + .5) * px, (z + lo[2] + .5) * px);
  return gunCellCache[i] = new Float32Array(out);
}
const holdOf = w => w.hold;
// knife swing for characters: raise, chop down, come back
const KNIFE_SWING = .36, swingT = w => w.swingT || KNIFE_SWING; // seconds (a balisong's is quicker)
const swingAt = t => { const e = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  t = Math.min(1, Math.max(0, t)); return t < .3 ? -.55 * e(t / .3) : t < .55 ? -.55 + 1.3 * e((t - .3) / .25) : .75 * (1 - e((t - .55) / .45)); };

// your first-person arms, in your own skin
const ARM_U = .0325, UP_V = new THREE.Vector3(0, 1, 0);
let armGeos = null;
const armMats = {};
// how far out to the side a palm sits to be just clear of the part it holds
function palmOut(cells, c, dir, o, m, px, u) {
  let t = 0;
  for (let k = 0; k < cells.length; k += 3) {
    const vx = cells[k] - c[0], vy = cells[k + 1] - c[1], vz = cells[k + 2] - c[2], po = vx * o.x + vy * o.y + vz * o.z;
    if (po <= t || po > PALM_FAR || Math.abs(vx * dir.x + vy * dir.y + vz * dir.z) > 1.5 * u || Math.abs(vx * m.x + vy * m.y + vz * m.z) > 1.2 * u) continue;
    t = po;
  }
  return t + px / 2;
}
const PALM_FAR = .09, PALM_GAP = .004;
function vmArm(left, box, dir, low = 0, at = null, size = 1) { // at: the fist's end this far out along the arm, instead of the part in its palm; size: [thicker, longer]
  armGeos ??= [partBox(4, 12, 4, 40, 16, ARM_U), partBox(4, 12, 4, 32, 48, ARM_U)];
  const L = prof.look ?? PRESETS[0].look, k = JSON.stringify(L);
  const mat = armMats[k] ??= lam({ map: skinTexture(L) });
  dir.normalize();
  const c = [box.c[0], box.c[1] - low * box.h[1], box.c[2]];
  const sc = size.length ? size : [size, size], u = ARM_U * sc[0];
  const piv = new THREE.Group(); piv.quaternion.setFromUnitVectors(UP_V, dir); piv.rotateY(Math.PI); piv.scale.set(sc[0], sc[1], sc[0]);
  if (at != null) piv.position.set(...c).addScaledVector(dir, at);
  else { // held in the palm: the arm lies beside the part, the middle of the hand's inner face against it
    const o = new THREE.Vector3(left ? 1 : -1, 0, 0).applyQuaternion(piv.quaternion), m = new THREE.Vector3(0, 0, 1).applyQuaternion(piv.quaternion);
    piv.position.set(...c).addScaledVector(dir, -2 * u).addScaledVector(o, palmOut(gunCells(cur), c, dir, o, m, gunPx(cur), u) + PALM_GAP + 2 * u);
  }
  for (let s = 0; s < 3; s++) { // the arm's front faces up at you; extra length so the arm's end never shows, every other piece turned end for end so a sleeve carries on as sleeve, not as a second hand
    const m = new THREE.Mesh(armGeos[left ? 1 : 0], mat); m.position.y = (6 + s * 12) * ARM_U; if (s & 1) m.rotation.x = Math.PI; m.userData.shared = true; piv.add(m);
  }
  vm.add(piv);
  return piv;
}
// your arms in first person: character size, hands where everyone else sees them, shoulders off screen
const EYE_PX = [0, 28.5, 4];
function vmRest(w) { // where the frame loop (main.js) holds the gun while you stand still
  const hold = holdOf(w);
  if (w.melee) { const lo = w.tilt ? .12 : 0; return [[.3 + lo * .3 + (w.tilt ? .23 : 0), -.22 - lo, -.5 - lo], meleeUp(w)]; }
  if (hold === 'heavy') return [[.34, -.38, -.6], .04];
  if (hold === 'shoulder') return [[.42, -.17, -.62], 0];
  return [[.32, -.3 + (hold === 'pistol' ? .09 : 0), -.55], 0];
}
const FP_HAND_TOP = -.05; // a hand higher on screen than this would put its arm over the middle of the view
function fpArm(left, h, fore) {
  const S = left ? SH_L : SH_R, c = palmAt(h, left); // the middle of the palm, pushed a pixel into the gun
  // your shoulder seen from your eye (the body turned as it is for this gun), then in the gun's frame
  const sh = new THREE.Vector3(...S).applyAxisAngle(UP_V, -h.turn), [at, tip] = vmRest(WEAPONS[cur]);
  if (left && fore && c.y + at[1] > FP_HAND_TOP) c.set(fore.c[0], fore.c[1] - .3 * fore.h[1], fore.c[2]); // the Eradicator's top handle: low on its front instead
  sh.set(-(sh.x - EYE_PX[0]), sh.y - EYE_PX[1], -(sh.z - EYE_PX[2])).multiplyScalar(BOT_U).sub(new THREE.Vector3(...at)).applyAxisAngle(X_V, -tip);
  const d0 = sh.clone().sub(c).normalize(), piv = vmArm(left, { c: c.toArray(), h: [0, 0, 0] }, d0.clone(), 0, null, BOT_U / ARM_U);
  piv.userData.fp = { c, sh, d0, q0: piv.quaternion.clone(), off: piv.position.clone().sub(c) }; // to follow the gun
  return piv;
}
// your hands on the gun this frame (held.js has the moves): the gun turns in your hand, the arms follow it and swing at your shoulders
let gunG = null, gunArmR = null, fpTurn = 0;
const gunHandP = new THREE.Vector3(), Q_ID = new THREE.Quaternion(), V_0 = new THREE.Vector3();
const _fq = new THREE.Quaternion(), _fv = new THREE.Vector3(), _fd = new THREE.Vector3(), _fm = new THREE.Vector3();
function armFollow(piv, P) { // P: where the hand goes, in the gun's frame
  const f = piv.userData.fp; _fv.copy(P).applyMatrix4(gunG.matrix);
  _fq.setFromUnitVectors(f.d0, _fd.copy(f.sh).sub(_fv).normalize());
  piv.quaternion.copy(f.q0).premultiply(_fq); piv.position.copy(f.off).applyQuaternion(_fq).add(_fv);
}
function fpHeld(a, w, ads) {
  if (!gunG) return;
  heldGun(gunG.quaternion, gunG.position, Q_ID, V_0, a, gunHandP, 1, w.wand && !w.melee ? WAND_UP * (1 - a.level) * (1 - ads) : 0); // a wand rests tipped up in your hand
  gunG.updateMatrix();
  if (gunMag) gunMag.position.copy(gunMag.userData.rest).add(_fv.set(a.mx, a.my, a.mz));
  flipShow(gunFlips, a);
  if (gunArmR) armFollow(gunArmR, gunArmR.userData.fp.c);
  if (gunArmL) { _fm.copy(gunArmL.userData.fp.c); _fm.z += a.az; if (a.left > 0 && gunMag) _fm.lerp(_fd.copy(partMid(gunMag)).add(gunMag.position), a.left); armFollow(gunArmL, _fm); }
  if (gunHand) { // a free left hand comes up to the mag
    gunHand.visible = a.left > .01;
    gunHand.position.copy(gunHand.userData.rest).add(_fv.set(a.mx, a.my, a.mz)).applyMatrix4(gunG.matrix); gunHand.position.y -= (1 - a.left) * .35;
    gunHand.quaternion.copy(gunHand.userData.q0).premultiply(gunG.quaternion);
  }
  if (heldToss(gunG.quaternion, gunG.position, a, w)) gunG.updateMatrix(); // up out of your hand
  if (a.sw || a.push) { // the arms swing at your shoulders, behind and below your eye
    const c = Math.cos(fpTurn), s = Math.sin(fpTurn);
    _fm.set(0, (SH_R[1] - EYE_PX[1]) * BOT_U, EYE_PX[2] * BOT_U);
    _fq.setFromAxisAngle(_fd.set(-c, 0, -s), a.sw);
    vm.position.sub(_fm).applyQuaternion(_fq).add(_fm).addScaledVector(_fd.set(s, 0, -c), a.push); vm.quaternion.premultiply(_fq);
  }
}
// the Void Lantern in your view: big on the right, your fist on the right end of its handle at the screen's edge, the arm running off the screen
const LAN = { in: -.04, up: .64, far: .9, grip: .155, dir: [.08, -.81, .58], at: -.05, size: [1.15, 1.15] }, LAN_FOV = Math.tan(75 * Math.PI / 360);
let gunBody = null;
function lanternPose(bob = 0, kz = 0) { // vm sits at the middle of its handle
  const down = Math.tan(fovBase * Math.PI / 360), far = LAN.far * LAN_FOV / down, half = 8 * gunPx(gunShown); // farther out on a narrow view, so it looks the same size
  vm.position.set((down * camera.aspect - LAN.in) * (far - half) - half, LAN.up - down * far + bob, -far - kz); vm.rotation.set(0, 0, 0); // its near corner by the right edge
}
const X_V = new THREE.Vector3(1, 0, 0), meleeUp = w => w.tilt ? 1.2 : .22, WAND_UP = .3; // how far first person tips a melee weapon (or a wand) up
function buildGun() {
  vm.traverse(o => { if (o.geometry && o !== flashMesh && !o.userData.shared) o.geometry.dispose(); });
  vm.clear(); flashMesh.visible = false;
  gunG = new THREE.Group(); gunG.matrixAutoUpdate = false; vm.add(gunG); // the gun, moving in your hand
  gunSwing = holdOf(BASE[cur]) === 'lantern' ? new THREE.Group() : null; gunBody = null;
  if (gunSwing) { gunBody = new THREE.Group(); gunSwing.add(gunBody); gunG.add(gunSwing); } // gunSwing swings from your fist, gunBody is the lantern hung from it
  gunCore?.dispose();
  const body = gunBody || gunG, { muzzle: [my, mz], grip, fore, spin, round, mag, rounds, charges, pulse, holo, core, flips } = makeGun(cur, body, lvl[cur]);
  if (chargeT) chargeEnd(); // put away mid-charge
  gunSpin = spin; gunRound = round; gunRounds = rounds; gunCharges = charges; chargeShow(charges, 0); gunPulse = pulse; gunCore = core; gunHolo = holo; gunMag = mag; gunFlips = flips; gunShown = cur; drawCross(BASE[cur]);
  const pose = !gunSwing && typeof holdFor === 'function' ? holdFor(cur) : null; // none yet while the game loads
  gunArmL = gunArmR = null; fpTurn = pose ? pose.turn : 0; gunHandP.set(...grip.c);
  if (gunSwing) { // your fist on the right end of its handle: it swings from there
    const at = [grip.c[0] + LAN.grip, grip.c[1], grip.c[2]]; gunSwing.position.set(...at); gunBody.position.set(...at).negate();
    gunG.add(vmArm(false, { c: at, h: [0, 0, 0] }, new THREE.Vector3(...LAN.dir), 0, LAN.at, LAN.size)); // moves with it in a reload
  }
  else if (pose) { gunArmR = fpArm(false, pose); gunHandP.copy(gunArmR.userData.fp.c); if (pose.dL) gunArmL = fpArm(true, pose, fore); }
  // one-handed guns: the left hand only shows up to reload
  gunHand = (pose || gunSwing) && !gunArmL && mag && !WEAPONS[cur].melee ? vmArm(true, partBounds(mag), new THREE.Vector3(-.3, -1, .45), 1, null, gunSwing ? LAN.size[0] : BOT_U / ARM_U) : null; // the lantern's matches its own arm
  if (gunHand) { gunHand.visible = false; gunHand.userData.q0 = gunHand.quaternion.clone(); }
  for (const o of [gunMag, gunArmL, gunHand]) if (o) o.userData.rest = o.position.clone();
  vmRl.rk = -1;
  flashMesh.position.set(0, my, mz - .015); flashLight.position.copy(flashMesh.position); body.add(flashMesh, flashLight); gunG.updateMatrix(); // the flash sits just past the muzzle, or the gun hides it
  if (WEAPONS[cur].melee) return; // still marks the tip, where the Stun Wand's blast starts
  flashMesh.material = vmFlashMat(flashOf(WEAPONS[cur])); flashLight.color.setHex(FLASH_FX[WEAPONS[cur].id]?.light ?? 0xffcc66);
}
function cycle(d) { let s = slotOf(cur); do s = (s + d + CATS.length) % CATS.length; while (slotGun[s] < 0); equip(slotGun[s]); }
function selectSlot(s) {
  if (slotGun[s] < 0) return;
  if (slotOf(cur) === s && mode === 'zombies') { // zombie waves: press again to flip between guns
    const list = BASE.map((w, i) => i).filter(i => owned[i] && slotOf(i) === s);
    if (list.length > 1) equip(list[(list.indexOf(cur) + 1) % list.length]);
    return;
  }
  equip(slotGun[s]);
}
function equip(i) {
  if (i === cur || !WEAPONS[i] || !owned[i]) return;
  cur = i; slotGun[slotOf(i)] = i; cancelReload(); inspT = -1; swapLen = drawT(WEAPONS[i]); swapDown = true;
  cd = Math.max(cd, swapLen * (SWAP_DOWN * (1 - swapOff) + 1 - SWAP_DOWN)); renderHotbar(); sfx('equip');
}
function swapTick(dt) {
  if (swapDown) { swapOff += dt / (swapLen * SWAP_DOWN); if (swapOff >= 1) { swapOff = 1; swapDown = false; if (gunShown !== cur) buildGun(); } }
  else if (swapOff > 0) swapOff = Math.max(0, swapOff - dt / (swapLen * (1 - SWAP_DOWN)));
  return swapOff;
}
const dry = () => sfx('dry');
// reload sound speeds up with faster reloads
let reloadSnd = null;
function reload() {
  const w = WEAPONS[cur]; if (w.melee || w.pool || reloading > 0 || ammo[cur] === w.mag || swapOff > 0) return;
  if (!reserve[cur]) { dry(); return; }
  reloading = reloadFull = rlOf(w, youFx()); reloadSnd = sfx('r_' + w.id, { rate: BASE[cur].reload / reloading }); myBurst.bn = 0;
}
function cancelReload() { reloading = 0; stopSfx(reloadSnd); reloadSnd = null; myBurst.bn = 0; }
// melee can't aim: the aim key plays with it instead (held.js inspectPose)
let inspT = -1, swingV = 0; // swingV: which of a blade's swings this one is (held.js swingPose)
function inspect() { if (WEAPONS[cur].melee && inspT < 0 && kick <= 0 && swapOff <= 0 && respawnT <= 0 && gunShown === cur) inspT = 0; }
buildGun();
// build gun models and pictures in idle time so nothing stalls later
{
  const later = window.requestIdleCallback || (f => setTimeout(f, 50));
  let k = 0;
  const next = () => { if (k >= BASE.length) return; if (inLobby) { gunPic(k); k++; } later(next); }; // a picture builds its model too; none mid-match
  later(next);
}

// little cubes flying off (hits, dust, smoke): one instanced mesh, so one draw call for all of them
const parts = [], P_CAP = 1500, pCols = {}, _pm = new THREE.Matrix4();
const pMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .08, .08), new THREE.MeshBasicMaterial(), P_CAP);
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); pMesh.setColorAt(0, new THREE.Color()); pMesh.count = 0; pMesh.frustumCulled = false; scene.add(pMesh);
function burst(p, color, n) {
  const c = pCols[color] ??= new THREE.Color(color);
  for (let i = fxN(n); i > 0; i--) parts.push({ p: p.clone(), c, v: new THREE.Vector3((Math.random() - .5) * 4, Math.random() * 4, (Math.random() - .5) * 4), life: .6 });
}
function partsDraw() {
  const n = Math.min(parts.length, P_CAP);
  for (let i = 0; i < n; i++) { const q = parts[i]; pMesh.setMatrixAt(i, _pm.makeTranslation(q.p.x, q.p.y, q.p.z)); pMesh.setColorAt(i, q.c); }
  pMesh.count = n; pMesh.instanceMatrix.needsUpdate = true; pMesh.instanceColor.needsUpdate = true;
}
