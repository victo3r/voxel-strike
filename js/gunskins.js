// gun skins: earned with the gun itself and worn by it for everyone to see (a rare gun has one, an epic two, a legendary four, a mythic five)
const GS_TIERS = ['alt', 'shiny', 'silver', 'gold', 'crystal'], GS_COUNT = { rare: 1, epic: 2, legend: 4, mythic: 5 };
const GS_NAME = { shiny: 'Shiny', silver: 'Silver', gold: 'Gold', crystal: 'Crystal' }, GS_COL = { alt: '#4fa3ff', shiny: '#c06bff', silver: '#d8dee6', gold: '#ffc531', crystal: '#7fe9ff' };
const gsTiers = w => w && !w.start ? GS_TIERS.slice(0, GS_COUNT[w.rar] | 0) : [];
// a gun's own skin: its name, what its greys become (or null to leave them), then what its colours become, the commonest first
const GUN_ALT = {
  hitman: ['Ivory', 0xe8dfc8, 0xc9a23a], heatray: ['Coolant', null, 0x2f9fd8], rocket: ['Desert', null, 0xc9a86a, 0x3a3a3a], thrasher: ['Crimson', 0x8a2a2a, 0xe0b040], semisniper: ['Forest', 0x3f6a3a, 0xc8a050],
  herosword: ['Emerald', null, 0x2fae6a, 0xe0c040], shockbeam: ['Overload', null, 0xd8a020, 0xff6a3a], crossbow: ['Ebony', null, 0x3a3238, 0xd8c8a0], hornet: ['Red Hornet', null, 0xd8402a], daybreak: ['Dusk', null, 0x7a4ad8, 0xf06a8a],
  cutlass: ['Coral', null, 0xf07a6a, 0xf0d8a0], firefly: ['Ember', 0x6a2a18, 0xff8a2a],
  tigerbite: ['White Tiger', null, 0xe8ecf0], trex: ['Fossil', null, 0xc8b890, 0x8a6a4a], frostwand: ['Rose Quartz', null, 0xf0a0c8, 0xffe0f0], warhammer: ['Molten', 0x7a3418, 0xff8a2a], executioner: ['Venom', null, 0x4fd040],
  grenade: ['Hazard', null, 0xf2c21a, 0x2a2a2a], aerial: ['Sunset', null, 0xf08a4a, 0xf0d060], windwand: ['Spring', 0xcfe8c0, 0x6fd06a], stunwand: ['Plasma', null, 0xd04af0], tracker: ['Night Ops', null, 0x3a6ad8],
  highnoon: ['Midnight', null, 0x3a4a8a, 0xc8d0e0], harpoon: ['Kraken', null, 0x7a3ab0, 0xe0a0d0], balisong: ['Jade', null, 0x3fc08a], longbow: ['Birch', null, 0xe0d8c8, 0x4a8a4a], rhino: ['Savanna', 0xb89a5a, 0x6a4a2a],
  sleighbells: ['Silver Bells', null, 0xc8d0d8, 0x2c5fb0, 0xe8eef2],
  eradicator: ['Toxic', 0x4a8a2a, 0xc8f04a], starsmasher: ['Supernova', null, 0xd8402a, 0xffc040], blazesaber: ['Blue Flame', null, 0x3a9aff, 0xa0e0ff], rubypierce: ['Sapphire', null, 0x2a5ad8], paragon: ['Crimson Guard', null, 0xc82a3a],
  flamewand: ['Ghost Flame', null, 0x4ae8c8, 0xc0fff0], soulwand: ['Banshee', null, 0xb48aff], salvo: ['Arctic', null, 0xe8f0f8, 0x4a9ad8], apex: ['Blackout', 0x2a2c32, 0xd8402a], tempest: ['Stormcloud', null, 0x4a8ad8, 0xe8f0ff],
  conch: ['Abalone', null, 0x6ac8c0, 0xb48ad8], quasar: ['Pulsar', null, 0xf04a9a], monarch: ['Blue Morpho', null, 0x2a7af0], wildfire: ['Brimstone', null, 0xd8d030, 0xf0f0a0], finale: ['Jubilee', null, 0x8a3ad8, 0x2fae6a],
  moonbeam: ['Blood Moon', 0xd86a5a, 0xff4a3a], bombard: ['Iron', null, 0x4a5560, 0xa0a8b0], peregrine: ['Snowy Owl', 0xe8ecf0, 0xe0b040], boomerang: ['Painted', null, 0x2a8ab0, 0xf0e0a0], juggernaut: ['Brass', 0xb8923a, 0xd8402a],
  scythe: ['Bone', 0xd8d0b8, 0x8a2a2a], candycane: ['Mint', null, 0x3fc08a], nutcracker: ['Royal Guard', null, 0x2a4ab0, 0xc8322c, 0xe8eef2], northstar: ['Aurora', null, 0x2a8a6a, 0xa0f0c8], snowglobe: ['Winter Night', null, 0x2c4a8a, 0xc8d0e0],
  windsaber: ['Sandstorm', 0xe8c88a, 0xd8943a], ancientwand: ['Obsidian', null, 0x3a3048, 0xb48aff], wisp: ['Marsh Light', null, 0xa0f04a], voidlantern: ['Sun Lantern', null, 0xf0a82a, 0xfff0a0], crystal: ['Rose Crystal', null, 0xf06aa8],
  aurora: ['Solar Flare', null, 0x8a2a1a, 0xffa02a], tishot: ['Black Titanium', 0x30343c, 0x383e48, 0xe0483a], tipistol: ['Black Titanium', 0x30343c, 0x383e48, 0xe0483a], tisword: ['Black Titanium', 0x30343c, 0x383e48, 0xe0483a], tisaw: ['Black Titanium', 0x30343c, 0x383e48, 0xe0483a], tisniper: ['Black Titanium', 0x30343c, 0x383e48, 0xe0483a],
  tirocket: ['Black Titanium', 0x30343c, 0x383e48, 0xe0483a], meteor: ['Ice Comet', null, 0x9ad8f0, 0x4ae8ff], delivery: ['North Pole', null, 0xe8f0f8, 0x2f8a4c, 0xc8322c],
};
const GS_OWN = { crystal: { crystal: ['Max Crystal', 'prism'] } }; // a gun whose top skin would look like itself gets one of its own: [name, what it's made of]
const gsName = (i, tier) => tier ? (tier === 'alt' ? GUN_ALT[BASE[i].id]?.[0] || 'Alternate' : GS_OWN[BASE[i].id]?.[tier]?.[0] || GS_NAME[tier]) : 'Default';
// ---- painting a model in a skin
const _gc = new THREE.Color(), _gh = { h: 0, s: 0, l: 0 }, hslOf = col => { _gc.set(col).getHSL(_gh, THREE.SRGBColorSpace); return [_gh.h, _gh.s, _gh.l]; }, hslHex = (h, s, l) => _gc.setHSL((h % 1 + 1) % 1, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)), THREE.SRGBColorSpace).getHex(); // as the eye sees them, not as light adds up
const grey = ([, s, l]) => s < .17 || l < .07 || l > .95, hueGap = (a, b) => Math.abs(((a - b) % 1 + 1.5) % 1 - .5);
const ramp = (stops, t) => { const n = stops.length - 1, k = Math.min(n - 1, Math.floor(Math.max(0, Math.min(.9999, t)) * n)); return _gc.set(stops[k]).lerp(new THREE.Color(stops[k + 1]), Math.max(0, Math.min(1, t)) * n - k).getHex(); };
const GS_RAMP = { silver: [0x3a4048, 0x8a929c, 0xc8d0d8, 0xf6f9fc], gold: [0x5a3606, 0xb87a12, 0xf2bc2e, 0xfff0a8], crystal: [0x16245e, 0x2a5fc0, 0x4fb0e6, 0xa8e8ff], prism: [0x3a4058, 0x8a94b8, 0xc8d4ee, 0xffffff] }, GS_KIND = { silver: 'sheen', gold: 'gilt', crystal: 'crystal', prism: 'prism' };
// the colour families a model is painted in, biggest first: what its own skin swaps for others
const gunHueCache = {};
function gunHues(i) {
  return gunHueCache[i] ??= (() => {
    const vol = new Map(), add = (w, h, d, m) => { if (m > 0) vol.set(m, (vol.get(m) || 0) + w * h * d); }, same = c => c + 1; // colours stand for themselves here (+1: black counts)
    try { GUN_MODELS[BASE[i].id]({ p: add, at: () => add, sub: () => ({}), mat: same, shine: same, bare: same, glow: same, glass: () => 0, dark: GUN_DARK + 1, grow: BASE[i].grow ? GROW_MAX : 0 }); } catch (e) {}
    const heads = []; let gl = 0, gv = 0;
    for (const [c, v] of [...vol].sort((a, b) => b[1] - a[1])) { const x = hslOf(c - 1); if (grey(x)) { if (x[2] > .06) { gl += x[2] * v; gv += v; } continue; } const f = heads.find(H => hueGap(H.h, x[0]) < .1); if (f) f.v += v; else if (heads.length < 3) heads.push({ h: x[0], s: x[1], l: x[2], v }); }
    return Object.assign(heads.sort((a, b) => b.v - a.v), { grey: gv ? gl / gv : .3 }); // grey: how light its greys are, taken together
  })();
}
// what a gun's own skin makes of a colour: its greys take the skin's grey, each colour family the colour given for it
const gsMapCache = {};
function gsMap(i) {
  return gsMapCache[i] ??= (() => {
    const [, n, ...cols] = GUN_ALT[BASE[i].id] || [], heads = gunHues(i), N = n != null && hslOf(n), T = cols.map(hslOf);
    return col => { const x = hslOf(col);
      if (grey(x)) return N && x[2] > .06 ? hslHex(N[0], N[1] * (x[2] > .9 ? .4 : 1), Math.max(.05, Math.min(.96, x[2] * N[2] / Math.max(.12, heads.grey)))) : col;
      if (!T.length || !heads.length) return col;
      let f = 0; heads.forEach((H, k) => { if (hueGap(H.h, x[0]) < hueGap(heads[f].h, x[0])) f = k; }); const H = heads[f], t = T[Math.min(f, T.length - 1)];
      return hslHex(t[0], x[1] * t[1] / Math.max(.25, H.s), Math.max(.05, Math.min(.93, t[2] + (x[2] - H.l) * .9))); }; // as much lighter or darker than the new colour as it was than the old
  })();
}
// what it fires takes the skin's colours too (a Sapphire Ruby Pierce's beam is blue): only its own skin changes them
const shotCol = (i, skin, col) => skin === 'alt' && GUN_ALT[BASE[i]?.id] ? gsMap(i)(col) : col;
const skinBy = (b, i) => b ? gsFor(i, b.rec?.skins?.[i]) : gunSkin(i), altBy = (b, i) => skinBy(b, i) === 'alt' ? i : -1; // whose gun: a bot's or another player's, or yours
function skinPaint(i, skin) { // the model's colour helpers, repainted
  const flags = { mat: [], shine: [false, true], bare: [false, false, false, true] }, out = {}, own = GS_OWN[BASE[i].id]?.[skin]?.[1] || skin;
  let to;
  if (skin === 'shiny') to = col => [col, false, 'polish'];
  else if (GS_RAMP[own]) to = col => { const [, , l] = hslOf(col); return [ramp(GS_RAMP[own], .06 + l * 1.05), false, GS_KIND[own]]; };
  else if (skin === 'alt') { const m = gsMap(i); to = col => [m(col)]; }
  else return null;
  for (const [k, a] of Object.entries(flags)) out[k] = col => { const [c, shine, kind] = to(col); return palIdx(c, false, a[1] || !!shine, a[1] || !!shine || !!kind, !!a[3], false, kind || ''); };
  out.dark = out.mat(GUN_DARK); if (skin === 'alt') out.glow = col => palIdx(to(col)[0], true); // its own skin recolours its light too; the metals leave a gun's light alone
  return out;
}
// ---- earning them: what you've done with each gun (prof.gs[id] = [kills, headshots, doubles, 3 in a life, 5 in a life, wins with 5 of its kills])
const GS_N = { k: 0, h: 1, d: 2, l3: 3, l5: 4, w: 5 };
const gsHead = w => !w.melee && !['rocket', 'grenade', 'flare', 'flame', 'beam', 'boomer', 'vortex', 'wisp', 'saw', 'spell', 'wand', 'bolt', 'lance', 'lob', 'chain', 'bow'].some(f => w[f]); // a gun you can aim at a head
const gsGoals = (w, tier) => tier === 'alt' ? [['k', 75]] : tier === 'shiny' ? [['k', 200], gsHead(w) ? ['h', 30] : ['d', 10]] : tier === 'silver' ? [['k', 400], ['l3', 15]]
  : tier === 'gold' ? [['k', 800], gsHead(w) ? ['h', 100] : ['d', 30], ['l5', 10]] : tier === 'crystal' ? [['k', 1500], ['w', 25]] : [];
