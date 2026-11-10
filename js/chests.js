// chests: keys from online wins, the daily reward and ads open them
const keyCount = () => prof.keys | 0;
// chests you've won (weekly prizes) open free: prof.box[id] = how many
const boxN = c => prof.box?.[c.id] | 0, boxAll = () => CHESTS.reduce((s, c) => s + boxN(c), 0);
// loot: k = kind, n = amount or [min, max], w = weight, r = rarity. Things you can only have one of drop out once you own them
const GUN_DROP = { common: 2, rare: 1.6, epic: 1, legend: .5, mythic: .2 }; // the rarer the gun, the rarer the drop
const CHESTS = [
  { id: 'wood', name: 'WOODEN CHEST', cost: 1, pal: { m: '#9a6634', w: '#c48a4e', b: '#5d5d66', g: '#d8d8e0' }, loot: [
    { k: 'coins', n: [10, 16], w: 40 }, { k: 'boosts', n: 1, w: 30 }, { k: 'xp', n: [100, 160], w: 20 },
    { k: 'coins', n: 30, w: 8, r: 'rare' }, { k: 'boosts', n: 3, w: 2, r: 'rare' },
  ] },
  { id: 'iron', name: 'IRON CHEST', cost: 3, pal: { m: '#7f8a99', w: '#b5bfcc', b: '#3c4450', g: '#4fa3ff' }, loot: [
    { k: 'coins', n: [30, 45], w: 34 }, { k: 'boosts', n: 3, w: 24 }, { k: 'xp', n: [300, 450], w: 18 },
    { k: 'star', n: 1, w: 5, r: 'rare' }, { k: 'coins', n: 100, w: 6, r: 'rare' },
    ...BOOTS.map(b => ({ k: 'boots', id: b.id, w: 1.5, r: rarOf(b) })), ...HATS.map(h => ({ k: 'hats', id: h.id, w: 1.5, r: rarOf(h) })),
    { k: 'boosts', n: 6, w: 2, r: 'epic' },
  ] },
  { id: 'gold', name: 'GOLDEN CHEST', cost: 10, pal: { m: '#e0b234', w: '#ffe07a', b: '#8a5a12', g: '#d23cff' }, loot: [
    { k: 'coins', n: [120, 180], w: 24 }, { k: 'boosts', n: 12, w: 16 }, { k: 'star', n: 2, w: 14, r: 'rare' },
    ...BOOTS.map(b => ({ k: 'boots', id: b.id, w: 3, r: rarOf(b) })), ...HATS.map(h => ({ k: 'hats', id: h.id, w: 3, r: rarOf(h) })),
    { k: 'coins', n: 300, w: 12, r: 'epic' },
    ...BASE.filter(w => w.price).map(w => ({ k: 'gun', id: w.id, w: GUN_DROP[rarOf(w)], r: rarOf(w) })),
    { k: 'coins', n: 500, w: 3, r: 'legend' },
  ] },
];
const starGuns = () => BASE.map((w, i) => i).filter(i => BASE[i].price && gunStars(i) >= 1 && gunStars(i) < 3);
const lootOk = l => l.k === 'star' ? starGuns().length > 0 : l.k === 'gun' ? !gunStars(gi(l.id)) : l.k === 'boots' ? !prof.boots[l.id] : l.k === 'hats' ? !prof.hats[l.id] : true;
// what a chest can give you right now, with odds that add up to 100
function lootNow(c) {
  const ok = c.loot.filter(lootOk), sum = ok.reduce((s, l) => s + l.w, 0);
  return ok.map(l => ({ ...l, p: l.w / sum }));
}
// the "can have" row: common to mythic, then by kind and amount
const LOOT_KIND = ['coins', 'boosts', 'xp', 'star', 'boots', 'hats', 'gun'], lootLow = n => Array.isArray(n) ? n[0] : n | 0;
function lootShown(c) {
  const rk = Object.keys(RARITY), r = l => rk.indexOf(l.r || 'common');
  return lootNow(c).sort((a, b) => r(a) - r(b) || LOOT_KIND.indexOf(a.k) - LOOT_KIND.indexOf(b.k) || lootLow(a.n) - lootLow(b.n));
}
const rollN = n => Array.isArray(n) ? n[0] + Math.floor(Math.random() * (n[1] - n[0] + 1)) : n;
const nText = n => Array.isArray(n) ? `${n[0]}-${n[1]}` : n;
const gearOf = l => (l.k === 'boots' ? BOOTS : HATS).find(g => g.id === l.id);
// a loot card: picture and name
function lootCard(l, n = l.n) {
  const [rn, rc] = RARITY[l.r || 'common'];
  let pic, name;
  if (l.k === 'coins') { pic = `<span class="lc">${COIN}</span>`; name = `${nText(n)} COINS`; }
  else if (l.k === 'boosts') { pic = `<span class="lc">${ico('bolt')}</span>`; name = `${n} BOOSTER${n === 1 ? '' : 'S'}`; }
  else if (l.k === 'xp') { pic = `<span class="lc lx">XP</span>`; name = `${nText(n)} XP`; }
  else if (l.k === 'star') { pic = `<span class="lc ls">${ico('star').repeat(n)}</span>`; name = l.gave ? l.gave.map(([i, k]) => `${BASE[i].name.toUpperCase()} +${k} ${ico('star')}`).join('<br>') || '50 COINS A STAR' : n > 1 ? `+${n} STARS ON YOUR GUNS` : '+1 STAR ON A GUN'; }
  else if (l.k === 'gun') { pic = `<img class="ai" src="${gunPic(gi(l.id))}">`; name = BASE[gi(l.id)].name.toUpperCase(); }
  else { pic = `<img class="ai" src="${l.k === 'boots' ? bootPic(l.id, 1) : hatPic(l.id, 1)}">`; name = gearOf(l).name.toUpperCase(); }
  return `<div class="loot" style="--rc:${rc}"><div class="pic">${pic}</div><b>${name}</b><small>${rn}</small>${l.p !== undefined ? `<i>${(l.p * 100).toFixed(l.p < .1 ? 1 : 0)}%</i>` : ''}</div>`;
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
  if (got.k === 'xp') grant(got.n, 0); else { saveProf(); showProf(); }
  return got;
}
// chest models: voxel boxes like the guns, the lock at the front (+z)
const chestGeo = [];
function chestModel(i, g) {
  const c = CHESTS[i], { m, w, b, g: gem } = c.pal, M = palIdx(m), W = palIdx(w), D = palIdx(b), G = palIdx(gem, c.id !== 'wood');
  const B = (x0, y0, z0, x1, y1, z1, k) => [x1 - x0, y1 - y0, z1 - z0, k, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  chestGeo[i] ??= voxelGeos([
    B(-7, 1, -4, 7, 6, 4, M), B(-8, 0, -5, 8, 1, 5, W), // body on a rim
    ...[-7, 6].flatMap(x => [-4, 3].map(z => B(x, 1, z, x + 1, 6, z + 1, W))), // corner posts
    B(-8, 3, -5, 8, 4, 5, D), // a band round the body
    B(-8, 6, -5, 8, 10, 5, M), B(-7, 10, -4, 7, 11, 4, M), B(-8, 8, -5, 8, 9, 5, D), // the lid, its rounded top and its band
    B(-3, 3, 4, 3, 8, 6, D), c.id === 'wood' ? B(-1, 5, 5, 1, 7, 6, G) : B(-1, 5, 6, 1, 7, 7, G), // the lock: a latch set in it, or a glowing gem
  ], 1 / 16);
  for (const [geo, mat] of [[chestGeo[i].lit, gunLit], [chestGeo[i].glow, gunGlow]]) if (geo) { const o = new THREE.Mesh(geo, mat); o.userData.shared = true; g.add(o); }
}
const chestPic = i => modelPic('chest:' + CHESTS[i].id, g => chestModel(i, g), { yaw: .5, tilt: .32, w: 200, h: 170 });
// the CHESTS screen
let chestSel = 0, chestGot = null, chestBusy = false;
function renderChests() {
  const won = boxAll();
  $('keyBtn').innerHTML = ico('key') + `<b>${keyCount()}</b>` + (won ? `<i class="cb">${won}</i>` : '');
  $('keyBtn').classList.toggle('ready', keyCount() >= CHESTS[0].cost || won > 0);
  if ($('chests').style.display !== 'flex') return;
  const today = typeof dayKey === 'function' ? dayKey() : '', adOk = cg.on && !noAds, adUsed = prof.adKey === today, wait = Math.ceil((adNext - performance.now()) / 1000);
  if (chestGot || chestBusy) {
    const c = CHESTS[chestSel];
    $('chestBox').innerHTML = `<h1>${c.name}</h1><div class="reveal${chestBusy ? ' shake' : ' open'}"><img class="big" src="${chestPic(chestSel)}">${chestGot && !chestBusy ? lootCard({ ...chestGot, p: undefined }) : ''}</div>` +
      (chestBusy ? '' : `<button id="chestOk" class="go">NICE!</button>`);
    return;
  }
  $('chestBox').innerHTML = `<h1>${ico('key')} CHESTS <span class="kn">${ico('key')} ${keyCount()}</span></h1><p>Win online matches to earn keys</p>` +
    `<div class="row">${CHESTS.map((c, i) => { const n = boxN(c), ok = n > 0 || keyCount() >= c.cost;
      return `<div class="chest${i === chestSel ? ' sel' : ''}" data-c="${i}">${n ? `<i class="own">×${n}</i>` : ''}<img src="${chestPic(i)}"><b>${c.name}</b>` +
        `<button data-open="${i}" class="${ok ? 'go' : ''}" ${ok ? '' : 'disabled'}>${n ? 'OPEN · FREE' : `OPEN · ${ico('key')} ${c.cost}`}</button></div>`; }).join('')}</div>` +
    `<div class="lootHead">${CHESTS[chestSel].name} CAN HAVE</div><div class="lootRow">${lootShown(CHESTS[chestSel]).map(l => lootCard(l)).join('')}</div>` +
    `<div class="btns">${adOk ? `<button id="keyAd" ${adUsed || wait > 0 ? 'disabled' : ''}>${ico('video')} ${adUsed ? 'NEXT AD KEY TOMORROW' : wait > 0 ? `NEXT AD IN ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}` : 'WATCH AD · +1 KEY'}</button>` : ''}<button id="chestX">CLOSE</button></div>`;
}
function openChests() { chestGot = null; $('chests').style.display = 'flex'; renderChests(); sfx('ui'); }
function closeChests() { if (chestBusy) return; chestGot = null; $('chests').style.display = 'none'; }
$('keyBtn').addEventListener('click', e => { e.stopPropagation(); openChests(); });
$('chests').addEventListener('click', e => {
  e.stopPropagation();
  if (chestBusy) return;
  const b = e.target.closest('button'), id = b?.id;
  if (!b && e.target.id === 'chests' || id === 'chestX') return closeChests();
  if (id === 'chestOk') { chestGot = null; sfx('ui'); }
  else if (b?.dataset.open !== undefined) {
    const i = +b.dataset.open; chestSel = i;
    const got = openChest(CHESTS[i]); if (!got) return;
    chestBusy = true; chestGot = got; sfx('ui'); renderChests();
    setTimeout(() => { chestBusy = false; renderChests(); sfx(got.r && got.r !== 'common' ? 'levelUp' : 'buy'); }, 900);
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
