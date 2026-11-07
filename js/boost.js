// 2x BOOSTERS: one doubles the XP and coins of your next game (a match, or a whole Zombie Waves run).
// prof.boosts = how many you have, prof.boostOn = one is set for your next game. The ⚡ button under your coins in the lobby opens
// the booster card: set one for the next game (or stop), watch an ad for one more (CrazyGames only, every AD_GAP seconds at most),
// or buy one with coins (the way to get one without ads). Daily rewards and other events can hand them out later.
// A booster is used up at your game's first pay (the end of a match, the first wave of a run), so leaving before then keeps it,
// and it has to be set again for the game after.
const BOOST_PRICE = 15, AD_GAP = 180; // coins for one; seconds between rewarded ads
let gameBoost = false, boostSpent = false; // this game is boosted (set when it starts, input.js restart); its booster is used up
let adNext = 0; // when the next ad may be offered (performance.now), noAds: CrazyGames has no ads for us this session
let noAds = false;
const boosts = () => prof.boosts | 0;
function boostStart() { gameBoost = !!prof.boostOn && boosts() > 0; boostSpent = false; }
// every pay from a game goes through this: doubled when boosted, and the first boosted pay uses the booster up (grant saves it)
function boostPay(xp, coins) {
  if (!gameBoost) return [xp, coins];
  if (!boostSpent) { boostSpent = true; prof.boosts = Math.max(0, boosts() - 1); prof.boostOn = false; }
  return [xp * 2, coins * 2];
}
const boostTag = () => gameBoost ? `<span class="bx">${ico('bolt')} 2× BOOST</span>` : '';
function renderBoost() {
  const b = $('boostBtn'); b.innerHTML = ico('bolt') + `<b>${boosts()}</b>`; b.classList.toggle('on', !!prof.boostOn && boosts() > 0);
  if ($('boost').style.display !== 'flex') return;
  const n = boosts(), on = !!prof.boostOn && n > 0, wait = Math.ceil((adNext - performance.now()) / 1000), ads = cg.on && !noAds;
  $('boostBox').innerHTML = `<h1>${ico('bolt')} 2× BOOSTER</h1><p>Doubles the XP and coins from your next game</p>` +
    `<div class="bn">YOU HAVE <b>${n}</b></div>` +
    `<button id="boostUse" class="${on ? 'on' : ''}" ${n ? '' : 'disabled'}>${on ? 'SET FOR NEXT GAME · CANCEL' : 'USE ON NEXT GAME'}</button>` +
    (ads ? `<button id="boostAd" ${wait > 0 ? 'disabled' : ''}>${ico('video')} ${wait > 0 ? `NEXT AD IN ${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, '0')}` : 'WATCH AD · +1'}</button>` : '') +
    `<button id="boostBuy" ${prof.coins >= BOOST_PRICE ? '' : 'disabled'}>BUY 1 · ${COIN}${BOOST_PRICE}</button>` +
    `<button id="boostX">CLOSE</button>`;
}
function openBoost() { $('boost').style.display = 'flex'; renderBoost(); sfx('ui'); }
function closeBoost() { $('boost').style.display = 'none'; }
setInterval(() => { if ($('boost').style.display === 'flex' && adNext > performance.now() - 1500) renderBoost(); }, 1000); // the ad timer
$('boostBtn').addEventListener('click', e => { e.stopPropagation(); openBoost(); });
$('boost').addEventListener('click', e => {
  e.stopPropagation();
  const id = e.target.closest('button')?.id;
  if (!id && e.target.id === 'boost') return closeBoost(); // a click outside the card
  if (id === 'boostX') return closeBoost();
  if (id === 'boostUse') { prof.boostOn = !(prof.boostOn && boosts() > 0); saveProf(); sfx('ui'); }
  else if (id === 'boostBuy' && prof.coins >= BOOST_PRICE) { prof.coins -= BOOST_PRICE; prof.boosts = boosts() + 1; saveProf(); showProf(); sfx('buy'); }
  else if (id === 'boostAd') {
    adNext = performance.now() + AD_GAP * 1000; // no second ad for a while, watched or not
    cgRewarded(() => { prof.boosts = boosts() + 1; saveProf(); renderBoost(); sfx('buy'); netToast('+1 2× BOOSTER'); },
      code => { if (code === 'adsDisabled' || code === 'adblock') noAds = true; else adNext = 0; renderBoost(); netToast(code === 'adblock' ? 'Ads are blocked, so no ad booster this time' : 'No ad right now, try again later'); });
  }
  renderBoost();
});
renderBoost();
