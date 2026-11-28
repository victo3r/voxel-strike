// the season page: this month's weapons, each earned by three challenges of its own, and its daily presents
const SLOT_WORD = { primary: 'primary', backup: 'backup', melee: 'melee', special: 'special', sniper: 'sniper', premium: 'premium' };
const seasonGoalText = G => ({
  cat: () => `${G.g} kills with ${SLOT_WORD[G.c]} weapons`, head: () => `${G.g} headshot kills with ${SLOT_WORD[G.c]} weapons`, dbl: () => `${G.g} double kills with ${SLOT_WORD[G.c]} weapons`,
  life: () => `${G.n} ${SLOT_WORD[G.c]} kills in one life, ${G.g} times`, win: () => `Win ${G.g} matches`, near: () => `${G.g} kills from under 5 metres`, far: () => `${G.g} kills from 40 metres or more`,
  zk: () => `Take down ${G.g} zombies`, wave: () => `Reach zombie wave ${G.g}`, multi: () => `${G.g} blasts that take out two or more`,
})[G.k]();
// your progress this season: n[gun] = how far along each of its three is
function seasonProf() { const S = seasonNow(); if (!S?.guns) return null; if (prof.season?.id !== S.id) prof.season = { id: S.id, n: {} }; return prof.season; }
const seasonN = id => { const sp = seasonProf(); return sp ? sp.n[id] ??= [0, 0, 0] : [0, 0, 0]; };
const seasonDone = (S, id) => { const n = seasonN(id); return S.goals[id].every((G, j) => (n[j] | 0) >= G.g); };
const seasonReady = () => { const S = seasonNow(); return S?.guns ? S.guns.filter(id => !prof.guns[id] && seasonDone(S, id)) : []; };
let seasonNew = []; // challenges finished this game, for the results screen
function seasonStep(test, add) {
  const S = seasonNow(), sp = seasonProf(); if (!sp) return;
  let done = null;
  for (const id of S.guns) {
    if (prof.guns[id]) continue;
    const n = sp.n[id] ??= [0, 0, 0];
    S.goals[id].forEach((G, j) => { if ((n[j] | 0) >= G.g || !test(G)) return; const v = Math.min(G.g, add(n[j] | 0, G)); if (v === n[j]) return; n[j] = v; if (v >= G.g) done = [id, G]; });
  }
  if (!done) return;
  const [id, G] = done, all = seasonDone(S, id), name = BASE[gi(id)].name.toUpperCase();
  seasonNew.push(all ? name + ' IS READY' : seasonGoalText(G).toUpperCase());
  if (!matchOver && !inLobby) toast(all ? `${name} IS READY TO UNLOCK` : `SEASON CHALLENGE DONE · ${name}`, S.col);
  sfx(all ? 'levelUp' : 'buy'); saveProf(); renderSeasonBtn();
}
// what counts: your kills on players and bots with the gun in your hands, your wins, zombies and waves
let sLife = {}, sLast = { t: -9, cat: '', used: false }, sBlast = { t: -9, used: false };
function seasonKill(head, at, streak) {
  if (!seasonProf()) return;
  const w = BASE[cur], cat = w?.cat, now = performance.now() / 1000, d = at ? Math.hypot(at.x - P.pos.x, at.y - P.pos.y, at.z - P.pos.z) : -1;
  if (streak === 1) sLife = {}; // the first since you last went down
  sLife[cat] = (sLife[cat] | 0) + 1;
  const dbl = sLast.cat === cat && now - sLast.t < 3 && !sLast.used; sLast = { t: now, cat, used: dbl }; // two inside three seconds; a third starts a new pair
  const boom = !!(w?.rocket || w?.grenade || w?.flare || w?.spell || w?.vortex), multi = boom && now - sBlast.t < .35 && !sBlast.used; sBlast = { t: now, used: multi || now - sBlast.t < .35 && sBlast.used }; // one blast, two down
  seasonStep(G => G.k === 'cat' && G.c === cat, n => n + 1);
  if (head) seasonStep(G => G.k === 'head' && G.c === cat, n => n + 1);
  if (dbl) seasonStep(G => G.k === 'dbl' && G.c === cat, n => n + 1);
  seasonStep(G => G.k === 'life' && G.c === cat && sLife[cat] === G.n, n => n + 1);
  if (d >= 0 && d < 5 && !w?.melee) seasonStep(G => G.k === 'near', n => n + 1);
  if (d >= 40) seasonStep(G => G.k === 'far', n => n + 1);
  if (multi) seasonStep(G => G.k === 'multi', n => n + 1);
}
const seasonZombie = () => seasonStep(G => G.k === 'zk', n => n + 1);
const seasonWave = w => seasonStep(G => G.k === 'wave', n => Math.max(n, w));
const seasonGame = won => { if (won) seasonStep(G => G.k === 'win', n => n + 1); };
function seasonMark() { seasonNew = []; }
const seasonRow = () => seasonNew.length ? `<div class="rl acr" style="color:${seasonNow()?.col || '#ffd75e'}">${ico('gift')} ${seasonNew.length > 1 ? seasonNew.length + ' SEASON CHALLENGES' : seasonNew[0]} · SEE THE SEASON PAGE</div>` : '';
function seasonClaim(id) {
  const S = seasonNow(); if (!S?.guns?.includes(id) || prof.guns[id] || !seasonDone(S, id)) return;
  prof.guns[id] = 1; saveProf(); sfx('levelUp'); snSel = id; renderSeason(); renderSeasonBtn();
  const T = GUN_SETS.find(x => x.id === S.id); if (T?.ach && setHas(T) === T.guns.length) netToast(`${T.name} COMPLETE · YOUR REWARD IS IN THE ARMORY`); // the last of them
}

