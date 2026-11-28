// seasons: a month can bring its own maps, weapons to earn, presents and chests (the server's copy is tables.js SEASONS)
const SEASONS = [
  { id: 'xmas26', y: 2026, m: 12, name: 'CHRISTMAS', only: 'ONLY IN DECEMBER', col: '#e2403a', setAch: 'xmasset', snow: true, lights: true, chests: true,
    maps: { cove: 'workshop', resort: 'town' }, // what stands in for a map this month
    guns: ['sleighbells', 'candycane', 'nutcracker', 'northstar', 'snowglobe', 'delivery'], // earned on the season page, never sold
    goals: { // three challenges for each: k what's counted, c the slot it's for, g how many (n: how many in one life, for 'life')
      sleighbells: [{ k: 'cat', c: 'backup', g: 150 }, { k: 'dbl', c: 'backup', g: 30 }, { k: 'head', c: 'backup', g: 40 }],
      candycane: [{ k: 'cat', c: 'melee', g: 150 }, { k: 'life', c: 'melee', n: 3, g: 10 }, { k: 'win', g: 15 }],
      nutcracker: [{ k: 'cat', c: 'primary', g: 250 }, { k: 'near', g: 100 }, { k: 'win', g: 20 }],
      northstar: [{ k: 'head', c: 'sniper', g: 150 }, { k: 'far', g: 75 }, { k: 'life', c: 'sniper', n: 5, g: 10 }],
      snowglobe: [{ k: 'cat', c: 'special', g: 250 }, { k: 'zk', g: 2000 }, { k: 'wave', g: 15 }],
      delivery: [{ k: 'cat', c: 'premium', g: 300 }, { k: 'multi', g: 20 }, { k: 'win', g: 30 }],
    },
    // a present a day from the 1st: coins, keys, boosters, chests, and now and then something to wear or show off
    gifts: [{ c: 40 }, { b: 2 }, { c: 50 }, { k: 1 }, { b: 3 }, { c: 60, hskin: 'antlers' }, { k: 1 }, { c: 60 }, { box: 'wood' }, { b: 3 }, { c: 70 }, { c: 40, kfx: 'snowman' }, { k: 1 },
      { c: 70 }, { b: 4 }, { box: 'iron' }, { c: 80 }, { c: 60, hskin: 'santa' }, { k: 2 }, { b: 4 }, { c: 100 }, { box: 'iron' }, { k: 2 }, { c: 100, skin: 'gingerbread' }, { c: 250, box: 'gold', lobby: 'xmas' }] },
];
// ?season=xmas26 (or none) on this PC picks one, and ?day=6 the day of it; tests set seasonPick and seasonDay
const _seasonQ = (() => { try { return /^(127\.0\.0\.1|localhost)$/.test(location.hostname) ? new URLSearchParams(location.search) : null; } catch { return null; } })();
let seasonPick = _seasonQ?.get('season') || null, seasonDay = +_seasonQ?.get('day') || 0;
const seasonAt = t => { const d = new Date(t); return SEASONS.find(S => S.y === d.getUTCFullYear() && S.m === d.getUTCMonth() + 1) || null; }; // months turn at midnight UTC, for everyone at once
const seasonNow = () => seasonPick ? SEASONS.find(S => S.id === seasonPick) || null : seasonAt(Date.now());
const seasonOf = id => SEASONS.find(S => S.id === id) || null;
const seasonMap = id => seasonNow()?.maps?.[id] || id;
const seasonEnd = S => Date.UTC(S.y, S.m, 1); // the first moment of the month after
const seasonOn = id => !!id && seasonNow()?.id === id;
// weapon sets (the EXCLUSIVE page's SETS tab): a season's guns are one; ach: the achievement that pays for owning the lot
const GUN_SETS = SEASONS.filter(S => S.guns).map(S => ({ id: S.id, name: S.name + ' SET', col: S.col, guns: S.guns, ach: S.setAch }));
const setHas = T => T.guns.filter(id => prof.guns[id]).length;
const setsShown = () => GUN_SETS.filter(T => seasonOn(T.id) || setHas(T)); // a season's while it's on, after that only if some of it is yours
