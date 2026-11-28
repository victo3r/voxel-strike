// chests: keys from online wins, the daily reward and ads open them
const keyCount = () => prof.keys | 0;
// chests you've won (weekly prizes) open free: prof.box[id] = how many
const boxN = c => prof.box?.[c.id] | 0, boxAll = () => CHESTS.reduce((s, c) => s + boxN(c), 0);
// loot: k = kind, n = amount or [min, max], w = weight, r = rarity. Things you can only have one of drop out once you own them, and wear waits for its level
const GUN_DROP = { rare: 4.5, epic: 3.75, legend: 2.25, mythic: .75 }; // the guns a golden chest can hold are its own (chest: true), never the armory's
const CHESTS = [
  { id: 'wood', name: 'WOODEN CHEST', cost: 1, pal: { m: '#9a6634', w: '#c48a4e', b: '#5d5d66', g: '#d8d8e0' }, loot: [
    { k: 'coins', n: [10, 16], w: 40 }, { k: 'xp', n: [100, 160], w: 20 },
    { k: 'coins', n: 30, w: 8, r: 'rare' },
  ] },
  { id: 'iron', name: 'IRON CHEST', cost: 3, pal: { m: '#7f8a99', w: '#b5bfcc', b: '#3c4450', g: '#4fa3ff' }, loot: [
    { k: 'coins', n: [30, 45], w: 28 }, { k: 'xp', n: [300, 450], w: 18 },
    { k: 'star', n: 1, w: 7, r: 'rare' }, { k: 'coins', n: 100, w: 6, r: 'rare' },
    ...BOOTS.filter(b => !b.bars && !b.season).map(b => ({ k: 'boots', id: b.id, w: 2.25, r: rarOf(b) })), ...HATS.filter(h => !h.bars && !h.season).map(h => ({ k: 'hats', id: h.id, w: 2.25, r: rarOf(h) })), // crafted pieces stay out of chests
  ] },
  { id: 'gold', name: 'GOLDEN CHEST', cost: 10, pal: { m: '#e0b234', w: '#ffe07a', b: '#8a5a12', g: '#d23cff' }, loot: [
    { k: 'coins', n: [120, 180], w: 16 }, { k: 'star', n: 2, w: 15, r: 'rare' },
    ...BOOTS.filter(b => !b.bars && !b.season).map(b => ({ k: 'boots', id: b.id, w: 3.5, r: rarOf(b) })), ...HATS.filter(h => !h.bars && !h.season).map(h => ({ k: 'hats', id: h.id, w: 3.5, r: rarOf(h) })),
    { k: 'coins', n: 300, w: 9, r: 'epic' },
    ...BASE.filter(w => w.chest).map(w => ({ k: 'gun', id: w.id, w: w.drop ?? GUN_DROP[rarOf(w)], r: rarOf(w) })), // drop: a gun's own odds (the Crystal Companion is rarer still)
    ...KILL_FX.filter(K => K.chest && !K.season).map(K => ({ k: 'kfx', id: K.id, w: GUN_DROP[K.rar] * .6, r: K.rar })), // the kill effects only chests hold
    ...LOBBIES.filter(L => L.chest).map(L => ({ k: 'lobby', id: L.id, w: GUN_DROP[L.rar] * .6, r: L.rar })), // and the lobbies
    { k: 'coins', n: 500, w: 3, r: 'legend' },
  ] },
];
const starGuns = () => BASE.map((w, i) => i).filter(i => BASE[i].price && gunStars(i) >= 1 && gunStars(i) < 3);
const lootOk = l => l.k === 'star' ? starGuns().length > 0 : l.k === 'gun' ? !gunStars(gi(l.id)) : l.k === 'boots' ? !prof.boots[l.id] && (gearOf(l).season || prof.lv >= gearOf(l).unlock) : l.k === 'hats' ? !prof.hats[l.id] && (gearOf(l).season || prof.lv >= gearOf(l).unlock)
  : l.k === 'av' ? !prof.avs?.[l.id] : l.k === 'kfx' ? !prof.kfx?.[l.id] : l.k === 'lobby' ? !prof.lobbies?.[l.id] : l.k === 'suit' ? !prof.suits?.[l.id] : l.k === 'hskin' ? !prof.skins?.[l.id] : l.k === 'skin' ? !giftHas('skin', l.id) : true;
