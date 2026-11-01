// Star upgrades cost a share of the gun's own price: UPG[0] for ★★, UPG[1] for ★★★ (so less than buying the gun again).
const UPG = [.75, .9];
let armCat = 'primary', armOpen = false;
const gunStars = i => prof.guns[BASE[i].id] ?? 0; // 0 = not bought yet (starters are always 0: no stars)
const upgPrice = i => Math.round(BASE[i].price * UPG[gunStars(i) - 1]);
const inMatch = () => !inLobby && mode === 'dm' && !matchOver;

function gunStats(i) {
  const w = BASE[i], L = Math.max(0, gunStars(i) - 1), dmg = Math.round(w.dmg * (1 + .25 * L)), mag = Math.round(w.mag * (1 + .25 * L));
  if (w.melee) return `DMG ${dmg} · MELEE`;
  const L2 = Math.max(0, gunStars(i) - 1), rl = +(w.reload * (1 - .15 * L2)).toFixed(1);
  if (w.mag === 1) return `DMG ${dmg} · RELOAD ${rl}s`; // one shot per reload, so fire rate doesn't mean much
  const rate = (1 / w.rate).toFixed(w.rate < .2 ? 0 : 1) + '/s';
  return `DMG ${w.pellets > 1 ? dmg + '×' + w.pellets : dmg} · ${rate} · ${w.flame ? 'FUEL' : 'MAG'} ${mag}`;
}
function renderArmory() {
  $('armInfo').innerHTML = `LVL ${prof.lv}<span class="pc">◆ ${prof.coins}</span>`;
  $('armTabs').innerHTML = CATS.map(([c, label], s) =>
    `<button data-c="${c}" class="${c === armCat ? 'sel' : ''}"><img src="${SPRITES[loadoutGun(c)]}"><span>${label}</span></button>`).join('');
  const list = BASE.map((w, i) => i).filter(i => BASE[i].cat === armCat).sort((a, b) => (BASE[a].unlock ?? 0) - (BASE[b].unlock ?? 0));
  const eq = loadoutGun(armCat);
  $('armList').innerHTML = list.map(i => {
    const w = BASE[i], have = hasGun(i), st = gunStars(i), locked = !have && prof.lv < (w.unlock ?? 0);
    let btns = '';
    if (locked) btns = `<button disabled>🔒 LVL ${w.unlock}</button>`;
    else if (!have) btns = `<button data-buy="${i}" ${prof.coins < w.price ? 'disabled' : ''}>BUY ◆ ${w.price}</button>`;
    else {
      btns = i === eq ? '<button class="eq" disabled>EQUIPPED</button>' : `<button data-eq="${i}">EQUIP</button>`;
      if (!w.start && st < 3) btns += `<button data-up="${i}" ${prof.coins < upgPrice(i) ? 'disabled' : ''}>${'★'.repeat(st + 1)} ◆ ${upgPrice(i)}</button>`;
    }
    const starTxt = w.start ? '' : '★'.repeat(st) + '☆'.repeat(3 - st);
    return `<div class="card${locked ? ' locked' : ''}${i === eq ? ' on' : ''}"><img src="${SPRITES[i]}">` +
      `<div class="cn">${w.name} <span class="st">${starTxt}</span></div><small>${gunStats(i)}</small><div class="cb">${btns}</div></div>`;
  }).join('');
}

function armSync(i, how) {
  if (!inMatch()) return;
  if (how === 'buy') giveGun(i);
  if (how === 'up') { lvl[i] = gunStars(i) - 1; applyLvl(i); if (i === cur) buildGun(); }
  const s = slotOf(i);
  if (slotGun[s] !== loadoutGun(BASE[i].cat)) { slotGun[s] = loadoutGun(BASE[i].cat); if (slotOf(cur) === s) { const g = slotGun[s]; cur = -1; equip(g); } }
  renderHotbar();
}
$('armory').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.c) { armCat = b.dataset.c; sfx('ui'); }
  else if (b.dataset.buy) {
    const i = +b.dataset.buy, w = BASE[i]; if (prof.coins < w.price || prof.lv < (w.unlock ?? 0)) return;
    prof.coins -= w.price; prof.guns[w.id] = 1; prof.loadout[w.cat] = w.id; saveProf(); showProf();
    armSync(i, 'buy'); sfx('buy');
  } else if (b.dataset.up) {
    const i = +b.dataset.up, p = upgPrice(i); if (prof.coins < p || gunStars(i) >= 3) return;
    prof.coins -= p; prof.guns[BASE[i].id]++; saveProf(); showProf();
    armSync(i, 'up'); sfx('upgrade');
  } else if (b.dataset.eq) {
    const i = +b.dataset.eq; prof.loadout[BASE[i].cat] = BASE[i].id; saveProf();
    armSync(i, 'eq'); sfx('equip');
  } else if (b.id === 'armX') { closeArmory(); return; }
  renderArmory();
});
function openArmory() { armOpen = true; renderArmory(); $('armory').style.display = 'flex'; }
function closeArmory() { if (!armOpen) return; armOpen = false; $('armory').style.display = 'none'; }
$('armBtn').addEventListener('click', e => { e.stopPropagation(); openArmory(); }); // stopPropagation so the click doesn't re-lock the mouse
$('lobbyArm').addEventListener('click', openArmory);
addEventListener('keydown', e => { if (e.code === 'Escape' && armOpen && $('binds').style.display !== 'flex') closeArmory(); });