// ---- the presents: one a day from the 1st, by your own calendar; a day you miss stays shut, but what it had to wear or show comes with the next one you open
const GIFT_ITEMS = ['hskin', 'kfx', 'skin', 'lobby'], GIFT_ALT = 100; // one you already have (a chest gave it) pays coins on its own day
function giftsProf() { const S = seasonNow(); if (!S?.gifts) return null; if (prof.gifts?.id !== S.id) prof.gifts = { id: S.id, got: {} }; return prof.gifts; }
function giftDay() { const S = seasonNow(); if (!S?.gifts) return 0; if (seasonPick) return seasonDay; const d = new Date(); return d.getFullYear() === S.y && d.getMonth() + 1 === S.m ? d.getDate() : 0; }
const giftOpen = d => !!giftsProf()?.got[d];
const giftReady = () => { const S = seasonNow(), d = giftDay(); return S?.gifts && d >= 1 && d <= S.gifts.length && !giftOpen(d) ? d : 0; };
const giftHas = (k, id) => k === 'hskin' ? !!prof.skins?.[id] : k === 'kfx' ? !!prof.kfx?.[id] : k === 'lobby' ? !!prof.lobbies?.[id] : Array.isArray(prof.secrets) && prof.secrets.includes(id);
function giftGive(k, id) {
  if (k === 'hskin') prof.skins = { ...prof.skins, [id]: 1 }; else if (k === 'kfx') prof.kfx = { ...prof.kfx, [id]: 1 }; else if (k === 'lobby') prof.lobbies = { ...prof.lobbies, [id]: 1 };
  else prof.secrets = [...new Set([...(Array.isArray(prof.secrets) ? prof.secrets : []), id])];
}
const giftName = (k, id) => (k === 'hskin' ? hatSkinOf(id)?.name : k === 'kfx' ? KILL_FX.find(K => K.id === id)?.name : k === 'lobby' ? lobbyById(id)?.name : SECRETS[id]?.name) || id;
const GIFT_WORD = { hskin: 'HAT SKIN', kfx: 'KILL EFFECT', skin: 'SKIN', lobby: 'LOBBY' };
const giftArt = (k, id) => k === 'lobby' ? `<span class="lc">${ico(lobbyById(id)?.ic || 'gift')}</span>` : `<img src="${k === 'hskin' ? hatPic(HATS[0].id, 1, id) : k === 'kfx' ? kfxPic(id) : lookPic(SECRETS[id]?.look ?? PRESETS[0].look)}">`;
// a present for each day, in 3D: its paper, ribbon and shape go by the day (gold for one with something to wear or show), and it stands open once it's yours
const GIFT_PAPER = [[0xc8322c, 0xf4e8c0], [0x2f8a4c, 0xc8322c], [0xf2f2ee, 0xc8322c], [0x2c5fb0, 0xe8eef6]], GIFT_GOLD = [0xe0b234, 0xc8322c], GIFT_SHAPE = [[12, 20, 12], [10, 26, 10], [15, 15, 12]]; // [paper, ribbon]; [half width, height, half depth]
const giftLook = (d, star) => [star ? 4 : (d * 2 + (d / 3 | 0)) % 4, d % 3];
function giftBoxModel(g, look, shape, open) {
  const [pc, rc] = look === 4 ? GIFT_GOLD : GIFT_PAPER[look], [W, H, D] = GIFT_SHAPE[shape], dark = (c, k) => new THREE.Color(c).multiplyScalar(k).getHex();
  const P = palIdx(pc), PD = palIdx(dark(pc, .72)), R = palIdx(rc), RD = palIdx(dark(rc, .7)), TI = palIdx(0xfbf6ea), B = (x0, y0, z0, x1, y1, z1, k) => [x1 - x0, y1 - y0, z1 - z0, k, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const box = [B(-W, 0, -D, W, H - 4, D, P), B(-W, H - 5, -D, W, H - 4, D, PD), B(-2, 0, -D, 2, H - 4, D, R), B(-W, 0, -2, W, H - 4, 2, R)]; // the box, a shadow under its lid, ribbon both ways
  const lid = [B(-W - 1, 0, -D - 1, W + 1, 4, D + 1, P), B(-2, 0, -D - 1, 2, 4, D + 1, R), B(-W - 1, 0, -2, W + 1, 4, 2, R), B(-9, 4, -3, -2, 10, 3, R), B(2, 4, -3, 9, 10, 3, R), B(-2, 4, -2, 2, 8, 2, RD)]; // the lid, its bow (no holes in the loops: at this size they'd be all outline)
  if (open) box.push(B(-W + 2, 3, -D + 2, W - 2, H - 4, D - 2, 0), B(-W + 3, H - 9, -D + 3, -W + 8, H - 2, -D + 8, TI), B(1, H - 10, 0, 6, H - 3, 5, TI), B(-3, H - 8, -D + 3, 2, H - 5, -D + 6, TI)); // empty, tissue paper left in it
  const add = (list, at) => { const geos = voxelGeos(list, 1 / 32), o = new THREE.Group(); for (const [geo, mat] of [[geos.lit, gunLit], [geos.glow, gunGlow]]) if (geo) { const m = new THREE.Mesh(geo, mat); m.userData.shared = true; o.add(m); } at(o); g.add(o); };
  add(box, () => {});
  add(lid, o => open ? (o.position.set((W + 5) / 32, 3 / 32, 0), o.rotation.z = -1.15) : o.position.set(0, (H - 4) / 32, 0)); // on the box, or leant against its side
}
const giftBoxPic = (d, star, open) => { const [look, shape] = giftLook(d, star); return modelPic(`gift:${look}:${shape}:${open ? 1 : 0}`, g => giftBoxModel(g, look, shape, open), { yaw: .6, tilt: .36, w: 150, h: 140 }); };
// the things a day's present would bring you now (those of days you missed too)
function giftItems(S, d) { const out = []; for (let k = 1; k <= d; k++) if (k === d || !giftOpen(k)) for (const key of GIFT_ITEMS) { const id = S.gifts[k - 1][key]; if (id) out.push([key, id, k]); } return out; }
let giftGot = null; // what the last one held, for the page
function giftTake() {
  const S = seasonNow(), d = giftReady(); if (!d) return;
  const g = S.gifts[d - 1], got = { d, c: g.c | 0, k: g.k | 0, b: g.b | 0, box: g.box, items: [] };
  for (const [key, id, day] of giftItems(S, d)) { if (giftHas(key, id)) { if (day === d) got.c += GIFT_ALT; } else { giftGive(key, id); got.items.push([key, id]); } }
  prof.coins += got.c; prof.earned = (prof.earned ?? 0) + got.c; prof.keys = (prof.keys | 0) + got.k; prof.boosts = (prof.boosts | 0) + got.b;
  if (got.box) prof.box = { ...prof.box, [got.box]: (prof.box?.[got.box] | 0) + 1 };
  giftsProf().got[d] = 1; giftGot = got; saveProf(); sfx('levelUp');
  showProf(); renderChests(); renderBoost(); renderSeason(); renderSeasonBtn();
}

// ---- the page
let snTab = 'guns', snSel = null;
const seasonLeft = S => { const ms = Math.max(0, seasonEnd(S) - Date.now()), d = ms / 864e5 | 0, h = ms / 36e5 % 24 | 0; return seasonPick ? '' : d ? `${d}D ${h}H LEFT` : `${h}H ${ms / 6e4 % 60 | 0}M LEFT`; };
function renderSeasonBtn() {
  const el = $('seasonBtn'), S = seasonNow(); if (!el) return;
  el.style.display = S?.guns ? '' : 'none'; if (!S?.guns) return;
  const n = seasonReady().length + (giftReady() ? 1 : 0);
  el.style.setProperty('--sn', S.col); el.classList.toggle('new', n > 0);
  setHTML(el, `${ico('gift')}<b>${S.name}</b><i id="seasonBadge">${n || ''}</i>`);
}
const giftTags = g => [g.c && `<span class="ay">${COIN}${g.c}</span>`, g.k && `<span>${ico('key')}${g.k}</span>`, g.b && `<span>${ico('bolt')}${g.b}</span>`, g.box && `<span><img src="${chestPic(CHESTS.findIndex(c => c.id === g.box))}"></span>`].filter(Boolean).join('');
function renderSeason() {
  if ($('season').style.display !== 'flex') return;
  const S = seasonNow(), box = $('seasonBox'); if (!S?.guns) { $('season').style.display = 'none'; return; }
  box.style.setProperty('--sn', S.col);
  const day = giftReady(), left = seasonLeft(S);
  let h = `<div class="lbTop"><h1>${ico('gift')} ${S.name}</h1><span class="snOnly">${S.only}${left ? ' · ' + left : ''}</span></div>` +
    `<div class="snTabs"><button data-tab="guns" class="${snTab === 'guns' ? 'on' : ''}">WEAPONS${seasonReady().length ? `<i>${seasonReady().length}</i>` : ''}</button><button data-tab="gifts" class="${snTab === 'gifts' ? 'on' : ''}">PRESENTS${day ? '<i>1</i>' : ''}</button></div>`;
  if (snTab === 'gifts') {
    const d0 = giftDay();
    h += (d0 >= 1 ? `<div class="snNote">${day ? 'Today\'s present is waiting' : d0 > S.gifts.length ? 'That was the last of them, see you next year' : 'Come back tomorrow for the next one'}</div>` : '') + '<div class="pzGrid">' + S.gifts.map((g, i) => {
      const d = i + 1, open = giftOpen(d), now = d === day, item = GIFT_ITEMS.map(k => g[k] && [k, g[k]]).find(Boolean), miss = !open && d < d0;
      return `<button class="pz${open ? ' open' : now ? ' now' : miss ? ' miss' : ''}${item ? ' star' : ''}" data-day="${d}"${now ? '' : ' disabled'} title="${item ? GIFT_WORD[item[0]] + ' · ' + giftName(...item) : ''}"><b>${d}</b><img class="pzb" src="${giftBoxPic(d, !!item, open)}">` +
        (item ? `<span class="pzi">${giftArt(...item)}</span>` : '') + `<small>${open ? ico('check') : now ? 'OPEN' : miss ? 'MISSED' : item ? GIFT_WORD[item[0]] : ''}</small></button>`;
    }).join('') + '</div>';
    if (giftGot) h += `<div class="pzGot"><b>DAY ${giftGot.d}</b>${giftTags(giftGot)}${giftGot.items.map(([k, id]) => `<span class="pzNew">${giftArt(k, id)}${GIFT_WORD[k]} · ${giftName(k, id).toUpperCase()}</span>`).join('')}</div>`;
  } else if (snSel && S.guns.includes(snSel)) {
    const i = gi(snSel), w = BASE[i], [rn, rc] = RARITY[rarOf(w)], n = seasonN(snSel), own = !!prof.guns[snSel], ready = !own && seasonDone(S, snSel);
    h += `<div class="snDet" style="--rc:${rc}"><div class="snPic"><img class="ai" src="${gunPic(i)}"><b>${w.name.toUpperCase()}</b><small>${rn} ${CATS[CAT_I[w.cat]][1]}</small><p>${DESC[w.id] || ''}</p></div><div class="snGoals">` +
      S.goals[snSel].map((G, j) => { const at = own ? G.g : Math.min(G.g, n[j] | 0), ok = at >= G.g; return `<div class="snG${ok ? ' ok' : ''}"><span>${seasonGoalText(G)}</span><em>${ok ? ico('check') : `${at}/${G.g}`}</em><u><i style="width:${at / G.g * 100}%"></i></u></div>`; }).join('') +
      (own ? `<button data-arm="${i}" class="snGo">${ico('check')} IT'S YOURS · SEE IT IN THE ARMORY</button>` : ready ? `<button data-claim="${snSel}" class="snGo ready">UNLOCK ${w.name.toUpperCase()}</button>` : `<div class="snHint">Finish all three and it's yours to keep</div>`) + '</div></div>';
  } else {
    h += '<div class="snGrid">' + S.guns.map(id => {
      const i = gi(id), w = BASE[i], [, rc] = RARITY[rarOf(w)], n = seasonN(id), own = !!prof.guns[id], ready = !own && seasonDone(S, id);
      return `<button class="snCard${own ? ' own' : ready ? ' ready' : ''}" data-gun="${id}" style="--rc:${rc}"><small>${CATS[CAT_I[w.cat]][1]}</small><img class="ai" src="${gunPic(i)}"><b>${w.name.toUpperCase()}</b>` +
        `<span class="snPips">${own ? 'YOURS' : ready ? 'READY TO UNLOCK' : S.goals[id].map((G, j) => `<i class="${(n[j] | 0) >= G.g ? 'on' : ''}"></i>`).join('')}</span></button>`;
    }).join('') + '</div>';
  }
  h += `<div class="lbFoot">${snTab === 'guns' && snSel ? `<button id="seasonBack">${ico('left')} BACK</button>` : ''}<button id="seasonX">${ico('close')} CLOSE</button></div>`;
  const keep = box.querySelector('.pzGrid')?.scrollTop | 0;
  box.innerHTML = h;
  if (box.querySelector('.pzGrid')) box.querySelector('.pzGrid').scrollTop = keep;
}
function openSeason(tab) { if (!seasonNow()?.guns) return; snTab = tab || (giftReady() ? 'gifts' : 'guns'); snSel = null; giftGot = null; $('season').style.display = 'flex'; renderSeason(); sfx('ui'); }
$('seasonBtn').addEventListener('click', e => { e.stopPropagation(); openSeason(); });
$('season').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b && e.target.id === 'season' || b?.id === 'seasonX') { $('season').style.display = 'none'; return; }
  if (!b) return;
  if (b.id === 'seasonBack') { snSel = null; sfx('ui'); }
  else if (b.dataset.tab) { snTab = b.dataset.tab; snSel = null; sfx('ui'); }
  else if (b.dataset.gun) { snSel = b.dataset.gun; sfx('ui'); }
  else if (b.dataset.claim) { seasonClaim(b.dataset.claim); return; }
  else if (b.dataset.day) { giftTake(); return; }
  else if (b.dataset.arm) { const k = +b.dataset.arm; $('season').style.display = 'none'; openArmory(); armPage = 'exclusive'; armCat = BASE[k].cat; armSel = k; armPick = true; armDet = false; renderArmory(); return; }
  renderSeason();
});
setInterval(() => { if (inLobby) renderSeasonBtn(); }, 30000);
renderSeasonBtn();