const gsText = ([k, g]) => k === 'k' ? `${g} kills` : k === 'h' ? `${g} headshot kills` : k === 'd' ? `${g} double kills` : k === 'l3' ? `3 kills in one life, ${g} times` : k === 'l5' ? `5 kills in one life, ${g} times` : `Win ${g} matches with 5 kills from it`;
const gsAt = (id, k) => prof.gs?.[id]?.[GS_N[k]] | 0;
const gsDone = (i, tier) => { const w = BASE[i], T = gsTiers(w), at = T.indexOf(tier); return at >= 0 && T.slice(0, at + 1).every(t => gsGoals(w, t).every(([k, g]) => gsAt(w.id, k) >= g)); }; // each needs the ones before it
const gsHas = (i, tier) => !tier || !!prof.guns[BASE[i].id] && gsDone(i, tier);
const gsOwned = i => gsTiers(BASE[i]).filter(t => gsHas(i, t));
const gunSkin = i => { const s = prof.gskin?.[BASE[i]?.id]; return s && gsHas(i, s) ? s : ''; }; // the one your gun wears
const gsFor = (i, s) => s && gsTiers(BASE[i]).includes(s) ? s : ''; // someone else's, if that gun has such a skin
function gsWear(i, tier) { if (!gsHas(i, tier)) return false; prof.gskin = { ...prof.gskin, [BASE[i].id]: tier }; if (!tier) delete prof.gskin[BASE[i].id]; saveProf(); return true; }
// counting: your kills on players and bots with the gun in your hands, and the wins it helped with
let gsLife = {}, gsLast = { t: -9, g: -1, used: false }, gsMatch = {}, gsNew = [];
function gsCount(i, fn) {
  const w = BASE[i]; if (!w || !gsTiers(w).length || !prof.guns[w.id]) return;
  const was = gsOwned(i).length; prof.gs = { ...prof.gs }; fn(prof.gs[w.id] = [0, 1, 2, 3, 4, 5].map(k => prof.gs[w.id]?.[k] | 0));
  const now = gsOwned(i); if (now.length <= was) return;
  const tier = now[now.length - 1], name = `${gsName(i, tier)} ${w.name}`.toUpperCase();
  gsNew.push(name); if (!matchOver && !inLobby) toast(`SKIN UNLOCKED · ${name}`, GS_COL[tier]); sfx('levelUp'); saveProf();
}
function gsKill(head, streak) {
  const i = cur, now = performance.now() / 1000; if (mode === 'range' || mode === 'zombies') return;
  if (streak === 1) gsLife = {};
  const L = gsLife[i] = (gsLife[i] | 0) + 1, dbl = gsLast.g === i && now - gsLast.t < 3 && !gsLast.used; gsLast = { t: now, g: i, used: dbl }; // two inside three seconds; a third starts a new pair
  gsMatch[i] = (gsMatch[i] | 0) + 1;
  gsCount(i, n => { n[0]++; if (head) n[1]++; if (dbl) n[2]++; if (L === 3) n[3]++; if (L === 5) n[4]++; });
}
function gsEnd(won) { if (won) for (const [i, k] of Object.entries(gsMatch)) if (k >= 5) gsCount(+i, n => { n[5]++; }); gsMatch = {}; }
function gsMark() { gsNew = []; gsMatch = {}; gsLife = {}; }
const gsRow = () => gsNew.length ? `<div class="rl acr" style="color:#7fe9ff">${ico('star')} ${gsNew.length > 1 ? gsNew.length + ' GUN SKINS UNLOCKED' : gsNew[0] + ' UNLOCKED'} · WEAR IT IN THE ARMORY</div>` : '';
// a bot's gun now and then wears one, never past shiny
const gsBot = i => { const T = gsTiers(BASE[i]).slice(0, 2), r = Math.random(); return T.length && r < .14 ? T[r < .04 && T[1] ? 1 : 0] : ''; };
