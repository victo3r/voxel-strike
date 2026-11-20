// the level up screen: the level you reached, what it paid and what it opened
let lvlWait = null, lvlTest = false;
// several level ups before it shows become one screen
function lvlNote(from, to, coins, boosts) { lvlWait = lvlWait ? { from: lvlWait.from, to, coins: lvlWait.coins + coins, boosts: lvlWait.boosts + boosts } : { from, to, coins, boosts }; }
const LVL_BITS = ['#ffd75e', '#fff0a0', '#35c98a', '#a8ffd8', '#ffffff', '#6fd8ff'];
// only once a game is over or in the lobby, never while you're playing
function lvlShow(force) {
  if (!lvlWait || $('lvlUp').style.display === 'flex' || !(matchOver || inLobby)) return false;
  if (navigator.webdriver && !force && !lvlTest) return false; // tests click through the results
  const L = lvlWait, got = []; lvlWait = null;
  for (let l = L.from + 1; l <= L.to; l++) got.push(...unlocksAt(l));
  const bits = Array.from({ length: 34 }, (_, i) => `<i style="left:${Math.random() * 100}%;--w:${(.45 + Math.random() * .9).toFixed(2)}s;--d:${(1.6 + Math.random() * 1.6).toFixed(2)}s;--s:${6 + (i % 3) * 3}px;background:${LVL_BITS[i % LVL_BITS.length]}"></i>`).join('');
  $('lvlBox').innerHTML = `<div class="lvRays"></div><div class="lvBits">${bits}</div><div class="lvKick">LEVEL UP!</div>` +
    `<div class="lvNum"><small>LVL</small><span class="lvFlip"><span class="lvOld">${L.from}</span><span class="lvNew">${L.to}</span></span></div>` +
    rewardRow([L.coins && coinTile(L.coins), L.boosts && [ico('bolt'), L.boosts > 1 ? 'BOOSTERS' : 'BOOSTER', `+${L.boosts}`, 'tbo']]) +
    (got.length ? `<div class="nx new"><b>NEW IN THE ARMORY</b>${unlockPics(got)}</div>` : '') +
    `<div class="rl">${xpText()}</div>${xpBar()}<button id="lvlOk">CONTINUE</button>`;
  $('lvlUp').style.display = 'flex'; sfx('levelUp');
  setTimeout(() => $('lvlOk')?.focus(), 900);
  return true;
}
function lvlClose() { $('lvlUp').style.display = 'none'; sfx('ui'); }
$('lvlUp').addEventListener('click', e => { e.stopPropagation(); lvlClose(); });
