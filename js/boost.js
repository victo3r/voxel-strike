// 2x boosters: double the XP and coins of your next games
const AD_GAP = 180; // seconds between rewarded ads
let gameBoost = false, boostSpent = false;
let adNext = 0;
let noAds = false;
const boosts = () => prof.boosts | 0;
if (prof.boostOn) { prof.boostSet = Math.max(prof.boostSet | 0, 1); delete prof.boostOn; } // old saves had a single on/off
const boostSet = () => Math.min(prof.boostSet | 0, boosts());
function boostStart() { gameBoost = boostSet() > 0; boostSpent = false; }
// doubles a game's pay; the first boosted pay uses the booster up
function boostPay(xp, coins) {
  if (!gameBoost) return [xp, coins];
  if (!boostSpent) { boostSpent = true; prof.boostSet = Math.max(0, boostSet() - 1); prof.boosts = Math.max(0, boosts() - 1); }
  return [xp * 2, coins * 2];
}
const boostTag = () => gameBoost ? `<span class="bx">${ico('bolt')} 2× BOOST</span>` : '';
function renderBoost() {
  const b = $('boostBtn'), on = boostSet();
  b.innerHTML = ico('bolt') + `<b>${boosts()}</b>` + (on ? `<small>${on} SET</small>` : ''); b.classList.toggle('on', on > 0);
  if ($('boost').style.display !== 'flex') return;
  const n = boosts(), k = boostSet(), wait = Math.ceil((adNext - performance.now()) / 1000), ads = cg.on && !noAds;
  $('boostBox').innerHTML = `<h1>${ico('bolt')} 2× BOOSTER</h1><p>Each one doubles the XP and coins from a game</p>` +
    `<div class="bn">YOU HAVE <b>${n}</b></div>` +
    `<div class="bs"><span>BOOST MY NEXT</span><button id="boostLess" ${k > 0 ? '' : 'disabled'}>${ico('left')}</button><b class="${k ? 'on' : ''}">${k}</b>` +
    `<button id="boostMore" ${k < n ? '' : 'disabled'}>${ico('right')}</button><span>${k === 1 ? 'GAME' : 'GAMES'}</span></div>` +
    (ads ? `<button id="boostAd" ${wait > 0 ? 'disabled' : ''}>${ico('video')} ${wait > 0 ? `NEXT AD IN ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}` : 'WATCH AD · +1'}</button>` : '') +
    `<p class="be">Level up to earn more</p>` +
    `<button id="boostX">CLOSE</button>`;
}
function openBoost() { $('boost').style.display = 'flex'; renderBoost(); sfx('ui'); }
function closeBoost() { $('boost').style.display = 'none'; }
setInterval(() => { if ($('boost').style.display === 'flex' && adNext > performance.now() - 1500) renderBoost(); }, 1000); // keep the ad countdown ticking
$('boostBtn').addEventListener('click', e => { e.stopPropagation(); openBoost(); });
$('boost').addEventListener('click', e => {
  e.stopPropagation();
  const id = e.target.closest('button')?.id;
  if (!id && e.target.id === 'boost') return closeBoost(); // clicked outside the card
  if (id === 'boostX') return closeBoost();
  if (id === 'boostLess' || id === 'boostMore') { prof.boostSet = Math.max(0, Math.min(boosts(), boostSet() + (id === 'boostMore' ? 1 : -1))); saveProf(); sfx('ui'); }
  else if (id === 'boostAd') {
    adNext = performance.now() + AD_GAP * 1000; // no second ad for a while, watched or not
    cgRewarded(() => { prof.boosts = boosts() + 1; saveProf(); renderBoost(); sfx('buy'); netToast('+1 2× BOOSTER'); },
      code => { if (code === 'adsDisabled' || code === 'adblock') noAds = true; else adNext = 0; renderBoost(); netToast(code === 'adblock' ? 'Ads are blocked, so no ad booster this time' : 'No ad right now, try again later'); });
  }
  renderBoost();
});
renderBoost();