// this month's chests: the season's own things in them (its set, and in the golden one what its presents bring, early, and what only its chests hold), and the other sets' boots and hats put away till it's over
function seasonLoot(c) {
  const S = seasonNow(); if (!S?.chests) return c.loot;
  const own = x => x.season === S.id, list = c.loot.filter(l => l.k !== 'boots' && l.k !== 'hats');
  if (c.id === 'wood') return list;
  const w = c.id === 'gold' ? 4.5 : 2.6;
  list.push(...BOOTS.filter(own).map(b => ({ k: 'boots', id: b.id, w, r: rarOf(b) })), ...HATS.filter(own).map(h => ({ k: 'hats', id: h.id, w, r: rarOf(h) })), ...SUITS.filter(own).map(s => ({ k: 'suit', id: s.id, w: w * .8, r: rarOf(s) })));
  if (c.id === 'gold') list.push(...HAT_SKINS.filter(own).map(K => ({ k: 'hskin', id: K.id, w: K.chest ? 2.2 : 1.4, r: 'epic' })), ...KILL_FX.filter(own).map(K => ({ k: 'kfx', id: K.id, w: K.chest ? 1.8 : 1.4, r: K.rar })),
    ...S.gifts.map(g => g.skin).filter(Boolean).map(id => ({ k: 'skin', id, w: 1.2, r: 'event' })));
  for (const k of ['f', 'b']) list.push(...AV[k].filter(own).map(X => ({ k: 'av', id: k + ':' + X.id, w: c.id === 'gold' ? 1.6 : 1.1, r: 'event' }))); // its avatar frames and backgrounds
  return list;
}
// what a chest can give you right now, with odds that add up to 100
function lootNow(c) {
  const ok = seasonLoot(c).filter(lootOk), sum = ok.reduce((s, l) => s + l.w, 0);
  return ok.map(l => ({ ...l, p: l.w / sum }));
}
// the "can have" row: common to mythic, then by kind and amount
const LOOT_KIND = ['coins', 'boosts', 'xp', 'star', 'boots', 'hats', 'suit', 'hskin', 'kfx', 'av', 'skin', 'lobby', 'gun'], lootLow = n => Array.isArray(n) ? n[0] : n | 0;
function lootShown(c) {
  const rk = Object.keys(RARITY), r = l => rk.indexOf(l.r || 'common');
  return lootNow(c).sort((a, b) => r(a) - r(b) || LOOT_KIND.indexOf(a.k) - LOOT_KIND.indexOf(b.k) || lootLow(a.n) - lootLow(b.n));
}
const rollN = n => Array.isArray(n) ? n[0] + Math.floor(Math.random() * (n[1] - n[0] + 1)) : n;
const nText = n => Array.isArray(n) ? `${n[0]}-${n[1]}` : n;
const gearOf = l => (l.k === 'boots' ? BOOTS : HATS).find(g => g.id === l.id);
// what a piece of loot looks like and is called: its picture, its name, its rarity and kind
function lootParts(l, n = l.n) {
  const [rn, rc] = RARITY[l.r || 'common'];
  let pic, name;
  if (l.k === 'coins') { pic = `<span class="lc">${COIN}</span>`; name = `${nText(n)} COINS`; }
  else if (l.k === 'boosts') { pic = `<span class="lc">${ico('bolt')}</span>`; name = `${n} BOOSTER${n === 1 ? '' : 'S'}`; }
  else if (l.k === 'xp') { pic = `<span class="lc lx">XP</span>`; name = `${nText(n)} XP`; }
  else if (l.k === 'star') { pic = `<span class="lc ls">${ico('star').repeat(n)}</span>`; name = l.gave ? l.gave.map(([i, k]) => `${BASE[i].name.toUpperCase()} +${k} ${ico('star')}`).join('<br>') || '50 COINS A STAR' : n > 1 ? `+${n} STARS ON YOUR GUNS` : '+1 STAR ON A GUN'; }
  else if (l.k === 'gun') { pic = `<img class="ai" src="${gunPic(gi(l.id))}">`; name = BASE[gi(l.id)].name.toUpperCase(); }
  else if (l.k === 'kfx') { pic = `<img class="ai" src="${kfxPic(l.id)}">`; name = kfxOf(l.id).name.toUpperCase(); }
  else if (l.k === 'lobby') { pic = `<span class="lc">${ico(lobbyById(l.id).ic)}</span>`; name = lobbyById(l.id).name; }
  else if (l.k === 'suit') { pic = `<img class="ai" src="${armorPic(suitN(l.id, 1) - 1)}">`; name = suitOf(l.id).name.toUpperCase(); }
  else if (l.k === 'hskin') { pic = `<img class="ai" src="${hatPic(HATS[0].id, 1, l.id)}">`; name = hatSkinOf(l.id).name.toUpperCase(); }
  else if (l.k === 'skin') { pic = `<img class="ai" src="${lookPic(SECRETS[l.id].look)}">`; name = SECRETS[l.id].name; }
  else if (l.k === 'av') { const [k, id] = l.id.split(':'); pic = avatar(prof.look, { [k]: id }, 'mid'); name = avOf(k, id).name.toUpperCase(); }
  else { pic = `<img class="ai" src="${l.k === 'boots' ? bootPic(l.id, 1) : hatPic(l.id, 1)}">`; name = gearOf(l).name.toUpperCase(); }
  const kind = rn + (l.k === 'gun' ? ' ' + CATS[CAT_I[BASE[gi(l.id)].cat]][1] : l.k === 'kfx' ? ' KILL FX' : l.k === 'lobby' ? ' LOBBY' : l.k === 'hskin' ? ' HAT SKIN' : l.k === 'skin' ? ' SKIN' : l.k === 'av' ? (l.id[0] === 'f' ? ' AVATAR FRAME' : ' AVATAR BACKGROUND') : l.k === 'suit' ? ' ARMOR' : l.k === 'boots' ? ' BOOTS' : l.k === 'hats' ? ' HAT' : '');
  return { pic, name, kind, rc };
}
const lootPct = l => (l.p * 100).toFixed(l.p < .1 ? 1 : 0) + '%';
// a loot card: picture and name, and its rarity, kind and odds unless it's a plain one (idx: which of the list it is, to look closer)
function lootCard(l, n = l.n, idx = -1) {
  const { pic, name, kind, rc } = lootParts(l, n);
  return `<div class="loot${idx >= 0 ? ' pl' : ''}" style="--rc:${rc}"${idx >= 0 ? ` data-loot="${idx}"` : ''}><div class="pic">${pic}</div><b>${name}</b>${idx >= 0 ? '' : `<small>${kind}</small>${l.p !== undefined ? `<i>${lootPct(l)}</i>` : ''}`}</div>`;
}
// open one: a won chest or the keys, roll, hand it over
function openChest(c) {
  const free = boxN(c) > 0;
  if (!free && keyCount() < c.cost) return null;
  const list = lootNow(c);
  let r = Math.random(), l = list[list.length - 1];
  for (const x of list) { if ((r -= x.p) <= 0) { l = x; break; } }
  if (free) prof.box = { ...prof.box, [c.id]: boxN(c) - 1 }; else prof.keys = keyCount() - c.cost;
  const got = { ...l, n: rollN(l.n) };
  achChest(c.id);
  if (got.k === 'coins') { prof.coins += got.n; prof.earned = (prof.earned ?? 0) + got.n; }
  else if (got.k === 'boosts') prof.boosts = (prof.boosts | 0) + got.n;
  else if (got.k === 'star') { // each star on a random gun that can take one (they can split); the card lists them all
    const gave = new Map();
    for (let i = 0; i < got.n; i++) {
      const g = starGuns(); if (!g.length) { prof.coins += 50; continue; } // nowhere to go: 50 coins
      const k = g[Math.floor(Math.random() * g.length)]; prof.guns[BASE[k].id]++; gave.set(k, (gave.get(k) || 0) + 1);
    }
    got.gave = [...gave];
  }
  else if (got.k === 'gun') prof.guns[got.id] = 1;
  else if (got.k === 'boots') prof.boots[got.id] = 1;
  else if (got.k === 'hats') prof.hats[got.id] = 1;
  else if (got.k === 'av') avGive(...got.id.split(':'));
  else if (got.k === 'kfx') prof.kfx = { ...prof.kfx, [got.id]: 1 };
  else if (got.k === 'lobby') prof.lobbies = { ...prof.lobbies, [got.id]: 1 };
  else if (got.k === 'suit') prof.suits = { ...prof.suits, [got.id]: 1 };
  else if (got.k === 'hskin') prof.skins = { ...prof.skins, [got.id]: 1 };
  else if (got.k === 'skin') giftGive('skin', got.id);
  if (got.k === 'xp') grant(got.n, 0); else { saveProf(); showProf(); }
  return got;
}
// chest models: voxel boxes like the guns, the lock at the front (+z); part: 'body' (open, light inside) or 'lid', for the opening
const chestGeo = {}, chestB = (x0, y0, z0, x1, y1, z1, k) => [x1 - x0, y1 - y0, z1 - z0, k, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], CHEST_GHOST = new THREE.MeshBasicMaterial({ visible: false }), CHEST_ROOM = new THREE.BoxGeometry(1.5, 1.4, 1.5), LID_TURNS = [0, .35, .8, 1.3, 1.85, 2.5, 3.2, 4];
function chestPieces(i) { // its boxes, how big a pixel is, where the lid starts, how far in its hollow is [x, z, down]
  const c = CHESTS[i], sn = chestSeason(), { m, w, b, g: gem } = c.pal, M = palIdx(m), W = palIdx(w), D = palIdx(b), G = palIdx(gem, c.id !== 'wood'), B = chestB;
  if (sn && SEASON_CHEST[sn]) return { list: SEASON_CHEST[sn](c, B, { M, W, D, G }), px: 1 / 32, Y: 12, hollow: [12, 6, 6] };
  return { px: 1 / 16, Y: 6, hollow: [6, 3, 3], list: [
    B(-7, 1, -4, 7, 6, 4, M), B(-8, 0, -5, 8, 1, 5, W), // body on a rim
    ...[-7, 6].flatMap(x => [-4, 3].map(z => B(x, 1, z, x + 1, 6, z + 1, W))), // corner posts
    B(-8, 3, -5, 8, 4, 5, D), // a band round the body
    B(-8, 6, -5, 8, 10, 5, M), B(-7, 10, -4, 7, 11, 4, M), B(-8, 8, -5, 8, 9, 5, D), // the lid, its rounded top and its band
    B(-3, 3, 4, 3, 8, 6, D), c.id === 'wood' ? B(-1, 5, 5, 1, 7, 6, G) : B(-1, 5, 6, 1, 7, 7, G), // the lock: a latch set in it, or a glowing gem
  ] };
}
function chestModel(i, g, part = '', turn = 0) { // turn: how far the lid has swung back on its hinge and tumbled
  const key = i + chestSeason() + part, full = i + chestSeason();
  if (!chestGeo[key]) {
    const P = chestPieces(i), [hx, hz, hd] = P.hollow; let list = P.list;
    if (part) { // cut at the lid: what's below is the box (hollowed, a light in it), what's above the lid
      const lid = part === 'lid'; list = [];
      for (const [w, h, d, k, x, y, z] of P.list) { const y0 = Math.max(y - h / 2, lid ? P.Y : -99), y1 = Math.min(y + h / 2, lid ? 99 : P.Y); if (y1 > y0) list.push([w, y1 - y0, d, k, x, (y0 + y1) / 2, z]); }
      if (!lid) list.push(chestB(-hx, P.Y - hd, -hz, hx, P.Y, hz, 0), chestB(-hx, P.Y - hd - 1, -hz, hx, P.Y - hd, hz, palIdx(0xffe9a0, true)));
    }
    chestGeo[key] = voxelGeos(list, P.px);
  }
  const at = part === 'lid' && turn ? new THREE.Group() : g;
  for (const [geo, mat] of [[chestGeo[key].lit, gunLit], [chestGeo[key].glow, gunGlow]]) if (geo) { const o = new THREE.Mesh(geo, mat); o.userData.shared = true; at.add(o); }
  if (at !== g) { const piv = new THREE.Group(); piv.position.set(0, .375, -.3125); at.position.copy(piv.position).negate(); piv.rotation.x = -turn; piv.add(at); g.add(piv); } // hinged along the back of its rim
  if (part) { const o = new THREE.Mesh(CHEST_ROOM, CHEST_GHOST); o.position.y = .7; g.add(o); } // unseen: every part's picture is framed alike, with room over the chest for the lid to fly
}
// a season's own chests, drawn twice as fine: each still what it is (wood, iron, gold) under its trimmings
const SEASON_CHEST = {
  xmas26(c, B, { M, W, D, G }) {
    const col = (h, glow, bare) => palIdx(h, glow, false, false, bare), RD = col(0xc8322c), RDD = col(0x8e1f1c), GR = col(0x2f8a4c), GD = col(0x1f6a38), WH = col(0xf4f8fc), BERRY = col(0xff4a44, true), SNOW = col(0xffffff, false, true), ICE = col(0xcfeeff, false, true), PINE = col(0x2f8a4c, false, true), PINED = col(0x1f6a38, false, true);
    const bow = (y, K, KD, w = 7) => [B(-w - 2, y, -3, -2, y + 5, 3, K), B(2, y, -3, w + 2, y + 5, 3, K), B(-w, y + 1, -3, -4, y + 4, 3, 0), B(4, y + 1, -3, w, y + 4, 3, 0), B(-2, y, -2, 2, y + 4, 2, KD)]; // two loops you can see through and a knot
    if (c.id === 'wood') { // a toy crate of pine boards, tied up with red ribbon under a green bow, a tag on its front and a sprig of holly
      const MD = col(0x74491f), CREAM = col(0xf2e6c8);
      return [B(-16, 0, -10, 16, 2, 10, W), B(-14, 2, -8, 14, 12, 8, M), B(-16, 12, -10, 16, 16, 10, M), B(-14, 16, -8, 14, 18, 8, M), B(-16, 12, -10, 16, 13, 10, W), // its foot, the box, the lid and its lip
        ...[-9, -4, 5, 10].map(x => B(x, 2, -8, x + 1, 18, 8, MD)), ...[-9, -4, 5, 10].map(x => B(x, 13, -10, x + 1, 16, 10, MD)), ...[-4, 3].map(z => B(-16, 2, z, 16, 18, z + 1, MD)), // the gaps between its boards
        ...[-1, 1].flatMap(sx => [-1, 1].map(sz => B(sx > 0 ? 13 : -16, 2, sz > 0 ? 7 : -10, sx > 0 ? 16 : -13, 12, sz > 0 ? 10 : -7, W))), // corner posts
        ...[-11, 11].flatMap(x => [5, 9].map(y => B(x - 1, y, -8, x + 1, y + 1, 8, D))), // nail heads
        B(-2, 2, -8, 2, 12, 8, RD), B(-2, 12, -10, 2, 16, 10, RD), B(-2, 16, -8, 2, 18, 8, RD), B(-14, 2, -2, 14, 12, 2, RD), B(-16, 12, -2, 16, 16, 2, RD), B(-14, 16, -2, 14, 18, 2, RD), // ribbon both ways round
        ...bow(18, GR, GD), B(-1, 21, 2, 0, 22, 3, BERRY), B(1, 20, 2, 2, 21, 3, BERRY), // the bow, berries in its knot
        B(5, 4, 8, 11, 11, 9, CREAM), B(7, 7, 8, 9, 9, 9, RD), B(7, 5, 8, 9, 6, 9, MD)]; // a tag: a red seal and a line of writing
    }
    if (c.id === 'iron') { // a riveted strongbox under a cap of snow, icicles off its lid and a wreath round its lock
      const strap = x => [B(x, 2, -9, x + 3, 12, 9, D), B(x, 12, -11, x + 3, 16, 11, D), B(x, 16, -10, x + 3, 18, 10, D), ...[4, 9, 14].flatMap(y => [B(x + 1, y, 8, x + 2, y + 1, 9 + (y > 12 ? 2 : 0), W), B(x + 1, y, -9 - (y > 12 ? 2 : 0), x + 2, y + 1, -8, W)])]; // an iron strap over body and lid, its rivets
      return [B(-16, 0, -10, 16, 2, 10, D), B(-14, 2, -8, 14, 12, 8, M), B(-16, 12, -10, 16, 16, 10, M), B(-15, 16, -9, 15, 18, 9, M), B(-13, 18, -7, 13, 19, 7, M), B(-16, 12, -10, 16, 13, 10, W), // its foot, the box, the lid rounding over, a bright lip
        ...strap(-12), ...strap(9), B(14, 6, -2, 16, 9, 2, D), B(-16, 6, -2, -14, 9, 2, D), // straps and a handle each end
        B(-15, 18, -9, 15, 19, 9, SNOW), B(-13, 19, -7, 13, 20, 7, SNOW), B(-9, 20, -5, 8, 21, 5, SNOW), // snow lying on it
        ...[[-14, 3], [-7, 4], [-5, 2], [4, 3], [7, 2], [13, 4]].map(([x, n]) => B(x, 12 - n, 10, x + 1, 12, 11, ICE)), ...[[-10, 2], [2, 4], [11, 3]].map(([x, n]) => B(x, 12 - n, -11, x + 1, 12, -10, ICE)), // icicles off the lid
        B(-6, 2, 8, 6, 13, 10, PINE), B(-5, 1, 8, 5, 14, 10, PINE), B(-3, 4, 8, 3, 11, 10, 0), B(-3, 4, 8, 3, 11, 9, D), B(-1, 6, 9, 1, 9, 10, G), // the wreath (no outline: it's all needles), the lock plate inside it and its lit gem
        B(-5, 4, 9, -4, 6, 10, PINED), B(3, 11, 9, 5, 12, 10, PINED), B(-6, 9, 9, -4, 10, 10, PINED), B(4, 4, 9, 6, 5, 10, PINED), B(-1, 12, 9, 1, 13, 10, PINED), B(-3, 12, 10, -2, 13, 11, BERRY), B(4, 8, 10, 5, 9, 11, BERRY), B(-5, 7, 10, -4, 8, 11, BERRY), B(3, 2, 10, 4, 3, 11, BERRY), // darker needles, berries
        B(-3, 1, 10, 3, 3, 11, col(0xc8322c, false, true)), B(-1, 1, 10, 1, 3, 12, col(0x8e1f1c, false, true))]; // a red bow under it
    }
    // a gold coffer on feet with red velvet panels, white fur round its lid, a star for a lock and a big red bow
    const STAR = col(0xffe890, true), rows = [[[4, 1]], [[4, 1]], [[3, 3]], [[0, 9]], [[1, 7]], [[2, 5]], [[2, 5]], [[1, 3], [5, 3]], [[1, 1], [7, 1]]];
    return [...[-1, 1].flatMap(sx => [-1, 1].map(sz => B(sx > 0 ? 12 : -16, 0, sz > 0 ? 6 : -10, sx > 0 ? 16 : -12, 2, sz > 0 ? 10 : -6, D))), B(-16, 2, -10, 16, 3, 10, W), // feet and a bright rim
      B(-14, 3, -8, 14, 12, 8, M), B(-11, 5, -8, -3, 10, 8, RD), B(3, 5, -8, 11, 10, 8, RD), B(-14, 5, -5, 14, 10, 5, RD), // the coffer, velvet set in its front, back and ends
      ...[-12, -2, 2, 12].map(x => B(x - 1, 3, -8, x + 1, 12, 8, W)), // bright gold between the panels
      B(-16, 12, -10, 16, 15, 10, WH), B(-15, 15, -9, 15, 18, 9, M), B(-13, 18, -7, 13, 20, 7, M), B(-10, 20, -5, 10, 21, 5, W), // fur round the lid, its dome
      B(-2, 15, -9, 2, 18, 9, RD), B(-2, 18, -7, 2, 20, 7, RD), B(-2, 20, -5, 2, 21, 5, RD), ...bow(21, RD, RDD, 8), // ribbon over the dome, the bow
      ...rows.flatMap((runs, r) => runs.map(([x, n]) => B(x - 4.5, 13 - r, 8, x - 4.5 + n, 14 - r, 10, STAR))), B(-1, 8, 10, 1, 10, 11, G)]; // the star, a gem at its heart
  },
};
const chestSeason = () => seasonNow()?.chests ? seasonNow().id : ''; // dressed up for the month
const chestPic = i => modelPic('chest:' + CHESTS[i].id + chestSeason(), g => chestModel(i, g), { yaw: .5, tilt: .32, w: 200, h: 170 });
const chestPartPic = (i, part, turn = 0) => modelPic('chest:' + CHESTS[i].id + chestSeason() + ':' + part + turn, g => chestModel(i, g, part, turn), { yaw: .5, tilt: .32, w: 300, h: 300 });
// the CHESTS screen
let chestSel = 0, chestGot = null, chestBusy = false, chestView = null, chestUid = 0; // chestView: 'odds' (the list), or a piece of loot looked at closely
const lootArm = l => l.k === 'gun' || l.k === 'boots' || l.k === 'hats' || l.k === 'suit' || l.k === 'kfx'; // what the armory has a card for
function renderChests() {
  const won = boxAll();
  $('keyBtn').innerHTML = ico('key') + `<b>${keyCount()}</b>` + (won ? `<i class="cb">${won}</i>` : '');
  $('keyBtn').classList.toggle('ready', keyCount() >= CHESTS[0].cost || won > 0);
  if ($('chests').style.display !== 'flex') return;
  const today = typeof dayKey === 'function' ? dayKey() : '', adOk = cg.on && !noAds, adUsed = prof.adKey === today, wait = Math.ceil((adNext - performance.now()) / 1000), box = $('chestBox'), c = CHESTS[chestSel];
  if (chestGot) { // the opening plays once: nothing redraws it while it runs
    if (box.dataset.got === String(chestGot.uid)) return; box.dataset.got = chestGot.uid;
    const rc = RARITY[chestGot.r || 'common'][1], R = () => Math.random();
    const bits = Array.from({ length: 16 }, (_, k) => `<i style="--a:${(k / 16 * 360 + R() * 18) | 0}deg;--d:${(70 + R() * 80) | 0}px;--c:${[rc, '#fff', '#ffd75e'][k % 3]};--s:${(6 + R() * 6) | 0}px"></i>`).join('');
    box.innerHTML = `<h1>${c.name}</h1><div class="reveal opening" style="--rc:${rc}">${lootCard({ ...chestGot, p: undefined })}` +
      `<div class="cstage"><div class="crays"></div><div class="cflash"></div><div class="cglow"></div><img class="cbody" src="${chestPartPic(chestSel, 'body')}"><div class="clid">${LID_TURNS.map((a, k) => `<img style="--k:${k}" src="${chestPartPic(chestSel, 'lid', a)}">`).join('')}</div><div class="cbits">${bits}</div></div></div>` +
      `<button id="chestOk" class="go">NICE!</button>`;
    return;
  }
  box.dataset.got = '';
  if (chestView === 'odds') {
    box.innerHTML = `<h1>${c.name} · THE ODDS</h1><div class="oddsList">${lootShown(c).map((l, k) => { const { pic, name, kind, rc } = lootParts(l); return `<button class="odr" data-loot="${k}" style="--rc:${rc}"><span class="pic">${pic}</span><b>${name}</b><small>${kind}</small><i>${lootPct(l)}</i></button>`; }).join('')}</div>` +
      `<div class="btns"><button id="lootBack">${ico('left')} BACK</button></div>`;
    return;
  }
  if (chestView) {
    const l = chestView, { pic, name, kind, rc } = lootParts(l), text = l.k === 'gun' ? DESC[l.id] : l.k === 'kfx' ? kfxOf(l.id).about : l.k === 'hskin' ? hatSkinOf(l.id).about : l.k === 'boots' || l.k === 'hats' ? gearOf(l).about : '';
    box.innerHTML = `<h1>${name}</h1><div class="lootBig" style="--rc:${rc}"><div class="pic">${pic}</div><small>${kind}</small>${text ? `<p>${text}</p>` : ''}<div class="odp"><b>${lootPct(l)}</b> chance in a ${c.name.toLowerCase()}</div></div>` +
      `<div class="btns"><button id="lootBack">${ico('left')} BACK</button>${lootArm(l) && inLobby ? `<button id="lootArm" class="go">GO TO ARMORY ${ico('right')}</button>` : ''}</div>`;
    return;
  }
  box.innerHTML = `<h1>${ico('key')} CHESTS <span class="kn">${ico('key')} ${keyCount()}</span></h1><p>Win online matches to earn keys</p>` +
    `<div class="row">${CHESTS.map((c, i) => { const n = boxN(c), ok = n > 0 || keyCount() >= c.cost;
      return `<div class="chest${i === chestSel ? ' sel' : ''}" data-c="${i}">${n ? `<i class="own">×${n}</i>` : ''}<img src="${chestPic(i)}"><b>${c.name}</b>` +
        `<button data-open="${i}" class="${ok ? 'go' : ''}" ${ok ? '' : 'disabled'}>${n ? 'OPEN · FREE' : `OPEN · ${ico('key')} ${c.cost}`}</button></div>`; }).join('')}</div>` +
    `<div class="lootHead"><span>${c.name} CAN HAVE</span><button id="lootOdds">SEE THE ODDS</button></div><div class="lootRow">${lootShown(c).map((l, k) => lootCard(l, l.n, k)).join('')}</div>` +
    `<div class="btns">${adOk ? `<button id="keyAd" ${adUsed || wait > 0 ? 'disabled' : ''}>${ico('video')} ${adUsed ? 'NEXT AD KEY TOMORROW' : wait > 0 ? `NEXT AD IN ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}` : 'WATCH AD · +1 KEY'}</button>` : ''}<button id="chestX">CLOSE</button></div>`;
}
// from a piece of loot to its card in the armory
function lootToArmory(l) {
  chestView = null; closeChests(); openArmory();
  if (l.k === 'gun') { const k = gi(l.id); armPage = chestOnly(k) ? 'exclusive' : 'weapons'; exclTab = 'all'; armCat = BASE[k].cat; armSel = k; armPick = true; }
  else { armPage = 'wear'; if (l.k === 'kfx') { wearCat = 'kfx'; kfxSel = l.id; } else if (l.k === 'suit') { wearCat = 'armor'; suitSel = l.id; armorCard = false; } else { wearCat = l.k; gearSel = GEAR[l.k].I[l.id]; gearPick = true; } }
  renderArmory();
}
const CHEST_OPEN = 1.75; // seconds till what was in it is out and NICE! can be pressed (the stylesheet's timings add up to this)
function openChests() { chestGot = null; chestView = null; $('chests').style.display = 'flex'; renderChests(); sfx('ui'); }
function closeChests() { if (chestBusy) return; chestGot = null; $('chests').style.display = 'none'; }
$('keyBtn').addEventListener('click', e => { e.stopPropagation(); openChests(); });
$('chests').addEventListener('click', e => {
  e.stopPropagation();
  if (chestBusy) return;
  const b = e.target.closest('button'), id = b?.id;
  if (!b && e.target.id === 'chests' || id === 'chestX') return closeChests();
  if (id === 'chestOk') { chestGot = null; sfx('ui'); }
  else if (id === 'lootOdds') { chestView = 'odds'; sfx('ui'); }
  else if (id === 'lootBack') { chestView = chestView === 'odds' || !chestView?.fromOdds ? null : 'odds'; sfx('ui'); }
  else if (id === 'lootArm') { lootToArmory(chestView); return; }
  else if (e.target.closest('[data-loot]')) { const l = lootShown(CHESTS[chestSel])[+e.target.closest('[data-loot]').dataset.loot]; if (l) { chestView = { ...l, fromOdds: chestView === 'odds' }; sfx('ui'); } }
  else if (b?.dataset.open !== undefined) {
    const i = +b.dataset.open; chestSel = i;
    const got = openChest(CHESTS[i]); if (!got) return;
    chestBusy = true; chestGot = { ...got, uid: ++chestUid }; chestView = null; renderChests();
    sfx('chestDrop'); setTimeout(() => sfx('chestRattle'), 400); setTimeout(() => sfx('chestBurst'), 1300); // it lands, rattles, bursts open
    setTimeout(() => sfx(got.r && got.r !== 'common' ? 'levelUp' : 'buy'), 1500);
    setTimeout(() => { chestBusy = false; }, CHEST_OPEN * 1000);
    setTimeout(lvlShow, 3200); // XP from a chest can level you up
    return;
  }
  else if (id === 'keyAd') {
    adNext = performance.now() + AD_GAP * 1000;
    cgRewarded(() => { prof.keys = keyCount() + 1; prof.adKey = dayKey(); saveProf(); renderChests(); sfx('buy'); netToast('+1 KEY'); },
      code => { if (code === 'adsDisabled' || code === 'adblock') noAds = true; else adNext = 0; renderChests(); netToast(code === 'adblock' ? 'Ads are blocked, so no ad key this time' : `No ad right now, try again later (${code})`); });
  }
  else { const c = e.target.closest('.chest'); if (c) { chestSel = +c.dataset.c; sfx('ui'); } }
  renderChests();
});
setInterval(() => { if ($('chests').style.display === 'flex' && !chestBusy && !chestGot && adNext > performance.now() - 1500) renderChests(); }, 1000);
renderChests();
